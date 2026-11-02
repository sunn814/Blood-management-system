const Donor = require("../models/Donor");
const BloodStock = require("../models/BloodStock");
const { BLOOD_GROUPS, compatibleGroupsFor } = require("../utils/compatibility");
const {
  eligibilityCutoff,
  eligibleDonorFilter,
  escapeRegex,
  toPositiveInt,
  isValidId,
  parseLatLng,
  round,
  fail,
  isValidPhone,
  isText,
  maskPhone,
} = require("../utils/helpers");
const audit = require("../utils/audit");
const AuditLog = require("../models/AuditLog");

const REVEAL_LIMIT_PER_DAY = 20; // contact reveals per hospital per 24 hours

// @route  POST /api/donors   (a donor registers their own profile)
exports.createDonor = async (req, res) => {
  try {
    const existing = await Donor.exists({ user: req.user.id });
    if (existing) {
      return res.status(409).json({ message: "You already have a donor profile" });
    }
    const { name, age, bloodGroup, phone, address } = req.body;
    if (!isText(name, 80) || !isText(address, 200)) {
      return res.status(400).json({ message: "Name (max 80) and address (max 200) are required" });
    }
    if (!isValidPhone(phone)) return res.status(400).json({ message: "Enter a valid phone number" });
    const geo = parseLatLng(req.body);
    if (geo.error) return res.status(400).json({ message: geo.error });
    const donor = await Donor.create({
      user: req.user.id,
      name,
      age,
      bloodGroup,
      phone,
      address,
      ...(geo.point && { location: geo.point }),
    });
    res.status(201).json(donor);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    fail(res, 500, "Failed to create donor profile", err);
  }
};

// @route  GET /api/donors?bloodGroup=A+&search=ravi   (admin only)
exports.getDonors = async (req, res) => {
  try {
    const { bloodGroup, search } = req.query;
    const filter = {};
    if (typeof bloodGroup === "string" && bloodGroup) {
      if (!BLOOD_GROUPS.includes(bloodGroup)) {
        return res.status(400).json({ message: "Invalid blood group" });
      }
      filter.bloodGroup = bloodGroup;
    }
    if (typeof search === "string" && search.trim()) {
      const rx = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: rx, $options: "i" } },
        { phone: { $regex: rx, $options: "i" } },
        { address: { $regex: rx, $options: "i" } },
      ];
    }
    const donors = await Donor.find(filter).sort({ createdAt: -1 });
    res.json(donors);
  } catch (err) {
    fail(res, 500, "Failed to fetch donors", err);
  }
};

// @route  GET /api/donors/me   (donor role)
exports.getMyDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    res.json(donor);
  } catch (err) {
    fail(res, 500, "Failed to fetch donor profile", err);
  }
};

// @route  PUT /api/donors/:id   (owner or admin)
exports.updateDonor = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Donor not found" });
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });

    const isOwner = String(donor.user) === String(req.user.id);
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "You can only edit your own profile" });
    }

    // Whitelist: never allow changing `user`, donation counters or dates from the client.
    const allowed = ["name", "age", "phone", "address"];
    if (req.user.role === "admin") allowed.push("bloodGroup");
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) donor[field] = req.body[field];
    });

    if (req.body.name !== undefined && !isText(req.body.name, 80)) {
      return res.status(400).json({ message: "Name must be 1 to 80 characters" });
    }
    if (req.body.address !== undefined && !isText(req.body.address, 200)) {
      return res.status(400).json({ message: "Address must be 1 to 200 characters" });
    }
    if (req.body.phone !== undefined && !isValidPhone(req.body.phone)) {
      return res.status(400).json({ message: "Enter a valid phone number" });
    }
    const geo = parseLatLng(req.body);
    if (geo.error) return res.status(400).json({ message: geo.error });
    if (geo.point) donor.location = geo.point;

    await donor.save();
    res.json(donor);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    fail(res, 500, "Failed to update donor", err);
  }
};

// @route  DELETE /api/donors/:id  (admin only)
exports.deleteDonor = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Donor not found" });
    const donor = await Donor.findByIdAndDelete(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    audit(req, "delete_donor", donor._id, `Deleted donor ${donor.name}`);
    res.json({ message: "Donor deleted successfully" });
  } catch (err) {
    fail(res, 500, "Failed to delete donor", err);
  }
};

// @route  POST /api/donors/:id/donate  (admin marks a donation, adds units to stock)
exports.recordDonation = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Donor not found" });

    const units = toPositiveInt(req.body.units ?? 1);
    if (!units || units > 3) {
      return res.status(400).json({ message: "Units must be a whole number between 1 and 3" });
    }

    // Single atomic update: only succeeds if the donor is eligible, so a
    // double-click / two admins cannot record the same donation twice.
    const donor = await Donor.findOneAndUpdate(
      { _id: req.params.id, $or: [{ lastDonationDate: null }, { lastDonationDate: { $lte: eligibilityCutoff() } }] },
      { $set: { lastDonationDate: new Date() }, $inc: { totalDonations: 1 } },
      { new: true }
    );

    if (!donor) {
      const exists = await Donor.exists({ _id: req.params.id });
      if (!exists) return res.status(404).json({ message: "Donor not found" });
      return res.status(400).json({
        message: "Donor is not yet eligible (must wait 3 months between donations)",
      });
    }

    await BloodStock.findOneAndUpdate(
      { bloodGroup: donor.bloodGroup },
      { $inc: { unitsAvailable: units } },
      { upsert: true, new: true }
    );

    audit(req, "record_donation", donor._id, `${units} unit(s) of ${donor.bloodGroup} from ${donor.name}`);
    res.json({ message: "Donation recorded and stock updated", donor });
  } catch (err) {
    fail(res, 500, "Failed to record donation", err);
  }
};

// @route  GET /api/donors/compatible?bloodGroup=A+&lat=19.2&lng=72.9&radiusKm=25   (admin, hospital)
// Blood Compatibility Matcher + radius search:
// for a patient's blood group, returns every group that can safely donate,
// the current stock of each, and the eligible registered donors (exact match first).
// If lat/lng are given, only donors within radiusKm are returned, nearest first.
exports.getCompatibleDonors = async (req, res) => {
  try {
    const { bloodGroup } = req.query;
    if (typeof bloodGroup !== "string" || !BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ message: "A valid bloodGroup is required" });
    }

    const isAdmin = req.user.role === "admin";

    // optional radius search
    const hasGeo = req.query.lat !== undefined || req.query.lng !== undefined;
    let center = null;
    let radiusKm = null;
    if (hasGeo) {
      const geo = parseLatLng({ latitude: req.query.lat, longitude: req.query.lng });
      if (geo.error || !geo.point) return res.status(400).json({ message: "Valid lat and lng are required" });
      center = geo.point;
      radiusKm = req.query.radiusKm === undefined ? 25 : Number(req.query.radiusKm);
      const maxRadius = isAdmin ? 100 : 50;
      if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > maxRadius) {
        return res.status(400).json({ message: `Distance must be between 1 and ${maxRadius} km` });
      }
    }

    const groups = compatibleGroupsFor(bloodGroup);
    const donorQuery = { bloodGroup: { $in: groups }, ...eligibleDonorFilter() };
    const fields = "name bloodGroup phone address totalDonations lastDonationDate location";

    const donorsPromise = center
      ? Donor.aggregate([
          {
            $geoNear: {
              near: center,
              distanceField: "distanceMeters",
              maxDistance: radiusKm * 1000,
              spherical: true,
              query: donorQuery,
            },
          },
          { $limit: 200 },
          { $project: Object.fromEntries(fields.split(" ").map((f) => [f, 1]).concat([["distanceMeters", 1]])) },
        ])
      : Donor.find(donorQuery).select(fields).limit(200).lean();

    const [stockDocs, donors] = await Promise.all([
      BloodStock.find({ bloodGroup: { $in: groups } }).lean(),
      donorsPromise,
    ]);

    const stockMap = Object.fromEntries(stockDocs.map((s) => [s.bloodGroup, s.unitsAvailable]));
    const stock = groups.map((g) => ({
      bloodGroup: g,
      unitsAvailable: stockMap[g] || 0,
      exact: g === bloodGroup,
    }));

    // Privacy: hospitals only get approximate pins (~1 km); admins get precise ones.
    const digits = req.user.role === "admin" ? 4 : 2;
    const donorList = donors
      .map((d) => {
        const { location, distanceMeters, ...rest } = d;
        return {
          ...rest,
          match: d.bloodGroup === bloodGroup ? "exact" : "compatible",
          // Hospitals only get whole-km distances (precise ones would let someone
          // pinpoint a donor by searching from several centres).
          distanceKm:
            distanceMeters === undefined
              ? null
              : isAdmin
              ? round(distanceMeters / 1000, 1)
              : Math.max(1, Math.round(distanceMeters / 1000)),
          lat: location ? round(location.coordinates[1], digits) : null,
          lng: location ? round(location.coordinates[0], digits) : null,
        };
      })
      .sort((a, b) => {
        // exact group first, then nearest (radius search) or compatibility order, then longest since last donation
        const exact = (a.match === "exact" ? 0 : 1) - (b.match === "exact" ? 0 : 1);
        if (exact !== 0) return exact;
        if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        const g = groups.indexOf(a.bloodGroup) - groups.indexOf(b.bloodGroup);
        if (g !== 0) return g;
        return (a.lastDonationDate ? +new Date(a.lastDonationDate) : 0) -
          (b.lastDonationDate ? +new Date(b.lastDonationDate) : 0);
      })
      .slice(0, isAdmin ? 50 : 20)
      .map((d) => {
        if (isAdmin) return d;
        // Hospitals never get the address, donation history or the full phone number.
        // They use "Show number" (limited per day and logged) when they really need to call.
        const { phone, address, totalDonations, lastDonationDate, ...safe } = d;
        return { ...safe, phoneMasked: maskPhone(phone) };
      });

    res.json({
      recipientGroup: bloodGroup,
      compatibleGroups: groups,
      stock,
      center: center ? { lat: center.coordinates[1], lng: center.coordinates[0], radiusKm } : null,
      donors: donorList,
    });
  } catch (err) {
    fail(res, 500, "Failed to find compatible donors", err);
  }
};

// @route  POST /api/donors/:id/reveal   (admin, approved hospital)
// Shows one donor's full phone number. Limited per day and written to the audit log,
// so nobody can quietly collect the whole donor list.
exports.revealContact = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: "Donor not found" });
    const donor = await Donor.findById(req.params.id).select("name phone");
    if (!donor) return res.status(404).json({ message: "Donor not found" });

    if (req.user.role !== "admin") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const used = await AuditLog.countDocuments({
        actor: req.user.id,
        action: "reveal_contact",
        createdAt: { $gte: since },
      });
      if (used >= REVEAL_LIMIT_PER_DAY) {
        return res
          .status(429)
          .json({ message: `You can view ${REVEAL_LIMIT_PER_DAY} donor numbers per day. Try again tomorrow.` });
      }
    }

    await audit(req, "reveal_contact", donor._id, `Viewed phone number of ${donor.name}`);
    res.json({ phone: donor.phone });
  } catch (err) {
    fail(res, 500, "Failed to show contact number", err);
  }
};
