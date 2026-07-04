const pool = require("../db/pool");
const { scopeWhere } = require("../middleware/authMiddleware");
const { paginationFromQuery, paginationMeta } = require("../utils/pagination");

const configs = {
  affidavit: {
    table: "affidavit_status",
    collection: "affidavits",
    fields: [
      "case_no",
      "police_station_id",
      "io_name",
      "date_notice_received",
      "date_remarks_sought",
      "remarks_received_date",
      "legal_vetting_done",
      "affidavit_filed_date",
      "delay_days",
      "reason_for_delay",
      "status",
    ],
    boolFields: ["legal_vetting_done"],
    numberFields: ["delay_days"],
    defaultStatus: "Pending",
    selectExtra: "",
  },
  contempt: {
    table: "contempt_risk",
    collection: "risks",
    fields: [
      "case_no",
      "order_date",
      "compliance_deadline",
      "nature_of_risk",
      "responsible_officer",
      "compliance_done",
      "escalation_level",
      "remarks",
    ],
    boolFields: ["compliance_done"],
    numberFields: [],
    selectExtra: ", (c.compliance_deadline - CURRENT_DATE) AS days_remaining",
  },
  appearance: {
    table: "personal_appearance",
    collection: "appearances",
    fields: [
      "case_no",
      "officer_name",
      "rank",
      "appearance_date",
      "court_hall",
      "appearance_confirmed",
      "order_after_appearance",
      "next_date",
    ],
    boolFields: ["appearance_confirmed"],
    numberFields: [],
    selectExtra: ", (c.appearance_date - CURRENT_DATE) AS days_remaining",
  },
};

function toBool(value) {
  return value === true || value === "true" || value === "Y" || value === "Yes" || value === "YES" || value === "1";
}

function dbValue(value) {
  return value === "" || value === undefined ? null : value;
}

function normalizeValues(config, body) {
  const values = { ...body };
  for (const field of config.boolFields) {
    if (field in values) values[field] = toBool(values[field]);
  }
  for (const field of config.numberFields) {
    if (field in values) {
      const parsed = Number(values[field]);
      values[field] = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
    }
  }
  return values;
}

function selectSql(config) {
  const stationExpression = config.table === "affidavit_status" ? "COALESCE(c.police_station_id, m.police_station_id)" : "m.police_station_id";
  return `SELECT c.*, m.case_type, m.crime_no, m.io_name AS master_io_name,
                 m.risk_level, ps.station_name AS police_station_name,
                 d.division_name, sd.sub_division_name
                 ${config.selectExtra}
          FROM ${config.table} c
          JOIN master_hc_register m ON m.case_no = c.case_no
          LEFT JOIN police_stations ps ON ps.police_station_id = ${stationExpression}
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

async function ensureInScope(config, id, user) {
  const scope = scopeWhere(user, "m");
  const result = await pool.query(
    `SELECT c.id
     FROM ${config.table} c
     JOIN master_hc_register m ON m.case_no = c.case_no
     WHERE c.id = $1 ${scope.text ? scope.text.replace("$1", "$2") : ""}`,
    [id, ...scope.values]
  );
  return Boolean(result.rowCount);
}

function listModule(name) {
  const config = configs[name];
  return async (req, res, next) => {
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

      addFilter("c.case_no ILIKE ?", req.query.caseNo ? `%${req.query.caseNo}%` : "");
      addFilter("m.police_station_id = ?", req.query.policeStationId);
      if ("status" in req.query) addFilter("c.status = ?", req.query.status);
      if ("escalationLevel" in req.query) addFilter("c.escalation_level = ?", req.query.escalationLevel);

      if (req.query.search) {
        params.push(`%${req.query.search}%`);
        filters.push(
          `(c.case_no ILIKE $${params.length} OR ps.station_name ILIKE $${params.length} OR m.crime_no ILIKE $${params.length})`
        );
      }

      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const order =
        name === "affidavit"
          ? "ORDER BY c.id DESC"
          : name === "contempt"
            ? "ORDER BY c.compliance_deadline ASC, c.id DESC"
            : "ORDER BY c.appearance_date ASC, c.id DESC";

      const { page, pageSize, offset } = paginationFromQuery(req.query);
      const count = await pool.query(`SELECT COUNT(*)::int AS total FROM (${selectSql(config)} ${where}) scoped`, params);
      params.push(pageSize, offset);
      const result = await pool.query(`${selectSql(config)} ${where} ${order} LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      res.json({ [config.collection]: result.rows, pagination: paginationMeta(count.rows[0].total, page, pageSize) });
    } catch (error) {
      next(error);
    }
  };
}

function createModule(name) {
  const config = configs[name];
  return async (req, res, next) => {
    try {
      const masterCase = await getScopedMasterCase(req.body.case_no, req.user);
      if (!masterCase) {
        return res.status(400).json({ message: "Case number is invalid or outside your access scope" });
      }

      const values = normalizeValues(config, req.body);
      for (const field of config.boolFields) if (!(field in values)) values[field] = false;
      for (const field of config.numberFields) if (!(field in values)) values[field] = 0;
      if (name === "affidavit" && !values.police_station_id) values.police_station_id = masterCase.police_station_id;
      if (name === "affidavit" && !values.io_name) values.io_name = masterCase.io_name;
      if (name === "affidavit" && !values.status) values.status = "Pending";
      if (name === "contempt" && !values.escalation_level) values.escalation_level = "None";

      const fields = [...config.fields, "created_by"];
      const placeholders = fields.map((_, index) => `$${index + 1}`);
      const result = await pool.query(
        `INSERT INTO ${config.table} (${fields.join(", ")})
         VALUES (${placeholders.join(", ")})
         RETURNING *`,
        fields.map((field) => (field === "created_by" ? req.user.id : dbValue(values[field])))
      );

      res.status(201).json({ item: result.rows[0] });
    } catch (error) {
      next(error);
    }
  };
}

function updateModule(name) {
  const config = configs[name];
  return async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const allowed = await ensureInScope(config, id, req.user);
      if (!allowed) return res.status(404).json({ message: "Entry not found" });

      const values = normalizeValues(config, req.body);
      if (values.case_no) {
        const masterCase = await getScopedMasterCase(values.case_no, req.user);
        if (!masterCase) {
          return res.status(400).json({ message: "Case number is invalid or outside your access scope" });
        }
      }

      const fields = config.fields.filter((field) => field in values);
      if (!fields.length) return res.status(400).json({ message: "No fields to update" });

      const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
      const result = await pool.query(
        `UPDATE ${config.table}
         SET ${assignments.join(", ")}, updated_at = NOW()
         WHERE id = $${fields.length + 1}
         RETURNING *`,
        [...fields.map((field) => dbValue(values[field])), id]
      );

      res.json({ item: result.rows[0] });
    } catch (error) {
      next(error);
    }
  };
}

async function escalateContempt(req, res, next) {
  try {
    const id = Number(req.params.id);
    const allowed = await ensureInScope(configs.contempt, id, req.user);
    if (!allowed) return res.status(404).json({ message: "Contempt risk entry not found" });

    const level = req.body.escalation_level || "DCP";
    const result = await pool.query(
      `UPDATE contempt_risk
       SET escalation_level = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [level, id]
    );

    res.json({ item: result.rows[0], message: `Contempt risk escalated to ${level}` });
  } catch (error) {
    next(error);
  }
}

async function followupSummary(req, res, next) {
  try {
    const scope = scopeWhere(req.user, "m");
    const [affidavit, contempt, appearance] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE a.status IN ('Pending', 'Delayed'))::int AS pending
         FROM affidavit_status a
         JOIN master_hc_register m ON m.case_no = a.case_no
         WHERE 1 = 1 ${scope.text}`,
        scope.values
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE cr.compliance_done = FALSE)::int AS open,
                COUNT(*) FILTER (WHERE cr.compliance_done = FALSE AND cr.compliance_deadline <= CURRENT_DATE + INTERVAL '2 days')::int AS urgent
         FROM contempt_risk cr
         JOIN master_hc_register m ON m.case_no = cr.case_no
         WHERE 1 = 1 ${scope.text}`,
        scope.values
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE pa.appearance_confirmed = FALSE)::int AS unconfirmed,
                COUNT(*) FILTER (WHERE pa.appearance_date = CURRENT_DATE)::int AS today
         FROM personal_appearance pa
         JOIN master_hc_register m ON m.case_no = pa.case_no
         WHERE 1 = 1 ${scope.text}`,
        scope.values
      ),
    ]);

    res.json({
      summary: {
        affidavitPending: affidavit.rows[0].pending,
        contemptOpen: contempt.rows[0].open,
        contemptUrgent: contempt.rows[0].urgent,
        appearanceUnconfirmed: appearance.rows[0].unconfirmed,
        appearanceToday: appearance.rows[0].today,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAffidavits: listModule("affidavit"),
  createAffidavit: createModule("affidavit"),
  updateAffidavit: updateModule("affidavit"),
  listContemptRisks: listModule("contempt"),
  createContemptRisk: createModule("contempt"),
  updateContemptRisk: updateModule("contempt"),
  escalateContempt,
  listAppearances: listModule("appearance"),
  createAppearance: createModule("appearance"),
  updateAppearance: updateModule("appearance"),
  followupSummary,
};
