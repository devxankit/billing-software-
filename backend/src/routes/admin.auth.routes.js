const express = require("express");
const adminAuthController = require("../controllers/admin.auth.controller");
const { authRequired, requireRole } = require("../middleware/auth.middleware");
const { rateLimit } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/login", rateLimit({ windowSeconds: 15 * 60, max: 10, message: "Too many login attempts. Please try again in a few minutes." }), adminAuthController.login);

router.post("/refresh", adminAuthController.refresh);
router.post("/logout", adminAuthController.logout);
router.get("/me", authRequired, requireRole("admin"), adminAuthController.me);
router.post("/change-password", authRequired, requireRole("admin"), adminAuthController.changePassword);

module.exports = router;

