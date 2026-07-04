import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import Pagination from "../components/Pagination.jsx";
import { apiGet } from "../lib/api.js";

export default function AuditLogs({ token }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  async function load(nextPage = page) {
    try {
      const data = await apiGet(`/operations/audit-logs?page=${nextPage}&pageSize=25`, token);
      setLogs(data.auditLogs || []);
      setPagination(data.pagination);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(page); }, [page, token]);

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Track platform activity, user actions, and operational audit trails.</p>
        </div>
        <button className="secondary" onClick={() => load(page)}><RefreshCw size={16} />Refresh</button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="filters audit-filters">
        <label>
          Current view
          <Search size={16} />
          <input value="Latest platform activity" readOnly />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Actor</th>
              <th>Status</th>
              <th>IP Address</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDateTime(log.created_at)}</td>
                <td>{log.action}</td>
                <td>{log.resource}</td>
                <td>{log.user_email || "System"}</td>
                <td>{log.status_code}</td>
                <td>{log.ip_address || "-"}</td>
                <td>{log.duration_ms ?? 0} ms</td>
              </tr>
            ))}
            {!logs.length && <tr><td colSpan="7" className="empty">No audit logs found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPageChange={setPage} />
    </section>
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
