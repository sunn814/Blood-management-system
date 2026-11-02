const mongoose = require("mongoose");

// A donor must wait 3 months between donations.
const eligibilityCutoff = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d;
};

// Mongo filter: donor has never donated OR last donation was >= 3 months ago.
const eligibleDonorFilter = () => ({
  $or: [{ lastDonationDate: null }, { lastDonationDate: { $lte: eligibilityCutoff() } }],
});

// Escape user text before putting it inside a RegExp (prevents regex injection).
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Returns a positive integer, or null if the value is not one.
const toPositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Reads optional latitude/longitude from a request body.
// Returns { error } if invalid, { point: null } if not given, or { point: GeoJSON Point }.
const parseLatLng = (body) => {
  const { latitude, longitude } = body || {};
  const empty = (v) => v === undefined || v === null || v === "";
  if (empty(latitude) && empty(longitude)) return { point: null };
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (empty(latitude) || empty(longitude) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Latitude and longitude must both be valid numbers" };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: "Location is out of range" };
  }
  return { point: { type: "Point", coordinates: [lng, lat] } };
};

const round = (n, digits) => Number(n.toFixed(digits));

const isValidId = (id) => mongoose.isValidObjectId(id);

// Render sets RENDER=true, so we treat it as production even if NODE_ENV is missing.
const isProduction = () => process.env.NODE_ENV === "production" || !!process.env.RENDER;

// Log the real error on the server; only expose details outside production.
const fail = (res, status, message, err) => {
  if (err) console.error(message, err);
  const body = { message };
  if (err && !isProduction()) body.error = err.message;
  return res.status(status).json(body);
};

// ---- input rules ----
// Phone: optional +, then digits with spaces, dashes or brackets (7 to 18 chars).
const isValidPhone = (p) => typeof p === "string" && /^\+?[0-9][0-9\s\-()]{6,17}$/.test(p.trim());

// Password: 8 to 64 characters with at least one letter and one number.
const isStrongPassword = (p) =>
  typeof p === "string" && p.length >= 8 && p.length <= 64 && /[A-Za-z]/.test(p) && /\d/.test(p);

// Text must be a non-empty string of at most `max` characters.
const isText = (v, max) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;

// Hide all digits except the last 3: "+91 98765 43210" -> "+91 ••••• ••210"
const maskPhone = (p) => String(p || "").replace(/\d(?=(?:\D*\d){3})/g, "•");

module.exports = { isProduction, isValidPhone, isStrongPassword, isText, maskPhone, parseLatLng, round, eligibilityCutoff, eligibleDonorFilter, escapeRegex, toPositiveInt, isValidId, fail };
