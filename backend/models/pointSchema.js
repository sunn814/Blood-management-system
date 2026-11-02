const mongoose = require("mongoose");

// GeoJSON point: coordinates are [longitude, latitude].
// Used for donor and request locations (needed for radius search).
module.exports = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);
