const express = require("express");
const router = express.Router();
const garageVehicleController = require("../controllers/garageVehicle.controller");
const { authRequired, requireRole } = require("../middleware/auth.middleware");

router.use(authRequired);
router.use(requireRole("garage"));

router.get("/", garageVehicleController.listVehicles);
router.post("/", garageVehicleController.createVehicle);
router.patch("/:id", garageVehicleController.updateVehicle);
router.delete("/:id", garageVehicleController.deleteVehicle);

module.exports = router;
