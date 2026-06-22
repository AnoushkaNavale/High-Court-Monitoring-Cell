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

CREATE TABLE IF NOT EXISTS affidavit_status (
  id SERIAL PRIMARY KEY,
  case_no TEXT NOT NULL REFERENCES master_hc_register(case_no) ON UPDATE CASCADE,
  police_station_id INTEGER REFERENCES police_stations(police_station_id),
  io_name TEXT,
  date_notice_received DATE,
  date_remarks_sought DATE,
  remarks_received_date DATE,
  legal_vetting_done BOOLEAN NOT NULL DEFAULT FALSE,
  affidavit_filed_date DATE,
  delay_days INTEGER NOT NULL DEFAULT 0,
  reason_for_delay TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Filed', 'Delayed')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affidavit_status_case ON affidavit_status (case_no);
CREATE INDEX IF NOT EXISTS idx_affidavit_status_status ON affidavit_status (status);
CREATE INDEX IF NOT EXISTS idx_affidavit_status_ps ON affidavit_status (police_station_id);

CREATE TABLE IF NOT EXISTS contempt_risk (
  id SERIAL PRIMARY KEY,
  case_no TEXT NOT NULL REFERENCES master_hc_register(case_no) ON UPDATE CASCADE,
  order_date DATE,
  compliance_deadline DATE NOT NULL,
  nature_of_risk TEXT,
  responsible_officer TEXT,
  compliance_done BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_level TEXT NOT NULL DEFAULT 'None' CHECK (escalation_level IN ('None', 'ACP', 'DCP', 'JCP', 'CP')),
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contempt_risk_case ON contempt_risk (case_no);
CREATE INDEX IF NOT EXISTS idx_contempt_risk_deadline ON contempt_risk (compliance_deadline);
CREATE INDEX IF NOT EXISTS idx_contempt_risk_done ON contempt_risk (compliance_done);

CREATE TABLE IF NOT EXISTS personal_appearance (
  id SERIAL PRIMARY KEY,
  case_no TEXT NOT NULL REFERENCES master_hc_register(case_no) ON UPDATE CASCADE,
  officer_name TEXT NOT NULL,
  rank TEXT,
  appearance_date DATE NOT NULL,
  court_hall TEXT,
  appearance_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  order_after_appearance TEXT,
  next_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_appearance_case ON personal_appearance (case_no);
CREATE INDEX IF NOT EXISTS idx_personal_appearance_date ON personal_appearance (appearance_date);
CREATE INDEX IF NOT EXISTS idx_personal_appearance_confirmed ON personal_appearance (appearance_confirmed);

CREATE TABLE IF NOT EXISTS evening_preparation_log (
  id SERIAL PRIMARY KEY,
  cause_list_date DATE NOT NULL,
  case_no TEXT NOT NULL REFERENCES master_hc_register(case_no) ON UPDATE CASCADE,
  case_type TEXT,
  police_station_id INTEGER REFERENCES police_stations(police_station_id),
  io_contacted BOOLEAN NOT NULL DEFAULT FALSE,
  sho_contacted BOOLEAN NOT NULL DEFAULT FALSE,
  acp_contacted BOOLEAN NOT NULL DEFAULT FALSE,
  dcp_contacted BOOLEAN NOT NULL DEFAULT FALSE,
  spp_briefed BOOLEAN NOT NULL DEFAULT FALSE,
  case_file_traced BOOLEAN NOT NULL DEFAULT FALSE,
  cd_updated BOOLEAN NOT NULL DEFAULT FALSE,
  para_wise_remarks_ready BOOLEAN NOT NULL DEFAULT FALSE,
  personal_appearance_required BOOLEAN NOT NULL DEFAULT FALSE,
  risk_level TEXT NOT NULL DEFAULT 'Green' CHECK (risk_level IN ('Red', 'Orange', 'Yellow', 'Green')),
  briefing_note_prepared BOOLEAN NOT NULL DEFAULT FALSE,
  prepared_by TEXT,
  time_completed TIMESTAMPTZ,
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cause_list_date, case_no)
);

CREATE INDEX IF NOT EXISTS idx_evening_log_date ON evening_preparation_log (cause_list_date);

CREATE TABLE IF NOT EXISTS officer_legal_performance (
  id SERIAL PRIMARY KEY,
  officer_name TEXT NOT NULL,
  police_station_id INTEGER REFERENCES police_stations(police_station_id),
  no_of_hc_cases INTEGER NOT NULL DEFAULT 0,
  delayed_submissions INTEGER NOT NULL DEFAULT 0,
  adverse_remarks INTEGER NOT NULL DEFAULT 0,
  appreciations INTEGER NOT NULL DEFAULT 0,
  avg_compliance_time_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  risk_category TEXT NOT NULL DEFAULT 'Low' CHECK (risk_category IN ('High', 'Medium', 'Low')),
  remarks TEXT,
  report_month DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_officer_performance_ps ON officer_legal_performance (police_station_id);
CREATE INDEX IF NOT EXISTS idx_officer_performance_risk ON officer_legal_performance (risk_category);

CREATE TABLE IF NOT EXISTS document_repository (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  case_no TEXT REFERENCES master_hc_register(case_no) ON UPDATE CASCADE,
  police_station_id INTEGER REFERENCES police_stations(police_station_id),
  document_date DATE,
  tags TEXT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_category ON document_repository (category);
CREATE INDEX IF NOT EXISTS idx_document_case ON document_repository (case_no);

CREATE TABLE IF NOT EXISTS case_types (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS case_stages (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT,
  whatsapp_number TEXT,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  case_no TEXT,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'Preview',
  recipients TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Preview',
  provider_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS poll_runs (
  id SERIAL PRIMARY KEY,
  source_url TEXT,
  status TEXT NOT NULL,
  cases_found INTEGER NOT NULL DEFAULT 0,
  entries_created INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  polled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
