const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "donor", "hospital"],
      default: "donor",
    },
    phone: { type: String, trim: true, maxlength: 20 },
    // Hospitals must be approved by an admin before they can see donors or raise requests.
    // Default true so existing accounts keep working; register() sets false for new hospitals.
    approved: { type: Boolean, default: true },
    // Login protection: lock the account for 15 minutes after 5 wrong passwords.
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null],
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
