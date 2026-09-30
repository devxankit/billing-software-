const express = require("express");
const router = express.Router();
const translationController = require("../controllers/translationController");

router.post("/", translationController.translateSingle);
router.post("/batch", translationController.translateBatch);
router.post("/object", translationController.translateObject);

module.exports = router;
