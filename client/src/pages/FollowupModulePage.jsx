import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit, Plus, RefreshCw, Search } from "lucide-react";
import { apiGet, apiPost, apiPut } from "../lib/api.js";

const moduleConfigs = {
  affidavit: {
    title: "Affidavit Status",
    subtitle: "Track IO remarks, legal vetting, filing status, and delay reasons.",
    endpoint: "/followups/affidavits",
    collection: "affidavits",
    blank: {
      case_no: "",
      police_station_id: "",
      io_name: "",
      date_notice_received: "",
      date_remarks_sought: "",
      remarks_received_date: "",
      legal_vetting_done: false,
      affidavit_filed_date: "",
      delay_days: 0,
      reason_for_delay: "",
      status: "Pending",
    },
    statusOptions: ["Pending", "Filed", "Delayed"],
    fields: [
      ["date_notice_received", "Notice Received", "date"],
      ["date_remarks_sought", "Remarks Sought", "date"],
      ["remarks_received_date", "Remarks Received", "date"],
      ["affidavit_filed_date", "Affidavit Filed", "date"],
      ["io_name", "IO Name", "text"],
      ["delay_days", "Delay Days", "number"],
    ],
    textAreas: [["reason_for_delay", "Reason for Delay"]],
    bools: [["legal_vetting_done", "Legal Vetting Done"]],
    table: [
      ["case_no", "Case No"],
      ["police_station_name", "Police Station"],
      ["io_name", "IO"],
      ["date_notice_received", "Notice"],
      ["remarks_received_date", "Remarks Received"],
      ["legal_vetting_done", "Vetting"],
      ["affidavit_filed_date", "Filed"],
      ["delay_days", "Delay"],
      ["status", "Status"],
    ],
  },
  contempt: {
    title: "Contempt Risk",
    subtitle: "Monitor urgent compliance risks and escalation levels.",
    endpoint: "/followups/contempt-risks",
    collection: "risks",
    blank: {
      case_no: "",
      order_date: "",
      compliance_deadline: "",
      nature_of_risk: "",
      responsible_officer: "",
      compliance_done: false,
      escalation_level: "None",
      remarks: "",
    },
    escalationOptions: ["None", "ACP", "DCP", "JCP", "CP"],
    fields: [
      ["order_date", "Order Date", "date"],
      ["compliance_deadline", "Compliance Deadline", "date"],
      ["responsible_officer", "Responsible Officer", "text"],
    ],
    textAreas: [
      ["nature_of_risk", "Nature of Risk"],
      ["remarks", "Remarks"],
    ],
    bools: [["compliance_done", "Compliance Done"]],
    table: [
      ["case_no", "Case No"],
      ["police_station_name", "Police Station"],
      ["order_date", "Order"],
      ["compliance_deadline", "Deadline"],
      ["days_remaining", "Days"],
      ["nature_of_risk", "Risk"],
      ["responsible_officer", "Officer"],
      ["compliance_done", "Done"],
      ["escalation_level", "Escalation"],
    ],
  },
  appearance: {
    title: "Personal Appearance",
    subtitle: "Track officer appearance dates, confirmations, court hall, and post-appearance orders.",
    endpoint: "/followups/personal-appearances",
    collection: "appearances",
    blank: {
      case_no: "",
      officer_name: "",
      rank: "",
      appearance_date: "",
      court_hall: "",
      appearance_confirmed: false,
      order_after_appearance: "",
      next_date: "",
    },
    fields: [
      ["officer_name", "Officer Name", "text"],
      ["rank", "Rank", "text"],
      ["appearance_date", "Appearance Date", "date"],
      ["court_hall", "Court Hall", "text"],
      ["next_date", "Next Date", "date"],
    ],
    textAreas: [["order_after_appearance", "Order After Appearance"]],
    bools: [["appearance_confirmed", "Appearance Confirmed"]],
    table: [
      ["case_no", "Case No"],
      ["police_station_name", "Police Station"],
      ["officer_name", "Officer"],
      ["rank", "Rank"],
      ["appearance_date", "Appearance Date"],
      ["days_remaining", "Days"],
      ["court_hall", "Court Hall"],
      ["appearance_confirmed", "Confirmed"],
      ["next_date", "Next Date"],
    ],
  },
};

export default function FollowupModulePage({ token, module }) {
  const config = moduleConfigs[module];
  const [masters, setMasters] = useState({ policeStations: [] });
  const [cases, setCases] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", policeStationId: "", status: "", escalationLevel: "" });
  const [form, setForm] = useState(config.blank);
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
      const [masterData, caseData, moduleData] = await Promise.all([
        apiGet("/masters", token),
        apiGet("/cases", token),
        apiGet(`${config.endpoint}${query ? `?${query}` : ""}`, token),
      ]);
      setMasters(masterData);
      setCases(caseData.cases || []);
      setItems(moduleData[config.collection] || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [module]);

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
      police_station_id: current.police_station_id || match?.police_station_id || "",
      io_name: current.io_name || match?.io_name || "",
      officer_name: current.officer_name || match?.io_name || "",
      responsible_officer: current.responsible_officer || match?.io_name || "",
    }));
  }

  function editItem(item) {
    const next = { ...config.blank, ...item };
    for (const [field, , type] of config.fields) {
      if (type === "date") next[field] = toInputDate(item[field]);
    }
    for (const [field] of config.textAreas || []) {
      next[field] = item[field] || "";
    }
    setEditingId(item.id);
    setForm(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(config.blank);
  }

  async function saveItem(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = { ...form };
      if ("delay_days" in payload) payload.delay_days = Number(payload.delay_days || 0);
      if ("police_station_id" in payload && payload.police_station_id) {
        payload.police_station_id = Number(payload.police_station_id);
      }
      if (editingId) {
        await apiPut(`${config.endpoint}/${editingId}`, payload, token);
        setNotice(`${config.title} entry updated.`);
      } else {
        await apiPost(config.endpoint, payload, token);
        setNotice(`${config.title} entry added.`);
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
      const data = await apiPost(`${config.endpoint}/${id}/escalate`, { escalation_level: "DCP" }, token);
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
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
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
          <h2>{editingId ? `Edit ${config.title}` : `Add ${config.title}`}</h2>
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
        <Field label="Police Station" value={selectedCase?.police_station_name || stationName(masters, form.police_station_id)} readOnly />

        {config.fields.map(([field, label, type]) => (
          <Field key={field} label={label} type={type} value={form[field]} onChange={(value) => updateForm(field, value)} required={["appearance_date", "compliance_deadline"].includes(field)} />
        ))}

        {config.statusOptions && (
          <label>
            Status
            <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
              {config.statusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        )}

        {config.escalationOptions && (
          <label>
            Escalation Level
            <select value={form.escalation_level} onChange={(event) => updateForm("escalation_level", event.target.value)}>
              {config.escalationOptions.map((level) => <option key={level}>{level}</option>)}
            </select>
          </label>
        )}

        {(config.bools || []).map(([field, label]) => (
          <label key={field} className="check compact-check">
            <input type="checkbox" checked={Boolean(form[field])} onChange={(event) => updateForm(field, event.target.checked)} />
            {label}
          </label>
        ))}

        {(config.textAreas || []).map(([field, label]) => (
          <label key={field} className="wide">
            {label}
            <textarea value={form[field] || ""} onChange={(event) => updateForm(field, event.target.value)} rows="3" />
          </label>
        ))}

        <div className="form-actions">
          <button type="submit" className="primary">
            {editingId ? <Edit size={16} /> : <Plus size={16} />}
            {editingId ? "Update Entry" : "Add Entry"}
          </button>
        </div>
      </form>

      <div className="filters">
        <label>
          <Search size={16} />
          <input
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Search case, crime no, police station"
          />
        </label>
        {config.statusOptions ? (
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            {config.statusOptions.map((status) => <option key={status}>{status}</option>)}
          </select>
        ) : config.escalationOptions ? (
          <select value={filters.escalationLevel} onChange={(event) => setFilters({ ...filters, escalationLevel: event.target.value })}>
            <option value="">All escalation levels</option>
            {config.escalationOptions.map((level) => <option key={level}>{level}</option>)}
          </select>
        ) : (
          <span />
        )}
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
              {config.table.map(([, label]) => <th key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={rowClass(module, item)}>
                <td className="action-stack">
                  <button className="icon-btn" onClick={() => editItem(item)}><Edit size={15} /></button>
                  {module === "contempt" && item.escalation_level === "None" && !item.compliance_done && (
                    <button className="icon-btn warn" onClick={() => escalateItem(item.id)} title="Escalate to DCP">
                      <AlertTriangle size={15} />
                    </button>
                  )}
                </td>
                {config.table.map(([field]) => <td key={field}>{displayValue(field, item[field])}</td>)}
              </tr>
            ))}
            {!loading && !items.length && (
              <tr><td colSpan={config.table.length + 1} className="empty">No entries found.</td></tr>
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

function stationName(masters, id) {
  return masters.policeStations.find((station) => String(station.police_station_id) === String(id))?.station_name || "";
}

function toInputDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function displayValue(field, value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field.includes("date") || field.includes("deadline") || field.includes("received")) return formatDate(value);
  if (field === "days_remaining") {
    const days = Number(value);
    if (!Number.isFinite(days)) return "";
    if (days < 0) return `${Math.abs(days)} overdue`;
    return `${days} left`;
  }
  return value || "";
}

function rowClass(module, item) {
  if (module === "affidavit") {
    if (item.status === "Delayed") return "row-red";
    if (item.status === "Pending") return "row-orange";
    return "row-green";
  }
  if (module === "contempt") {
    const days = Number(item.days_remaining);
    if (!item.compliance_done && (days <= 2 || item.escalation_level !== "None")) return "row-red";
    if (!item.compliance_done && days <= 5) return "row-orange";
    return "row-green";
  }
  const days = Number(item.days_remaining);
  if (!item.appearance_confirmed && days <= 2) return "row-red";
  if (!item.appearance_confirmed && days <= 5) return "row-orange";
  return "row-green";
}
