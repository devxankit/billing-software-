const mongoose = require("mongoose");
const { stripProtected } = require("../utils/sanitizeBody");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const Party = require("../models/Party");
const TransportBill = require("../models/TransportBill");
const notificationService = require("../services/notification.service");

// Set by the server only (billing links and generated IDs)
const TRIP_SERVER_FIELDS = ["billed", "billId", "tripId"];

async function sendTripNotification(trip, action) {
  try {
    const party = await Party.findById(trip.party);
    if (!party) return;

    let title = "";
    let body = "";

    if (action === "created") {
      title = "New Trip Scheduled";
      body = `A new trip from ${trip.from || "origin"} to ${trip.to || "destination"} has been scheduled.`;
    } else if (action === "updated") {
      title = "Trip Updated";
      body = `Trip details from ${trip.from || "origin"} to ${trip.to || "destination"} have been updated.`;
    }

    if (title && body) {
      await notificationService.sendToUser(party, {
        title,
        body,
        data: {
          type: "trip",
          tripId: trip._id.toString(),
        },
      });
    }

    // ALSO notify the owner (User)
    const User = require("../../models/User");

    const owner = await User.findById(trip.owner);
    if (owner && action === "created") {
      await notificationService.sendToUser(owner, {
        title: "Trip Created",
        body: `New trip from ${trip.from || "origin"} to ${trip.to || "destination"} has been added.`,
        data: { type: "trip", tripId: trip._id.toString() }
      });
    }
  } catch (err) {
    console.warn("[sendTripNotification] Failed:", err.message);
  }
}

async function getTransportStats(req, res, next) {
  try {
    const ownerId = req.user.id;
    const ownerObjId = new mongoose.Types.ObjectId(ownerId);

    const [totalVehicles, activeTripsCount, revenueData] = await Promise.all([
      Vehicle.countDocuments({ owner: ownerId }),
      Trip.countDocuments({ owner: ownerId, billed: false }),
      TransportBill.aggregate([
        { $match: { owner: ownerObjId, status: { $ne: 'draft' } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$grandTotal" },
            paid: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "paid"] },
                  { $ifNull: ["$paidAmount", "$grandTotal"] },
                  { $ifNull: ["$paidAmount", 0] }
                ]
              }
            },
          }
        }
      ])
    ]);

    const rev = revenueData[0] || { total: 0, paid: 0 };

    return res.json({
      success: true,
      stats: {
        totalVehicles,
        activeTrips: activeTripsCount,
        pendingRevenue: Math.max(0, rev.total - rev.paid),
        totalRevenue: rev.total
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Failed to load stats" });
  }
}

async function listVehicles(req, res, next) {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const vehicles = await Vehicle.aggregate([
      { $match: { owner: ownerId } },
      {
        $lookup: {
          from: "trips",
          localField: "_id",
          foreignField: "vehicle",
          as: "trips"
        }
      },
      {
        $project: {
          vehicleNumber: 1,
          vehicleType: 1,
          model: 1,
          ownerName: 1,
          owner: 1,
          createdAt: 1,
          tripCount: { $size: "$trips" }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    return res.json({ success: true, vehicles });
  } catch (e) {
    console.error("List Vehicles Error:", e);
    return res.status(500).json({ success: false, message: "Failed to load vehicles" });
  }
}

async function createVehicle(req, res, next) {
  try {
    const { vehicleNumber } = req.body;
    if (!vehicleNumber) return res.status(400).json({ success: false, message: "Vehicle Number is required" });

    const cleanNumber = vehicleNumber.toString().toUpperCase().trim();
    const existing = await Vehicle.findOne({ vehicleNumber: cleanNumber });
    if (existing) return res.status(400).json({ success: false, message: "This vehicle is already registered" });


    const vehicle = await Vehicle.create({ ...stripProtected(req.body), vehicleNumber: cleanNumber, owner: req.user.id });
    return res.json({ success: true, vehicle });
  } catch (e) {
    console.error("Vehicle Creation Error:", e);
    const msg = e.name === 'ValidationError' ? "Invalid vehicle data" : "Failed to add vehicle";
    return res.status(400).json({ success: false, message: e.message || msg });
  }
}

async function updateVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: stripProtected(req.body) },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });
    return res.json({ success: true, vehicle });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Update failed" });
  }
}

async function getVehicleDetail(req, res, next) {
  try {
    const ownerId = req.user.id;
    const vehicleId = req.params.id;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId }).lean();
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const trips = await Trip.find({ vehicle: vehicleId, owner: ownerId })
      .populate("party", "name phone")
      .sort({ startDate: -1 })
      .lean();

    return res.json({ 
      success: true, 
      vehicle: {
        ...vehicle,
        trips,
        tripCount: trips.length
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Failed to load vehicle details" });
  }
}

async function listTrips(req, res, next) {
  try {
    const { billed } = req.query;
    const query = { owner: req.user.id };
    
    if (billed === "false") {
      query.billed = false;
    } else if (billed === "true") {
      query.billed = true;
    }

    const trips = await Trip.find(query)
      .populate("vehicle", "vehicleNumber vehicleType")
      .populate("party", "name phone")
      .sort({ startDate: -1 })
      .lean();
    return res.json({ success: true, trips });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Failed to load trips" });
  }
}

async function createTrip(req, res, next) {
  try {
    // Billing state is set only by the bill endpoints
    const tripData = { 
      ...stripProtected(req.body, TRIP_SERVER_FIELDS), 
      owner: req.user.id,
      vehicle: req.body.vehicleId || req.body.vehicle,
      party: req.body.partyId || req.body.party
    };
    
    const trip = await Trip.create(tripData);
    
    // Populate for immediate UI update
    const populated = await Trip.findById(trip._id)
      .populate("vehicle", "vehicleNumber vehicleType")
      .populate("party", "name phone")
      .lean();
      
    await sendTripNotification(trip, "created");
      
    return res.json({ success: true, trip: populated });
  } catch (e) {
    return res.status(400).json({ success: false, message: `Database Save Error: ${e.message || "Unknown error"}` });
  }
}

async function updateTrip(req, res, next) {
  try {
    const existing = await Trip.findOne({ _id: req.params.id, owner: req.user.id }).select("billId billed");
    if (!existing) return res.status(404).json({ success: false, message: "Trip not found" });
    // A trip on a bill/draft would drift out of sync with that bill if edited here
    if (existing.billed || existing.billId) {
      return res.status(400).json({ success: false, message: "This trip is on a bill. Remove it from the bill before editing." });
    }
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: stripProtected(req.body, TRIP_SERVER_FIELDS) },
      { returnDocument: "after", runValidators: true }
    );
    if (trip) {
      await sendTripNotification(trip, "updated");
    }
    return res.json({ success: true, trip });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Update failed" });
  }
}

async function deleteTrip(req, res, next) {
  try {
    const existing = await Trip.findOne({ _id: req.params.id, owner: req.user.id }).select("billId billed");
    if (!existing) return res.status(404).json({ success: false, message: "Trip not found" });
    if (existing.billed || existing.billId) {
      return res.status(400).json({ success: false, message: "This trip is on a bill. Remove it from the bill before deleting." });
    }
    await Trip.deleteOne({ _id: existing._id });
    return res.json({ success: true, message: "Trip deleted" });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Delete failed" });
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });
    return res.json({ success: true, message: "Vehicle deleted successfully" });
  } catch (e) {
    console.error("Delete Vehicle Error:", e);
    return res.status(500).json({ success: false, message: e.message || "Failed to delete vehicle" });
  }
}

module.exports = {
  getTransportStats,
  listVehicles,
  createVehicle,
  updateVehicle,
  listTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  getVehicleDetail,
  deleteVehicle
};
