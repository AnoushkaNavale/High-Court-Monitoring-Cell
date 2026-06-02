const path = require("path");
const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");
const pool = require("../db/pool");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const sourcePath =
  process.env.DIVISION_DATA_XLSX ||
  "C:\\Users\\admin\\Downloads\\DivisionData.xlsx";
const defaultPassword = process.env.DEFAULT_SEED_PASSWORD || "Hcmc@123";

function rows(workbook, sheetName) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) return [];

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value || "").trim();
  });

  const data = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    let hasValue = false;
    headers.forEach((header, colNumber) => {
      if (!header) return;
      const value = row.getCell(colNumber).value;
      let normalized = value;
      if (value && typeof value === "object") {
        if ("text" in value) normalized = value.text;
        else if ("result" in value) normalized = value.result;
        else if ("error" in value) normalized = "";
        else normalized = "";
      }
      record[header] = normalized ?? "";
      if (record[header] !== "") hasValue = true;
    });
    if (hasValue) data.push(record);
  });

  return data;
}

function intOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value) {
  const text = String(value || "").trim();
  return text === "#N/A" ? "" : text;
}

function normalizeRole(row) {
  const name = String(row["User Name"] || "").toLowerCase();
  if (name.includes("joint cp")) return "JCP";
  if (name.includes("dcp")) return "DCP";
  if (name.includes("acp")) return "ACP";
  if (name.includes("sho") || name.includes("pi ")) return "PI";
  if (name.includes("spp")) return "SPP";
  return "HCMC_STAFF";
}

function fallbackEmail(row, index) {
  const explicit = String(row.email || "").trim().toLowerCase();
  if (explicit) return explicit;
  const safeName = String(row["User Name"] || `user-${index}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
  return `${safeName || `user-${index}`}@hcmc.local`;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(sourcePath));
  const client = await pool.connect();
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  try {
    await client.query("BEGIN");
    const skipped = [];

    const zoneNames = new Set();
    for (const sheet of ["Divisions", "SubDivisions", "PoliceStations", "Users"]) {
      for (const row of rows(workbook, sheet)) {
        const zoneName = cleanText(row.Zone);
        if (zoneName) zoneNames.add(zoneName);
      }
    }

    for (const zoneName of zoneNames) {
      await client.query(
        "INSERT INTO zones (zone_name) VALUES ($1) ON CONFLICT (zone_name) DO NOTHING",
        [zoneName]
      );
    }

    const zoneResult = await client.query("SELECT id, zone_name FROM zones");
    const zoneIdByName = new Map(zoneResult.rows.map((z) => [z.zone_name, z.id]));

    for (const row of rows(workbook, "Divisions")) {
      const divisionId = intOrNull(row.division_id);
      const zoneId = zoneIdByName.get(cleanText(row.Zone));
      if (!divisionId || !zoneId) {
        skipped.push(`Division: ${row.division || "(blank)"}`);
        continue;
      }
      await client.query(
        `INSERT INTO divisions (division_id, division_name, zone_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (division_id) DO UPDATE
         SET division_name = EXCLUDED.division_name, zone_id = EXCLUDED.zone_id`,
        [divisionId, row.division, zoneId]
      );
    }

    for (const row of rows(workbook, "SubDivisions")) {
      const subDivisionId = intOrNull(row.sub_division_id);
      const divisionId = intOrNull(row.division_id);
      if (!subDivisionId || !divisionId) {
        skipped.push(`SubDivision: ${row.sub_division || "(blank)"}`);
        continue;
      }
      await client.query(
        `INSERT INTO sub_divisions (sub_division_id, division_id, sub_division_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (sub_division_id) DO UPDATE
         SET division_id = EXCLUDED.division_id, sub_division_name = EXCLUDED.sub_division_name`,
        [subDivisionId, divisionId, row.sub_division]
      );
    }

    for (const row of rows(workbook, "PoliceStations")) {
      const policeStationId = intOrNull(row.police_station_id);
      const divisionId = intOrNull(row.division_id);
      const subDivisionId = intOrNull(row.sub_division_id);
      if (!policeStationId || !divisionId || !subDivisionId) {
        skipped.push(`PoliceStation: ${row.police_station || "(blank)"}`);
        continue;
      }
      await client.query(
        `INSERT INTO police_stations (police_station_id, division_id, sub_division_id, station_name, email)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (police_station_id) DO UPDATE
         SET division_id = EXCLUDED.division_id,
             sub_division_id = EXCLUDED.sub_division_id,
             station_name = EXCLUDED.station_name,
             email = EXCLUDED.email`,
        [
          policeStationId,
          divisionId,
          subDivisionId,
          row.police_station,
          row.email || null,
        ]
      );
    }

    let index = 0;
    for (const row of rows(workbook, "Users")) {
      index += 1;
      const zoneName = cleanText(row.Zone);
      await client.query(
        `INSERT INTO users
          (name, email, password_hash, mobile_no, rank, role, zone_id, division_id, sub_division_id, police_station_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             mobile_no = EXCLUDED.mobile_no,
             role = EXCLUDED.role,
             zone_id = EXCLUDED.zone_id,
             division_id = EXCLUDED.division_id,
             sub_division_id = EXCLUDED.sub_division_id,
             police_station_id = EXCLUDED.police_station_id,
             updated_at = NOW()`,
        [
          row["User Name"] || `HCMC User ${index}`,
          fallbackEmail(row, index),
          passwordHash,
          row.mobile_no ? String(row.mobile_no) : null,
          null,
          normalizeRole(row),
          zoneIdByName.get(zoneName) || null,
          intOrNull(row.division_id),
          intOrNull(row.sub_division_id),
          intOrNull(row.police_station_id),
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`Seeded master data from ${sourcePath}`);
    console.log(`Default password for seeded users: ${defaultPassword}`);
    if (skipped.length) {
      console.log(`Skipped incomplete rows: ${skipped.join(", ")}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
