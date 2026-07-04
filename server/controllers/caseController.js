const pool = require("../db/pool");
const { scopeWhere } = require("../middleware/authMiddleware");
const { paginationFromQuery, paginationMeta } = require("../utils/pagination");
const { requiredText, enumValue } = require("../utils/validation");

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
  return value === true || value === "true" || value === "Y" || value === "Yes" || value === "YES" || value === "1";
}

function dbValue(value) {
  return value === "" || value === undefined ? null : value;
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value) return String(value.text || "").trim();
    if ("result" in value) return cleanText(value.result);
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
    return "";
  }
  return String(value).trim();
}

function normalizeHeader(value) {
  return cleanText(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function excelDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const text = cleanText(value);
  if (!text) return null;
  const parts = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (parts) {
    const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
    const date = new Date(`${year}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
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

async function resolveStationByNameOrId(value) {
  const text = cleanText(value);
  if (!text) return null;
  const numeric = Number(text);
  if (Number.isFinite(numeric)) return resolveStation(numeric);

  const result = await pool.query(
    `SELECT ps.police_station_id, ps.division_id, ps.sub_division_id
     FROM police_stations ps
     LEFT JOIN police_station_aliases a ON a.police_station_id=ps.police_station_id
     WHERE LOWER(ps.station_name)=LOWER($1) OR LOWER(a.alias_name)=LOWER($1)
     LIMIT 1`,
    [text]
  );
  return result.rows[0];
}

function stationAllowedForUser(station, user, ioName = "") {
  if (["JCP", "HCMC_STAFF", "SPP"].includes(user.role)) return true;
  if (user.role === "DCP") return Number(station.division_id) === Number(user.division_id);
  if (user.role === "ACP") return Number(station.sub_division_id) === Number(user.sub_division_id);
  if (user.role === "PI") return Number(station.police_station_id) === Number(user.police_station_id);
  if (user.role === "IO") {
    return cleanText(ioName).toLowerCase() === cleanText(user.name).toLowerCase();
  }
  return false;
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
    const { page, pageSize, offset } = paginationFromQuery(req.query);
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM master_hc_register m ${where}`, params);
    params.push(pageSize, offset);
    const result = await pool.query(
      `${caseSelect()} ${where} ORDER BY m.next_hearing_date NULLS LAST, m.sl_no DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ cases: result.rows, pagination: paginationMeta(count.rows[0].total, page, pageSize) });
  } catch (error) {
    next(error);
  }
}

async function createCase(req, res, next) {
  try {
    req.body.case_no = requiredText(req.body.case_no, "Case number", 150);
    req.body.risk_level = enumValue(req.body.risk_level, "Risk level", ["Red", "Orange", "Yellow", "Green"], "Green");
    req.body.status = enumValue(req.body.status, "Status", ["Active", "Disposed", "Stayed"], "Active");
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

async function insertImportedCase(client, values) {
  const fields = [
    ...editableFields,
    "division_id",
    "sub_division_id",
    "created_by",
  ];
  const placeholders = fields.map((_, index) => `$${index + 1}`);
  return client.query(
    `INSERT INTO master_hc_register (${fields.join(", ")})
     VALUES (${placeholders.join(", ")})
     ON CONFLICT (case_no) DO NOTHING
     RETURNING *`,
    fields.map((field) => dbValue(values[field]))
  );
}

async function uploadCases(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ message: "Upload an .xlsx file" });
  }

  const ExcelJS = require("exceljs");
  const workbook = new ExcelJS.Workbook();
  const client = await pool.connect();

  try {
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet("Master_HC_Register") || workbook.getWorksheet("CaseList") || workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ message: "Workbook has no sheets" });

    const headerRow = sheet.getRow(1);
    const headers = {};
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber] = normalizeHeader(cell.value);
    });

    const imported = [];
    const skipped = [];
    const errors = [];
    await client.query("BEGIN");

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const record = {};
      let hasValue = false;

      Object.entries(headers).forEach(([colNumber, header]) => {
        if (!header) return;
        const value = row.getCell(Number(colNumber)).value;
        if (cleanText(value)) hasValue = true;
        record[header] = value;
      });

      if (!hasValue) continue;

      const caseNo = cleanText(record.case_no);
      if (!caseNo) {
        errors.push({ row: rowNumber, message: "Missing Case No" });
        continue;
      }

      const station = await resolveStationByNameOrId(record.police_station || record.police_station_id || record.ps);
      if (!station) {
        await client.query(
          `INSERT INTO import_issues(source_file,sheet_name,row_number,case_no,issue_type,source_value,details)
           VALUES($1,$2,$3,$4,'UNKNOWN_POLICE_STATION',$5,$6)
           ON CONFLICT(source_file,sheet_name,row_number,issue_type) DO NOTHING`,
          [req.file.originalname, sheet.name, rowNumber, caseNo, cleanText(record.police_station || record.police_station_id || record.ps), "Police station could not be matched to master data"]
        );
        errors.push({ row: rowNumber, caseNo, message: "Police Station not found" });
        continue;
      }

      if (!stationAllowedForUser(station, req.user, record.io_name)) {
        errors.push({ row: rowNumber, caseNo, message: "Case is outside your access scope" });
        continue;
      }

      const presentStatus = cleanText(record.present_status);
      const values = {
        case_no: caseNo,
        case_type: cleanText(record.case_type),
        crime_no: cleanText(record.crime_no || record.cr_no),
        police_station_id: station.police_station_id,
        division_id: station.division_id,
        sub_division_id: station.sub_division_id,
        sections: cleanText(record.sections),
        petitioner_accused: cleanText(record.petitioner_accused || record.petitioner_name),
        io_name: cleanText(record.io_name),
        sho: cleanText(record.sho),
        acp: cleanText(record.acp),
        dcp: cleanText(record.dcp),
        spp_name: cleanText(record.spp_name || record.ppnmae),
        stage: cleanText(record.stage) || presentStatus || "Pending",
        next_hearing_date: excelDate(record.next_hearing_date || record.next_date_of_hearing),
        disposed_date: excelDate(record.disposed_date),
        interim_order: toBool(cleanText(record.interim_order)),
        stay_on_arrest: toBool(cleanText(record.stay_on_arrest)),
        personal_appearance_required: toBool(cleanText(record.personal_appearance || record.personal_appearance_required)),
        risk_level: cleanText(record.risk_level) || "Green",
        status: cleanText(record.status) || (/disposed|closed/i.test(presentStatus) ? "Disposed" : "Active"),
        remarks: cleanText(record.remarks),
        created_by: req.user.id,
      };

      if (!["Red", "Orange", "Yellow", "Green"].includes(values.risk_level)) values.risk_level = "Green";
      if (!["Active", "Disposed", "Stayed"].includes(values.status)) values.status = "Active";

      const result = await insertImportedCase(client, values);
      if (result.rowCount) imported.push({ row: rowNumber, caseNo });
      else skipped.push({ row: rowNumber, caseNo, message: "Duplicate case number" });
    }

    await client.query("COMMIT");
    res.status(201).json({
      sheet: sheet.name,
      importedCount: imported.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
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
    if ("case_no" in values) values.case_no = requiredText(values.case_no, "Case number", 150);
    if ("risk_level" in values) values.risk_level = enumValue(values.risk_level, "Risk level", ["Red", "Orange", "Yellow", "Green"]);
    if ("status" in values) values.status = enumValue(values.status, "Status", ["Active", "Disposed", "Stayed"]);
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
  uploadCases,
};
