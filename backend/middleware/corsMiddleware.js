
const cors = require("cors");

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Requests without an Origin header
    if (!origin) {
      return callback(null, true);
    }

    // Configured frontend URLs
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Local development only
    if (
      !isProduction &&
      /^http:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

module.exports = cors(corsOptions);
