const express = require("express");
const router = express.Router();
const { getStock, updateStock } = require("../controllers/stockController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", protect, getStock);
router.put("/:bloodGroup", protect, authorize("admin"), updateStock);

module.exports = router;
