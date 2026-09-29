const express = require("express");
const router = express.Router();
const translationController = require("../controllers/translationController");
const { rateLimit } = require("../middleware/rateLimit.middleware");

// Public (used on logged-out screens), so cap usage of the paid translation API per client
router.use(rateLimit({ windowSeconds: 15 * 60, max: 600, message: "Too many translation requests. Please try again shortly." }));

router.post("/", translationController.translateSingle);
router.post("/batch", translationController.translateBatch);
router.post("/object", translationController.translateObject);

module.exports = router;
