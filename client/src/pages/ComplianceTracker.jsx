import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit, Plus, RefreshCw, Search } from "lucide-react";
import { apiGet, apiPost, apiPut } from "../lib/api.js";

const blankForm = {
  case_no: "",
  direction_date: new Date().toISOString().slice(0, 10),
  nature_of_direction: "",
  compliance_required: "",
  deadline: "",
  responsible_officer: "",
  reminder_sent_date: "",
  compliance_filed_date: "",
  delay_days: 0,
  status: "Pending",
  escalated: false,
  delay_reason: "",
};

const statuses = ["Pending", "Filed", "Delayed", "Escalated", "Closed"];

export default function ComplianceTracker({ token }) {
  const [masters, setMasters] = useState({ policeStations: [] });
  const [cases, setCases] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", policeStationId: "" });
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      ).toString();
      const [masterData, caseData, complianceData] = await Promise.all([
        apiGet("/masters", token),
        apiGet("/cases", token),
        apiGet(`/compliance${query ? `?${query}` : ""}`, token),
      ]);
      setMasters(masterData);
      setCases(caseData.cases || []);
      setItems(complianceData.compliance || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedCase = useMemo(
    () => cases.find((item) => item.case_no === form.case_no),
    [cases, form.case_no]
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCaseChange(caseNo) {
    const match = cases.find((item) => item.case_no === caseNo);
    setForm((current) => ({
      ...current,
      case_no: caseNo,
      responsible_officer: current.responsible_officer || match?.io_name || "",
    }));
  }

  function editItem(item) {
    setEditingId(item.id);
    setForm({
      ...blankForm,
      ...item,
      direction_date: toInputDate(item.direction_date),
      deadline: toInputDate(item.deadline),
      reminder_sent_date: toInputDate(item.reminder_sent_date),
      compliance_filed_date: toInputDate(item.compliance_filed_date),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankForm);
  }

  async function saveItem(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = {
        ...form,
        delay_days: Number(form.delay_days || 0),
      };
      if (editingId) {
        await apiPut(`/compliance/${editingId}`, payload, token);
        setNotice("Compliance entry updated.");
      } else {
        await apiPost("/compliance", payload, token);
        setNotice("Compliance direction added.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function escalateItem(id) {
    setError("");
    setNotice("");
    try {
      const data = await apiPost(`/compliance/${id}/escalate`, {}, token);
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Compliance Tracker</h1>
          <p>Track court directions, deadlines, filing status, and escalations.</p>
        </div>
        <button className="secondary" onClick={load}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <form className="case-form" onSubmit={saveItem}>
        <div className="form-title">
          <h2>{editingId ? "Edit Compliance" : "Add Court Direction"}</h2>
          {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel edit</button>}
        </div>

        <label>
          Case No
          <select value={form.case_no} onChange={(event) => handleCaseChange(event.target.value)} required>
            <option value="">Select case</option>
            {cases.map((item) => (
              <option key={item.sl_no} value={item.case_no}>
                {item.case_no} {item.police_station_name ? `- ${item.police_station_name}` : ""}
              </option>
            ))}
          </select>
        </label>
        <Field label="Police Station" value={selectedCase?.police_station_name || ""} readOnly />
        <Field label="Direction Date" type="date" value={form.direction_date} onChange={(value) => updateForm("direction_date", value)} required />
        <Field label="Deadline" type="date" value={form.deadline} onChange={(value) => updateForm("deadline", value)} required />
        <Field label="Nature of Direction" value={form.nature_of_direction} onChange={(value) => updateForm("nature_of_direction", value)} />
        <Field label="Responsible Officer" value={form.responsible_officer} onChange={(value) => updateForm("responsible_officer", value)} />
        <label>
          Status
          <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <Field label="Reminder Sent Date" type="date" value={form.reminder_sent_date || ""} onChange={(value) => updateForm("reminder_sent_date", value)} />
        <Field label="Compliance Filed Date" type="date" value={form.compliance_filed_date || ""} onChange={(value) => updateForm("compliance_filed_date", value)} />
        <Field label="Delay Days" type="number" value={form.delay_days} onChange={(value) => updateForm("delay_days", value)} />
        <label className="wide">
          Compliance Required
          <textarea value={form.compliance_required} onChange={(event) => updateForm("compliance_required", event.target.value)} rows="3" required />
        </label>
        <label className="wide">
          Delay Reason
          <textarea value={form.delay_reason || ""} onChange={(event) => updateForm("delay_reason", event.target.value)} rows="2" />
        </label>
        <label className="check compact-check"><input type="checkbox" checked={form.escalated} onChange={(event) => updateForm("escalated", event.target.checked)} /> Escalated</label>

        <div className="form-actions">
          <button type="submit" className="primary">
            {editingId ? <Edit size={16} /> : <Plus size={16} />}
            {editingId ? "Update Compliance" : "Add Compliance"}
          </button>
        </div>
      </form>

      <div className="filters">
        <label>
          <Search size={16} />
          <input
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Search case, officer, compliance"
          />
        </label>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        <select value={filters.policeStationId} onChange={(event) => setFilters({ ...filters, policeStationId: event.target.value })}>
          <option value="">All police stations</option>
          {masters.policeStations.map((station) => (
            <option key={station.police_station_id} value={station.police_station_id}>{station.station_name}</option>
          ))}
        </select>
        <button className="secondary" onClick={load}>Apply</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Case No</th>
              <th>Police Station</th>
              <th>Direction</th>
              <th>Required</th>
              <th>Deadline</th>
              <th>Days</th>
              <th>Responsible</th>
              <th>Status</th>
              <th>Filed</th>
              <th>Escalated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={deadlineClass(item)}>
                <td className="action-stack">
                  <button className="icon-btn" onClick={() => editItem(item)}><Edit size={15} /></button>
                  {!item.escalated && item.status !== "Closed" && (
                    <button className="icon-btn warn" onClick={() => escalateItem(item.id)} title="Escalate">
                      <AlertTriangle size={15} />
                    </button>
                  )}
                </td>
                <td>{item.case_no}</td>
                <td>{item.police_station_name}</td>
                <td>{item.nature_of_direction}</td>
                <td>{item.compliance_required}</td>
                <td>{formatDate(item.deadline)}</td>
                <td>{displayDays(item)}</td>
                <td>{item.responsible_officer}</td>
                <td>{item.status}</td>
                <td>{formatDate(item.compliance_filed_date)}</td>
                <td>{item.escalated ? "Yes" : "No"}</td>
              </tr>
            ))}
            {!loading && !items.length && (
              <tr><td colSpan="11" className="empty">No compliance entries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text", required = false, readOnly = false }) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        readOnly={readOnly}
      />
    </label>
  );
}

function toInputDate(value) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function displayDays(item) {
  if (item.compliance_filed_date) return "Filed";
  if (item.days_remaining === null || item.days_remaining === undefined) return "";
  const days = Number(item.days_remaining);
  if (days < 0) return `${Math.abs(days)} overdue`;
  return `${days} left`;
}

function deadlineClass(item) {
  if (item.compliance_filed_date || item.status === "Closed") return "row-green";
  const days = Number(item.days_remaining);
  if (item.escalated || days <= 2) return "row-red";
  if (days <= 5) return "row-orange";
  return "row-green";
}
