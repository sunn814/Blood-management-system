const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { BLOOD_GROUPS } = require("../utils/compatibility");
const { fail, isValidPhone, isStrongPassword, isText } = require("../utils/helpers");

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
    algorithm: "HS256",
  });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  approved: user.approved !== false,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// Used so a login for an unknown email takes as long as a real one (no timing leak).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-1", 10);

// @route  POST /api/auth/register
// SECURITY: public signup can only create "donor" or "hospital" accounts.
// New hospitals start unapproved; admins are created with `npm run create-admin`.
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, bloodGroup } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || !isText(name, 80)) {
      return res.status(400).json({ message: "Enter your name (up to 80 characters), email and password" });
    }
    if (!EMAIL_REGEX.test(email.trim()) || email.length > 120) {
      return res.status(400).json({ message: "Enter a valid email" });
    }
    if (!isStrongPassword(password)) {
      return res
        .status(400)
        .json({ message: "Password must be 8 to 64 characters with at least one letter and one number" });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: "Enter a valid phone number" });
    }
    if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ message: "Invalid blood group" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const isHospital = role === "hospital";
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: isHospital ? "hospital" : "donor", // never trust "admin" from the client
      approved: !isHospital, // hospitals wait for admin approval
      phone: typeof phone === "string" ? phone.trim() : undefined,
      bloodGroup: bloodGroup || null,
    });

    res.status(201).json({ token: generateToken(user), user: publicUser(user) });
  } catch (err) {
    fail(res, 500, "Registration failed", err);
  }
};

// @route  POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH); // same delay as a real check
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res
        .status(429)
        .json({ message: `Too many wrong passwords. Try again in ${LOCK_MINUTES} minutes.` });
    }

    if (!(await user.comparePassword(password))) {
      const updated = await User.findByIdAndUpdate(user._id, { $inc: { failedLogins: 1 } }, { new: true });
      if (updated.failedLogins >= MAX_FAILED) {
        await User.updateOne(
          { _id: user._id },
          { $set: { lockUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000), failedLogins: 0 } }
        );
      }
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.failedLogins || user.lockUntil) {
      await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lockUntil: null } });
    }

    res.json({ token: generateToken(user), user: publicUser(user) });
  } catch (err) {
    fail(res, 500, "Login failed", err);
  }
};

// @route  GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -failedLogins -lockUntil");
    if (!user) return res.status(401).json({ message: "This account no longer exists" });
    res.json({ ...publicUser(user), phone: user.phone, bloodGroup: user.bloodGroup });
  } catch (err) {
    fail(res, 500, "Failed to fetch profile", err);
  }
};
