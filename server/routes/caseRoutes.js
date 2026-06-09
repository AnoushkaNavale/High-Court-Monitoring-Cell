const router = require("express").Router();
const multer = require("multer");
const { requireAuth } = require("../middleware/authMiddleware");
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
router.post("/upload", requireAuth, upload.single("file"), uploadCases);
router.post("/", requireAuth, createCase);
router.put("/:id", requireAuth, updateCase);

module.exports = router;
