const BloodStock = require("../models/BloodStock");
const Request = require("../models/Request");
const Donor = require("../models/Donor");
const { BLOOD_GROUPS, canDonateTo } = require("../utils/compatibility");
const { fail } = require("../utils/helpers");

const LOW_STOCK_LIMIT = 5; // units at or below this = low-stock alert
const OPEN = ["Pending", "Approved"];

// @route  GET /api/alerts
// NEW FEATURE - Urgent alerts. What each role sees:
//  - everyone : groups with low stock
//  - admin    : open HIGH-urgency requests (oldest first)
//  - donor    : whether they are eligible and how many urgent open requests
//               their blood can help (no patient details are exposed)
exports.getAlerts = async (req, res) => {
  try {
    const stockDocs = await BloodStock.find().lean();
    const map = Object.fromEntries(stockDocs.map((s) => [s.bloodGroup, s.unitsAvailable]));
    const lowStock = BLOOD_GROUPS.map((g) => ({ bloodGroup: g, unitsAvailable: map[g] || 0 }))
      .filter((s) => s.unitsAvailable <= LOW_STOCK_LIMIT);

    const alerts = { lowStock, lowStockLimit: LOW_STOCK_LIMIT };

    if (req.user.role === "admin") {
      alerts.urgentRequests = await Request.find({ status: { $in: OPEN }, urgency: "High" })
        .select("patientName bloodGroup unitsRequired hospitalName status createdAt")
        .sort({ createdAt: 1 })
        .limit(10)
        .lean();
    }

    if (req.user.role === "donor") {
      const donor = await Donor.findOne({ user: req.user.id });
      if (donor) {
        const helpsGroups = canDonateTo(donor.bloodGroup);
        const matches = await Request.aggregate([
          { $match: { status: { $in: OPEN }, urgency: "High", bloodGroup: { $in: helpsGroups } } },
          { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
        ]);
        alerts.donor = {
          bloodGroup: donor.bloodGroup,
          eligible: donor.eligible,
          nextEligibleDate: donor.nextEligibleDate,
          urgentMatches: matches.map((m) => ({ bloodGroup: m._id, count: m.count })),
        };
      }
    }

    res.json(alerts);
  } catch (err) {
    fail(res, 500, "Failed to load alerts", err);
  }
};
