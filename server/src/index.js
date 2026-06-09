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

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "hcmc-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/masters", masterRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/daily-cause-list", dailyCauseListRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/followups", followupModulesRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Unexpected server error",
  });
});

app.listen(port, () => {
  console.log(`HCMC API listening on port ${port}`);
});
