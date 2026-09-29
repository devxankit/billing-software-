/**
 * One-off repair: recompute every party's stored balance from its bills,
 * payments and manual finance entries (see src/utils/partyBalance.js).
 *
 *   node scripts/recalc-party-balances.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Party = require("../src/models/Party");
const { recalcPartyBalance } = require("../src/utils/partyBalance");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const parties = await Party.find({}).select("_id owner name balance").lean();
  let changed = 0;
  for (const p of parties) {
    const balance = await recalcPartyBalance(p.owner, p._id);
    if (balance !== p.balance) {
      changed += 1;
      console.log(`${p.name}: ${p.balance} -> ${balance}`);
    }
  }
  console.log(`Checked ${parties.length} parties, updated ${changed}.`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
