const path = require("path");
const multer = require("multer");
const router = require("express").Router();
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const c = require("../controllers/operationsController");

const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>cb(null,c.uploadDir),
  filename: (_req,file,cb)=>cb(null,`${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const allowedDocumentTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);
const upload = multer({
  storage,
  limits:{fileSize:15*1024*1024},
  fileFilter: (_req,file,cb) => allowedDocumentTypes.has(file.mimetype)
    ? cb(null,true)
    : cb(Object.assign(new Error("Only PDF, PNG, and JPEG documents are allowed"),{status:400})),
});

router.get("/evening-logs", requireAuth, c.listEveningLogs);
const operationalWriter = allowRoles("JCP", "HCMC_STAFF", "DCP", "ACP", "PI", "IO");
const performanceManager = allowRoles("JCP", "HCMC_STAFF", "DCP", "ACP");
const piUploader = allowRoles("PI");
router.post("/evening-logs", requireAuth, operationalWriter, c.saveEveningLog);
router.post("/evening-logs/generate", requireAuth, operationalWriter, c.generateEveningLogs);
router.get("/performance", requireAuth, performanceManager, c.listPerformance);
router.post("/performance", requireAuth, performanceManager, c.savePerformance);
router.put("/performance/:id", requireAuth, performanceManager, c.savePerformance);
router.get("/analytics", requireAuth, c.analytics);
router.get("/analytics/export", requireAuth, c.exportAnalytics);
router.get("/analytics/export-pdf", requireAuth, c.exportAnalyticsPdf);
router.get("/alerts", requireAuth, c.listAlerts);
router.put("/alerts/read", requireAuth, c.markAlertsRead);
router.get("/documents", requireAuth, c.listDocuments);
router.post("/documents", requireAuth, piUploader, upload.single("file"), c.uploadDocument);
router.get("/documents/:id/download", requireAuth, c.downloadDocument);
const adminOnly = allowRoles("JCP", "HCMC_STAFF");
router.get("/settings", requireAuth, adminOnly, c.settings);
router.post("/settings/case-types", requireAuth, adminOnly, c.addCaseType);
router.post("/settings/case-stages", requireAuth, adminOnly, c.addCaseStage);
router.post("/settings/notifications", requireAuth, adminOnly, c.saveNotificationSetting);
router.post("/settings/users", requireAuth, adminOnly, c.createUser);
router.put("/settings/users/:id/active", requireAuth, adminOnly, c.toggleUser);
router.get("/audit-logs", requireAuth, adminOnly, c.listAuditLogs);
router.get("/import-issues", requireAuth, adminOnly, c.listImportIssues);
router.post("/import-issues/:id/resolve", requireAuth, adminOnly, c.resolveImportIssue);

module.exports = router;
