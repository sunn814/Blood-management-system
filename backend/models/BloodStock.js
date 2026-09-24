const mongoose = require("mongoose");

const bloodStockSchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
      required: true,
      unique: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    unitsAvailable: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BloodStock", bloodStockSchema);
