process.env.JWT_SECRET = 'x';
const B = require('path').resolve(__dirname, '..') + '/';
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require(B + 'node_modules/mongoose');
const User = require(B + 'src/models/User'), Party = require(B + 'src/models/Party'), Trip = require(B + 'src/models/Trip');
const Vehicle = require(B + 'src/models/Vehicle'), TransportBill = require(B + 'src/models/TransportBill');
const GarageBill = require(B + 'src/models/GarageBill'), Transaction = require(B + 'src/models/Transaction');
const bills = require(B + 'src/controllers/bill.controller');
const transport = require(B + 'src/controllers/transport.controller');
const partyCtl = require(B + 'src/controllers/party.controller');
const adminT = require(B + 'src/controllers/admin.transport.controller');

const call = async (fn, req) => {
  const r = { code: 200 }; r.status = c => (r.code = c, r); r.json = b => (r.body = b, r);
  let err; await fn({ params: {}, body: {}, query: {}, ...req }, r, e => { err = e });
  if (err) { r.code = 500; r.body = { message: err.message } }
  return r;
};
let pass = 0, fail = 0;
const ok = (c, m, extra = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : '  ' + extra)) };

(async () => {
  const mem = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mem.getUri());
  const user = await User.create({ phone: '9000000001', role: 'transport', subscriptionActive: true, subscriptionExpiry: new Date(Date.now() + 864e5) });
  const other = await User.create({ phone: '9000000002', role: 'transport' });
  const u = { id: String(user._id), role: 'transport', phone: user.phone };
  const party = await Party.create({ owner: user._id, name: 'Sharma', phone: '9876543210' });
  const veh = await Vehicle.create({ owner: user._id, vehicleNumber: 'MH12AB1234' });
  const mkTrip = (amt) => Trip.create({ owner: user._id, vehicle: veh._id, party: party._id, source: 'A', destination: 'B', amount: amt });
  const t1 = await mkTrip(1000), t2 = await mkTrip(2000), t3 = await mkTrip(500);
  const item = (t, amt) => ({ date: '2026-09-01', companyFrom: 'A', companyTo: 'B', amount: amt, tripIds: [String(t._id)] });

  // ── 6: double billing ──
  let r = await call(bills.createBill, { user: u, body: { billType: 'transport', status: 'draft', party: String(party._id), billedToName: 'Sharma', items: [item(t1, 1000)] } });
  ok(r.code === 200 && r.body.bill.status === 'draft', 'draft created', JSON.stringify(r.body));
  const draftId = r.body.bill._id;
  let t1db = await Trip.findById(t1._id);
  ok(String(t1db.billId) === String(draftId) && t1db.billed === false, 'draft reserves its trip (billId set, not billed)');
  r = await call(bills.createBill, { user: u, body: { billType: 'transport', status: 'unpaid', party: String(party._id), items: [item(t1, 1000)] } });
  ok(r.code === 400, 'same trip cannot go on a second bill');
  r = await call(bills.updateBill, { user: u, params: { id: draftId }, body: { status: 'unpaid' } });
  t1db = await Trip.findById(t1._id);
  ok(r.code === 200 && r.body.bill.status === 'unpaid' && /^Inv-T-\d{4}-01$/.test(r.body.bill.billNumber), 'draft finalised with bill number', JSON.stringify(r.body?.bill?.billNumber));
  ok(t1db.billed === true, 'finalising a draft marks its trips billed');

  // ── 9: server-computed totals / no mass assignment ──
  r = await call(bills.createBill, { user: u, body: { billType: 'transport', status: 'unpaid', party: String(party._id), grandTotal: 1, owner: String(other._id), items: [item(t2, 2000)] } });
  ok(r.code === 200 && r.body.bill.grandTotal === 2000 && String(r.body.bill.owner._id) === u.id, 'client grandTotal/owner ignored on create');
  const bill2 = r.body.bill._id;
  r = await call(bills.updateBill, { user: u, params: { id: bill2 }, body: { grandTotal: 5, paidAmount: 9999, owner: String(other._id), billNumber: 'X' } });
  let b2 = await TransportBill.findById(bill2);
  ok(b2.grandTotal === 2000 && b2.paidAmount === 0 && String(b2.owner) === u.id && b2.billNumber !== 'X', 'client grandTotal/paidAmount/owner/billNumber ignored on update');
  r = await call(bills.updateBill, { user: u, params: { id: bill2 }, body: { status: 'paid' } });
  ok(r.code === 400, 'cannot mark paid through edit');
  r = await call(bills.updateBill, { user: u, params: { id: bill2 }, body: { status: 'draft' } });
  ok(r.code === 400, 'final bill cannot go back to draft');
  // edit: swap trip t2 -> t3
  r = await call(bills.updateBill, { user: u, params: { id: bill2 }, body: { items: [item(t3, 500)] } });
  const [t2db, t3db] = [await Trip.findById(t2._id), await Trip.findById(t3._id)];
  ok(r.code === 200 && r.body.bill.grandTotal === 500 && !t2db.billed && !t2db.billId && t3db.billed, 'editing items re-links trips and recomputes total', JSON.stringify(r.body));
  ok(r.body.bill.billedToName === undefined || r.body.bill.billedToName === b2.billedToName, 'partial edit keeps other fields');

  // ── 10: payments ──
  r = await call(bills.recordPayment, { user: u, params: { id: bill2 }, body: { amount: 600, mode: 'Cash' } });
  ok(r.code === 409, 'overpayment refused', JSON.stringify(r.body));
  const [p1, p2] = await Promise.all([
    call(bills.recordPayment, { user: u, params: { id: bill2 }, body: { amount: 200, mode: 'UPI' } }),
    call(bills.recordPayment, { user: u, params: { id: bill2 }, body: { amount: 100, mode: 'Cash', notes: '$danger' } }),
  ]);
  b2 = await TransportBill.findById(bill2);
  ok(p1.code === 200 && p2.code === 200 && b2.paidAmount === 300 && b2.payments.length === 2 && b2.status === 'partial', 'two simultaneous payments both kept', `${p1.code} ${p2.code} ${b2.paidAmount} ${b2.payments.length}`);
  ok(b2.payments.some(p => p.notes === '$danger'), 'notes starting with $ stored literally');
  r = await call(bills.recordPayment, { user: u, params: { id: bill2 }, body: { amount: 200 } });
  b2 = await TransportBill.findById(bill2);
  ok(r.code === 200 && b2.status === 'paid' && b2.paidAmount === 500, 'final payment marks bill paid');
  const partyAfterPay = await Party.findById(party._id);
  // balance = final bills − payments: bill #1 (1000, unpaid) + bill #2 (500, fully paid)
  ok(partyAfterPay.balance === 1000, 'party balance = unpaid billed amount', partyAfterPay.balance);

  // ── 7: delete releases trips & reverses money ──
  r = await call(bills.deleteBill, { user: u, params: { id: bill2 } });
  const t3after = await Trip.findById(t3._id);
  const txLeft = await Transaction.countDocuments({ bill: bill2 });
  const partyAfterDel = await Party.findById(party._id);
  ok(r.code === 200 && !t3after.billed && !t3after.billId, 'deleted bill frees its trips');
  ok(txLeft === 0 && partyAfterDel.balance === 1000, 'deleted bill removes its payment entries; balance still counts bill #1', `${txLeft} ${partyAfterDel.balance}`);

  // ── 8: numbering never reuses ──
  r = await call(bills.createBill, { user: u, body: { billType: 'transport', status: 'unpaid', party: String(party._id), items: [item(t3, 500)] } });
  ok(/-03$/.test(r.body.bill.billNumber), 'number after a deleted bill is not reused (expect -03)', r.body.bill.billNumber);
  const nums = await Promise.all([1, 2, 3].map(() => call(bills.createBill, { user: u, body: { billType: 'garage', status: 'unpaid', customerName: 'X', items: [{ description: 'Oil', qty: 2, rate: 150 }] } })));
  const gn = nums.map(n => n.body.bill.billNumber);
  ok(new Set(gn).size === 3, 'simultaneous bills get distinct numbers', gn.join(','));
  ok(nums[0].body.bill.grandTotal === 300, 'garage total computed from qty x rate', nums[0].body.bill.grandTotal);

  // ── 12: trips/parties ──
  r = await call(transport.updateTrip, { user: u, params: { id: String(t3._id) }, body: { amount: 1 } });
  ok(r.code === 400, 'billed trip cannot be edited');
  r = await call(transport.deleteTrip, { user: u, params: { id: String(t3._id) } });
  ok(r.code === 400, 'billed trip cannot be deleted');
  const t4 = await mkTrip(700);
  r = await call(transport.updateTrip, { user: u, params: { id: String(t4._id) }, body: { amount: 800, billed: true, owner: String(other._id) } });
  const t4db = await Trip.findById(t4._id);
  ok(r.code === 200 && t4db.amount === 800 && t4db.billed === false && String(t4db.owner) === u.id, 'trip edit ignores billed/owner');
  r = await call(transport.createTrip, { user: u, body: { vehicle: String(veh._id), party: String(party._id), source: 'A', destination: 'C', amount: 10, billed: true } });
  ok(r.code === 200 && r.body.trip.billed === false, 'new trip cannot be created as billed');
  r = await call(partyCtl.updateParty, { user: u, params: { id: String(party._id) }, body: { balance: 99999, owner: String(other._id), city: 'Pune' } });
  const pdb = await Party.findById(party._id);
  ok(pdb.balance !== 99999 && String(pdb.owner) === u.id && pdb.city === 'Pune', 'party edit ignores balance/owner', pdb.balance);

  // ── 11: admin status ──
  const gb = nums[0].body.bill;
  r = await call(adminT.updateBillStatus, { user: u, params: { id: gb._id }, body: { status: 'pending', type: 'garage' } });
  ok(r.code === 200 && r.body.bill.status === 'unpaid', "admin 'pending' saved as unpaid");
  r = await call(adminT.updateBillStatus, { user: u, params: { id: gb._id }, body: { status: 'paid', type: 'garage' } });
  const gdb = await GarageBill.findById(gb._id);
  ok(r.code === 200 && gdb.status === 'paid' && gdb.paidAmount === 300 && gdb.payments.length === 1, 'admin mark-paid records the payment');
  r = await call(adminT.updateBillStatus, { user: u, params: { id: gb._id }, body: { status: 'unpaid', type: 'garage' } });
  ok(r.code === 400, 'admin cannot un-pay a bill with payments');

  console.log(`\n${pass} passed, ${fail} failed`);
  await mongoose.disconnect(); await mem.stop();
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); process.exit(1) });
