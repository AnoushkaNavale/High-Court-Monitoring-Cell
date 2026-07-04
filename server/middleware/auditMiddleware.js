const pool = require("../db/pool");

const sensitiveKeys = new Set(["password", "password_hash", "token", "authorization", "jwt_secret"]);

function sanitize(value, depth = 0) {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeys.has(key.toLowerCase()) ? "[redacted]" : sanitize(item, depth + 1),
    ])
  );
}

function auditMutations(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const startedAt = Date.now();
  res.on("finish", () => {
    if (!req.path.startsWith("/api/")) return;
    pool.query(
      `INSERT INTO audit_logs
        (user_id, user_email, action, resource, status_code, ip_address, user_agent, request_body, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        req.user?.id || null,
        req.user?.email || null,
        req.method,
        req.originalUrl.split("?")[0],
        res.statusCode,
        req.ip,
        String(req.headers["user-agent"] || "").slice(0, 500),
        JSON.stringify(sanitize(req.body || {})).slice(0, 20000),
        Date.now() - startedAt,
      ]
    ).catch((error) => console.error("Audit log write failed:", error.message));
  });
  next();
}

module.exports = { auditMutations, sanitize };
