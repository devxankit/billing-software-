const mongoose = require("mongoose");
const TransportBill = require("../models/TransportBill");
const GarageBill = require("../models/GarageBill");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { recalcPartyBalance } = require("../utils/partyBalance");

/**
 * GET /api/admin/transport/bills
 * Fetch all platform-wide bills with owner & party populated
 */
async function getAllBills(req, res, next) {
  try {
    const { mode, page = 1, limit = 100 } = req.query;
    const pPage = parseInt(page);
    const pLimit = parseInt(limit);
    const skip = (pPage - 1) * pLimit;
    
    let bills = [];
    let totalCount = 0;

    if (mode === 'transport' || !mode) {
      const tBills = await TransportBill.find()
        .populate("owner", "name businessName")
        .populate("party", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pLimit)
        .lean();
      
      const tCount = await TransportBill.countDocuments();
      totalCount += tCount;
      bills = [...bills, ...tBills.map(b => ({ ...b, billType: 'transport' }))];
    }
    
    if (mode === 'garage' || !mode) {
      const gBills = await GarageBill.find()
        .populate("owner", "name businessName")
        .populate("party", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pLimit)
        .lean();
      
      const gCount = await GarageBill.countDocuments();
      totalCount += gCount;
      bills = [...bills, ...gBills.map(b => ({ ...b, billType: 'garage' }))];
    }

    // When combined, we sort again to ensure chronological order across types
    const finalBills = bills.sort((a,b) => b.createdAt - a.createdAt);

    return res.json({ 
      success: true, 
      bills: finalBills,
      pagination: {
        total: totalCount,
        page: pPage,
        limit: pLimit,
        totalPages: Math.ceil(totalCount / pLimit)
      }
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/transport/fleet
 * Master list of all registered vehicles on the platform
 */
async function getGlobalFleet(req, res, next) {
  try {
    const vehicles = await Vehicle.find()
      .populate("owner", "name businessName")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, vehicles });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/transport/sales-analytics
 * Revenue grouped by business/user
 */
async function getSalesAnalytics(req, res, next) {
  try {
    const transportSales = await TransportBill.aggregate([
      {
        $group: {
          _id: "$owner",
          totalBilled: { $sum: "$grandTotal" },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "paid"] },
                { $ifNull: ["$paidAmount", "$grandTotal"] },
                { $ifNull: ["$paidAmount", 0] }
              ]
            }
          },
          pendingAmount: {
            $sum: {
              $subtract: [
                "$grandTotal",
                {
                  $cond: [
                    { $eq: ["$status", "paid"] },
                    { $ifNull: ["$paidAmount", "$grandTotal"] },
                    { $ifNull: ["$paidAmount", 0] }
                  ]
                }
              ]
            }
          },
          billCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          userId: "$_id",
          userName: "$userDetails.name",
          businessName: "$userDetails.businessName",
          totalBilled: 1,
          paidAmount: 1,
          pendingAmount: 1,
          billCount: 1
        }
      }
    ]);

    return res.json({ success: true, analytics: transportSales });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/transport/trips
 * Global trip logs for monitoring
 */
async function getGlobalTripHistory(req, res, next) {
  try {
    const { status, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (status) {
      // "billed" / "pending" follow the billing state the transporter sees on their trips page
      if (status === 'billed') {
        filter.billed = true;
      } else if (status === 'pending') {
        filter.billed = false;
        filter.status = { $ne: 'cancelled' };
      } else if (status === 'ongoing') {
        filter.status = 'active';
      } else if (status === 'scheduled') {
        filter.status = 'pending';
      } else {
        filter.status = status;
      }
    }

    const trips = await Trip.find(filter)
      .populate("owner", "name businessName")
      .populate("vehicle", "vehicleNumber vehicleType")
      .populate("party", "name")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Trip.countDocuments(filter);

    return res.json({ 
      success: true, 
      trips,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/admin/transport/bills/:id/status
 * Update bill status (paid/unpaid/pending)
 */
async function updateBillStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'transport' or 'garage'
    // "pending" is the admin UI's name for an unpaid bill
    const status = String(req.body.status || "").toLowerCase() === "pending" ? "unpaid" : String(req.body.status || "").toLowerCase();

    if (!["paid", "unpaid"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be paid or unpaid" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid bill ID" });
    }

    const Model = type === "garage" ? GarageBill : TransportBill;
    const bill = await Model.findById(id);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }
    if (bill.status === "draft") {
      return res.status(400).json({ success: false, message: "Draft bills must be finalised by the owner first" });
    }

    const paid = bill.paidAmount || 0;

    if (status === "unpaid") {
      if (paid > 0) {
        return res.status(400).json({ success: false, message: "This bill has payments recorded and cannot be set back to unpaid" });
      }
      bill.status = "unpaid";
      await bill.save();
      return res.json({ success: true, bill });
    }

    // Mark paid: record the remaining balance as a payment so paidAmount, the ledger and finance stay consistent
    const remaining = Math.round(((bill.grandTotal || 0) - paid) * 100) / 100;
    if (remaining > 0) {
      bill.payments.push({ amount: remaining, date: new Date(), mode: "Cash", notes: "Marked paid by admin", createdAt: new Date() });
      bill.paidAmount = Math.round((paid + remaining) * 100) / 100;
      await Transaction.create({
        owner: bill.owner,
        party: bill.party,
        bill: bill._id,
        type: "income",
        category: "Bill Payment",
        amount: remaining,
        paymentMode: "cash",
        date: new Date(),
        description: `Marked paid by admin — #${bill.billNumber || bill._id}`,
      });
    }
    bill.status = "paid";
    await bill.save();
    await recalcPartyBalance(bill.owner, bill.party);

    return res.json({ success: true, bill });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getAllBills,
  getGlobalFleet,
  getSalesAnalytics,
  getGlobalTripHistory,
  updateBillStatus
};
