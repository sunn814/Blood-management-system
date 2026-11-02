const rateLimit = require("express-rate-limit");

// Limits are counted per logged-in user (these run after `protect`).
const perUser = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? req.user.id : "anonymous"),
    message: { message },
  });

// Donor search: stops scripts from sweeping the whole donor list.
const searchLimiter = perUser(10 * 60 * 1000, 30, "Too many searches. Please wait a few minutes.");
// Showing a phone number
const revealLimiter = perUser(10 * 60 * 1000, 15, "Too many number requests. Please wait a few minutes.");
// Creating blood requests
const requestLimiter = perUser(60 * 60 * 1000, 10, "Too many requests created. Please try again later.");

module.exports = { searchLimiter, revealLimiter, requestLimiter };
