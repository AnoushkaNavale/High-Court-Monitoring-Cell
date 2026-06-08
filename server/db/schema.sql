CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  zone_name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS divisions (
  division_id INTEGER PRIMARY KEY,
  division_name TEXT NOT NULL,
  zone_id INTEGER NOT NULL REFERENCES zones(id)
);

CREATE TABLE IF NOT EXISTS sub_divisions (
  sub_division_id INTEGER PRIMARY KEY,
  division_id INTEGER NOT NULL REFERENCES divisions(division_id),
  sub_division_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS police_stations (
  police_station_id INTEGER PRIMARY KEY,
  division_id INTEGER NOT NULL REFERENCES divisions(division_id),
  sub_division_id INTEGER NOT NULL REFERENCES sub_divisions(sub_division_id),
  station_name TEXT NOT NULL,
  email TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  mobile_no TEXT,
  rank TEXT,
  role TEXT NOT NULL CHECK (role IN ('JCP', 'DCP', 'ACP', 'PI', 'IO', 'HCMC_STAFF', 'SPP')),
  zone_id INTEGER REFERENCES zones(id),
  division_id INTEGER REFERENCES divisions(division_id),
  sub_division_id INTEGER REFERENCES sub_divisions(sub_division_id),
  police_station_id INTEGER REFERENCES police_stations(police_station_id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_hc_register (
  sl_no SERIAL PRIMARY KEY,
  case_no TEXT UNIQUE NOT NULL,
  case_type TEXT,
  crime_no TEXT,
  police_station_id INTEGER REFERENCES police_stations(police_station_id),
  division_id INTEGER REFERENCES divisions(division_id),
  sub_division_id INTEGER REFERENCES sub_divisions(sub_division_id),
  sections TEXT,
  petitioner_accused TEXT,
  io_name TEXT,
  sho TEXT,
  acp TEXT,
  dcp TEXT,
  spp_name TEXT,
  stage TEXT,
  next_hearing_date DATE,
  disposed_date DATE,
  interim_order BOOLEAN NOT NULL DEFAULT FALSE,
  stay_on_arrest BOOLEAN NOT NULL DEFAULT FALSE,
  personal_appearance_required BOOLEAN NOT NULL DEFAULT FALSE,
  risk_level TEXT NOT NULL DEFAULT 'Green' CHECK (risk_level IN ('Red', 'Orange', 'Yellow', 'Green')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disposed', 'Stayed')),
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hc_register_scope ON master_hc_register (division_id, sub_division_id, police_station_id);
CREATE INDEX IF NOT EXISTS idx_hc_register_hearing ON master_hc_register (next_hearing_date);
CREATE INDEX IF NOT EXISTS idx_hc_register_risk ON master_hc_register (risk_level);

CREATE TABLE IF NOT EXISTS daily_cause_list (
  id SERIAL PRIMARY KEY,
  listing_date DATE NOT NULL,
  case_no TEXT NOT NULL REFERENCES master_hc_register(case_no) ON UPDATE CASCADE,
  case_type TEXT,
  police_station_id INTEGER REFERENCES police_stations(police_station_id),
  io_informed BOOLEAN NOT NULL DEFAULT FALSE,
  dcp_informed BOOLEAN NOT NULL DEFAULT FALSE,
  spp_informed BOOLEAN NOT NULL DEFAULT FALSE,
  file_ready BOOLEAN NOT NULL DEFAULT FALSE,
  objections_filed BOOLEAN NOT NULL DEFAULT FALSE,
  court_hall TEXT,
  outcome TEXT,
  next_hearing_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_date, case_no)
);

CREATE INDEX IF NOT EXISTS idx_daily_cause_list_date ON daily_cause_list (listing_date);
CREATE INDEX IF NOT EXISTS idx_daily_cause_list_ps ON daily_cause_list (police_station_id);

CREATE TABLE IF NOT EXISTS compliance_tracker (
  id SERIAL PRIMARY KEY,
  case_no TEXT NOT NULL REFERENCES master_hc_register(case_no) ON UPDATE CASCADE,
  direction_date DATE NOT NULL,
  nature_of_direction TEXT,
  compliance_required TEXT NOT NULL,
  deadline DATE NOT NULL,
  responsible_officer TEXT,
  reminder_sent_date DATE,
  compliance_filed_date DATE,
  delay_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Filed', 'Delayed', 'Escalated', 'Closed')),
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  delay_reason TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_tracker_case ON compliance_tracker (case_no);
CREATE INDEX IF NOT EXISTS idx_compliance_tracker_deadline ON compliance_tracker (deadline);
CREATE INDEX IF NOT EXISTS idx_compliance_tracker_status ON compliance_tracker (status);
