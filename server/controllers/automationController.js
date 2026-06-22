const pool = require("../db/pool");

async function deliverNotification({ caseNo, eventType, recipients, message, channel = "Preview" }) {
  let status = "Preview";
  let providerResponse = null;
  const webhook = process.env.NOTIFICATION_WEBHOOK_URL;
  if (webhook && channel !== "Preview") {
    try {
      const response = await fetch(webhook, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({caseNo,eventType,recipients,message,channel}) });
      providerResponse = await response.text();
      status = response.ok ? "Sent" : "Failed";
    } catch (error) { status = "Failed"; providerResponse = error.message; }
  }
  const result = await pool.query(
    `INSERT INTO notification_logs(case_no,event_type,channel,recipients,message,status,provider_response) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [caseNo,eventType,channel,Array.isArray(recipients)?recipients.join(", "):recipients,message,status,providerResponse]
  );
  return result.rows[0];
}

async function sendNotification(req,res,next){
  try { const log=await deliverNotification(req.body); res.status(201).json({notification:log,message:log.status === "Preview" ? "Notification preview logged" : `Notification ${log.status.toLowerCase()}`}); }
  catch(error){next(error);}
}

async function runRemindersInternal(){
  const hearings = await pool.query(`SELECT case_no,next_hearing_date,io_name,police_station_id FROM master_hc_register WHERE status='Active' AND next_hearing_date=CURRENT_DATE+3`);
  const compliance = await pool.query(`SELECT case_no,deadline,responsible_officer FROM compliance_tracker WHERE status IN ('Pending','Delayed','Escalated') AND compliance_filed_date IS NULL AND deadline<=CURRENT_DATE+2`);
  let created=0;
  for(const item of hearings.rows){ await deliverNotification({caseNo:item.case_no,eventType:"HEARING_REMINDER",recipients:"IO,SHO,ACP,DCP",message:`HCMC Reminder: Case ${item.case_no} is listed on ${item.next_hearing_date.toISOString().slice(0,10)}. Please ensure readiness.`,channel:"Preview"}); created++; }
  for(const item of compliance.rows){ await deliverNotification({caseNo:item.case_no,eventType:"COMPLIANCE_ESCALATION",recipients:"ACP,DCP",message:`HCMC Escalation: Compliance for ${item.case_no} is due by ${item.deadline.toISOString().slice(0,10)}. Responsible: ${item.responsible_officer||"Not assigned"}.`,channel:"Preview"}); created++; }
  return { hearingReminders:hearings.rowCount, complianceEscalations:compliance.rowCount, logsCreated:created };
}

async function runReminders(req,res,next){ try{ res.json(await runRemindersInternal()); }catch(error){next(error);} }

async function pollCauseListInternal(listingDate){
  const url=process.env.HC_CAUSE_LIST_URL;
  if(!url){ const r=await pool.query(`INSERT INTO poll_runs(source_url,status,details) VALUES($1,'Not configured',$2) RETURNING *`,[null,"Set HC_CAUSE_LIST_URL in server/.env"]); return r.rows[0]; }
  try{
    const response=await fetch(url,{headers:{"User-Agent":"HCMC-West-Zone/1.0"}});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const text=(await response.text()).toLowerCase().replace(/\s+/g,"");
    const cases=await pool.query(`SELECT case_no,case_type,police_station_id,next_hearing_date FROM master_hc_register WHERE status='Active'`);
    const matches=cases.rows.filter(c=>text.includes(String(c.case_no).toLowerCase().replace(/\s+/g,"")));
    let created=0;
    const date=listingDate||new Date(Date.now()+86400000).toISOString().slice(0,10);
    for(const c of matches){ const r=await pool.query(`INSERT INTO daily_cause_list(listing_date,case_no,case_type,police_station_id,next_hearing_date) VALUES($1,$2,$3,$4,$5) ON CONFLICT(listing_date,case_no) DO NOTHING RETURNING id`,[date,c.case_no,c.case_type,c.police_station_id,c.next_hearing_date]); created+=r.rowCount; }
    const r=await pool.query(`INSERT INTO poll_runs(source_url,status,cases_found,entries_created,details) VALUES($1,'Success',$2,$3,$4) RETURNING *`,[url,matches.length,created,`Fetched ${response.status}`]);
    return r.rows[0];
  }catch(error){ const r=await pool.query(`INSERT INTO poll_runs(source_url,status,details) VALUES($1,'Failed',$2) RETURNING *`,[url,error.message]); return r.rows[0]; }
}

async function pollCauseList(req,res,next){ try{ res.json({run:await pollCauseListInternal(req.body.listingDate)}); }catch(error){next(error);} }

async function automationStatus(req,res,next){
  try{ const [polls,logs]=await Promise.all([pool.query(`SELECT * FROM poll_runs ORDER BY polled_at DESC LIMIT 20`),pool.query(`SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 50`)]); res.json({configured:{causeListUrl:Boolean(process.env.HC_CAUSE_LIST_URL),notificationWebhook:Boolean(process.env.NOTIFICATION_WEBHOOK_URL)},pollRuns:polls.rows,notificationLogs:logs.rows}); }
  catch(error){next(error);}
}

module.exports={sendNotification,runReminders,pollCauseList,automationStatus,runRemindersInternal,pollCauseListInternal};
