const express = require("express");
const authController = require("../controllers/auth.controller");
const { authRequired, requireRole } = require("../middleware/auth.middleware");
const { rateLimit } = require("../middleware/rateLimit.middleware");

const TRY_LATER = "Too many attempts. Please try again in a few minutes.";
const sendOtpLimit = rateLimit({ windowSeconds: 15 * 60, max: 20, message: TRY_LATER });
const verifyLimit = rateLimit({ windowSeconds: 15 * 60, max: 40, message: TRY_LATER });
const loginLimit = rateLimit({ windowSeconds: 15 * 60, max: 10, message: TRY_LATER });

const router = express.Router();

router.post("/send-otp", sendOtpLimit, authController.sendOtp);
router.post("/verify-otp", verifyLimit, authController.verifyOtp);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authRequired, authController.me);

router.post("/set-role", authRequired, authController.setRole);
router.post("/register-transport", authRequired, authController.registerTransport);
router.post("/register-garage", authRequired, authController.registerGarage);
router.post("/update-profile", authRequired, authController.updateProfile);

router.post("/delete-account", authRequired, authController.deleteAccount);
router.post("/login", loginLimit, authController.login);
router.post("/set-password", authRequired, authController.setPassword);

module.exports = router;
