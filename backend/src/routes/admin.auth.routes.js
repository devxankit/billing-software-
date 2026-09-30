const express = require("express");
const adminAuthController = require("../controllers/admin.auth.controller");
const { authRequired, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/login", adminAuthController.login);

router.post("/refresh", adminAuthController.refresh);
router.post("/logout", adminAuthController.logout);
router.get("/me", authRequired, requireRole("admin"), adminAuthController.me);
router.post("/change-password", authRequired, requireRole("admin"), adminAuthController.changePassword);

module.exports = router;

