const express = require("express");
const router = express.Router();
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  getReports,
} = require("../controllers/requestController");
const { protect, authorize, requireApproved } = require("../middleware/auth");
const { requestLimiter } = require("../middleware/limits");

router.use(protect);

router.get("/reports", authorize("admin"), getReports);
router.post("/", requireApproved, requestLimiter, createRequest);
router.get("/", getRequests);
router.get("/:id", getRequestById); // keep below /reports so "reports" is not read as an id
router.put("/:id/status", authorize("admin"), updateRequestStatus);

module.exports = router;
