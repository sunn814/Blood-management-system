const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Checks the token AND that the account still exists. The role comes from the
// database, not the token, so a deleted or demoted user loses access immediately.
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided, access denied" });
  }
  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.id).select("role approved").lean();
    if (!user) return res.status(401).json({ message: "This account no longer exists" });
    req.user = { id: String(user._id), role: user.role, approved: user.approved !== false };
    next();
  } catch (err) {
    console.error("Auth lookup failed:", err.message);
    res.status(500).json({ message: "Could not verify your account" });
  }
};

// Usage: authorize("admin"), authorize("admin", "hospital")
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    next();
  };
};

// Hospitals can only use donor search and raise requests after an admin approves them.
const requireApproved = (req, res, next) => {
  if (req.user.role === "hospital" && !req.user.approved) {
    return res.status(403).json({
      message: "Your hospital account is waiting for admin approval. You can use this once it is approved.",
    });
  }
  next();
};

module.exports = { protect, authorize, requireApproved };
