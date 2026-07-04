const router = require("express").Router();
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const {
  listDailyCauseList,
  createDailyCauseEntry,
  updateDailyCauseEntry,
  generateDailyCauseList,
  previewNotification,
} = require("../controllers/dailyCauseListController");

router.get("/", requireAuth, listDailyCauseList);
const operationalWriter = allowRoles("JCP", "HCMC_STAFF", "DCP", "ACP", "PI", "IO");
router.post("/", requireAuth, operationalWriter, createDailyCauseEntry);
router.post("/generate", requireAuth, operationalWriter, generateDailyCauseList);
router.post("/:id/notify-preview", requireAuth, previewNotification);
router.put("/:id", requireAuth, operationalWriter, updateDailyCauseEntry);

module.exports = router;
