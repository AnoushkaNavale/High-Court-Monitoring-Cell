const attempts = new Map();

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}

function loginRateLimit(req, res, next) {
  const now = Date.now();
  const key = `${req.ip || "unknown"}:${String(req.body?.email || "").trim().toLowerCase()}`;
  const current = attempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + 15 * 60 * 1000;
  }
  current.count += 1;
  attempts.set(key, current);
  res.setHeader("RateLimit-Limit", "20");
  res.setHeader("RateLimit-Remaining", String(Math.max(0, 20 - current.count)));
  if (current.count > 20) return res.status(429).json({ message: "Too many login attempts. Try again later." });
  next();
}

module.exports = { securityHeaders, loginRateLimit };
