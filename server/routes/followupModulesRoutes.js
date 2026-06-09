const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
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

router.get("/affidavits", requireAuth, listAffidavits);
router.post("/affidavits", requireAuth, createAffidavit);
router.put("/affidavits/:id", requireAuth, updateAffidavit);

router.get("/contempt-risks", requireAuth, listContemptRisks);
router.post("/contempt-risks", requireAuth, createContemptRisk);
router.put("/contempt-risks/:id", requireAuth, updateContemptRisk);
router.post("/contempt-risks/:id/escalate", requireAuth, escalateContempt);

router.get("/personal-appearances", requireAuth, listAppearances);
router.post("/personal-appearances", requireAuth, createAppearance);
router.put("/personal-appearances/:id", requireAuth, updateAppearance);

module.exports = router;
