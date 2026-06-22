const path = require("path");
const multer = require("multer");
const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const c = require("../controllers/operationsController");

const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>cb(null,c.uploadDir),
  filename: (_req,file,cb)=>cb(null,`${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits:{fileSize:15*1024*1024} });

router.get("/evening-logs", requireAuth, c.listEveningLogs);
router.post("/evening-logs", requireAuth, c.saveEveningLog);
router.post("/evening-logs/generate", requireAuth, c.generateEveningLogs);
router.get("/performance", requireAuth, c.listPerformance);
router.post("/performance", requireAuth, c.savePerformance);
router.put("/performance/:id", requireAuth, c.savePerformance);
router.get("/analytics", requireAuth, c.analytics);
router.get("/analytics/export", requireAuth, c.exportAnalytics);
router.get("/analytics/export-pdf", requireAuth, c.exportAnalyticsPdf);
router.get("/documents", requireAuth, c.listDocuments);
router.post("/documents", requireAuth, upload.single("file"), c.uploadDocument);
router.get("/documents/:id/download", requireAuth, c.downloadDocument);
router.get("/settings", requireAuth, c.settings);
router.post("/settings/case-types", requireAuth, c.addCaseType);
router.post("/settings/case-stages", requireAuth, c.addCaseStage);
router.post("/settings/notifications", requireAuth, c.saveNotificationSetting);
router.post("/settings/users", requireAuth, c.createUser);
router.put("/settings/users/:id/active", requireAuth, c.toggleUser);

module.exports = router;
