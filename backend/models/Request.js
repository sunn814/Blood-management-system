const mongoose = require("mongoose");
const pointSchema = require("./pointSchema");

const requestSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientName: { type: String, required: true },
    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    unitsRequired: { type: Number, required: true, min: 1 },
    hospitalName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    urgency: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Fulfilled"],
      default: "Pending",
    },
    // Where the blood is needed (optional) - used for the radius map
    location: { type: pointSchema, default: undefined },
    // Request tracking: every status change is recorded here
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: ["Pending", "Approved", "Rejected", "Fulfilled"] },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: { type: String, trim: true, maxlength: 200 },
      },
    ],
    // Which blood group's stock was actually used (may differ from the
    // requested group when a compatible group is used as a substitute).
    fulfilledFrom: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
