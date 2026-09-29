const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: String, unique: true, index: true }, 
    groupId: { type: String, index: true }, // Explicitly link segments into one journey
    
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
    party: { type: mongoose.Schema.Types.ObjectId, ref: "Party", required: true, index: true },
    
    startDate: { type: Date, default: Date.now, index: true },
    source: { type: String, required: true },
    destination: { type: String, required: true },
    
    amount: { type: Number, required: true },
    numberOfTrips: { type: Number, default: 1 },
    
    status: { type: String, enum: ["pending", "active", "completed", "cancelled"], default: "pending" },
    
    billed: { type: Boolean, default: false, index: true },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", default: null, index: true },
    
    chalanImage: { type: String, default: null },
    chalanNumber: { type: String, default: null },
    gstPercent: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    haltDays: { type: Number, default: 0 },
    haltAmount: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    returnCharges: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: true },
    reason: { type: String, default: null },
    deliveries: [
      {
        from: { type: String },
        to: { type: String },
        chalanNumbers: [{ type: String }],
        // Per-delivery charges (absent on older trips, where charges live only at trip level)
        amount: { type: Number },
        haltDays: { type: Number },
        haltAmount: { type: Number },
        extraCharges: { type: Number },
        returnCharges: { type: Number }
      }
    ],
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

// High-speed compound indexes
TripSchema.index({ owner: 1, status: 1 });
TripSchema.index({ owner: 1, startDate: -1 });

// Clean, safe ID generator - No "next" parameter used to avoid middleware conflicts
TripSchema.pre("save", function () {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.round(Math.random() * 10000);
  
  if (!this.tripId) {
    this.tripId = `TRP-${timestamp}${random}`;
  }
  
  if (!this.groupId) {
    this.groupId = `GRP-${timestamp}${random}`;
  }
});

module.exports = mongoose.model("Trip", TripSchema);
