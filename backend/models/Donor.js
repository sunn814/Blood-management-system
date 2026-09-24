const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true, min: 18, max: 65 },
    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    lastDonationDate: { type: Date, default: null },
    totalDonations: { type: Number, default: 0 },
    isEligible: { type: Boolean, default: true }, // 3-month gap rule handled in controller
  },
  { timestamps: true }
);

module.exports = mongoose.model("Donor", donorSchema);
