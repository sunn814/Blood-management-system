const Request = require("../models/Request");
const BloodStock = require("../models/BloodStock");
const Donor = require("../models/Donor");

// @route  POST /api/requests  (hospital or donor raises a request)
exports.createRequest = async (req, res) => {
  try {
    const { patientName, bloodGroup, unitsRequired, hospitalName, contactNumber, urgency } =
      req.body;
    const request = await Request.create({
      requestedBy: req.user.id,
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      contactNumber,
      urgency,
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: "Failed to create request", error: err.message });
  }
};

// @route  GET /api/requests?status=Pending
exports.getRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    // non-admin users only see their own requests
    if (req.user.role !== "admin") filter.requestedBy = req.user.id;

    const requests = await Request.find(filter)
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
};

// @route  PUT /api/requests/:id/status  (admin approves/rejects/fulfills)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body; // Approved | Rejected | Fulfilled
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (status === "Fulfilled") {
      const stock = await BloodStock.findOne({ bloodGroup: request.bloodGroup });
      if (!stock || stock.unitsAvailable < request.unitsRequired) {
        return res.status(400).json({ message: "Not enough stock to fulfil this request" });
      }
      stock.unitsAvailable -= request.unitsRequired;
      await stock.save();
    }

    request.status = status;
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Failed to update request status", error: err.message });
  }
};

// @route  GET /api/requests/reports  (admin dashboard stats)
exports.getReports = async (req, res) => {
  try {
    const stock = await BloodStock.find();
    const totalDonors = await Donor.countDocuments();
    const totalRequests = await Request.countDocuments();
    const pendingRequests = await Request.countDocuments({ status: "Pending" });
    const fulfilledRequests = await Request.countDocuments({ status: "Fulfilled" });

    const requestsByGroup = await Request.aggregate([
      { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
    ]);

    const donationsThisMonth = await Donor.countDocuments({
      lastDonationDate: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });

    res.json({
      stock,
      totalDonors,
      totalRequests,
      pendingRequests,
      fulfilledRequests,
      donationsThisMonth,
      requestsByGroup,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to build report", error: err.message });
  }
};
