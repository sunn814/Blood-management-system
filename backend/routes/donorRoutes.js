const express = require("express");
const router = express.Router();
const {
  createDonor,
  getDonors,
  getMyDonorProfile,
  updateDonor,
  deleteDonor,
  recordDonation,
} = require("../controllers/donorController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);

router.post("/", createDonor);
router.get("/", getDonors);
router.get("/me", getMyDonorProfile);
router.put("/:id", updateDonor);
router.delete("/:id", authorize("admin"), deleteDonor);
router.post("/:id/donate", authorize("admin"), recordDonation);

module.exports = router;
