const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const audit = require("../utils/audit");
const { isValidId, fail } = require("../utils/helpers");

// @route  GET /api/admin/hospitals?status=pending|approved   (admin)
exports.listHospitals = async (req, res) => {
  try {
    const filter = { role: "hospital" };
    if (req.query.status === "pending") filter.approved = false;
    else if (req.query.status === "approved") filter.approved = { $ne: false };
    const hospitals = await User.find(filter)
      .select("name email phone approved createdAt")
      .sort({ approved: 1, createdAt: -1 })
      .limit(200)
      .lean();
    res.json(hospitals.map((h) => ({ ...h, approved: h.approved !== false })));
  } catch (err) {
    fail(res, 500, "Failed to load hospitals", err);
  }
};

// @route  PUT /api/admin/hospitals/:id/approval   body: { approved: true|false }
exports.setHospitalApproval = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Hospital not found" });
    if (typeof req.body.approved !== "boolean") {
      return res.status(400).json({ message: "approved must be true or false" });
    }
    const hospital = await User.findOneAndUpdate(
      { _id: req.params.id, role: "hospital" },
      { approved: req.body.approved },
      { new: true }
    ).select("name email approved");
    if (!hospital) return res.status(404).json({ message: "Hospital not found" });

    audit(req, req.body.approved ? "approve_hospital" : "revoke_hospital", hospital._id, hospital.email);
    res.json(hospital);
  } catch (err) {
    fail(res, 500, "Failed to update hospital", err);
  }
};

// @route  GET /api/admin/audit?limit=50   (admin)
exports.getAuditLog = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const logs = await AuditLog.find()
      .populate("actor", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(logs);
  } catch (err) {
    fail(res, 500, "Failed to load audit log", err);
  }
};
