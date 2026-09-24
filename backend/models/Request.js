const mongoose = require("mongoose");

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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
