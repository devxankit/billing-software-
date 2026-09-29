const mongoose = require("mongoose");

// Monotonic sequences (e.g. bill numbers per owner/prefix/year).
// Never decremented, so deleting a record never frees its number for reuse.
const CounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", CounterSchema);
