const Donor = require("../models/Donor");
const BloodStock = require("../models/BloodStock");

// @route  POST /api/donors   (donor registers their own profile)
exports.createDonor = async (req, res) => {
  try {
    const { name, age, bloodGroup, phone, address } = req.body;
    const donor = await Donor.create({
      user: req.user.id,
      name,
      age,
      bloodGroup,
      phone,
      address,
    });
    res.status(201).json(donor);
  } catch (err) {
    res.status(500).json({ message: "Failed to create donor profile", error: err.message });
  }
};

// @route  GET /api/donors?bloodGroup=A+&search=ravi
exports.getDonors = async (req, res) => {
  try {
    const { bloodGroup, search } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }
    const donors = await Donor.find(filter).sort({ createdAt: -1 });
    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch donors", error: err.message });
  }
};

// @route  GET /api/donors/me
exports.getMyDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    res.json(donor);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch donor profile", error: err.message });
  }
};

// @route  PUT /api/donors/:id
exports.updateDonor = async (req, res) => {
  try {
    const donor = await Donor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    res.json(donor);
  } catch (err) {
    res.status(500).json({ message: "Failed to update donor", error: err.message });
  }
};

// @route  DELETE /api/donors/:id  (admin only)
exports.deleteDonor = async (req, res) => {
  try {
    const donor = await Donor.findByIdAndDelete(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    res.json({ message: "Donor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete donor", error: err.message });
  }
};

// @route  POST /api/donors/:id/donate  (admin marks a donation, adds units to stock)
exports.recordDonation = async (req, res) => {
  try {
    const { units = 1 } = req.body;
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (donor.lastDonationDate && donor.lastDonationDate > threeMonthsAgo) {
      return res.status(400).json({
        message: "Donor is not yet eligible (must wait 3 months between donations)",
      });
    }

    donor.lastDonationDate = new Date();
    donor.totalDonations += 1;
    donor.isEligible = false;
    await donor.save();

    await BloodStock.findOneAndUpdate(
      { bloodGroup: donor.bloodGroup },
      { $inc: { unitsAvailable: units } },
      { upsert: true, new: true }
    );

    res.json({ message: "Donation recorded and stock updated", donor });
  } catch (err) {
    res.status(500).json({ message: "Failed to record donation", error: err.message });
  }
};
