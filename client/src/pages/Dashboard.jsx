import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, FileSignature, FileText, Moon, Sun, UserCheck } from "lucide-react";
import { apiGet } from "../lib/api.js";

export default function Dashboard({ token, theme, setTheme }) {
  const darkMode = theme === "dark";
  const [cases, setCases] = useState([]);
  const [analytics, setAnalytics] = useState({ totals: {}, byStation: [], byType: [] });
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
    Promise.all([apiGet("/cases?pageSize=500", token), apiGet("/compliance/summary", token), apiGet("/followups/summary", token), apiGet("/operations/analytics", token)])
      .then(([caseData, complianceData, followupData, analyticsData]) => {
        setCases(caseData.cases || []);
        setComplianceSummary(complianceData.summary || { pending: 0, escalated: 0, due_soon: 0 });
        setFollowupSummary(followupData.summary || {});
        setAnalytics(analyticsData || { totals: {}, byStation: [], byType: [] });
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      active: cases.filter((item) => item.status === "Active").length,
      total: analytics.totals?.total || cases.length,
      activeTotal: analytics.totals?.active ?? cases.filter((item) => item.status === "Active").length,
      critical: cases.filter((item) => item.risk_level === "Red").length,
      hearingsToday: cases.filter((item) => item.next_hearing_date?.slice(0, 10) === today).length,
      stayed: cases.filter((item) => item.status === "Stayed" || item.interim_order).length,
    };
  }, [cases, analytics]);

  const hearingDays = useMemo(() => {
    const grouped = new Map();
    for (const item of cases) {
      const date = item.next_hearing_date?.slice(0, 10);
      if (!date) continue;
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(item.case_no);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 14)
      .map(([date, caseNos]) => ({ date, count: caseNos.length, sample: caseNos.slice(0, 2) }));
  }, [cases]);

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Operational overview from register, hearings, and compliance modules.</p>
        </div>
        <button className="mode-button" onClick={() => setTheme(darkMode ? "light" : "dark")}>
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="stat-grid">
        <Stat icon={<FileText />} label="HC register cases" value={stats.total} />
        <Stat icon={<CheckCircle2 />} label="Active cases" value={stats.activeTotal} />
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

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Hearing calendar</h2>
          <p className="muted">Upcoming hearing dates from the scoped register.</p>
          <div className="calendar-strip">
            {hearingDays.map((day) => (
              <article key={day.date} className="calendar-tile">
                <strong>{formatDay(day.date)}</strong>
                <span>{day.count} hearings</span>
                <small>{day.sample.join(", ")}</small>
              </article>
            ))}
            {!hearingDays.length && <p className="muted">No upcoming hearings found.</p>}
          </div>
        </div>

        <div className="panel">
          <h2>Jurisdiction cases</h2>
          <p className="muted">Ranked case distribution by police station.</p>
          <div className="rank-list">
            {(analytics.byStation || []).slice(0, 8).map((item, index) => (
              <div key={`${item.label}-${index}`} className="rank-row">
                <span>{index + 1}</span>
                <strong>{item.label || "Unassigned"}</strong>
                <em>{item.value}</em>
              </div>
            ))}
            {!analytics.byStation?.length && <p className="muted">No station distribution yet.</p>}
          </div>
        </div>
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

function formatDay(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
