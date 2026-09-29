const crypto = require("crypto");

const OTP_TTL_SECONDS = 5 * 60; // 5 minutes validity
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;   // minimum gap between two OTPs for one number
const SEND_WINDOW_SECONDS = 15 * 60;  // rolling window for the send limit
const MAX_SENDS_PER_WINDOW = 5;       // stops SMS spam and unlimited guessing via resends

// In-memory OTP store: good for dev/single instance.
// For production, replace with Redis or DB table.
const store = new Map(); // phone -> { otp, expiresAtMs, attempts }
const sendLog = new Map(); // phone -> [sentAtMs, ...] within the window

// Demo/review accounts that log in with a fixed code instead of an SMS.
// Off unless configured, e.g. OTP_TEST_PHONES=7458947838,6260491554 and OTP_TEST_CODE=123456
function testPhones() {
  return String(process.env.OTP_TEST_PHONES || "").split(",").map(p => p.trim()).filter(Boolean);
}
function isTestPhone(phone) {
  return !!process.env.OTP_TEST_CODE && testPhones().includes(phone);
}

function cleanupExpired() {
  const now = Date.now();
  for (const [phone, rec] of store.entries()) {
    if (now > rec.expiresAtMs) {
      store.delete(phone);
    }
  }
  for (const [phone, times] of sendLog.entries()) {
    const recent = times.filter(t => now - t < SEND_WINDOW_SECONDS * 1000);
    if (recent.length) sendLog.set(phone, recent);
    else sendLog.delete(phone);
  }
}

function generateOtp(phone) {
  if (isTestPhone(phone)) return process.env.OTP_TEST_CODE;
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Issue a new OTP, or refuse with { error: "RATE_LIMITED", retryAfterSeconds } when
 * the number asked too recently or too often.
 */
function issueOtp(phone) {
  cleanupExpired();
  const now = Date.now();
  const sends = sendLog.get(phone) || [];

  const last = sends[sends.length - 1];
  if (last && now - last < RESEND_COOLDOWN_SECONDS * 1000) {
    return { error: "RATE_LIMITED", retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (now - last)) / 1000) };
  }
  if (sends.length >= MAX_SENDS_PER_WINDOW) {
    return { error: "RATE_LIMITED", retryAfterSeconds: Math.ceil((SEND_WINDOW_SECONDS * 1000 - (now - sends[0])) / 1000) };
  }

  const otp = generateOtp(phone);
  store.set(phone, { otp, expiresAtMs: now + OTP_TTL_SECONDS * 1000, attempts: 0 });
  sendLog.set(phone, [...sends, now]);
  return { otp, ttlSeconds: OTP_TTL_SECONDS };
}

function verifyOtp(phone, otp) {
  const rec = store.get(phone);

  if (!rec) {
    return {
      valid: false,
      reason: "NOT_FOUND",
      message: "OTP has expired or was not requested. Please request a new OTP.",
    };
  }

  if (Date.now() > rec.expiresAtMs) {
    store.delete(phone);
    return {
      valid: false,
      reason: "EXPIRED",
      message: "OTP has expired. Please request a new OTP.",
    };
  }

  const expected = Buffer.from(String(rec.otp));
  const given = Buffer.from(String(otp || ""));
  const matches = expected.length === given.length && crypto.timingSafeEqual(expected, given);

  if (!matches) {
    rec.attempts = (rec.attempts || 0) + 1;
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - rec.attempts);
    if (rec.attempts >= MAX_ATTEMPTS) {
      store.delete(phone);
      return {
        valid: false,
        reason: "MAX_ATTEMPTS",
        message: "Too many incorrect attempts. This OTP has been invalidated. Please request a new OTP.",
        attemptsLeft: 0,
      };
    }
    return {
      valid: false,
      reason: "INVALID",
      message: "Invalid OTP. Please enter the correct 6-digit code.",
      attemptsLeft,
    };
  }

  store.delete(phone);
  return { valid: true };
}

module.exports = { issueOtp, verifyOtp, isTestPhone, OTP_TTL_SECONDS, store };
