const GarageBill = require("../models/GarageBill");
const { stripProtected } = require("../utils/sanitizeBody");
const GarageVehicle = require("../models/GarageVehicle");
const dayjs = require("dayjs");

async function getStats(req, res, next) {
  try {
    const ownerId = req.user.id;
    const bills = await GarageBill.find({ owner: ownerId });

    const totalSales = bills
      .filter((b) => b.status !== "draft")
      .reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const receivables = bills
      .filter((b) => b.status !== "paid" && b.status !== "draft")
      .reduce((sum, b) => sum + Math.max(0, (b.grandTotal || 0) - (b.paidAmount || 0)), 0);
    const servicesDone = bills.filter((b) => b.status !== "draft").length;

    // Reminders - vehicles due for service
    const today = dayjs().startOf("day");
    const vehicles = await GarageVehicle.find({ owner: ownerId });
    const criticalReminders = vehicles.filter((v) => {
      if (!v.nextServiceDate) return false;
      const dueDate = dayjs(v.nextServiceDate);
      return dueDate.diff(today, "day") <= 7; // Due in 7 days or overdue
    }).length;

    return res.json({
      success: true,
      stats: {
        totalSales,
        receivables,
        servicesDone,
        criticalReminders,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function listVehicles(req, res, next) {
  try {
    const vehicles = await GarageVehicle.find({ owner: req.user.id }).sort({ createdAt: -1 });
    return res.json({ success: true, vehicles });
  } catch (e) {
    next(e);
  }
}

async function addVehicle(req, res, next) {
  try {
    const data = { ...stripProtected(req.body), owner: req.user.id };
    const vehicle = await GarageVehicle.create(data);
    return res.json({ success: true, vehicle });
  } catch (e) {
    next(e);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const { id } = req.params;
    await GarageVehicle.findOneAndDelete({ _id: id, owner: req.user.id });
    return res.json({ success: true, message: "Vehicle removed" });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getStats,
  listVehicles,
  addVehicle,
  deleteVehicle,
};
