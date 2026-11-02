const express = require("express");
const router = express.Router();
const {
  createDonor,
  getDonors,
  getMyDonorProfile,
  getCompatibleDonors,
  updateDonor,
  deleteDonor,
  recordDonation,
  revealContact,
} = require("../controllers/donorController");
const { protect, authorize, requireApproved } = require("../middleware/auth");
const { searchLimiter, revealLimiter } = require("../middleware/limits");

router.use(protect);

router.post("/", authorize("donor"), createDonor);
router.get("/", authorize("admin"), getDonors);
router.get("/me", authorize("donor"), getMyDonorProfile);
router.get("/compatible", authorize("admin", "hospital"), requireApproved, searchLimiter, getCompatibleDonors);
router.post("/:id/reveal", authorize("admin", "hospital"), requireApproved, revealLimiter, revealContact);
router.put("/:id", updateDonor); // owner-or-admin check lives in the controller
router.delete("/:id", authorize("admin"), deleteDonor);
router.post("/:id/donate", authorize("admin"), recordDonation);

module.exports = router;
