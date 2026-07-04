const router = require("express").Router();
const multer = require("multer");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const { listCases, createCase, updateCase, uploadCases } = require("../controllers/caseController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".xlsx")) return cb(null, true);
    cb(new Error("Only .xlsx files are supported"));
  },
});

router.get("/", requireAuth, listCases);
const operationalWriter = allowRoles("JCP", "HCMC_STAFF", "DCP", "ACP", "PI", "IO");
const piUploader = allowRoles("PI");
router.post("/upload", requireAuth, piUploader, upload.single("file"), uploadCases);
router.post("/", requireAuth, operationalWriter, createCase);
router.put("/:id", requireAuth, operationalWriter, updateCase);

module.exports = router;
