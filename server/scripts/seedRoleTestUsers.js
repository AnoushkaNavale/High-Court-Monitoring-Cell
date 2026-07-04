const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const pool = require("../db/pool");

const roles = ["JCP", "DCP", "ACP", "PI", "IO", "SPP"];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Role test fixtures cannot be seeded in production");
  const password = process.env.ROLE_TEST_PASSWORD;
  if (!password || password.length < 10) throw new Error("Set ROLE_TEST_PASSWORD to at least 10 characters");
  const hierarchy = await pool.query(
    `SELECT z.id zone_id,d.division_id,sd.sub_division_id,ps.police_station_id
     FROM zones z JOIN divisions d ON d.zone_id=z.id
     JOIN sub_divisions sd ON sd.division_id=d.division_id
     JOIN police_stations ps ON ps.sub_division_id=sd.sub_division_id
     ORDER BY z.id,d.division_id,sd.sub_division_id,ps.police_station_id LIMIT 1`
  );
  if (!hierarchy.rowCount) throw new Error("Seed division master data before role fixtures");
  const h = hierarchy.rows[0];
  const hash = await bcrypt.hash(password, 12);
  for (const role of roles) {
    const scoped = ["DCP", "ACP", "PI", "IO"].includes(role);
    await pool.query(
      `INSERT INTO users(name,email,password_hash,rank,role,zone_id,division_id,sub_division_id,police_station_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,
       zone_id=EXCLUDED.zone_id,division_id=EXCLUDED.division_id,sub_division_id=EXCLUDED.sub_division_id,
       police_station_id=EXCLUDED.police_station_id,active=TRUE,updated_at=NOW()`,
      [`QA ${role}`, `qa.${role.toLowerCase()}@hcmc.local`, hash, role, role, h.zone_id,
       scoped ? h.division_id : null, ["ACP","PI","IO"].includes(role) ? h.sub_division_id : null,
       ["PI","IO"].includes(role) ? h.police_station_id : null]
    );
  }
  console.log("Seeded QA users for JCP, DCP, ACP, PI, IO, and SPP");
}

main().catch((error)=>{console.error(error);process.exitCode=1;}).finally(()=>pool.end());
