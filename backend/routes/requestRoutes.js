const express = require("express");
const router = express.Router();
const {
  createRequest,
  getRequests,
  updateRequestStatus,
  getReports,
} = require("../controllers/requestController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);

router.get("/reports", authorize("admin"), getReports);
router.post("/", createRequest);
router.get("/", getRequests);
router.put("/:id/status", authorize("admin"), updateRequestStatus);

module.exports = router;
