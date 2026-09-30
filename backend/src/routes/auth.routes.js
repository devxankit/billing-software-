const express = require("express");
const authController = require("../controllers/auth.controller");
const { authRequired, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authRequired, authController.me);

router.post("/set-role", authRequired, authController.setRole);
router.post("/register-transport", authRequired, authController.registerTransport);
router.post("/register-garage", authRequired, authController.registerGarage);
router.post("/update-profile", authRequired, authController.updateProfile);

router.post("/delete-account", authRequired, authController.deleteAccount);
router.post("/login", authController.login);
router.post("/set-password", authRequired, authController.setPassword);

module.exports = router;
