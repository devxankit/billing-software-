const Razorpay = require('razorpay');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay Order
 * @param {number} amount - Amount in INR (not paise)
 * @param {string} receipt - Unique receipt ID
 * @param {object} notes - Stored on the order (e.g. planId/userId) so verification can check them
 */
async function createRazorpayOrder(amount, receipt, notes = {}) {
  const options = {
    amount: Math.round(amount * 100), // convert to paise
    currency: "INR",
    receipt: receipt,
    notes,
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    throw error;
  }
}

/**
 * Verify Razorpay Signature
 */
function verifyRazorpaySignature(orderId, paymentId, signature) {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  const expected = Buffer.from(expectedSignature);
  const given = Buffer.from(String(signature || ""));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/**
 * Fetch an order from Razorpay (source of truth for amount + notes)
 */
async function fetchRazorpayOrder(orderId) {
  return razorpay.orders.fetch(orderId);
}

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchRazorpayOrder,
};
