const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { listCases, createCase, updateCase } = require("../controllers/caseController");

router.get("/", requireAuth, listCases);
router.post("/", requireAuth, createCase);
router.put("/:id", requireAuth, updateCase);

module.exports = router;
