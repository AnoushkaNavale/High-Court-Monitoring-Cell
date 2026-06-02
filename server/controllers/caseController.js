const pool = require("../db/pool");
const { scopeWhere } = require("../middleware/authMiddleware");

const editableFields = [
  "case_no",
  "case_type",
  "crime_no",
  "police_station_id",
  "sections",
  "petitioner_accused",
  "io_name",
  "sho",
  "acp",
  "dcp",
  "spp_name",
  "stage",
  "next_hearing_date",
  "disposed_date",
  "interim_order",
  "stay_on_arrest",
  "personal_appearance_required",
  "risk_level",
  "status",
  "remarks",
];

function toBool(value) {
  return value === true || value === "true" || value === "Y" || value === "Yes";
}

function dbValue(value) {
  return value === "" || value === undefined ? null : value;
}

async function resolveStation(stationId) {
  const result = await pool.query(
    `SELECT police_station_id, division_id, sub_division_id
     FROM police_stations
     WHERE police_station_id = $1`,
    [stationId]
  );
  return result.rows[0];
}

function caseSelect() {
  return `SELECT m.*, ps.station_name AS police_station_name,
                 d.division_name, sd.sub_division_name
          FROM master_hc_register m
          LEFT JOIN police_stations ps ON ps.police_station_id = m.police_station_id
          LEFT JOIN divisions d ON d.division_id = m.division_id
          LEFT JOIN sub_divisions sd ON sd.sub_division_id = m.sub_division_id`;
}

async function listCases(req, res, next) {
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

    addFilter("m.division_id = ?", req.query.divisionId);
    addFilter("m.sub_division_id = ?", req.query.subDivisionId);
    addFilter("m.police_station_id = ?", req.query.policeStationId);
    addFilter("m.case_type ILIKE ?", req.query.caseType ? `%${req.query.caseType}%` : "");
    addFilter("m.risk_level = ?", req.query.riskLevel);

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      filters.push(
        `(m.case_no ILIKE $${params.length} OR m.crime_no ILIKE $${params.length} OR m.petitioner_accused ILIKE $${params.length})`
      );
    }

    if (req.query.fromDate) addFilter("m.next_hearing_date >= ?", req.query.fromDate);
    if (req.query.toDate) addFilter("m.next_hearing_date <= ?", req.query.toDate);

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `${caseSelect()} ${where} ORDER BY m.next_hearing_date NULLS LAST, m.sl_no DESC LIMIT 200`,
      params
    );
    res.json({ cases: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCase(req, res, next) {
  try {
    const station = await resolveStation(req.body.police_station_id);
    if (!station) return res.status(400).json({ message: "Invalid police station" });

    const values = {
      ...req.body,
      division_id: station.division_id,
      sub_division_id: station.sub_division_id,
      interim_order: toBool(req.body.interim_order),
      stay_on_arrest: toBool(req.body.stay_on_arrest),
      personal_appearance_required: toBool(req.body.personal_appearance_required),
      created_by: req.user.id,
    };

    const fields = [
      ...editableFields,
      "division_id",
      "sub_division_id",
      "created_by",
    ];
    const placeholders = fields.map((_, index) => `$${index + 1}`);
    const result = await pool.query(
      `INSERT INTO master_hc_register (${fields.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      fields.map((field) => dbValue(values[field]))
    );

    res.status(201).json({ case: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Case number already exists" });
    }
    next(error);
  }
}

async function updateCase(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await pool.query("SELECT * FROM master_hc_register WHERE sl_no = $1", [id]);
    if (!existing.rowCount) return res.status(404).json({ message: "Case not found" });

    const scope = scopeWhere(req.user, "m");
    if (scope.text) {
      const scoped = await pool.query(
        `SELECT 1 FROM master_hc_register m WHERE m.sl_no = $1 ${scope.text.replace("$1", "$2")}`,
        [id, ...scope.values]
      );
      if (!scoped.rowCount) return res.status(403).json({ message: "Case is outside your access scope" });
    }

    const values = { ...req.body };
    if (values.police_station_id) {
      const station = await resolveStation(values.police_station_id);
      if (!station) return res.status(400).json({ message: "Invalid police station" });
      values.division_id = station.division_id;
      values.sub_division_id = station.sub_division_id;
    }

    for (const field of ["interim_order", "stay_on_arrest", "personal_appearance_required"]) {
      if (field in values) values[field] = toBool(values[field]);
    }

    const fields = [...editableFields, "division_id", "sub_division_id"].filter(
      (field) => field in values
    );

    if (!fields.length) return res.status(400).json({ message: "No fields to update" });

    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const result = await pool.query(
      `UPDATE master_hc_register
       SET ${assignments.join(", ")}, updated_at = NOW()
       WHERE sl_no = $${fields.length + 1}
       RETURNING *`,
      [...fields.map((field) => dbValue(values[field])), id]
    );

    res.json({ case: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Case number already exists" });
    }
    next(error);
  }
}

module.exports = {
  listCases,
  createCase,
  updateCase,
};
