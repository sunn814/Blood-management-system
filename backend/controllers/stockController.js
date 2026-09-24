const BloodStock = require("../models/BloodStock");

const ALL_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// @route  GET /api/stock
exports.getStock = async (req, res) => {
  try {
    const stock = await BloodStock.find();
    // ensure every blood group shows up even if no record yet
    const existingGroups = stock.map((s) => s.bloodGroup);
    const missing = ALL_GROUPS.filter((g) => !existingGroups.includes(g)).map((g) => ({
      bloodGroup: g,
      unitsAvailable: 0,
    }));
    res.json([...stock, ...missing]);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stock", error: err.message });
  }
};

// @route  PUT /api/stock/:bloodGroup  (admin manually adjusts units)
exports.updateStock = async (req, res) => {
  try {
    const { unitsAvailable } = req.body;
    const stock = await BloodStock.findOneAndUpdate(
      { bloodGroup: req.params.bloodGroup },
      { unitsAvailable },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: "Failed to update stock", error: err.message });
  }
};
