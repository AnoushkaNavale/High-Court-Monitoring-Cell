const pool = require("../db/pool");

async function getMasters(req, res, next) {
  try {
    const role = req.user.role;
    const user = req.user;
    const params = [];
    let stationScope = "";
    let divisionScope = "";
    let subDivisionScope = "";

    if (role === "DCP") {
      params.push(user.division_id);
      stationScope = `WHERE ps.division_id = $${params.length}`;
      divisionScope = `WHERE d.division_id = ${Number(user.division_id)}`;
      subDivisionScope = `WHERE sd.division_id = ${Number(user.division_id)}`;
    } else if (role === "ACP") {
      params.push(user.sub_division_id);
      stationScope = `WHERE ps.sub_division_id = $${params.length}`;
      divisionScope = `WHERE d.division_id = ${Number(user.division_id)}`;
      subDivisionScope = `WHERE sd.sub_division_id = ${Number(user.sub_division_id)}`;
    } else if (["PI", "IO"].includes(role)) {
      params.push(user.police_station_id);
      stationScope = `WHERE ps.police_station_id = $${params.length}`;
      divisionScope = `WHERE d.division_id = ${Number(user.division_id)}`;
      subDivisionScope = `WHERE sd.sub_division_id = ${Number(user.sub_division_id)}`;
    }

    const [zones, divisions, subDivisions, stations] = await Promise.all([
      pool.query("SELECT id, zone_name FROM zones ORDER BY zone_name"),
      pool.query(
        `SELECT d.division_id, d.division_name, z.zone_name
         FROM divisions d
         JOIN zones z ON z.id = d.zone_id
         ${divisionScope}
         ORDER BY d.division_name`
      ),
      pool.query(
        `SELECT sd.sub_division_id, sd.division_id, sd.sub_division_name
         FROM sub_divisions sd
         ${subDivisionScope}
         ORDER BY sd.sub_division_name`
      ),
      pool.query(
        `SELECT ps.police_station_id, ps.division_id, ps.sub_division_id,
                ps.station_name, ps.email, d.division_name, sd.sub_division_name
         FROM police_stations ps
         JOIN divisions d ON d.division_id = ps.division_id
         JOIN sub_divisions sd ON sd.sub_division_id = ps.sub_division_id
         ${stationScope}
         ORDER BY ps.station_name`,
        params
      ),
    ]);

    res.json({
      zones: zones.rows,
      divisions: divisions.rows,
      subDivisions: subDivisions.rows,
      policeStations: stations.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMasters };
