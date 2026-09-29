const mongoose = require("mongoose");
const { isRealAdmin } = require("../middleware/auth.middleware");
const TransportBill = require("../models/TransportBill");
const GarageBill = require("../models/GarageBill");
const Trip = require("../models/Trip");
const Transaction = require("../models/Transaction");
const notificationService = require("../services/notification.service");
const User = require("../../models/User");
const Party = require("../models/Party");
const Counter = require("../models/Counter");

// ─── helpers ────────────────────────────────────────────────────────────────

async function sendBillNotification(bill, type, action) {
  try {
    if (bill.status === "draft") return;

    // Fetch the party to get their FCM tokens
    const party = await Party.findById(bill.party);
    if (!party) return;

    let title = "";
    let body = "";

    if (action === "created") {
      title = `New ${type === "garage" ? "Job Card" : "Invoice"}`;
      body = `A new ${type === "garage" ? "Job Card" : "Invoice"} #${bill.billNumber} for ₹${bill.grandTotal} has been generated.`;
    } else if (action === "paid") {
      title = "Payment Received";
      body = `Thank you! Payment of ₹${bill.grandTotal} for ${type === "garage" ? "Job Card" : "Invoice"} #${bill.billNumber} has been received.`;
    }

    if (title && body) {
      await notificationService.sendToUser(party, {
        title,
        body,
        data: {
          type: "bill",
          billId: bill._id.toString(),
          billType: type,
        },
      });
    }

    // ALSO notify the owner (User) for confirmation
    const owner = await User.findById(bill.owner);
    if (owner && action === "created") {
      await notificationService.sendToUser(owner, {
        title: `Bill Generated: #${bill.billNumber}`,
        body: `A new ${type} bill for ₹${bill.grandTotal} has been created.`,
        data: { type: "bill", billId: bill._id.toString() }
      });
    }
  } catch (err) {
    console.warn("[sendBillNotification] Failed:", err.message);
  }
}

function getModel(billType) {
  if (billType === "garage") return GarageBill;
  if (billType === "transport") return TransportBill;
  return null;
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v) => parseFloat(v) || 0;

// Bill numbers come from a per-owner/prefix/year counter that only ever goes up,
// so deleting a bill never makes its number reusable and concurrent saves can't collide.
async function genBillNumber(type, ownerId) {
  const prefix = type === "garage" ? "Inv-G-" : "Inv-T-";
  const base = `${prefix}${new Date().getFullYear()}-`;
  const key = `bill:${ownerId}:${base}`;

  const existing = await Counter.findOne({ key }).lean();
  if (!existing) {
    // First use of this counter: continue after the highest number already issued
    const Model = type === "garage" ? GarageBill : TransportBill;
    const issued = await Model.find({ owner: ownerId, billNumber: new RegExp("^" + base) }).select("billNumber").lean();
    const max = issued.reduce((m, b) => Math.max(m, parseInt(b.billNumber.slice(base.length), 10) || 0), 0);
    try {
      await Counter.updateOne({ key }, { $max: { seq: max } }, { upsert: true });
    } catch (e) {
      if (e.code !== 11000) throw e; // another request created it first
    }
  }

  const counter = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { returnDocument: "after", upsert: true });
  return base + String(counter.seq).padStart(2, "0");
}

function subscriptionBlocked(user) {
  if (!user) return false;
  const isExpired = user.subscriptionExpiry && new Date(user.subscriptionExpiry).getTime() < Date.now();
  return !user.subscriptionActive || isExpired;
}

const SUBSCRIPTION_REQUIRED = {
  success: false,
  message: "Active subscription required to create bills. Please subscribe to continue.",
  requiresSubscription: true,
};

function businessSnapshotFrom(user) {
  if (!user) return undefined;
  return {
    businessName: user.businessName || user.name || "",
    logoUrl:      user.logoUrl || null,
    signatureUrl: user.signatureUrl || null,
    phone:        user.phone || "",
    alternatePhone: user.alternatePhone || null,
    address:      user.address || "",
    city:         user.city || "",
    state:        user.state || "",
    pincode:      user.pincode || "",
    gstin:        user.gstin || "",
    panNo:        user.panNo || "",
    slogan:       user.slogan || "",
    brandColor:   user.brandColor || "#000000",
    wishingName:  user.wishingName || "",
    wishingColor: user.wishingColor || "#444444",
    repairDetailsLabel: user.repairDetailsLabel || null,
    bankDetails: user.bankDetails ? {
      accountName:   user.bankDetails.accountName || "",
      accountNumber: user.bankDetails.accountNumber || "",
      ifsc:          user.bankDetails.ifsc || "",
      bankName:      user.bankDetails.bankName || "",
      upiId:         user.bankDetails.upiId || "",
      qrUrl:         user.bankDetails.qrUrl || null,
    } : undefined,
  };
}

const OWNER_FIELDS = "businessName name email address phone alternatePhone gstin panNo logoUrl signatureUrl bankDetails slogan wishingName brandColor wishingColor repairDetailsLabel";

// Transport bill fields + totals, always computed on the server from the line items
function buildTransportFields(src) {
  const items = (src.items || []).map(it => ({
    date: it.date,
    tempoNo: it.tempoNo,
    companyFrom: it.companyFrom,
    companyTo: it.companyTo,
    chalanNo: it.chalanNo,
    haltDays: num(it.haltDays),
    haltAmount: num(it.haltAmount),
    extraAmount: num(it.extraAmount),
    returnAmount: num(it.returnAmount),
    gstPercent: num(it.gstPercent),
    gstAmount: num(it.gstAmount),
    amount: num(it.amount),
    tripIds: (it.tripIds || []).map(String),
  }));
  const tripIds = [...new Set(items.flatMap(it => it.tripIds))];

  const itemsTotal = items.reduce((s, it) => s + it.amount + it.extraAmount + it.returnAmount + it.haltAmount, 0);
  const itemsGstTotal = items.reduce((s, it) => s + it.gstAmount, 0);
  const extras = [src.loadingCharge, src.unloadingCharge, src.detentionCharge, src.otherCharge, src.extraCharges]
    .reduce((s, v) => s + num(v), 0);
  const subTotal = itemsTotal + extras;
  // If items already carry GST (from trips) use that, otherwise apply the bill-level %
  const gstAmount = itemsGstTotal || (subTotal * num(src.gstPercent) / 100);
  const resolvedParty = String(src.party?._id || src.party || src.partyId || "").trim() || undefined;

  return {
    tripIds,
    fields: {
      ...(resolvedParty && { party: resolvedParty }),
      billedToName: src.billedToName, billedToPhone: src.billedToPhone, billedToEmail: src.billedToEmail,
      billedToAddress: src.billedToAddress, billedToCity: src.billedToCity, billedToState: src.billedToState,
      billedToPincode: src.billedToPincode, billedToGstin: src.billedToGstin, billedToPan: src.billedToPan,
      items,
      trips: tripIds,
      loadingCharge: num(src.loadingCharge),
      unloadingCharge: num(src.unloadingCharge),
      detentionCharge: num(src.detentionCharge),
      otherCharge: num(src.otherCharge),
      extraCharges: num(src.extraCharges),
      gstPercent: num(src.gstPercent),
      gstType: src.gstType || "CGST+SGST",
      gstAmount: round2(gstAmount),
      subTotal: round2(subTotal),
      grandTotal: round2(subTotal + gstAmount),
      paymentMode: src.paymentMode || "topay",
      billingDate: src.billingDate || src.billDate || new Date(),
      notes: src.notes,
    },
  };
}

const GARAGE_PAYMENT_METHODS = ["Cash", "UPI", "Online Payment", "Bank Transfer", "Card", "Credit", "Cheque"];

// Garage bill fields + totals, always computed on the server from the line items
function buildGarageFields(src) {
  const items = (src.items || []).map(it => {
    const qty = num(it.qty || it.quantity) || 1;
    const rate = num(it.rate);
    return { description: it.description, qty, rate, amount: num(it.amount) || round2(qty * rate) };
  });
  const partsTotal = items.reduce((s, it) => s + it.amount, 0);
  const labor = num(src.laborCharge);
  const subTotal = partsTotal + labor;
  const discPercent = num(src.discountPercent);
  const discount = subTotal * discPercent / 100;
  const taxable = subTotal - discount;
  const gstAmount = taxable * num(src.gstPercent) / 100;
  const resolvedParty = String(src.party?._id || src.party || src.partyId || "").trim() || undefined;

  return {
    ...(resolvedParty && { party: resolvedParty }),
    customerName: src.customerName, customerPhone: src.customerPhone, customerEmail: src.customerEmail,
    customerAddress: src.customerAddress, customerCity: src.customerCity, customerState: src.customerState,
    customerPincode: src.customerPincode, customerGstin: src.customerGstin, customerPan: src.customerPan,
    customerSignatureUrl: src.customerSignatureUrl,
    vehicleNo: src.vehicleNo, vehicleModel: src.vehicleModel, vehicleCompany: src.vehicleCompany,
    kmReading: num(src.kmReading) || undefined,
    nextServiceKm: num(src.nextServiceKm) || undefined,
    nextServiceDate: src.nextServiceDate || undefined,
    items,
    partsTotal: round2(partsTotal),
    laborCharge: labor,
    subTotal: round2(subTotal),
    discountPercent: discPercent,
    discount: round2(discount),
    gstPercent: num(src.gstPercent),
    gstAmount: round2(gstAmount),
    grandTotal: round2(taxable + gstAmount),
    paymentMethod: GARAGE_PAYMENT_METHODS.includes(src.paymentMethod) ? src.paymentMethod : "Cash",
    billingDate: src.billingDate || src.billDate || new Date(),
    notes: src.notes,
  };
}

// Returns an error message if any trip is missing, not the user's, or already on another bill
async function tripConflict(ownerId, tripIds, billId = null) {
  if (tripIds.length === 0) return null;
  if (!tripIds.every(id => mongoose.Types.ObjectId.isValid(id))) return "Invalid trip reference";
  const trips = await Trip.find({ _id: { $in: tripIds }, owner: ownerId }).select("billed billId").lean();
  if (trips.length !== tripIds.length) return "Some selected trips no longer exist. Please refresh and try again.";
  const taken = trips.some(t => (t.billed || t.billId) && String(t.billId || "") !== String(billId || ""));
  return taken ? "One or more trips are already on another bill or draft. Please refresh and try again." : null;
}

// Point exactly `tripIds` at this bill: drafts reserve trips, final bills mark them billed,
// and trips removed from the bill become available again.
async function syncBillTrips(ownerId, billId, tripIds, isFinal) {
  await Trip.updateMany(
    { owner: ownerId, billId, _id: { $nin: tripIds } },
    { $set: { billed: false, billId: null } }
  );
  if (tripIds.length > 0) {
    await Trip.updateMany(
      { owner: ownerId, _id: { $in: tripIds } },
      { $set: { billed: isFinal, billId } }
    );
  }
}

// Find a bill of either type owned by this user
async function findOwnedBill(id, ownerId) {
  if (!mongoose.Types.ObjectId.isValid(id)) return {};
  const tBill = await TransportBill.findOne({ _id: id, owner: ownerId });
  if (tBill) return { bill: tBill, type: "transport", Model: TransportBill };
  const gBill = await GarageBill.findOne({ _id: id, owner: ownerId });
  if (gBill) return { bill: gBill, type: "garage", Model: GarageBill };
  return {};
}

// ─── GET /bills/drafts ────────────────────────────────────────────────────────
async function getDrafts(req, res, next) {
  try {
    const [tDrafts, gDrafts] = await Promise.all([
      TransportBill.find({ owner: req.user.id, status: "draft" })
        .populate("party", "name")
        .select("billNumber party createdAt _id")
        .lean(),
      GarageBill.find({ owner: req.user.id, status: "draft" })
        .populate("party", "name")
        .select("billNumber party customerName createdAt _id")
        .lean(),
    ]);

    const drafts = [
      ...tDrafts.map(d => ({ ...d, billType: "transport" })),
      ...gDrafts.map(d => ({ ...d, billType: "garage" })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, drafts });
  } catch (e) {
    next(e);
  }
}

// ─── GET /bills ───────────────────────────────────────────────────────────────
async function listBills(req, res, next) {
  try {
    const { from, to } = req.query;
    const filter = { owner: req.user.id };

    if (from || to) {
      filter.billingDate = {};
      if (from) filter.billingDate.$gte = new Date(from);
      if (to) {
        // Set 'to' to end of the day or month
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.billingDate.$lte = end;
      }
    }

    const [tBills, gBills] = await Promise.all([
      TransportBill.find(filter)
        .populate("party", "name phone")
        .sort({ billingDate: -1 })
        .lean(),
      GarageBill.find(filter)
        .populate("party", "name phone")
        .sort({ billingDate: -1 })
        .lean(),
    ]);

    const bills = [
      ...tBills.map(b => ({ ...b, billType: "transport" })),
      ...gBills.map(b => ({ ...b, billType: "garage" })),
    ].sort((a, b) => new Date(b.billingDate) - new Date(a.billingDate));

    return res.json({ success: true, bills });
  } catch (e) {
    next(e);
  }
}

// ─── POST /bills ──────────────────────────────────────────────────────────────
async function createBill(req, res, next) {
  try {
    const body = req.body || {};
    const resolvedType = body.billType || (body.type === "garage" ? "garage" : "transport");
    const Model = getModel(resolvedType);

    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid billType. Use 'transport' or 'garage'." });
    }

    const user = await User.findById(req.user.id);

    // Block ALL bill creation (draft + final) if subscription is inactive or expired.
    // Bill viewing/listing is NOT affected — only creation is gated here.
    if (subscriptionBlocked(user)) return res.status(403).json(SUBSCRIPTION_REQUIRED);

    // New bills start as draft or unpaid — payments are only added through /payments
    const status = body.status === "draft" ? "draft" : "unpaid";
    const isFinal = status !== "draft";
    const billData = { owner: req.user.id, status, businessSnapshot: businessSnapshotFrom(user) };

    // ── TRANSPORT BILL ──────────────────────────────────────────────────────
    if (resolvedType === "transport") {
      const { fields, tripIds } = buildTransportFields(body);
      Object.assign(billData, fields);

      const conflict = await tripConflict(req.user.id, tripIds);
      if (conflict) return res.status(400).json({ success: false, message: conflict });

      if (isFinal) billData.billNumber = await genBillNumber("transport", req.user.id);

      const bill = await TransportBill.create(billData);
      // Drafts reserve their trips too, so the same trip can't go on a second bill
      await syncBillTrips(req.user.id, bill._id, tripIds, isFinal);

      const populatedBill = await TransportBill.findById(bill._id).populate("party").populate("owner", OWNER_FIELDS);

      if (isFinal) {
        await sendBillNotification(bill, "transport", "created");
      }

      return res.json({ success: true, bill: { ...populatedBill.toObject(), billType: "transport" } });
    }

    // ── GARAGE BILL ─────────────────────────────────────────────────────────
    Object.assign(billData, buildGarageFields(body));
    if (isFinal) billData.billNumber = await genBillNumber("garage", req.user.id);

    const bill = await GarageBill.create(billData);

    const populatedBill = await GarageBill.findById(bill._id).populate("party").populate("owner", OWNER_FIELDS);

    // Update GarageVehicle record for service reminders
    if (bill.vehicleNo) {
      try {
        const GarageVehicle = require("../models/GarageVehicle");
        await GarageVehicle.findOneAndUpdate(
          { owner: req.user.id, vehicleNumber: bill.vehicleNo },
          {
            $set: {
              partyId: bill.party,
              kmReading: bill.kmReading,
              nextServiceKm: bill.nextServiceKm,
              nextServiceDate: bill.nextServiceDate,
              lastServiceDate: bill.billingDate,
              model: bill.vehicleModel,
              company: bill.vehicleCompany,
              customerName: bill.customerName,
              customerPhone: bill.customerPhone,
            },
          },
          { upsert: true, returnDocument: "after" }
        );
      } catch (garageErr) {
        console.warn("GarageVehicle upsert failed:", garageErr.message);
      }
    }

    if (isFinal) {
      await sendBillNotification(bill, "garage", "created");
    }

    return res.json({ success: true, bill: { ...populatedBill.toObject(), billType: "garage" } });
  } catch (e) {
    console.error("[createBill ERROR]", e.message, e.errors ? JSON.stringify(e.errors) : "");
    next(e);
  }
}

// ─── PATCH /bills/:id ─────────────────────────────────────────────────────────
// Edits content and/or finalises a draft. Totals are recomputed here; payment
// status only changes through POST /bills/:id/payments.
async function updateBill(req, res, next) {
  try {
    const { bill, type, Model } = await findOwnedBill(req.params.id, req.user.id);
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
    if (bill.status === "paid") {
      return res.status(400).json({ success: false, message: "Cannot edit a paid bill" });
    }

    const body = req.body || {};
    const requested = body.status;
    if (requested !== undefined && !["draft", "unpaid"].includes(requested)) {
      return res.status(400).json({ success: false, message: "Use Record Payment to mark a bill paid" });
    }
    if (requested === "draft" && bill.status !== "draft") {
      return res.status(400).json({ success: false, message: "A final bill cannot be moved back to draft" });
    }

    const becomingFinal = requested === "unpaid" && bill.status === "draft";
    if (becomingFinal && subscriptionBlocked(await User.findById(req.user.id))) {
      return res.status(403).json(SUBSCRIPTION_REQUIRED);
    }

    const update = {};
    let tripIds = (bill.trips || []).map(String);

    // Content edit: rebuild from the stored bill overlaid with what was sent
    if (body.items !== undefined) {
      const src = { ...bill.toObject(), ...body };
      if (type === "transport") {
        const built = buildTransportFields(src);
        Object.assign(update, built.fields);
        tripIds = built.tripIds;
      } else {
        Object.assign(update, buildGarageFields(src));
      }
    } else if (body.notes !== undefined) {
      update.notes = body.notes;
    }

    if (becomingFinal) {
      update.status = "unpaid";
      if (!bill.billNumber) update.billNumber = await genBillNumber(type, req.user.id);
    }

    // Totals changed on a part-paid bill: keep its payment status in step
    const paid = bill.paidAmount || 0;
    if (update.grandTotal !== undefined && paid > 0) {
      update.status = paid >= update.grandTotal - 0.01 ? "paid" : "partial";
    }

    if (!bill.businessSnapshot) {
      update.businessSnapshot = businessSnapshotFrom(await User.findById(req.user.id));
    }

    if (type === "transport") {
      const conflict = await tripConflict(req.user.id, tripIds, bill._id);
      if (conflict) return res.status(400).json({ success: false, message: conflict });
    }

    const updatedBill = await Model.findByIdAndUpdate(bill._id, { $set: update }, { returnDocument: "after", runValidators: true })
      .populate("party")
      .populate("owner", OWNER_FIELDS);

    if (type === "transport") {
      await syncBillTrips(req.user.id, bill._id, tripIds, updatedBill.status !== "draft");
    }

    if (becomingFinal) {
      await sendBillNotification(updatedBill, type, "created");
    }

    return res.json({ success: true, bill: { ...updatedBill.toObject(), billType: type } });
  } catch (e) {
    next(e);
  }
}

// ─── GET /bills/:id ───────────────────────────────────────────────────────────
async function getBillDetail(req, res, next) {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid bill ID format" });
    }

    const isAdmin = req.user.role === "admin" && await isRealAdmin(req.user.id);
    const ownerFilter = isAdmin ? {} : { owner: req.user.id };

    // Check both collections
    let bill = await TransportBill.findOne({ _id: id, ...ownerFilter })
      .populate("party")
      .populate("owner", "businessName name email address phone alternatePhone gstin panNo logoUrl signatureUrl bankDetails slogan wishingName brandColor wishingColor repairDetailsLabel")
      .populate({ path: "trips", populate: { path: "vehicle", select: "vehicleNumber model" } });

    if (bill) {
      return res.json({ success: true, bill: { ...bill.toObject(), billType: "transport" } });
    }

    bill = await GarageBill.findOne({ _id: id, ...ownerFilter })
      .populate("owner", "businessName name email address phone alternatePhone gstin panNo logoUrl signatureUrl bankDetails slogan wishingName brandColor wishingColor repairDetailsLabel")
      .populate("party");

    if (bill) {
      return res.json({ success: true, bill: { ...bill.toObject(), billType: "garage" } });
    }

    return res.status(404).json({ success: false, message: "Bill not found" });
  } catch (e) {
    next(e);
  }
}

// ─── GET /bills/public/:id (NO AUTH REQUIRED) ────────────────────────────────
async function getPublicBill(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid link" });
    }

    // Public view only for finalized bills
    const filter = { _id: id, status: { $ne: "draft" } };

    let bill = await TransportBill.findOne(filter)
      .populate("party")
      .populate("owner", "businessName name email address phone alternatePhone gstin panNo logoUrl signatureUrl bankDetails slogan wishingName brandColor wishingColor repairDetailsLabel")
      .populate({ path: "trips", populate: { path: "vehicle", select: "vehicleNumber model" } });

    if (bill) {
      return res.json({ success: true, bill: { ...bill.toObject(), billType: "transport" } });
    }

    bill = await GarageBill.findOne(filter)
      .populate("owner", "businessName name email address phone alternatePhone gstin panNo logoUrl signatureUrl bankDetails slogan wishingName brandColor wishingColor repairDetailsLabel")
      .populate("party");

    if (bill) {
      return res.json({ success: true, bill: { ...bill.toObject(), billType: "garage" } });
    }

    return res.status(404).json({ success: false, message: "Invoice not found or expired" });
  } catch (e) {
    next(e);
  }
}

// ─── DELETE /bills/:id ────────────────────────────────────────────────────────
async function deleteBill(req, res, next) {
  try {
    const { bill, type, Model } = await findOwnedBill(req.params.id, req.user.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found or not authorized" });
    }

    // Its trips go back to "pending" so they can be billed again
    if (type === "transport") {
      await Trip.updateMany({ owner: req.user.id, billId: bill._id }, { $set: { billed: false, billId: null } });
    }

    // Undo the money side: payment entries go, and the party balance gets back what payments took off it
    const paymentsTotal = (bill.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    if (bill.party && paymentsTotal > 0) {
      await Party.updateOne({ _id: bill.party, owner: req.user.id }, { $inc: { balance: paymentsTotal } });
    }
    await Transaction.deleteMany({ owner: req.user.id, bill: bill._id });

    await Model.deleteOne({ _id: bill._id });

    return res.json({ success: true, message: "Bill deleted successfully" });
  } catch (e) {
    console.error("[deleteBill ERROR]", e.message);
    next(e);
  }
}

// ─── POST /bills/:id/payments ─────────────────────────────────────────────────
async function recordPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { amount, date, mode, notes } = req.body;

    const paymentAmount = round2(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: "Payment amount must be greater than 0" });
    }

    const validModes = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Online"];
    const paymentMode = validModes.includes(mode) ? mode : "Cash";
    const paymentDate = date ? new Date(date) : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid payment date" });
    }

    const { bill, type: resolvedType, Model } = await findOwnedBill(id, req.user.id);
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
    if (bill.status === "paid") {
      return res.status(400).json({ success: false, message: "This bill is already fully paid" });
    }
    if (bill.status === "draft") {
      return res.status(400).json({ success: false, message: "Cannot record payment for a draft bill" });
    }

    const newPayment = {
      amount: paymentAmount,
      date: paymentDate,
      mode: paymentMode,
      notes: notes || "",
      createdAt: new Date(),
    };

    // One atomic update: add the payment, bump paidAmount and set the status together,
    // and only if it doesn't overpay — so two payments at once can't overwrite each other.
    const paidSoFar = { $ifNull: ["$paidAmount", 0] };
    const updatedBill = await Model.findOneAndUpdate(
      {
        _id: bill._id,
        owner: req.user.id,
        status: { $nin: ["paid", "draft"] },
        $expr: { $lte: [{ $add: [paidSoFar, paymentAmount] }, { $add: ["$grandTotal", 0.01] }] },
      },
      [
        {
          $set: {
            paidAmount: { $round: [{ $add: [paidSoFar, paymentAmount] }, 2] },
            payments: { $concatArrays: [{ $ifNull: ["$payments", []] }, { $literal: [newPayment] }] },
          },
        },
        {
          $set: {
            status: { $cond: [{ $gte: ["$paidAmount", { $subtract: ["$grandTotal", 0.01] }] }, "paid", "partial"] },
          },
        },
      ],
      { returnDocument: "after", updatePipeline: true }
    )
      .populate("party")
      .populate("owner", OWNER_FIELDS);

    if (!updatedBill) {
      const balance = round2((bill.grandTotal || 0) - (bill.paidAmount || 0));
      return res.status(409).json({
        success: false,
        message: `Payment is more than the balance due (₹${balance}). Please refresh and try again.`,
      });
    }

    // Create real-time transaction record for this payment installment
    try {
      let txMode = "cash";
      const modeLower = paymentMode.toLowerCase();
      if (modeLower === "cheque") txMode = "check";
      else if (modeLower === "bank transfer") txMode = "bank";
      else if (modeLower === "upi" || modeLower === "card" || modeLower === "online") txMode = "online";

      await Transaction.create({
        owner: bill.owner,
        party: bill.party,
        bill: bill._id,
        type: "income",
        category: "Bill Payment",
        amount: paymentAmount,
        paymentMode: txMode,
        date: paymentDate,
        description: notes || `Payment received for ${resolvedType === 'garage' ? 'Job Card' : 'Invoice'} #${bill.billNumber || bill._id}`
      });

      // Update party balance in DB to match payment adjustment
      if (bill.party) {
        await Party.updateOne({ _id: bill.party, owner: req.user.id }, { $inc: { balance: -paymentAmount } });
      }
    } catch (txErr) {
      console.warn("[recordPayment] Transaction/Party update failed:", txErr.message);
    }

    // Send bill notification when fully paid
    if (updatedBill.status === "paid") {
      await sendBillNotification(updatedBill, resolvedType, "paid");
    }

    return res.json({ success: true, bill: { ...updatedBill.toObject(), billType: resolvedType } });
  } catch (e) {
    next(e);
  }
}

async function markAsDownloaded(req, res, next) {
  try {
    const { id } = req.params;
    let type = "transport";
    let bill = await TransportBill.findOneAndUpdate(
      { _id: id, owner: req.user.id },
      { $set: { isDownloaded: true, downloadedAt: new Date() } },
      { new: true }
    );

    if (!bill) {
      bill = await GarageBill.findOneAndUpdate(
        { _id: id, owner: req.user.id },
        { $set: { isDownloaded: true, downloadedAt: new Date() } },
        { new: true }
      );
      type = "garage";
    }

    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    return res.json({
      success: true,
      bill: { ...bill.toObject(), billType: type }
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { getDrafts, listBills, createBill, updateBill, getBillDetail, getPublicBill, deleteBill, markAsDownloaded, recordPayment };

