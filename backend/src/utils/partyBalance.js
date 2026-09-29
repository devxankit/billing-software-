const mongoose = require("mongoose");
const Party = require("../models/Party");
const TransportBill = require("../models/TransportBill");
const GarageBill = require("../models/GarageBill");
const Transaction = require("../models/Transaction");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Recompute a party's balance from its sources instead of nudging it up/down,
 * so it can never drift. Positive = the party owes us.
 *
 *   opening balance (+ toReceive / − toPay)
 * + final bills' totals − payments received on them
 * − manual income entries + manual expense entries (not linked to a bill)
 */
async function recalcPartyBalance(ownerId, partyId) {
  if (!partyId || !mongoose.Types.ObjectId.isValid(String(partyId))) return null;
  const party = await Party.findOne({ _id: partyId, owner: ownerId }).select("openingBalance balanceType");
  if (!party) return null;

  const owner = new mongoose.Types.ObjectId(String(ownerId));
  const pid = new mongoose.Types.ObjectId(String(partyId));
  const billTotals = [
    { $match: { owner, party: pid, status: { $nin: ["draft", "cancelled"] } } },
    { $group: { _id: null, billed: { $sum: "$grandTotal" }, paid: { $sum: { $ifNull: ["$paidAmount", 0] } } } },
  ];
  const [tBills, gBills, manual] = await Promise.all([
    TransportBill.aggregate(billTotals),
    GarageBill.aggregate(billTotals),
    Transaction.aggregate([
      { $match: { owner, party: pid, bill: null } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
  ]);

  const opening = (party.openingBalance || 0) * (party.balanceType === "toPay" ? -1 : 1);
  const billed = (tBills[0]?.billed || 0) + (gBills[0]?.billed || 0);
  const paid = (tBills[0]?.paid || 0) + (gBills[0]?.paid || 0);
  const income = manual.find(m => m._id === "income")?.total || 0;
  const expense = manual.find(m => m._id === "expense")?.total || 0;

  const balance = round2(opening + billed - paid - income + expense);
  await Party.updateOne({ _id: pid, owner }, { $set: { balance } });
  return balance;
}

module.exports = { recalcPartyBalance };
