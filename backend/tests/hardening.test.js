process.env.JWT_SECRET = 'x';
delete process.env.OTP_DEBUG_ECHO; delete process.env.OTP_TEST_PHONES; delete process.env.OTP_TEST_CODE;
const B = require('path').resolve(__dirname, '..') + '/';
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require(B + 'node_modules/mongoose');
const User = require(B + 'src/models/User'), Party = require(B + 'src/models/Party'), Trip = require(B + 'src/models/Trip');
const Vehicle = require(B + 'src/models/Vehicle'), Transaction = require(B + 'src/models/Transaction');
const bills = require(B + 'src/controllers/bill.controller');
const fin = require(B + 'src/controllers/finance.controller');
const partyCtl = require(B + 'src/controllers/party.controller');
const auth = require(B + 'src/controllers/auth.controller');
const translation = require(B + 'src/controllers/translationController');
const adminUsers = require(B + 'src/controllers/admin.users.controller');
const otpStore = require(B + 'utils/otpStore');
const smsService = require(B + 'src/services/sms.service');
const { rateLimit } = require(B + 'src/middleware/rateLimit.middleware');

const call = async (fn, req) => {
  const r = { code: 200, headers: {} }; r.status = c => (r.code = c, r); r.json = b => (r.body = b, r); r.set = (k, v) => (r.headers[k] = v, r);
  let err; await fn({ params: {}, body: {}, query: {}, headers: {}, ...req }, r, e => { err = e });
  if (err) { r.code = 500; r.body = { message: err.message } }
  return r;
};
let pass = 0, fail = 0;
const ok = (c, m, extra = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : '  ' + extra)) };

(async () => {
  const mem = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mem.getUri());
  smsService.sendOtpSms = async () => ({ success: true }); // no real SMS

  // ── 14: OTP ──
  let r = await call(auth.sendOtp, { body: { phone: '9876500001' } });
  ok(r.code === 200 && r.body.otp === undefined && r.body.smsResult === undefined, 'OTP not returned in response');
  r = await call(auth.sendOtp, { body: { phone: '9876500001' } });
  ok(r.code === 429 && r.body.retryAfterSeconds > 0, 'resend within 30s refused', JSON.stringify(r.body));
  const rec = otpStore.store.get('9876500001');
  ok(/^\d{6}$/.test(rec.otp), 'OTP is 6 digits');
  // max 5 sends per window (simulate time passing between sends)
  const realNow = Date.now; let t = realNow();
  Date.now = () => t;
  let lastCode;
  for (let i = 0; i < 5; i++) { t += 31000; lastCode = (await call(auth.sendOtp, { body: { phone: '9876500002' } })).code; }
  t += 31000; const sixth = await call(auth.sendOtp, { body: { phone: '9876500002' } });
  Date.now = realNow;
  ok(lastCode === 200 && sixth.code === 429, '6th OTP within 15 minutes refused', `${lastCode} ${sixth.code}`);
  ok(otpStore.verifyOtp('7458947838', '123456').valid === false, 'old demo number no longer accepts 123456');
  process.env.OTP_TEST_PHONES = '7458947838'; process.env.OTP_TEST_CODE = '123456';
  otpStore.issueOtp('7458947838');
  ok(otpStore.verifyOtp('7458947838', '123456').valid === true, 'demo number works when configured in env');

  // ── rate limiter ──
  const lim = rateLimit({ windowSeconds: 60, max: 2, message: 'slow' });
  const hit = () => call((req, res, next) => lim(req, res, next), { ip: '1.1.1.1', headers: { 'x-forwarded-for': '9.9.9.9' } });
  const [a, b2, c] = [await hit(), await hit(), await hit()];
  ok(a.code === 200 && b2.code === 200 && c.code === 429, 'rate limiter blocks after max');

  // ── translation caps ──
  r = await call(translation.translateBatch, { body: { texts: new Array(129).fill('x'), targetLang: 'hi' } });
  ok(r.code === 400, 'translation batch over 128 texts refused');
  r = await call(translation.translateSingle, { body: { text: 'x'.repeat(2001), targetLang: 'hi' } });
  ok(r.code === 400, 'translation text over 2000 chars refused');

  // ── party balance recalculation ──
  const user = await User.create({ phone: '9000000001', role: 'transport', subscriptionActive: true, subscriptionExpiry: new Date(Date.now() + 864e5) });
  const u = { id: String(user._id), role: 'transport', phone: user.phone };
  r = await call(partyCtl.createParty, { user: u, body: { name: 'Sharma & Sons', phone: '9876543210', openingBalance: 100, balance: 5 } });
  const party = r.body.party;
  ok(r.code === 200 && party.balance === 100, 'new party balance = opening balance (client balance ignored)', party?.balance);
  const bal = async () => (await Party.findById(party._id)).balance;
  const item = { date: '2026-09-01', companyFrom: 'A', companyTo: 'B', amount: 1000 };
  r = await call(bills.createBill, { user: u, body: { billType: 'transport', status: 'unpaid', party: party._id, items: [item] } });
  const billId = r.body.bill._id;
  ok(await bal() === 1100, 'final bill adds to party balance', await bal());
  await call(bills.recordPayment, { user: u, params: { id: billId }, body: { amount: 400 } });
  ok(await bal() === 700, 'payment reduces balance', await bal());
  r = await call(fin.addTransaction, { user: u, body: { type: 'income', amount: 50, party: party._id, notes: 'advance' } });
  const txId = r.body.transaction._id;
  ok(await bal() === 650, 'manual income reduces balance', await bal());
  r = await call(fin.updateTransaction, { user: u, params: { id: txId }, body: { amount: 80 } });
  ok(r.code === 200 && r.body.transaction.amount === 80 && await bal() === 620, 'editing entry recalculates balance', await bal());
  const payTx = await Transaction.findOne({ bill: billId });
  r = await call(fin.deleteTransaction, { user: u, params: { id: String(payTx._id) } });
  ok(r.code === 400, 'bill payment entry cannot be deleted from finance');
  r = await call(fin.deleteTransaction, { user: u, params: { id: txId } });
  ok(r.code === 200 && await bal() === 700, 'deleting entry recalculates balance', await bal());

  // ── 16: party delete guard ──
  r = await call(partyCtl.deleteParty, { user: u, params: { id: party._id } });
  ok(r.code === 400 && /unpaid bill/.test(r.body.message), 'party with unpaid bill cannot be deleted', r.body.message);
  await call(bills.recordPayment, { user: u, params: { id: billId }, body: { amount: 600 } });
  const veh = await Vehicle.create({ owner: user._id, vehicleNumber: 'MH12AB1234' });
  await Trip.create({ owner: user._id, vehicle: veh._id, party: party._id, source: 'A', destination: 'B', amount: 10 });
  r = await call(partyCtl.deleteParty, { user: u, params: { id: party._id } });
  ok(r.code === 400 && /not yet billed/.test(r.body.message), 'party with unbilled trips cannot be deleted', r.body.message);
  await Trip.deleteMany({});
  r = await call(partyCtl.deleteParty, { user: u, params: { id: party._id } });
  ok(r.code === 200, 'fully settled party can be deleted');

  // ── deleting a bill recalculates ──
  r = await call(partyCtl.createParty, { user: u, body: { name: 'Patil', phone: '9876543211' } });
  const p2 = r.body.party._id;
  r = await call(bills.createBill, { user: u, body: { billType: 'transport', status: 'unpaid', party: p2, items: [item] } });
  await call(bills.recordPayment, { user: u, params: { id: r.body.bill._id }, body: { amount: 300 } });
  await call(bills.deleteBill, { user: u, params: { id: r.body.bill._id } });
  ok((await Party.findById(p2)).balance === 0, 'deleting a bill removes it from the balance');

  // ── 18: admin shows expired subscription as inactive ──
  await User.create({ phone: '9000000009', role: 'garage', subscriptionActive: true, subscriptionExpiry: new Date(Date.now() - 864e5) });
  r = await call(adminUsers.list, { user: u, query: { role: 'garage' } });
  ok(r.body.users[0].subscriptionActive === false, 'expired subscription shown as inactive');
  r = await call(adminUsers.list, { user: u, query: { q: 'a(b' } });
  ok(r.code === 200, 'admin search with ( does not error');

  console.log(`\n${pass} passed, ${fail} failed`);
  await mongoose.disconnect(); await mem.stop();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
