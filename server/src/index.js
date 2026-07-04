const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const authRoutes = require("../routes/authRoutes");
const masterRoutes = require("../routes/masterRoutes");
const caseRoutes = require("../routes/caseRoutes");
const dailyCauseListRoutes = require("../routes/dailyCauseListRoutes");
const complianceRoutes = require("../routes/complianceRoutes");
const followupModulesRoutes = require("../routes/followupModulesRoutes");
const operationsRoutes = require("../routes/operationsRoutes");
const automationRoutes = require("../routes/automationRoutes");
const { startAutomationJobs } = require("../services/automationJobs");
const { auditMutations } = require("../middleware/auditMiddleware");
const pool = require("../db/pool");
const { securityHeaders } = require("../middleware/securityMiddleware");

const app = express();
const port = process.env.PORT || 5000;

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use(auditMutations);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "hcmc-api", database: "ok", uptimeSeconds: Math.round(process.uptime()) });
  } catch (_error) {
    res.status(503).json({ status: "degraded", service: "hcmc-api", database: "unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/masters", masterRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/daily-cause-list", dailyCauseListRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/followups", followupModulesRoutes);
app.use("/api/operations", operationsRoutes);
app.use("/api/automation", automationRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Unexpected server error",
  });
});

function validateRuntimeConfig() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
}

if (require.main === module) {
  validateRuntimeConfig();
  app.listen(port, () => {
    console.log(`HCMC API listening on port ${port}`);
    startAutomationJobs();
  });
}

module.exports = { app, validateRuntimeConfig };
