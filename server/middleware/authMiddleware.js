const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

function signUser(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      zoneId: user.zone_id,
      divisionId: user.division_id,
      subDivisionId: user.sub_division_id,
      policeStationId: user.police_station_id,
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET || "local-dev-secret",
    { expiresIn: "8h" }
  );
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "local-dev-secret");
    const result = await pool.query(
      `SELECT id, name, email, mobile_no, rank, role, zone_id, division_id,
              sub_division_id, police_station_id, active
       FROM users
       WHERE id = $1 AND active = TRUE`,
      [payload.id]
    );

    if (!result.rowCount) {
      return res.status(401).json({ message: "User is inactive or no longer exists" });
    }

    req.user = result.rows[0];
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

function scopeWhere(user, alias = "m") {
  if (["JCP", "HCMC_STAFF", "SPP"].includes(user.role)) {
    return { text: "", values: [] };
  }

  if (user.role === "DCP") {
    return { text: ` AND ${alias}.division_id = $1`, values: [user.division_id] };
  }

  if (user.role === "ACP") {
    return { text: ` AND ${alias}.sub_division_id = $1`, values: [user.sub_division_id] };
  }

  if (user.role === "PI") {
    return { text: ` AND ${alias}.police_station_id = $1`, values: [user.police_station_id] };
  }

  if (user.role === "IO") {
    return { text: ` AND LOWER(${alias}.io_name) = LOWER($1)`, values: [user.name] };
  }

  return { text: " AND 1 = 0", values: [] };
}

module.exports = {
  requireAuth,
  signUser,
  scopeWhere,
};
