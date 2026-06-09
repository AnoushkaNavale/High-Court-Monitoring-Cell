import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, FileSignature, FileText, UserCheck } from "lucide-react";
import { apiGet } from "../lib/api.js";

export default function Dashboard({ token }) {
  const [cases, setCases] = useState([]);
  const [complianceSummary, setComplianceSummary] = useState({ pending: 0, escalated: 0, due_soon: 0 });
  const [followupSummary, setFollowupSummary] = useState({
    affidavitPending: 0,
    contemptOpen: 0,
    contemptUrgent: 0,
    appearanceUnconfirmed: 0,
    appearanceToday: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiGet("/cases", token), apiGet("/compliance/summary", token), apiGet("/followups/summary", token)])
      .then(([caseData, complianceData, followupData]) => {
        setCases(caseData.cases || []);
        setComplianceSummary(complianceData.summary || { pending: 0, escalated: 0, due_soon: 0 });
        setFollowupSummary(followupData.summary || {});
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      active: cases.filter((item) => item.status === "Active").length,
      critical: cases.filter((item) => item.risk_level === "Red").length,
      hearingsToday: cases.filter((item) => item.next_hearing_date?.slice(0, 10) === today).length,
      stayed: cases.filter((item) => item.status === "Stayed" || item.interim_order).length,
    };
  }, [cases]);

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Operational overview from register, hearings, and compliance modules.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="stat-grid">
        <Stat icon={<FileText />} label="Active cases" value={stats.active} />
        <Stat icon={<AlertTriangle />} label="Critical Red risk" value={stats.critical} tone="red" />
        <Stat icon={<CalendarClock />} label="Hearings today" value={stats.hearingsToday} tone="blue" />
        <Stat icon={<CheckCircle2 />} label="Stayed/interim order" value={stats.stayed} tone="orange" />
        <Stat icon={<ClipboardCheck />} label="Pending compliance" value={complianceSummary.pending || 0} tone="orange" />
        <Stat icon={<AlertTriangle />} label="Due within 48 hours" value={complianceSummary.due_soon || 0} tone="red" />
        <Stat icon={<AlertTriangle />} label="Escalated compliance" value={complianceSummary.escalated || 0} tone="red" />
        <Stat icon={<FileSignature />} label="Pending affidavits" value={followupSummary.affidavitPending || 0} tone="orange" />
        <Stat icon={<AlertTriangle />} label="Urgent contempt risk" value={followupSummary.contemptUrgent || 0} tone="red" />
        <Stat icon={<UserCheck />} label="Unconfirmed appearances" value={followupSummary.appearanceUnconfirmed || 0} tone="orange" />
      </div>

      <div className="panel">
        <h2>Recent Register Items</h2>
        <div className="mini-table">
          {cases.slice(0, 8).map((item) => (
            <div key={item.sl_no} className="mini-row">
              <strong>{item.case_no}</strong>
              <span>{item.police_station_name || "PS not set"}</span>
              <RiskBadge value={item.risk_level} />
            </div>
          ))}
          {!cases.length && <p className="muted">No cases have been added yet.</p>}
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label, value, tone = "green" }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function RiskBadge({ value }) {
  return <span className={`risk ${String(value || "Green").toLowerCase()}`}>{value || "Green"}</span>;
}
