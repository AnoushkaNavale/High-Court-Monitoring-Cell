const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { scopeWhere } = require("../middleware/authMiddleware");
const { paginationFromQuery, paginationMeta } = require("../utils/pagination");
const { requiredText, enumValue, validEmail } = require("../utils/validation");

const boolFields = [
  "io_contacted", "sho_contacted", "acp_contacted", "dcp_contacted", "spp_briefed",
  "case_file_traced", "cd_updated", "para_wise_remarks_ready",
  "personal_appearance_required", "briefing_note_prepared", "active",
  "sms_enabled", "whatsapp_enabled",
];

function toBool(value) {
  return value === true || value === "true" || value === "Y" || value === "Yes" || value === "1";
}

function dbValue(value) {
  return value === "" || value === undefined ? null : value;
}

function normalize(body) {
  const values = { ...body };
  for (const field of boolFields) if (field in values) values[field] = toBool(values[field]);
  return values;
}

async function scopedCase(caseNo, user) {
  const scope = scopeWhere(user, "m");
  const result = await pool.query(
    `SELECT m.* FROM master_hc_register m WHERE m.case_no = $1 ${scope.text ? scope.text.replace("$1", "$2") : ""}`,
    [caseNo, ...scope.values]
  );
  return result.rows[0];
}

function stationScopeWhere(user, alias = "ps") {
  if (["JCP", "HCMC_STAFF", "SPP"].includes(user.role)) return { text: "", values: [] };
  if (user.role === "DCP") return { text: ` AND ${alias}.division_id=$1`, values: [user.division_id] };
  if (user.role === "ACP") return { text: ` AND ${alias}.sub_division_id=$1`, values: [user.sub_division_id] };
  if (["PI", "IO"].includes(user.role)) return { text: ` AND ${alias}.police_station_id=$1`, values: [user.police_station_id] };
  return { text: " AND 1=0", values: [] };
}

async function stationInScope(stationId, user) {
  if (!stationId) return ["JCP", "HCMC_STAFF", "SPP"].includes(user.role);
  const scope = stationScopeWhere(user, "ps");
  const result = await pool.query(
    `SELECT 1 FROM police_stations ps WHERE ps.police_station_id=$1 ${scope.text ? scope.text.replace("$1", "$2") : ""}`,
    [stationId, ...scope.values]
  );
  return Boolean(result.rowCount);
}

function documentScopeWhere(user) {
  if (["JCP", "HCMC_STAFF", "SPP"].includes(user.role)) return { text: "", values: [] };
  if (user.role === "DCP") return { text: " AND COALESCE(m.division_id,ps.division_id)=$1", values: [user.division_id] };
  if (user.role === "ACP") return { text: " AND COALESCE(m.sub_division_id,ps.sub_division_id)=$1", values: [user.sub_division_id] };
  if (user.role === "PI") return { text: " AND COALESCE(m.police_station_id,ps.police_station_id)=$1", values: [user.police_station_id] };
  if (user.role === "IO") return { text: " AND LOWER(m.io_name)=LOWER($1)", values: [user.name] };
  return { text: " AND 1=0", values: [] };
}

const eveningFields = [
  "cause_list_date", "case_no", "case_type", "police_station_id", "io_contacted",
  "sho_contacted", "acp_contacted", "dcp_contacted", "spp_briefed", "case_file_traced",
  "cd_updated", "para_wise_remarks_ready", "personal_appearance_required", "risk_level",
  "briefing_note_prepared", "prepared_by", "time_completed", "remarks",
];

async function listEveningLogs(req, res, next) {
  try {
    const scope = scopeWhere(req.user, "m");
    const params = [...scope.values];
    const filters = scope.text ? [scope.text.replace(" AND ", "")] : [];
    if (req.query.date) { params.push(req.query.date); filters.push(`e.cause_list_date = $${params.length}`); }
    if (req.query.policeStationId) { params.push(req.query.policeStationId); filters.push(`e.police_station_id = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT e.*, ps.station_name AS police_station_name, m.io_name
       FROM evening_preparation_log e
       JOIN master_hc_register m ON m.case_no = e.case_no
       LEFT JOIN police_stations ps ON ps.police_station_id = e.police_station_id
       ${where} ORDER BY e.cause_list_date DESC, e.id DESC LIMIT 250`, params
    );
    res.json({ logs: result.rows });
  } catch (error) { next(error); }
}

async function saveEveningLog(req, res, next) {
  try {
    const values = normalize(req.body);
    for (const field of boolFields.filter(field => eveningFields.includes(field))) {
      if (!(field in values)) values[field] = false;
    }
    const masterCase = await scopedCase(values.case_no, req.user);
    if (!masterCase) return res.status(400).json({ message: "Invalid or inaccessible case" });
    values.case_type ||= masterCase.case_type;
    values.police_station_id ||= masterCase.police_station_id;
    values.risk_level ||= masterCase.risk_level || "Green";
    values.prepared_by ||= req.user.name;
    values.time_completed ||= new Date().toISOString();
    const fields = [...eveningFields, "created_by"];
    const result = await pool.query(
      `INSERT INTO evening_preparation_log (${fields.join(", ")})
       VALUES (${fields.map((_, i) => `$${i + 1}`).join(", ")})
       ON CONFLICT (cause_list_date, case_no) DO UPDATE SET
         ${eveningFields.filter(f => !["cause_list_date", "case_no"].includes(f)).map(f => `${f}=EXCLUDED.${f}`).join(", ")}, updated_at=NOW()
       RETURNING *`,
      fields.map(f => f === "created_by" ? req.user.id : dbValue(values[f]))
    );
    res.status(201).json({ log: result.rows[0] });
  } catch (error) { next(error); }
}

async function generateEveningLogs(req, res, next) {
  try {
    const date = req.body.date;
    if (!date) return res.status(400).json({ message: "Date is required" });
    const scope = scopeWhere(req.user, "m");
    const shifted = scope.text ? scope.text.replace("$1", "$4") : "";
    const result = await pool.query(
      `INSERT INTO evening_preparation_log
       (cause_list_date, case_no, case_type, police_station_id, personal_appearance_required, risk_level, prepared_by, created_by)
       SELECT $1, m.case_no, m.case_type, m.police_station_id, m.personal_appearance_required, m.risk_level, $2, $3
       FROM master_hc_register m WHERE m.next_hearing_date=$1 AND m.status='Active' ${shifted}
       ON CONFLICT (cause_list_date, case_no) DO NOTHING RETURNING *`,
      [date, req.user.name, req.user.id, ...scope.values]
    );
    res.status(201).json({ created: result.rowCount, message: `Generated ${result.rowCount} preparation logs` });
  } catch (error) { next(error); }
}

const performanceFields = [
  "officer_name", "police_station_id", "no_of_hc_cases", "delayed_submissions",
  "adverse_remarks", "appreciations", "avg_compliance_time_days", "risk_category", "remarks", "report_month",
];

async function listPerformance(req, res, next) {
  try {
    const scope = stationScopeWhere(req.user, "ps");
    const params = [...scope.values];
    const filters = scope.text ? [scope.text.replace(" AND ", "")] : [];
    if (req.query.policeStationId) { params.push(req.query.policeStationId); filters.push(`p.police_station_id=$${params.length}`); }
    if (req.query.riskCategory) { params.push(req.query.riskCategory); filters.push(`p.risk_category=$${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT p.*, ps.station_name AS police_station_name FROM officer_legal_performance p
       LEFT JOIN police_stations ps ON ps.police_station_id=p.police_station_id
       ${where} ORDER BY p.risk_category, p.delayed_submissions DESC, p.id DESC`, params
    );
    res.json({ officers: result.rows });
  } catch (error) { next(error); }
}

async function savePerformance(req, res, next) {
  try {
    const values = normalize(req.body);
    if (!(await stationInScope(values.police_station_id, req.user))) {
      return res.status(403).json({ message: "Police station is outside your access scope" });
    }
    for (const f of ["no_of_hc_cases", "delayed_submissions", "adverse_remarks", "appreciations", "avg_compliance_time_days"]) values[f] = Number(values[f] || 0);
    const id = Number(req.params.id || 0);
    if (id) {
      const scope = stationScopeWhere(req.user, "ps");
      const existing = await pool.query(
        `SELECT 1 FROM officer_legal_performance p JOIN police_stations ps ON ps.police_station_id=p.police_station_id
         WHERE p.id=$1 ${scope.text ? scope.text.replace("$1", "$2") : ""}`,
        [id, ...scope.values]
      );
      if (!existing.rowCount) return res.status(404).json({ message: "Performance record not found" });
      const result = await pool.query(
        `UPDATE officer_legal_performance SET ${performanceFields.map((f,i)=>`${f}=$${i+1}`).join(", ")}, updated_at=NOW() WHERE id=$${performanceFields.length+1} RETURNING *`,
        [...performanceFields.map(f=>dbValue(values[f])), id]
      );
      return res.json({ officer: result.rows[0] });
    }
    const fields = [...performanceFields, "created_by"];
    const result = await pool.query(
      `INSERT INTO officer_legal_performance (${fields.join(", ")}) VALUES (${fields.map((_,i)=>`$${i+1}`).join(", ")}) RETURNING *`,
      fields.map(f=>f === "created_by" ? req.user.id : dbValue(values[f]))
    );
    res.status(201).json({ officer: result.rows[0] });
  } catch (error) { next(error); }
}

async function analytics(req, res, next) {
  try {
    const scope = scopeWhere(req.user, "m");
    const where = scope.text ? `WHERE ${scope.text.replace(" AND ", "")}` : "";
    const [totals, byType, byStation, trend, outcomes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE m.status='Active')::int active, COUNT(*) FILTER (WHERE m.status='Disposed')::int disposed FROM master_hc_register m ${where}`, scope.values),
      pool.query(`SELECT COALESCE(m.case_type,'Unspecified') label, COUNT(*)::int value FROM master_hc_register m ${where} GROUP BY m.case_type ORDER BY value DESC LIMIT 12`, scope.values),
      pool.query(`SELECT ps.station_name label, COUNT(*)::int value FROM master_hc_register m LEFT JOIN police_stations ps ON ps.police_station_id=m.police_station_id ${where} GROUP BY ps.station_name ORDER BY value DESC LIMIT 15`, scope.values),
      pool.query(`SELECT TO_CHAR(DATE_TRUNC('month',m.created_at),'YYYY-MM') label, COUNT(*)::int value FROM master_hc_register m ${where} GROUP BY DATE_TRUNC('month',m.created_at) ORDER BY label`, scope.values),
      pool.query(`SELECT COUNT(*) FILTER (WHERE LOWER(m.case_type) LIKE '%bail%' AND m.status='Disposed')::int bail_disposed, COUNT(*) FILTER (WHERE LOWER(m.case_type) LIKE '%quash%' AND m.status='Disposed')::int quashing_disposed FROM master_hc_register m ${where}`, scope.values),
    ]);
    res.json({ totals: totals.rows[0], byType: byType.rows, byStation: byStation.rows, monthlyTrend: trend.rows, outcomes: outcomes.rows[0] });
  } catch (error) { next(error); }
}

async function exportAnalytics(req, res, next) {
  try {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const scope = scopeWhere(req.user, "m");
    const cases = await pool.query(`SELECT m.case_no, m.case_type, m.crime_no, ps.station_name, m.petitioner_accused, m.io_name, m.stage, m.next_hearing_date, m.risk_level, m.status FROM master_hc_register m LEFT JOIN police_stations ps ON ps.police_station_id=m.police_station_id WHERE 1=1 ${scope.text} ORDER BY m.sl_no`,scope.values);
    const sheet = workbook.addWorksheet("Master Register Report");
    sheet.columns = ["Case No","Case Type","Crime No","Police Station","Petitioner/Accused","IO Name","Stage","Next Hearing","Risk","Status"].map((header, i)=>({ header, key:`c${i}`, width: i===4 ? 28 : 18 }));
    for (const row of cases.rows) sheet.addRow(Object.fromEntries(Object.values(row).map((v,i)=>[`c${i}`,v])));
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=hcmc-analytics-report.xlsx");
    res.send(Buffer.from(buffer));
  } catch (error) { next(error); }
}

async function exportAnalyticsPdf(req,res,next){
  try{
    const PDFDocument = require("pdfkit");
    const scope=scopeWhere(req.user,"m");const where=scope.text?`WHERE ${scope.text.replace(" AND ","")}`:"";
    const [totals,stations]=await Promise.all([pool.query(`SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE m.status='Active')::int active,COUNT(*) FILTER(WHERE m.status='Disposed')::int disposed FROM master_hc_register m ${where}`,scope.values),pool.query(`SELECT ps.station_name,COUNT(*)::int cases FROM master_hc_register m LEFT JOIN police_stations ps ON ps.police_station_id=m.police_station_id ${where} GROUP BY ps.station_name ORDER BY cases DESC LIMIT 20`,scope.values)]);
    res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition","attachment; filename=hcmc-analytics-report.pdf");
    const doc=new PDFDocument({margin:48});doc.pipe(res);doc.fontSize(20).text("High Court Monitoring Cell - Analytical Report");doc.moveDown().fontSize(11).text(`Generated: ${new Date().toLocaleString("en-IN")}`);doc.moveDown().fontSize(14).text(`Total cases: ${totals.rows[0].total}`);doc.text(`Active: ${totals.rows[0].active}`);doc.text(`Disposed: ${totals.rows[0].disposed}`);doc.moveDown().fontSize(16).text("Police Station-wise Litigation");doc.moveDown(0.5);stations.rows.forEach((r,i)=>doc.fontSize(11).text(`${i+1}. ${r.station_name||"Unassigned"}: ${r.cases}`));doc.end();
  }catch(error){next(error);}
}

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

async function listDocuments(req, res, next) {
  try {
    const scope=documentScopeWhere(req.user);
    const result = await pool.query(`SELECT d.*, ps.station_name AS police_station_name, u.name AS uploaded_by_name FROM document_repository d LEFT JOIN master_hc_register m ON m.case_no=d.case_no LEFT JOIN police_stations ps ON ps.police_station_id=COALESCE(d.police_station_id,m.police_station_id) LEFT JOIN users u ON u.id=d.uploaded_by WHERE 1=1 ${scope.text} ORDER BY d.created_at DESC`,scope.values);
    res.json({ documents: result.rows });
  } catch (error) { next(error); }
}

async function listAlerts(req, res, next) {
  try {
    const { page, pageSize, offset } = paginationFromQuery(req.query);
    const scope = scopeWhere(req.user, "m");
    const scopeText = scope.text ? scope.text.replace(" AND ", " AND n.case_no IS NOT NULL AND ") : "";
    const where = `WHERE 1=1 ${scopeText}`;
    const params = [...scope.values];
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
    }
    const searchText = req.query.search ? ` AND (n.message ILIKE $${params.length} OR n.event_type ILIKE $${params.length} OR n.case_no ILIKE $${params.length})` : "";
    const [count, result, unread] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total FROM notification_logs n LEFT JOIN master_hc_register m ON m.case_no=n.case_no ${where}${searchText}`, params),
      pool.query(
        `SELECT n.*, m.police_station_id, ps.station_name AS police_station_name
         FROM notification_logs n
         LEFT JOIN master_hc_register m ON m.case_no=n.case_no
         LEFT JOIN police_stations ps ON ps.police_station_id=m.police_station_id
         ${where}${searchText}
         ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      ),
      pool.query(`SELECT COUNT(*)::int total FROM notification_logs n LEFT JOIN master_hc_register m ON m.case_no=n.case_no ${where}${searchText} AND n.read_at IS NULL`, params),
    ]);
    res.json({
      alerts: result.rows,
      unread: unread.rows[0].total,
      pagination: paginationMeta(count.rows[0].total, page, pageSize),
    });
  } catch (error) { next(error); }
}

async function markAlertsRead(req, res, next) {
  try {
    const scope = scopeWhere(req.user, "m");
    const scopeText = scope.text ? scope.text.replace(" AND ", " AND n.case_no IS NOT NULL AND ") : "";
    const result = await pool.query(
      `UPDATE notification_logs n SET read_at=NOW()
       FROM master_hc_register m
       WHERE (n.case_no IS NULL OR m.case_no=n.case_no) AND n.read_at IS NULL ${scopeText}
       RETURNING n.id`,
      scope.values
    );
    res.json({ updated: result.rowCount });
  } catch (error) { next(error); }
}

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a document" });
    const b = req.body;
    if (b.case_no) {
      const masterCase=await scopedCase(b.case_no,req.user);
      if(!masterCase){fs.unlink(req.file.path,()=>{});return res.status(403).json({message:"Case is outside your access scope"});}
      b.police_station_id ||= masterCase.police_station_id;
    } else if (!(await stationInScope(b.police_station_id,req.user))) {
      fs.unlink(req.file.path,()=>{});return res.status(403).json({message:"Police station is outside your access scope"});
    }
    const result = await pool.query(
      `INSERT INTO document_repository (title,category,case_no,police_station_id,document_date,tags,original_name,stored_name,mime_type,file_size,uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.title,b.category,dbValue(b.case_no),dbValue(b.police_station_id),dbValue(b.document_date),dbValue(b.tags),req.file.originalname,req.file.filename,req.file.mimetype,req.file.size,req.user.id]
    );
    res.status(201).json({ document: result.rows[0] });
  } catch (error) { next(error); }
}

async function downloadDocument(req, res, next) {
  try {
    const scope=documentScopeWhere(req.user);
    const result = await pool.query(`SELECT d.* FROM document_repository d LEFT JOIN master_hc_register m ON m.case_no=d.case_no LEFT JOIN police_stations ps ON ps.police_station_id=COALESCE(d.police_station_id,m.police_station_id) WHERE d.id=$1 ${scope.text?scope.text.replace("$1","$2"):""}`, [req.params.id,...scope.values]);
    if (!result.rowCount) return res.status(404).json({ message: "Document not found" });
    const doc = result.rows[0];
    res.download(path.join(uploadDir, doc.stored_name), doc.original_name);
  } catch (error) { next(error); }
}

async function settings(req, res, next) {
  try {
    const [types, stages, users, notifications] = await Promise.all([
      pool.query(`SELECT * FROM case_types ORDER BY code`), pool.query(`SELECT * FROM case_stages ORDER BY name`),
      pool.query(`SELECT id,name,email,role,mobile_no,active,division_id,sub_division_id,police_station_id FROM users ORDER BY name`),
      pool.query(`SELECT n.*,u.name,u.email FROM notification_settings n JOIN users u ON u.id=n.user_id ORDER BY u.name`),
    ]);
    res.json({ caseTypes:types.rows, caseStages:stages.rows, users:users.rows, notificationSettings:notifications.rows });
  } catch (error) { next(error); }
}

async function addCaseType(req,res,next){ try { const code=requiredText(req.body.code,"Case type code",30).toUpperCase(); const name=requiredText(req.body.name,"Case type name",150); const r=await pool.query(`INSERT INTO case_types(code,name) VALUES($1,$2) ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name RETURNING *`,[code,name]); res.status(201).json({item:r.rows[0]}); } catch(e){next(e);} }
async function addCaseStage(req,res,next){ try { const name=requiredText(req.body.name,"Stage name",150); const r=await pool.query(`INSERT INTO case_stages(name,description) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET description=EXCLUDED.description RETURNING *`,[name,dbValue(req.body.description)]); res.status(201).json({item:r.rows[0]}); } catch(e){next(e);} }
async function saveNotificationSetting(req,res,next){ try { const b=normalize(req.body); const r=await pool.query(`INSERT INTO notification_settings(user_id,phone_number,whatsapp_number,sms_enabled,whatsapp_enabled) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET phone_number=EXCLUDED.phone_number,whatsapp_number=EXCLUDED.whatsapp_number,sms_enabled=EXCLUDED.sms_enabled,whatsapp_enabled=EXCLUDED.whatsapp_enabled,updated_at=NOW() RETURNING *`,[b.user_id,b.phone_number,b.whatsapp_number,b.sms_enabled,b.whatsapp_enabled]); res.json({item:r.rows[0]}); } catch(e){next(e);} }

async function createUser(req,res,next){try{const b=req.body;const name=requiredText(b.name,"Name",150);const email=validEmail(b.email);const password=requiredText(b.password,"Password",200);if(password.length<10)return res.status(400).json({message:"Password must be at least 10 characters"});const role=enumValue(b.role,"Role",["JCP","DCP","ACP","PI","IO","HCMC_STAFF","SPP"]);const hash=await bcrypt.hash(password,12);const r=await pool.query(`INSERT INTO users(name,email,password_hash,mobile_no,rank,role,zone_id,division_id,sub_division_id,police_station_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,name,email,role,active`,[name,email,hash,dbValue(b.mobile_no),dbValue(b.rank),role,dbValue(b.zone_id),dbValue(b.division_id),dbValue(b.sub_division_id),dbValue(b.police_station_id)]);res.status(201).json({user:r.rows[0]});}catch(error){next(error);}}
async function toggleUser(req,res,next){try{const r=await pool.query(`UPDATE users SET active=$1,updated_at=NOW() WHERE id=$2 RETURNING id,name,email,role,active`,[toBool(req.body.active),req.params.id]);res.json({user:r.rows[0]});}catch(error){next(error);}}

async function listAuditLogs(req,res,next){try{const {page,pageSize,offset}=paginationFromQuery(req.query);const [count,result]=await Promise.all([pool.query(`SELECT COUNT(*)::int total FROM audit_logs`),pool.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,[pageSize,offset])]);res.json({auditLogs:result.rows,pagination:paginationMeta(count.rows[0].total,page,pageSize)});}catch(error){next(error);}}
async function listImportIssues(req,res,next){try{const status=req.query.status||"Open";const {page,pageSize,offset}=paginationFromQuery(req.query);const [count,result]=await Promise.all([pool.query(`SELECT COUNT(*)::int total FROM import_issues WHERE status=$1`,[status]),pool.query(`SELECT * FROM import_issues WHERE status=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,[status,pageSize,offset])]);res.json({issues:result.rows,pagination:paginationMeta(count.rows[0].total,page,pageSize)});}catch(error){next(error);}}
async function resolveImportIssue(req,res,next){let client;try{const issue=await pool.query(`SELECT * FROM import_issues WHERE id=$1 AND status='Open'`,[req.params.id]);if(!issue.rowCount)return res.status(404).json({message:"Open import issue not found"});const station=await pool.query(`SELECT police_station_id FROM police_stations WHERE police_station_id=$1`,[req.body.police_station_id]);if(!station.rowCount)return res.status(400).json({message:"Invalid police station"});const sourceValue=requiredText(issue.rows[0].source_value,"Source station",200);client=await pool.connect();await client.query("BEGIN");await client.query(`INSERT INTO police_station_aliases(alias_name,police_station_id,created_by) VALUES($1,$2,$3) ON CONFLICT(alias_name) DO UPDATE SET police_station_id=EXCLUDED.police_station_id,created_by=EXCLUDED.created_by`,[sourceValue,req.body.police_station_id,req.user.id]);await client.query(`UPDATE import_issues SET status='Resolved',resolved_by=$1,resolved_at=NOW(),details=details||' Mapped to police_station_id '||$2 WHERE status='Open' AND LOWER(source_value)=LOWER($3)`,[req.user.id,req.body.police_station_id,sourceValue]);await client.query("COMMIT");res.json({message:`Mapped ${sourceValue}. Upload the workbook again to import the affected rows.`});}catch(error){if(client)await client.query("ROLLBACK").catch(()=>{});next(error);}finally{client?.release();}}

module.exports = { listEveningLogs, saveEveningLog, generateEveningLogs, listPerformance, savePerformance, analytics, exportAnalytics, exportAnalyticsPdf, listAlerts, markAlertsRead, listDocuments, uploadDocument, downloadDocument, settings, addCaseType, addCaseStage, saveNotificationSetting, createUser, toggleUser, listAuditLogs, listImportIssues, resolveImportIssue, uploadDir };
