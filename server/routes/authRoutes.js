const router = require("express").Router();
const { login, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { loginRateLimit } = require("../middleware/securityMiddleware");

router.post("/login", loginRateLimit, login);
router.get("/me", requireAuth, me);

module.exports = router;
