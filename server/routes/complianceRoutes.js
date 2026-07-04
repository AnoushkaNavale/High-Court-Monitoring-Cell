const router = require("express").Router();
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const {
  listCompliance,
  createCompliance,
  updateCompliance,
  escalateCompliance,
  getComplianceSummary,
} = require("../controllers/complianceController");

router.get("/", requireAuth, listCompliance);
router.get("/summary", requireAuth, getComplianceSummary);
const operationalWriter = allowRoles("JCP", "HCMC_STAFF", "DCP", "ACP", "PI", "IO");
router.post("/", requireAuth, operationalWriter, createCompliance);
router.put("/:id", requireAuth, operationalWriter, updateCompliance);
router.post("/:id/escalate", requireAuth, operationalWriter, escalateCompliance);

module.exports = router;
