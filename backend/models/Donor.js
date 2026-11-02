const mongoose = require("mongoose");
const pointSchema = require("./pointSchema");

const donorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    age: { type: Number, required: true, min: 18, max: 65 },
    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    lastDonationDate: { type: Date, default: null },
    totalDonations: { type: Number, default: 0 },
    location: { type: pointSchema, default: undefined },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

donorSchema.index({ location: "2dsphere" });

// Eligibility is calculated from the last donation date (3-month gap),
// so it can never go out of sync like a stored flag would.
donorSchema.virtual("nextEligibleDate").get(function () {
  if (!this.lastDonationDate) return null;
  const d = new Date(this.lastDonationDate);
  d.setMonth(d.getMonth() + 3);
  return d;
});

donorSchema.virtual("eligible").get(function () {
  const next = this.nextEligibleDate;
  return !next || next <= new Date();
});

module.exports = mongoose.model("Donor", donorSchema);
