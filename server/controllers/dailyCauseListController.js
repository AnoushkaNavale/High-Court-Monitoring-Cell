const pool = require("../db/pool");
const { scopeWhere } = require("../middleware/authMiddleware");
const { paginationFromQuery, paginationMeta } = require("../utils/pagination");

const editableFields = [
  "listing_date",
  "case_no",
  "case_type",
  "police_station_id",
  "io_informed",
  "dcp_informed",
  "spp_informed",
  "file_ready",
  "objections_filed",
  "court_hall",
  "outcome",
  "next_hearing_date",
];

function toBool(value) {
  return value === true || value === "true" || value === "Y" || value === "Yes";
}

function dbValue(value) {
  return value === "" || value === undefined ? null : value;
}

function dailyCauseSelect() {
  return `SELECT dcl.*, ps.station_name AS police_station_name,
                 m.sl_no AS master_sl_no, m.crime_no, m.io_name, m.sho, m.acp, m.dcp,
                 m.spp_name, m.stage, m.risk_level, div.division_name,
                 sd.sub_division_name
          FROM daily_cause_list dcl
          JOIN master_hc_register m ON m.case_no = dcl.case_no
          LEFT JOIN police_stations ps ON ps.police_station_id = dcl.police_station_id
          LEFT JOIN divisions div ON div.division_id = m.division_id
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

async function ensureEntryInScope(id, user) {
  const scope = scopeWhere(user, "m");
  const result = await pool.query(
    `SELECT dcl.id
     FROM daily_cause_list dcl
     JOIN master_hc_register m ON m.case_no = dcl.case_no
     WHERE dcl.id = $1 ${scope.text ? scope.text.replace("$1", "$2") : ""}`,
    [id, ...scope.values]
  );
  return Boolean(result.rowCount);
}

async function listDailyCauseList(req, res, next) {
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

    addFilter("dcl.listing_date = ?", req.query.listingDate);
    addFilter("dcl.listing_date >= ?", req.query.fromDate);
    addFilter("dcl.listing_date <= ?", req.query.toDate);
    addFilter("dcl.police_station_id = ?", req.query.policeStationId);

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      filters.push(
        `(dcl.case_no ILIKE $${params.length} OR m.crime_no ILIKE $${params.length} OR ps.station_name ILIKE $${params.length})`
      );
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const { page, pageSize, offset } = paginationFromQuery(req.query);
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM daily_cause_list dcl
       JOIN master_hc_register m ON m.case_no = dcl.case_no
       LEFT JOIN police_stations ps ON ps.police_station_id = dcl.police_station_id ${where}`,
      params
    );
    params.push(pageSize, offset);
    const result = await pool.query(
      `${dailyCauseSelect()} ${where}
       ORDER BY dcl.listing_date DESC, dcl.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ entries: result.rows, pagination: paginationMeta(count.rows[0].total, page, pageSize) });
  } catch (error) {
    next(error);
  }
}

async function createDailyCauseEntry(req, res, next) {
  try {
    const masterCase = await getScopedMasterCase(req.body.case_no, req.user);
    if (!masterCase) {
      return res.status(400).json({ message: "Case number is invalid or outside your access scope" });
    }

    const values = {
      ...req.body,
      case_type: req.body.case_type || masterCase.case_type,
      police_station_id: req.body.police_station_id || masterCase.police_station_id,
      io_informed: toBool(req.body.io_informed),
      dcp_informed: toBool(req.body.dcp_informed),
      spp_informed: toBool(req.body.spp_informed),
      file_ready: toBool(req.body.file_ready),
      objections_filed: toBool(req.body.objections_filed),
    };

    const fields = [...editableFields, "created_by"];
    const placeholders = fields.map((_, index) => `$${index + 1}`);
    const result = await pool.query(
      `INSERT INTO daily_cause_list (${fields.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      fields.map((field) => (field === "created_by" ? req.user.id : dbValue(values[field])))
    );

    res.status(201).json({ entry: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This case is already in the cause list for that date" });
    }
    next(error);
  }
}

async function updateDailyCauseEntry(req, res, next) {
  try {
    const id = Number(req.params.id);
    const allowed = await ensureEntryInScope(id, req.user);
    if (!allowed) return res.status(404).json({ message: "Cause list entry not found" });

    const values = { ...req.body };
    if (values.case_no) {
      const masterCase = await getScopedMasterCase(values.case_no, req.user);
      if (!masterCase) {
        return res.status(400).json({ message: "Case number is invalid or outside your access scope" });
      }
      values.case_type = values.case_type || masterCase.case_type;
      values.police_station_id = values.police_station_id || masterCase.police_station_id;
    }

    for (const field of ["io_informed", "dcp_informed", "spp_informed", "file_ready", "objections_filed"]) {
      if (field in values) values[field] = toBool(values[field]);
    }

    const fields = editableFields.filter((field) => field in values);
    if (!fields.length) return res.status(400).json({ message: "No fields to update" });

    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const result = await pool.query(
      `UPDATE daily_cause_list
       SET ${assignments.join(", ")}, updated_at = NOW()
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...fields.map((field) => dbValue(values[field])), id]
    );

    res.json({ entry: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This case is already in the cause list for that date" });
    }
    next(error);
  }
}

async function generateDailyCauseList(req, res, next) {
  try {
    const { listingDate } = req.body;
    if (!listingDate) return res.status(400).json({ message: "Listing date is required" });

    const scope = scopeWhere(req.user, "m");
    const shiftedScopeText = scope.text ? scope.text.replace("$1", "$3") : "";
    const result = await pool.query(
      `INSERT INTO daily_cause_list
        (listing_date, case_no, case_type, police_station_id, next_hearing_date, created_by)
       SELECT $1, m.case_no, m.case_type, m.police_station_id, m.next_hearing_date, $2
       FROM master_hc_register m
       WHERE m.next_hearing_date = $1
         AND m.status = 'Active'
         ${shiftedScopeText}
       ON CONFLICT (listing_date, case_no) DO NOTHING
       RETURNING *`,
      [listingDate, req.user.id, ...scope.values]
    );

    res.status(201).json({
      created: result.rowCount,
      entries: result.rows,
      message: result.rowCount
        ? `Generated ${result.rowCount} cause list entries`
        : "No new matching active cases found for that date",
    });
  } catch (error) {
    next(error);
  }
}

async function previewNotification(req, res, next) {
  try {
    const id = Number(req.params.id);
    const allowed = await ensureEntryInScope(id, req.user);
    if (!allowed) return res.status(404).json({ message: "Cause list entry not found" });

    const result = await pool.query(
      `${dailyCauseSelect()} WHERE dcl.id = $1`,
      [id]
    );
    const entry = result.rows[0];
    const recipients = req.body.recipients || [];
    const message = `HCMC Alert: Case ${entry.case_no} listed on ${entry.listing_date.toISOString().slice(0, 10)}. IO: ${entry.io_name || "Not assigned"}, PS: ${entry.police_station_name || "Not assigned"}. Please ensure file is ready. -West Zone HCMC`;

    res.json({
      recipients,
      message,
      status: "preview",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDailyCauseList,
  createDailyCauseEntry,
  updateDailyCauseEntry,
  generateDailyCauseList,
  previewNotification,
};
