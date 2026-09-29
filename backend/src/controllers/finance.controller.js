const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Party = require("../models/Party");
const { recalcPartyBalance } = require("../utils/partyBalance");

async function listTransactions(req, res, next) {
  try {
    const txs = await Transaction.find({ owner: req.user.id })
      .populate("party", "name")
      .sort({ date: -1 })
      .lean();
    return res.json({ success: true, transactions: txs });
  } catch (e) {
    next(e);
  }
}

async function getFinanceStats(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const today = new Date();
    
    // Monthly breakdown (last 6 months)
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    const stats = await Transaction.aggregate([
      { $match: { owner: userId } },
      {
        $facet: {
          totals: [
            { $group: { _id: "$type", total: { $sum: "$amount" } } }
          ],
          monthly: [
            { $match: { date: { $gte: sixMonthsAgo } } },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
                income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
                expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);

    const totals = stats[0].totals || [];
    const income = totals.find(t => t._id === 'income')?.total || 0;
    const expense = totals.find(t => t._id === 'expense')?.total || 0;

    return res.json({
      success: true,
      stats: {
        totalIncome: income,
        totalExpense: expense,
        cashBalance: income - expense,
        monthly: stats[0].monthly.map(m => ({
          month: m._id,
          income: m.income,
          expense: m.expense
        }))
      }
    });
  } catch (e) {
    next(e);
  }
}

// Validate a manual entry and return only the fields a client may set
async function manualEntryFields(body, ownerId) {
  const amount = parseFloat(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than 0" };
  if (!["income", "expense"].includes(body.type)) return { error: "Type must be income or expense" };

  // A linked party must belong to this user
  let partyId = null;
  if (body.party) {
    const rawParty = String(body.party._id || body.party);
    if (!mongoose.Types.ObjectId.isValid(rawParty)) return { error: "Invalid party" };
    const owned = await Party.exists({ _id: rawParty, owner: ownerId });
    if (!owned) return { error: "Party not found", status: 404 };
    partyId = rawParty;
  }

  return {
    fields: {
      type: body.type,
      amount: Math.round(amount * 100) / 100,
      party: partyId,
      category: body.category || undefined,
      paymentMode: body.paymentMode || undefined,
      date: body.date || undefined,
      description: body.description ?? body.notes ?? null,
      reference: body.reference ?? null,
    },
  };
}

async function addTransaction(req, res, next) {
  try {
    const { error, status, fields } = await manualEntryFields(req.body || {}, req.user.id);
    if (error) return res.status(status || 400).json({ success: false, message: error });

    // Bill payments go through POST /bills/:id/payments, so manual entries are never linked to a bill
    const tx = await Transaction.create({ ...fields, owner: req.user.id, bill: null });
    await recalcPartyBalance(req.user.id, tx.party);

    return res.json({ success: true, transaction: tx });
  } catch (e) {
    next(e);
  }
}

// Only manual entries can be changed here — payment entries belong to their bill
async function findManualEntry(id, ownerId) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { status: 404, error: "Entry not found" };
  const tx = await Transaction.findOne({ _id: id, owner: ownerId });
  if (!tx) return { status: 404, error: "Entry not found" };
  if (tx.bill) return { status: 400, error: "This entry is a bill payment. Manage it from the bill." };
  return { tx };
}

async function updateTransaction(req, res, next) {
  try {
    const found = await findManualEntry(req.params.id, req.user.id);
    if (found.error) return res.status(found.status).json({ success: false, message: found.error });

    const { error, status, fields } = await manualEntryFields({ ...found.tx.toObject(), ...req.body }, req.user.id);
    if (error) return res.status(status || 400).json({ success: false, message: error });

    const previousParty = found.tx.party;
    Object.assign(found.tx, fields);
    await found.tx.save();

    await recalcPartyBalance(req.user.id, found.tx.party);
    if (String(previousParty || "") !== String(found.tx.party || "")) {
      await recalcPartyBalance(req.user.id, previousParty);
    }

    const tx = await Transaction.findById(found.tx._id).populate("party", "name").lean();
    return res.json({ success: true, transaction: tx });
  } catch (e) {
    next(e);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const found = await findManualEntry(req.params.id, req.user.id);
    if (found.error) return res.status(found.status).json({ success: false, message: found.error });

    await Transaction.deleteOne({ _id: found.tx._id });
    await recalcPartyBalance(req.user.id, found.tx.party);

    return res.json({ success: true, message: "Entry deleted" });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getFinanceStats
};
