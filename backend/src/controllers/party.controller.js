const Party = require("../models/Party");
const TransportBill = require("../models/TransportBill");
const GarageBill = require("../models/GarageBill");
const Trip = require("../models/Trip");
const { stripProtected } = require("../utils/sanitizeBody");

const User = require("../../models/User");
const notificationService = require("../services/notification.service");

async function listParties(req, res, next) {
  try {
    const { partyType } = req.query;
    const filter = { owner: req.user.id };
    if (partyType) filter.partyType = partyType;
    
    const parties = await Party.find(filter).sort({ name: 1 });
    return res.json({ success: true, parties });
  } catch (e) {
    return next(e);
  }
}

async function createParty(req, res, next) {
  try {
    const data = { ...stripProtected(req.body, ["balance"]), owner: req.user.id };
    const party = await Party.create(data);

    // Notify the Owner
    const owner = await User.findById(req.user.id);
    if (owner) {
      await notificationService.sendToUser(owner, {
        title: "New Party Created",
        body: `Party "${party.name}" has been added to your list.`,
        data: { type: "new_party", partyId: party._id.toString() }
      });
    }

    return res.json({ success: true, party });
  } catch (e) {
    return next(e);
  }
}

async function updateParty(req, res, next) {
  try {
    const party = await Party.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      // balance is maintained by bills/payments, never set directly
      { $set: stripProtected(req.body, ["balance"]) },
      { returnDocument: "after", runValidators: true }
    );
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });
    return res.json({ success: true, party });
  } catch (e) {
    return next(e);
  }
}

async function deleteParty(req, res, next) {
  try {
    const party = await Party.findOne({ _id: req.params.id, owner: req.user.id });
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });

    // Keep parties that still have money or work outstanding — their bills would lose the link
    const open = { owner: req.user.id, party: party._id, status: { $in: ["unpaid", "partial"] } };
    const [openTransport, openGarage, pendingTrips] = await Promise.all([
      TransportBill.countDocuments(open),
      GarageBill.countDocuments(open),
      Trip.countDocuments({ owner: req.user.id, party: party._id, billed: false }),
    ]);
    if (openTransport + openGarage > 0) {
      return res.status(400).json({ success: false, message: `This party has ${openTransport + openGarage} unpaid bill(s). Settle or delete them before deleting the party.` });
    }
    if (pendingTrips > 0) {
      return res.status(400).json({ success: false, message: `This party has ${pendingTrips} trip(s) not yet billed. Bill or delete them before deleting the party.` });
    }

    await Party.deleteOne({ _id: party._id });
    return res.json({ success: true, message: "Party deleted" });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  listParties,
  createParty,
  updateParty,
  deleteParty,
};
