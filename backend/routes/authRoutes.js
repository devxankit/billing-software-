const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { issueOtp, verifyOtp } = require("../utils/otpStore");

const router = express.Router();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    const err = new Error(`Missing env: ${name}`);
    err.statusCode = 500;
    throw err;
  }
  return v;
}

router.post("/send-otp", async (req, res, next) => {
  try {
    const phone = String(req.body?.phone || "").replace(/\D/g, "");
    if (phone.length !== 10) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    const { otp, ttlSeconds } = issueOtp(phone);

    // TODO: integrate real SMS provider using SMSINDIAHUB_API_KEY/SENDER_ID
    // For now we always return success.
    // (Do not expose OTP via API response.)
    return res.json({ success: true, message: "OTP sent", ttlSeconds });
  } catch (e) {
    return next(e);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const phone = String(req.body?.phone || "").replace(/\D/g, "");
    const otp = String(req.body?.otp || "").replace(/\D/g, "");
    if (phone.length !== 10) {
      return res.status(400).json({ success: false, code: "INVALID_PHONE", message: "Invalid phone number" });
    }
    if (otp.length !== 6) {
      return res.status(400).json({ success: false, code: "INVALID_OTP_FORMAT", message: "Please enter a valid 6-digit OTP" });
    }

    const verification = verifyOtp(phone, otp);
    if (!verification.valid) {
      const isExpired = verification.reason === "EXPIRED" || verification.reason === "NOT_FOUND" || verification.reason === "MAX_ATTEMPTS";
      return res.status(400).json({
        success: false,
        code: isExpired ? "OTP_EXPIRED" : "OTP_INVALID",
        reason: verification.reason,
        message: verification.message || (isExpired ? "OTP has expired. Please request a new OTP." : "Invalid OTP. Please enter the correct code."),
        attemptsLeft: verification.attemptsLeft
      });
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { $setOnInsert: { phone } },
      { new: true, upsert: true }
    ).lean();

    const isNewUser = !user.role;

    const secret = requireEnv("JWT_SECRET");
    const accessExpiry = process.env.JWT_ACCESS_EXPIRY || "24h";

    const accessToken = jwt.sign(
      { sub: String(user._id), phone: user.phone, role: user.role || null },
      secret,
      { expiresIn: accessExpiry }
    );

    return res.json({
      success: true,
      isNewUser,
      accessToken,
      user: {
        id: String(user._id),
        phone: user.phone,
        name: user.name || null,
        role: user.role || null,
        businessName: user.businessName || null,
      },
    });
  } catch (e) {
    return next(e);
  }
});

router.post("/set-role", async (req, res, next) => {
  try {
    const phone = String(req.body?.phone || "").replace(/\D/g, "");
    const role = String(req.body?.role || "").toLowerCase();
    if (phone.length !== 10) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }
    if (!["admin", "transport", "garage"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { $set: { role } },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      success: true,
      user: {
        id: String(user._id),
        phone: user.phone,
        name: user.name || null,
        role: user.role || null,
        businessName: user.businessName || null,
      },
    });
  } catch (e) {
    return next(e);
  }
});

router.post("/update-profile", async (req, res, next) => {
  try {
    const phone = String(req.body?.phone || "").replace(/\D/g, "");
    if (phone.length !== 10) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    const allowed = [
      "name",
      "businessName",
      "setupComplete",
      "email",
      "address",
      "city",
      "pincode",
      "panNo",
      "gstin",
      "aadharNo",
      "bankDetails",
      "signatureUrl",
      "logoUrl",
    ];
    const updates = {};
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) updates[k] = req.body[k];
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      success: true,
      user: {
        id: String(user._id),
        phone: user.phone,
        name: user.name || null,
        role: user.role || null,
        businessName: user.businessName || null,
      },
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

