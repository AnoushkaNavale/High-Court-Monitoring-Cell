const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { signUser } = require("../middleware/authMiddleware");

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobileNo: row.mobile_no,
    rank: row.rank,
    role: row.role,
    zoneId: row.zone_id,
    divisionId: row.division_id,
    subDivisionId: row.sub_division_id,
    policeStationId: row.police_station_id,
    divisionName: row.division_name,
    subDivisionName: row.sub_division_name,
    policeStationName: row.station_name,
  };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await pool.query(
      `SELECT u.*, d.division_name, sd.sub_division_name, ps.station_name
       FROM users u
       LEFT JOIN divisions d ON d.division_id = u.division_id
       LEFT JOIN sub_divisions sd ON sd.sub_division_id = u.sub_division_id
       LEFT JOIN police_stations ps ON ps.police_station_id = u.police_station_id
       WHERE LOWER(u.email) = LOWER($1) AND u.active = TRUE`,
      [email]
    );

    if (!result.rowCount) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({ token: signUser(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT u.*, d.division_name, sd.sub_division_name, ps.station_name
       FROM users u
       LEFT JOIN divisions d ON d.division_id = u.division_id
       LEFT JOIN sub_divisions sd ON sd.sub_division_id = u.sub_division_id
       LEFT JOIN police_stations ps ON ps.police_station_id = u.police_station_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  me,
};
