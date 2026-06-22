const pool = require("../db/pool");
const { scopeWhere } = require("../middleware/authMiddleware");

const editableFields = [
  "case_no",
  "direction_date",
  "nature_of_direction",
  "compliance_required",
  "deadline",
  "responsible_officer",
  "reminder_sent_date",
  "compliance_filed_date",
  "delay_days",
  "status",
  "escalated",
  "delay_reason",
];

function toBool(value) {
  return value === true || value === "true" || value === "Y" || value === "Yes";
}

function dbValue(value) {
  return value === "" || value === undefined ? null : value;
}

function toDelayDays(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function complianceSelect() {
  return `SELECT c.*, m.case_type, m.crime_no, m.io_name, m.risk_level,
                 ps.station_name AS police_station_name,
                 d.division_name, sd.sub_division_name,
                 CASE
                   WHEN c.compliance_filed_date IS NOT NULL THEN 9999
                   ELSE (c.deadline - CURRENT_DATE)
                 END AS days_remaining
          FROM compliance_tracker c
          JOIN master_hc_register m ON m.case_no = c.case_no
          LEFT JOIN police_stations ps ON ps.police_station_id = m.police_station_id
          LEFT JOIN divisions d ON d.division_id = m.division_id
          LEFT JOIN sub_divisions sd ON sd.sub_division_id = m.sub_division_id`;
}

async function getScopedMasterCase(caseNo, user) {
  const scope = scopeWhere(user, "m");
  const result = await pool.query(
    `SELECT m.*
     FROM master_hc_register m
     WHERE m.case_no = $1 ${scope.text ? scope.text.replace("$1", "$2") : ""}`,
    [caseNo, ...scope.values]
  );
  return result.rows[0];
}

async function ensureComplianceInScope(id, user) {
  const scope = scopeWhere(user, "m");
  const result = await pool.query(
    `SELECT c.id
     FROM compliance_tracker c
     JOIN master_hc_register m ON m.case_no = c.case_no
     WHERE c.id = $1 ${scope.text ? scope.text.replace("$1", "$2") : ""}`,
    [id, ...scope.values]
  );
  return Boolean(result.rowCount);
}

async function listCompliance(req, res, next) {
  try {
    const params = [];
    const filters = [];
    const scope = scopeWhere(req.user, "m");

    params.push(...scope.values);
    if (scope.text) filters.push(scope.text.replace(" AND ", ""));

    const addFilter = (sql, value) => {
      if (value === undefined || value === "") return;
      params.push(value);
      filters.push(sql.replace("?", `$${params.length}`));
    };

    addFilter("c.status = ?", req.query.status);
    addFilter("m.police_station_id = ?", req.query.policeStationId);
    addFilter("c.deadline >= ?", req.query.fromDate);
    addFilter("c.deadline <= ?", req.query.toDate);

    if (req.query.escalated === "true") filters.push("c.escalated = TRUE");
    if (req.query.escalated === "false") filters.push("c.escalated = FALSE");

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      filters.push(
        `(c.case_no ILIKE $${params.length} OR c.responsible_officer ILIKE $${params.length} OR c.compliance_required ILIKE $${params.length} OR ps.station_name ILIKE $${params.length})`
      );
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `${complianceSelect()} ${where}
       ORDER BY c.deadline ASC, c.id DESC
       LIMIT 250`,
      params
    );

    res.json({ compliance: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCompliance(req, res, next) {
  try {
    const masterCase = await getScopedMasterCase(req.body.case_no, req.user);
    if (!masterCase) {
      return res.status(400).json({ message: "Case number is invalid or outside your access scope" });
    }

    const values = {
      ...req.body,
      delay_days: toDelayDays(req.body.delay_days),
      escalated: toBool(req.body.escalated),
      status: req.body.status || "Pending",
    };
    const fields = [...editableFields, "created_by"];
    const placeholders = fields.map((_, index) => `$${index + 1}`);

    const result = await pool.query(
      `INSERT INTO compliance_tracker (${fields.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      fields.map((field) => (field === "created_by" ? req.user.id : dbValue(values[field])))
    );

    res.status(201).json({ compliance: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateCompliance(req, res, next) {
  try {
    const id = Number(req.params.id);
    const allowed = await ensureComplianceInScope(id, req.user);
    if (!allowed) return res.status(404).json({ message: "Compliance entry not found" });

    const values = { ...req.body };
    if (values.case_no) {
      const masterCase = await getScopedMasterCase(values.case_no, req.user);
      if (!masterCase) {
        return res.status(400).json({ message: "Case number is invalid or outside your access scope" });
      }
    }

    if ("delay_days" in values) values.delay_days = toDelayDays(values.delay_days);
    if ("escalated" in values) values.escalated = toBool(values.escalated);

    const fields = editableFields.filter((field) => field in values);
    if (!fields.length) return res.status(400).json({ message: "No fields to update" });

    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const result = await pool.query(
      `UPDATE compliance_tracker
       SET ${assignments.join(", ")}, updated_at = NOW()
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...fields.map((field) => dbValue(values[field])), id]
    );

    res.json({ compliance: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function escalateCompliance(req, res, next) {
  try {
    const id = Number(req.params.id);
    const allowed = await ensureComplianceInScope(id, req.user);
    if (!allowed) return res.status(404).json({ message: "Compliance entry not found" });

    const result = await pool.query(
      `UPDATE compliance_tracker
       SET escalated = TRUE,
           status = CASE WHEN status = 'Closed' THEN status ELSE 'Escalated' END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      compliance: result.rows[0],
      message: "Compliance entry escalated to supervisory review",
    });
  } catch (error) {
    next(error);
  }
}

async function getComplianceSummary(req, res, next) {
  try {
    const scope = scopeWhere(req.user, "m");
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE c.status IN ('Pending', 'Delayed', 'Escalated'))::int AS pending,
         COUNT(*) FILTER (WHERE c.escalated = TRUE)::int AS escalated,
         COUNT(*) FILTER (WHERE c.status IN ('Pending', 'Delayed', 'Escalated') AND c.deadline <= CURRENT_DATE + INTERVAL '2 days')::int AS due_soon
       FROM compliance_tracker c
       JOIN master_hc_register m ON m.case_no = c.case_no
       WHERE 1 = 1 ${scope.text}`,
      scope.values
    );
    res.json({ summary: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCompliance,
  createCompliance,
  updateCompliance,
  escalateCompliance,
  getComplianceSummary,
};
