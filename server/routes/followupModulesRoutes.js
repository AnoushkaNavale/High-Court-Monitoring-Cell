const router = require("express").Router();
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const {
  listAffidavits,
  createAffidavit,
  updateAffidavit,
  listContemptRisks,
  createContemptRisk,
  updateContemptRisk,
  escalateContempt,
  listAppearances,
  createAppearance,
  updateAppearance,
  followupSummary,
} = require("../controllers/followupModulesController");

router.get("/summary", requireAuth, followupSummary);
const operationalWriter = allowRoles("JCP", "HCMC_STAFF", "DCP", "ACP", "PI", "IO");

router.get("/affidavits", requireAuth, listAffidavits);
router.post("/affidavits", requireAuth, operationalWriter, createAffidavit);
router.put("/affidavits/:id", requireAuth, operationalWriter, updateAffidavit);

router.get("/contempt-risks", requireAuth, listContemptRisks);
router.post("/contempt-risks", requireAuth, operationalWriter, createContemptRisk);
router.put("/contempt-risks/:id", requireAuth, operationalWriter, updateContemptRisk);
router.post("/contempt-risks/:id/escalate", requireAuth, operationalWriter, escalateContempt);

router.get("/personal-appearances", requireAuth, listAppearances);
router.post("/personal-appearances", requireAuth, operationalWriter, createAppearance);
router.put("/personal-appearances/:id", requireAuth, operationalWriter, updateAppearance);

module.exports = router;
