require("dotenv").config();
const express = require("express");
// const cors = require("cors");
const corsMiddleware = require("./middleware/corsMiddleware");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const donorRoutes = require("./routes/donorRoutes");
const stockRoutes = require("./routes/stockRoutes");
const requestRoutes = require("./routes/requestRoutes");
const alertsRoutes = require("./routes/alertsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { isProduction } = require("./utils/helpers");

// Fail fast if the important settings are missing
if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error("Missing JWT_SECRET or MONGO_URI in environment variables");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); // needed on Render so rate limiting sees the real client IP

connectDB();

app.use(helmet());

// CORS configuration
if (!process.env.CLIENT_URL && isProduction()) {
  console.warn("WARNING: CLIENT_URL is not set.");
}

app.use(corsMiddleware);

app.use(express.json({ limit: "10kb" }));
// Slow down password guessing on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again after 15 minutes" },
});

// General limit for every API route (per IP); stricter limits are on login and on search.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please slow down" },
  })
);

app.get("/", (req, res) => {
  res.json({ message: "Blood Management System API is running" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
