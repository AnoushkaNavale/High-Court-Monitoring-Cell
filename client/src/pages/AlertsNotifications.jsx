import { useEffect, useState } from "react";
import { Bell, CheckCheck, RefreshCw, Search } from "lucide-react";
import Pagination from "../components/Pagination.jsx";
import { apiGet, apiPut } from "../lib/api.js";

export default function AlertsNotifications({ token }) {
  const [alerts, setAlerts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load(nextPage = page) {
    try {
      const params = new URLSearchParams({ page: String(nextPage), pageSize: "10" });
      if (search.trim()) params.set("search", search.trim());
      const data = await apiGet(`/operations/alerts?${params}`, token);
      setAlerts(data.alerts || []);
      setUnread(data.unread || 0);
      setPagination(data.pagination);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(page); }, [page, token]);

  async function markRead() {
    try {
      const data = await apiPut("/operations/alerts/read", {}, token);
      setNotice(`${data.updated || 0} alerts marked as read.`);
      await load(1);
      setPage(1);
    } catch (err) {
      setError(err.message);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    load(1);
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Alerts & Notifications</h1>
          <p>Review cause-list summaries, reminders, and delivery notifications in your scope.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => load(page)}><RefreshCw size={16} />Refresh</button>
          <button onClick={markRead}><CheckCheck size={16} />Mark all read</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="stat-grid compact-stats">
        <Stat label="Unread alerts" value={unread} />
        <Stat label="Visible alerts" value={pagination?.totalItems || alerts.length} />
      </div>

      <form className="filters alert-filters" onSubmit={submitSearch}>
        <label>
          Search
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search message, event, case no..." />
        </label>
        <button>Search</button>
        <button type="button" className="secondary" onClick={() => { setSearch(""); setPage(1); load(1); }}>Reset</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Case No</th>
              <th>Message</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Read</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id} className={!alert.read_at ? "row-yellow" : ""}>
                <td>{alert.event_type}</td>
                <td>{alert.case_no || "Summary"}</td>
                <td>{alert.message}</td>
                <td>{alert.channel}</td>
                <td>{alert.status}</td>
                <td>{alert.read_at ? "Yes" : "No"}</td>
                <td>{formatDateTime(alert.created_at)}</td>
              </tr>
            ))}
            {!alerts.length && <tr><td colSpan="7" className="empty">No alerts found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPageChange={setPage} />
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <article className="stat-card blue">
      <Bell size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
