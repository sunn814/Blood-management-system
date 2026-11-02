const Request = require("../models/Request");
const BloodStock = require("../models/BloodStock");
const Donor = require("../models/Donor");
const { BLOOD_GROUPS, compatibleGroupsFor } = require("../utils/compatibility");
const {
  toPositiveInt,
  isValidId,
  parseLatLng,
  isValidPhone,
  isText: isTextMax,
  fail,
} = require("../utils/helpers");
const audit = require("../utils/audit");

const MAX_OPEN_REQUESTS = 5; // open (Pending/Approved) requests one account can have

const STATUSES = ["Pending", "Approved", "Rejected", "Fulfilled"];
const URGENCIES = ["Low", "Medium", "High"];

// Allowed status changes. Rejected and Fulfilled are final.
const TRANSITIONS = {
  Pending: ["Approved", "Rejected", "Fulfilled"],
  Approved: ["Fulfilled", "Rejected"],
  Rejected: [],
  Fulfilled: [],
};


// @route  POST /api/requests  (hospital or donor raises a request)
exports.createRequest = async (req, res) => {
  try {
    const { patientName, bloodGroup, unitsRequired, hospitalName, contactNumber, urgency } = req.body;

    const units = toPositiveInt(unitsRequired);
    if (!isTextMax(patientName, 80) || !isTextMax(hospitalName, 100)) {
      return res.status(400).json({ message: "Patient name (max 80) and hospital name (max 100) are required" });
    }
    if (!isValidPhone(contactNumber)) {
      return res.status(400).json({ message: "Enter a valid contact number" });
    }
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ message: "Select a valid blood group" });
    }
    if (!units || units > 10) {
      return res.status(400).json({ message: "Units required must be a whole number from 1 to 10" });
    }
    if (urgency !== undefined && !URGENCIES.includes(urgency)) {
      return res.status(400).json({ message: "Invalid urgency" });
    }

    // Only admins and approved hospitals can mark a request as High urgency
    // (stops fake emergencies from flooding the alerts).
    const mayUseHigh = req.user.role === "admin" || (req.user.role === "hospital" && req.user.approved);
    if (urgency === "High" && !mayUseHigh) {
      return res.status(403).json({ message: "High urgency can only be set by an approved hospital" });
    }

    if (req.user.role !== "admin") {
      const open = await Request.countDocuments({
        requestedBy: req.user.id,
        status: { $in: ["Pending", "Approved"] },
      });
      if (open >= MAX_OPEN_REQUESTS) {
        return res.status(429).json({
          message: `You already have ${MAX_OPEN_REQUESTS} open requests. Wait until they are completed.`,
        });
      }
    }

    const geo = parseLatLng(req.body);
    if (geo.error) return res.status(400).json({ message: geo.error });

    const request = await Request.create({
      requestedBy: req.user.id,
      ...(geo.point && { location: geo.point }),
      statusHistory: [{ status: "Pending", changedBy: req.user.id, note: "Request placed" }],
      patientName: patientName.trim(),
      bloodGroup,
      unitsRequired: units,
      hospitalName: hospitalName.trim(),
      contactNumber: contactNumber.trim(),
      urgency: urgency || "Medium",
    });
    res.status(201).json(request);
  } catch (err) {
    fail(res, 500, "Failed to create request", err);
  }
};

// @route  GET /api/requests?status=Pending
exports.getRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status !== undefined && status !== "") {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
      filter.status = status;
    }

    // non-admin users only see their own requests
    if (req.user.role !== "admin") filter.requestedBy = req.user.id;

    const requests = await Request.find(filter)
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    fail(res, 500, "Failed to fetch requests", err);
  }
};

// @route  GET /api/requests/:id   (admin, or the person who raised the request)
// Request tracking: the request plus its full status history.
exports.getRequestById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Request not found" });
    const request = await Request.findById(req.params.id)
      .populate("requestedBy", "name email")
      .populate("statusHistory.changedBy", "name role");
    if (!request) return res.status(404).json({ message: "Request not found" });

    const isOwner = request.requestedBy && String(request.requestedBy._id) === String(req.user.id);
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "You can only track your own requests" });
    }
    res.json(request);
  } catch (err) {
    fail(res, 500, "Failed to fetch request", err);
  }
};

// @route  PUT /api/requests/:id/status  (admin approves/rejects/fulfills)
// body: { status, fromGroup? }  - fromGroup lets the admin fulfil from a
// COMPATIBLE group when the exact group is out of stock (e.g. A+ patient <- O+ stock).
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status, fromGroup } = req.body;
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Request not found" });
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (!TRANSITIONS[request.status].includes(status)) {
      return res
        .status(400)
        .json({ message: `Cannot change a ${request.status} request to ${status}` });
    }

    if (status === "Fulfilled") {
      const compatible = compatibleGroupsFor(request.bloodGroup);
      const source = fromGroup || request.bloodGroup;
      if (!compatible.includes(source)) {
        return res
          .status(400)
          .json({ message: `${source} blood is not compatible with a ${request.bloodGroup} patient` });
      }

      // 1) take the units atomically - fails if stock is not enough
      const stock = await BloodStock.findOneAndUpdate(
        { bloodGroup: source, unitsAvailable: { $gte: request.unitsRequired } },
        { $inc: { unitsAvailable: -request.unitsRequired } },
        { new: true }
      );
      if (!stock) {
        // suggest other compatible groups that DO have enough units
        const others = await BloodStock.find({
          bloodGroup: { $in: compatible.filter((g) => g !== source) },
          unitsAvailable: { $gte: request.unitsRequired },
        }).lean();
        const alternatives = others
          .map((s) => ({ bloodGroup: s.bloodGroup, unitsAvailable: s.unitsAvailable }))
          .sort((a, b) => compatible.indexOf(a.bloodGroup) - compatible.indexOf(b.bloodGroup));
        return res.status(400).json({
          message: `Not enough ${source} stock to fulfil this request`,
          alternatives,
        });
      }

      // 2) mark fulfilled only if nobody changed the request meanwhile
      const note =
        source === request.bloodGroup
          ? `${request.unitsRequired} unit(s) of ${source} issued`
          : `${request.unitsRequired} unit(s) of ${source} issued as a compatible substitute`;
      const updated = await Request.findOneAndUpdate(
        { _id: request._id, status: request.status },
        {
          $set: { status: "Fulfilled", fulfilledFrom: source },
          $push: { statusHistory: { status: "Fulfilled", changedBy: req.user.id, note } },
        },
        { new: true }
      );
      if (!updated) {
        await BloodStock.updateOne({ bloodGroup: source }, { $inc: { unitsAvailable: request.unitsRequired } });
        return res.status(409).json({ message: "Request was changed by someone else, please refresh" });
      }
      audit(req, "request_fulfilled", updated._id, `${request.unitsRequired} unit(s) from ${source}`);
      return res.json(updated);
    }

    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 200) : undefined;
    const updated = await Request.findOneAndUpdate(
      { _id: request._id, status: request.status },
      {
        $set: { status },
        $push: { statusHistory: { status, changedBy: req.user.id, ...(note && { note }) } },
      },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: "Request was changed by someone else, please refresh" });
    }
    audit(req, `request_${status.toLowerCase()}`, updated._id, `${request.patientName}`);
    res.json(updated);
  } catch (err) {
    fail(res, 500, "Failed to update request status", err);
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

    const now = new Date();
    const donationsThisMonth = await Donor.countDocuments({
      lastDonationDate: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
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
    fail(res, 500, "Failed to build report", err);
  }
};
