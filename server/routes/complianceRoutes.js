const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const {
  listCompliance,
  createCompliance,
  updateCompliance,
  escalateCompliance,
  getComplianceSummary,
} = require("../controllers/complianceController");

router.get("/", requireAuth, listCompliance);
router.get("/summary", requireAuth, getComplianceSummary);
router.post("/", requireAuth, createCompliance);
router.put("/:id", requireAuth, updateCompliance);
router.post("/:id/escalate", requireAuth, escalateCompliance);

module.exports = router;
