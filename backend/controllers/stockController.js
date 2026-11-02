const BloodStock = require("../models/BloodStock");
const { BLOOD_GROUPS } = require("../utils/compatibility");
const { fail } = require("../utils/helpers");
const audit = require("../utils/audit");

// @route  GET /api/stock
exports.getStock = async (req, res) => {
  try {
    const stock = await BloodStock.find();
    // ensure every blood group shows up even if no record yet
    const existingGroups = stock.map((s) => s.bloodGroup);
    const missing = BLOOD_GROUPS.filter((g) => !existingGroups.includes(g)).map((g) => ({
      bloodGroup: g,
      unitsAvailable: 0,
    }));
    res.json([...stock, ...missing]);
  } catch (err) {
    fail(res, 500, "Failed to fetch stock", err);
  }
};

// @route  PUT /api/stock/:bloodGroup  (admin manually adjusts units)
exports.updateStock = async (req, res) => {
  try {
    const { bloodGroup } = req.params;
    const units = Number(req.body.unitsAvailable);
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ message: "Invalid blood group" });
    }
    if (!Number.isInteger(units) || units < 0 || units > 10000) {
      return res.status(400).json({ message: "Units must be a whole number (0 or more)" });
    }
    const stock = await BloodStock.findOneAndUpdate(
      { bloodGroup },
      { unitsAvailable: units },
      { upsert: true, new: true, runValidators: true }
    );
    audit(req, "update_stock", bloodGroup, `Set to ${units} units`);
    res.json(stock);
  } catch (err) {
    fail(res, 500, "Failed to update stock", err);
  }
};
