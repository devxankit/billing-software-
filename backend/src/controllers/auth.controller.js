const User = require("../models/User");
const { isTestPhone } = require("../../utils/otpStore");
const otpService = require("../services/otp.service");
const tokenService = require("../services/token.service");
const smsService = require("../services/sms.service");
const { hashPassword, verifyPassword } = require("../utils/password");
const notificationService = require("../services/notification.service");



function sanitizePhone(v) {
  return String(v || "").replace(/\D/g, "");
}

function sanitizeOtp(v) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function userDto(user) {
  return {
    id: String(user._id),
    phone: user.phone,
    alternatePhone: user.alternatePhone || null,
    name: user.name || null,
    role: user.role || null,
    email: user.email || null,
    businessName: user.businessName || null,
    slogan: user.slogan || null,
    wishingName: user.wishingName || null,
    address: user.address || null,
    city: user.city || null,
    state: user.state || null,
    pincode: user.pincode || null,
    gstin: user.gstin || null,
    panNo: user.panNo || null,
    aadharNo: user.aadharNo || null,
    logoUrl: user.logoUrl || null,
    signatureUrl: user.signatureUrl || null,
    documents: user.documents || null,
    bankDetails: user.bankDetails || null,
    brandColor: user.brandColor || '#000000',
    wishingColor: user.wishingColor || '#444444',
    repairDetailsLabel: user.repairDetailsLabel || null,
    setupComplete: !!user.setupComplete,
    subscriptionActive: !!user.subscriptionActive,
    subscriptionExpiry: user.subscriptionExpiry || null,
    allowedVehicles: user.allowedVehicles || 0,
    planName: user.planId?.name || null,
    planId: user.planId?._id ? String(user.planId._id) : (user.planId ? String(user.planId) : null),
  };
}

async function sendOtp(req, res, next) {
  try {
    const phone = sanitizePhone(req.body?.phone);
    if (phone.length !== 10) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

      const { otp, ttlSeconds } = otpService.issue(phone);

      let smsResult = null;
      if (!isTestPhone(phone)) {
        if (process.env.NODE_ENV !== 'production') {
          // In dev, wait for the result to surface SMS errors
          smsResult = await smsService.sendOtpSms(phone, otp);
        } else {
          smsService.sendOtpSms(phone, otp)
            .catch(e => console.error(`[AUTH] Async SMS failed:`, e.message));
        }
      }

    const user = await User.findOne({ phone });
    const isNewUser = !user || !user.role;

    return res.json({ 
      success: true, 
      message: "OTP sent", 
      ttlSeconds,
      isNewUser,
      // Never echo the OTP unless explicitly enabled for local testing — whatever NODE_ENV says
      ...(process.env.OTP_DEBUG_ECHO === 'true' ? { otp, smsResult } : {})
    });
  } catch (e) {
    return next(e);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const phone = sanitizePhone(req.body?.phone);
    const otp = sanitizeOtp(req.body?.otp);
    if (phone.length !== 10) {
      return res.status(400).json({ success: false, code: "INVALID_PHONE", message: "Invalid phone number" });
    }
    if (otp.length !== 6) {
      return res.status(400).json({ success: false, code: "INVALID_OTP_FORMAT", message: "Please enter a valid 6-digit OTP" });
    }

    const verification = otpService.verify(phone, otp);

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
      {
        $setOnInsert: { phone },
      },
      { new: true, upsert: true }
    ).populate('planId');

    const referralCode = req.body?.referralCode;
    const isNewUser = !user.role; // these default accounts are treated as existing/complete


    if (isNewUser && referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      
      if (!referrer) {
        return res.status(400).json({ success: false, message: "Invalid referral code" });
      }

      if (String(referrer._id) !== String(user._id)) {
        user.referredBy = referrer._id;
        await user.save();
        
        const Referral = require("../models/Referral");
        await Referral.create({
          referrer: referrer._id,
          referee: user._id,
          status: "signed_up",
        });
      }
    }
    const accessToken = tokenService.signAccessToken(user);

    const { token: refreshToken } = await tokenService.issueRefreshToken({
      userId: user._id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.cookie("refresh_token", refreshToken, tokenService.refreshCookieOptions());

    return res.json({
      success: true,
      isNewUser,
      accessToken,
      refreshToken,
      user: userDto(user),
    });
  } catch (e) {
    return next(e);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.body?.refreshToken || req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const rotated = await tokenService.rotateRefreshToken(token, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    let user = await User.findById(rotated.userId).populate('planId');
    if (!user) {
      const Admin = require("../models/Admin");
      user = await Admin.findById(rotated.userId);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const accessToken = tokenService.signAccessToken(user);

    res.cookie("refresh_token", rotated.refreshToken, tokenService.refreshCookieOptions());

    return res.json({ success: true, accessToken, refreshToken: rotated.refreshToken, user: userDto(user) });
  } catch (e) {
    return next(e);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.body?.refreshToken || req.cookies?.refresh_token;
    if (token) {
      await tokenService.revokeRefreshToken(token);
    }
    res.clearCookie("refresh_token", tokenService.refreshCookieOptions());
    return res.json({ success: true });
  } catch (e) {
    return next(e);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.user?.id;
    let user = await User.findById(userId).populate('planId');
    if (!user) {
       const Admin = require("../models/Admin");
       user = await Admin.findById(userId);
    }

    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
    return res.json({ success: true, user: userDto(user) });
  } catch (e) {
    return next(e);
  }
}

async function setRole(req, res, next) {
  try {
    const role = String(req.body?.role || "").toLowerCase();
    // Admin accounts are created by the admin panel only — never self-assigned
    if (!["transport", "garage"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const existing = await User.findOne({ phone: req.user.phone }).select("role");
    if (!existing) return res.status(404).json({ success: false, message: "User not found" });
    // Role is chosen once during signup; switching later would mix transport and garage data
    if (existing.role && existing.role !== role) {
      return res.status(403).json({ success: false, message: "Account role is already set and cannot be changed" });
    }

    const user = await User.findOneAndUpdate(
      { _id: existing._id },
      { $set: { role } },
      { new: true, upsert: false }
    ).populate('planId');

    const accessToken = tokenService.signAccessToken(user);
    return res.json({ success: true, user: userDto(user), accessToken });
  } catch (e) {
    return next(e);
  }
}

async function registerTransport(req, res, next) {
  try {
    const { 
      name, businessName, address, email, 
      aadharNo, panNo, bankDetails, 
      signatureUrl, logoUrl, documents 
    } = req.body;

    if (!name || !businessName) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const user = await User.findOneAndUpdate(
      { phone: req.user.phone },
      { 
        $set: { 
          name, businessName, address, email,
          aadharNo, panNo, bankDetails,
          signatureUrl, logoUrl, documents,
          role: "transport",
          setupComplete: true 
        } 
      },
      { new: true, upsert: false }
    ).populate('planId');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const accessToken = tokenService.signAccessToken(user);

    // Notify Admins
    notificationService.notifyAdmins({
      title: "New Transport User",
      body: `${user.name} has registered ${user.businessName}.`,
      icon: user.logoUrl || undefined,
      data: { type: "new_user", userId: user._id.toString() }
    });

    return res.json({ success: true, user: userDto(user), accessToken });
  } catch (e) {
    return next(e);
  }
}

async function registerGarage(req, res, next) {
  try {
    const { 
      name, businessName, address, email, 
      aadharNo, panNo, bankDetails, 
      logoUrl, documents 
    } = req.body;

    if (!name || !businessName) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const user = await User.findOneAndUpdate(
      { phone: req.user.phone },
      { 
        $set: { 
          name, businessName, address, email,
          aadharNo, panNo, bankDetails,
          logoUrl, documents,
          role: "garage",
          setupComplete: true 
        } 
      },
      { new: true, upsert: false }
    ).populate('planId');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const accessToken = tokenService.signAccessToken(user);

    // Notify Admins
    notificationService.notifyAdmins({
      title: "New Garage User",
      body: `${user.name} has registered ${user.businessName}.`,
      icon: user.logoUrl || undefined,
      data: { type: "new_user", userId: user._id.toString() }
    });

    return res.json({ success: true, user: userDto(user), accessToken });
  } catch (e) {
    return next(e);
  }
}

async function updateProfile(req, res, next) {
  try {
    const allowed = [
      "name",
      "businessName",
      "slogan",
      "wishingName",
      "repairDetailsLabel",
      "setupComplete",
      "email",
      "address",
      "city",
      "state",
      "pincode",
      "panNo",
      "gstin",
      "aadharNo",
      "bankDetails",
      "signatureUrl",
      "logoUrl",
      "documents",
      "alternatePhone",
      "brandColor",
      "wishingColor",
    ];
    
    const updates = {};
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) {
        updates[k] = req.body[k];
      }
    }

    // Ensure we don't accidentally wipe out the role if not provided
    const user = await User.findOneAndUpdate(
      { phone: req.user.phone },
      { $set: updates },
      { new: true, upsert: false }
    ).populate('planId');
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user: userDto(user) });
  } catch (e) {
    return next(e);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email }).populate('planId');
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: "Invalid credentials or password not set" });
    }

    const ok = verifyPassword(password, {
      salt: user.passwordSalt,
      hash: user.passwordHash,
      iterations: user.passwordIterations,
    });

    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const accessToken = tokenService.signAccessToken(user);
    const { token: refreshToken } = await tokenService.issueRefreshToken({
      userId: user._id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.cookie("refresh_token", refreshToken, tokenService.refreshCookieOptions());

    return res.json({ success: true, user: userDto(user), accessToken, refreshToken });
  } catch (e) {
    next(e);
  }
}

async function setPassword(req, res, next) {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const h = hashPassword(password);
    user.passwordSalt = h.salt;
    user.passwordHash = h.hash;
    user.passwordIterations = h.iterations;
    await user.save();

    return res.json({ success: true, message: "Password set successfully" });
  } catch (e) {
    next(e);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const timestamp = Date.now();
    const phoneDeleted = `${user.phone}_deleted_${timestamp}`;
    const emailDeleted = user.email ? `${user.email}_deleted_${timestamp}` : null;

    await User.findByIdAndUpdate(userId, {
      $set: {
        phone: phoneDeleted,
        email: emailDeleted,
        isDeleted: true,
        setupComplete: false,
        subscriptionActive: false,
        subscriptionExpiry: null,
        allowedVehicles: 0,
        planId: null,
        role: null,
        name: "Deleted User",
        businessName: "Closed Business",
        alternatePhone: null,
        address: null,
        city: null,
        state: null,
        pincode: null,
        panNo: null,
        gstin: null,
        aadharNo: null,
        signatureUrl: null,
        logoUrl: null,
        slogan: null,
        wishingName: null,
        isGstApplicable: false,
        walletBalance: 0,
        referredBy: null,
        passwordHash: null,
        passwordSalt: null,
        passwordIterations: null,
        fcmTokens: [],
        bankDetails: {
          accountName: null,
          accountNumber: null,
          ifsc: null,
          bankName: null,
          upiId: null,
          qrUrl: null,
        },
        documents: {
          aadharUrl: null,
          panUrl: null,
          photoUrl: null,
          rcUrl: null,
          insuranceUrl: null,
          addressProofUrl: null,
          gstCertificateUrl: null,
        }
      },
      $unset: {
        referralCode: 1
      }
    });

    // Revoke all tokens
    await tokenService.revokeAllUserTokens(userId);

    return res.json({ success: true, message: "Account deleted successfully" });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  refresh,
  logout,
  me,
  setRole,
  updateProfile,
  registerTransport,
  registerGarage,
  login,
  setPassword,
  deleteAccount,
  userDto,
};

