const GarageVehicle = require("../models/GarageVehicle");
const { stripProtected } = require("../utils/sanitizeBody");

async function listVehicles(req, res, next) {
  try {
    const vehicles = await GarageVehicle.find({ owner: req.user.id })
      .populate("partyId", "name phone")
      .sort({ vehicleNumber: 1 });
    return res.json({ success: true, vehicles });
  } catch (e) {
    next(e);
  }
}

async function createVehicle(req, res, next) {
  try {
    const data = { ...stripProtected(req.body), owner: req.user.id };
    const vehicle = await GarageVehicle.create(data);
    return res.json({ success: true, vehicle });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: "Vehicle number already exists for this garage" });
    }
    next(e);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const vehicle = await GarageVehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: stripProtected(req.body) },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });
    return res.json({ success: true, vehicle });
  } catch (e) {
    next(e);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const vehicle = await GarageVehicle.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });
    return res.json({ success: true, message: "Vehicle deleted" });
  } catch (e) {
    next(e);
  }
}

module.exports = { listVehicles, createVehicle, updateVehicle, deleteVehicle };
