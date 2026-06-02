const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { getMasters } = require("../controllers/masterController");

router.get("/", requireAuth, getMasters);

module.exports = router;
