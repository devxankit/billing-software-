const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const { requireEnv } = require("../config/env");

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const secret = requireEnv("JWT_SECRET");
    const payload = jwt.verify(token, secret);

    req.user = {
      id: payload.sub,
      phone: payload.phone || null,
      role: payload.role || null,
    };

    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

// A token only counts as admin if it belongs to an active account in the Admin
// collection — a user record whose role says "admin" is not enough.
async function isRealAdmin(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return false;
  const admin = await Admin.findById(userId).select("disabled").lean();
  return !!admin && !admin.disabled;
}

function requireRole(role) {
  return async function roleMiddleware(req, res, next) {
    try {
      const r = req.user?.role;
      if (r === "admin") {
        if (await isRealAdmin(req.user.id)) return next();
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      if (r === role) return next();
      return res.status(403).json({ success: false, message: "Forbidden: Role mismatch" });
    } catch (e) {
      return next(e);
    }
  };
}

function adminRequired(req, res, next) {
  return requireRole("admin")(req, res, next);
}

module.exports = { authRequired, requireRole, adminRequired, isRealAdmin };

