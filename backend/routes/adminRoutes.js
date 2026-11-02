const express = require("express");
const router = express.Router();
const { listHospitals, setHospitalApproval, getAuditLog } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("admin"));

router.get("/hospitals", listHospitals);
router.put("/hospitals/:id/approval", setHospitalApproval);
router.get("/audit", getAuditLog);

module.exports = router;
