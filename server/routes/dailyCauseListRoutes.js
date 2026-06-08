const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const {
  listDailyCauseList,
  createDailyCauseEntry,
  updateDailyCauseEntry,
  generateDailyCauseList,
  previewNotification,
} = require("../controllers/dailyCauseListController");

router.get("/", requireAuth, listDailyCauseList);
router.post("/", requireAuth, createDailyCauseEntry);
router.post("/generate", requireAuth, generateDailyCauseList);
router.post("/:id/notify-preview", requireAuth, previewNotification);
router.put("/:id", requireAuth, updateDailyCauseEntry);

module.exports = router;
