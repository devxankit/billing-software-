process.env.JWT_SECRET = 'x'; process.env.RAZORPAY_KEY_SECRET = 'rzsecret'; process.env.RAZORPAY_KEY_ID = 'rzid';
const path = require('path'); const B = path.resolve(__dirname, '../src') + '/';
const crypto = require('crypto');
const Admin = require(B + 'models/Admin'), User = require(B + 'models/User');
const SoftwarePlan = require(B + 'models/SoftwarePlan'), SoftwareSale = require(B + 'models/SoftwareSale');
const Party = require(B + 'models/Party'), Transaction = require(B + 'models/Transaction');
const rz = require(B + 'utils/razorpay.util');
const { requireRole } = require(B + 'middleware/auth.middleware');
const auth = require(B + 'controllers/auth.controller');
const plan = require(B + 'controllers/plan.controller');
const fin = require(B + 'controllers/finance.controller');
const q = (v) => ({ select() { return this }, lean: async () => v, populate: async () => v, then: (r) => r(v) });
const res = () => { const r = { code: 200 }; r.status = c => (r.code = c, r); r.json = b => (r.body = b, r); return r };
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m) };
const ID = '64b000000000000000000001', ID2 = '64b000000000000000000002';
(async () => {
  // 1a: user token claiming admin, not in Admin collection -> 403
  Admin.findById = () => q(null);
  let r = res(), nexted = false;
  await requireRole('admin')({ user: { id: ID, role: 'admin' } }, r, () => nexted = true);
  ok(!nexted && r.code === 403, 'fake admin token is rejected');
  Admin.findById = () => q({ disabled: false }); nexted = false;
  await requireRole('admin')({ user: { id: ID, role: 'admin' } }, res(), () => nexted = true);
  ok(nexted, 'real admin passes');
  Admin.findById = () => q({ disabled: true }); r = res(); nexted = false;
  await requireRole('admin')({ user: { id: ID, role: 'admin' } }, r, () => nexted = true);
  ok(!nexted && r.code === 403, 'disabled admin rejected');
  nexted = false; await requireRole('transport')({ user: { id: ID, role: 'transport' } }, res(), () => nexted = true);
  ok(nexted, 'transport user passes transport routes');
  r = res(); nexted = false; await requireRole('transport')({ user: { id: ID, role: 'garage' } }, r, () => nexted = true);
  ok(!nexted && r.code === 403, 'garage user blocked from transport routes');

  // 1b: set-role
  r = res(); await auth.setRole({ body: { role: 'admin' }, user: { phone: '9999999999' } }, r, e => { throw e });
  ok(r.code === 400, 'set-role admin refused');
  User.findOne = () => q({ _id: ID, role: 'transport' });
  r = res(); await auth.setRole({ body: { role: 'garage' }, user: { phone: '9999999999' } }, r, e => { throw e });
  ok(r.code === 403, 'switching an existing role refused');
  User.findOne = () => q({ _id: ID, role: null });
  User.findOneAndUpdate = () => ({ populate: async () => ({ _id: ID, phone: '9', role: 'garage', toObject() { return this } }) });
  r = res(); await auth.setRole({ body: { role: 'garage' }, user: { phone: '9999999999' } }, r, e => { throw e });
  ok(r.code === 200 && r.body.success, 'first-time role selection works');

  // 2a: subscribe paid plan without payment
  SoftwarePlan.findById = async () => ({ _id: ID2, name: 'Pro', price: 999 });
  r = res(); await plan.subscribeToPlan({ body: { planId: ID2 }, user: { id: ID } }, r, e => { throw e });
  ok(r.code === 402, 'paid plan via /subscribe refused');
  SoftwarePlan.findById = async () => ({ _id: ID2, name: 'Free', price: 0 });
  User.findById = async () => ({ _id: ID }); SoftwareSale.exists = async () => true;
  r = res(); await plan.subscribeToPlan({ body: { planId: ID2 }, user: { id: ID } }, r, e => { throw e });
  ok(r.code === 409, 'free plan cannot be claimed twice');

  // 2b: verify-payment
  const sig = (o, p) => crypto.createHmac('sha256', 'rzsecret').update(o + '|' + p).digest('hex');
  SoftwarePlan.findById = async () => ({ _id: ID2, name: 'Pro', price: 999 });
  rz.fetchRazorpayOrder = async () => ({ amount: 100, notes: { planId: 'cheap', userId: ID } });
  r = res(); await plan.verifyPayment({ body: { razorpay_order_id: 'o1', razorpay_payment_id: 'p1', razorpay_signature: sig('o1', 'p1'), planId: ID2 }, user: { id: ID } }, r, e => { throw e });
  ok(r.code === 400, 'cheap order used for expensive plan refused');
  rz.fetchRazorpayOrder = async () => ({ amount: 99900, notes: { planId: ID2, userId: ID2 } });
  r = res(); await plan.verifyPayment({ body: { razorpay_order_id: 'o1', razorpay_payment_id: 'p1', razorpay_signature: sig('o1', 'p1'), planId: ID2 }, user: { id: ID } }, r, e => { throw e });
  ok(r.code === 400, "someone else's order refused");
  rz.fetchRazorpayOrder = async () => ({ amount: 99900, notes: { planId: ID2, userId: ID } });
  SoftwareSale.exists = async () => true;
  r = res(); await plan.verifyPayment({ body: { razorpay_order_id: 'o1', razorpay_payment_id: 'p1', razorpay_signature: sig('o1', 'p1'), planId: ID2 }, user: { id: ID } }, r, e => { throw e });
  ok(r.code === 409, 'replayed payment refused');
  r = res(); await plan.verifyPayment({ body: { razorpay_order_id: 'o1', razorpay_payment_id: 'p1', razorpay_signature: 'bad', planId: ID2 }, user: { id: ID } }, r, e => { throw e });
  ok(r.code === 400, 'bad signature refused');

  // 5: finance
  // balance recalculation is covered by the step 3 suite against a real database
  const pb = require(B + 'utils/partyBalance'); let incs = [];
  Party.findOne = (f) => { incs.push(f); return { select: async () => null } };
  Party.exists = async (f) => f.owner === ID;
  Transaction.create = async d => d;
  r = res(); await fin.addTransaction({ body: { type: 'income', amount: 'abc' }, user: { id: ID } }, r, e => { throw e });
  ok(r.code === 400, 'non-numeric amount refused');
  r = res(); await fin.addTransaction({ body: { type: 'income', amount: 100, party: ID2 }, user: { id: 'other' } }, r, e => { throw e });
  ok(r.code === 404 && incs.length === 0, "other user's party balance untouched");
  r = res(); await fin.addTransaction({ body: { type: 'expense', amount: 50, party: ID2, owner: ID2, notes: 'diesel' }, user: { id: ID } }, r, e => { throw e });
  ok(r.code === 200 && r.body.transaction.owner === ID && r.body.transaction.description === 'diesel' && incs.length === 1, 'own party entry saved, owner forced, notes kept');
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
