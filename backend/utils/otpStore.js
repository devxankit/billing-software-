const crypto = require("crypto");

const OTP_TTL_SECONDS = 5 * 60; // 5 minutes validity
const MAX_ATTEMPTS = 5;

// In-memory OTP store: good for dev/single instance.
// For production, replace with Redis or DB table.
const store = new Map(); // phone -> { otp, expiresAtMs, attempts }

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
}

function generateOtp(phone) {
  if (isTestPhone(phone)) return process.env.OTP_TEST_CODE;
  return crypto.randomInt(100000, 1000000).toString();
}

function issueOtp(phone) {
  cleanupExpired();
  const otp = generateOtp(phone);
  store.set(phone, { otp, expiresAtMs: Date.now() + OTP_TTL_SECONDS * 1000, attempts: 0 });
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
