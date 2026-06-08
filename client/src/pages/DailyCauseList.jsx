import { useEffect, useMemo, useState } from "react";
import { Bell, Edit, Plus, RefreshCw, Search, Wand2 } from "lucide-react";
import { apiGet, apiPost, apiPut } from "../lib/api.js";

const blankForm = {
  listing_date: new Date().toISOString().slice(0, 10),
  case_no: "",
  case_type: "",
  police_station_id: "",
  io_informed: false,
  dcp_informed: false,
  spp_informed: false,
  file_ready: false,
  objections_filed: false,
  court_hall: "",
  outcome: "",
  next_hearing_date: "",
};

const recipientOptions = ["JC", "DCP", "ACP", "PI", "IO"];

export default function DailyCauseList({ token }) {
  const [masters, setMasters] = useState({ policeStations: [] });
  const [cases, setCases] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ listingDate: "", policeStationId: "", search: "" });
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [recipients, setRecipients] = useState(["DCP", "ACP", "PI", "IO"]);
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
      const [masterData, caseData, causeData] = await Promise.all([
        apiGet("/masters", token),
        apiGet("/cases", token),
        apiGet(`/daily-cause-list${query ? `?${query}` : ""}`, token),
      ]);
      setMasters(masterData);
      setCases(caseData.cases || []);
      setEntries(causeData.entries || []);
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
      case_type: match?.case_type || "",
      police_station_id: match?.police_station_id || "",
      next_hearing_date: match?.next_hearing_date ? match.next_hearing_date.slice(0, 10) : current.next_hearing_date,
    }));
  }

  function editEntry(entry) {
    setEditingId(entry.id);
    setForm({
      ...blankForm,
      ...entry,
      listing_date: entry.listing_date ? entry.listing_date.slice(0, 10) : "",
      next_hearing_date: entry.next_hearing_date ? entry.next_hearing_date.slice(0, 10) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankForm);
  }

  async function saveEntry(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = {
        ...form,
        police_station_id: form.police_station_id ? Number(form.police_station_id) : null,
      };
      if (editingId) {
        await apiPut(`/daily-cause-list/${editingId}`, payload, token);
        setNotice("Cause list entry updated.");
      } else {
        await apiPost("/daily-cause-list", payload, token);
        setNotice("Cause list entry added.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function generateForDate() {
    setError("");
    setNotice("");
    try {
      const data = await apiPost("/daily-cause-list/generate", { listingDate: form.listing_date }, token);
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function previewNotification() {
    if (!selectedEntryId) {
      setError("Select a cause list entry before previewing a notification");
      return;
    }
    setError("");
    setNotice("");
    try {
      const data = await apiPost(
        `/daily-cause-list/${selectedEntryId}/notify-preview`,
        { recipients },
        token
      );
      setNotice(`${data.status.toUpperCase()}: ${data.message} Recipients: ${data.recipients.join(", ")}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleRecipient(value) {
    setRecipients((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Daily Cause List</h1>
          <p>Prepare daily High Court listings and briefing alerts.</p>
        </div>
        <button className="secondary" onClick={load}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <form className="case-form" onSubmit={saveEntry}>
        <div className="form-title">
          <h2>{editingId ? "Edit Listing" : "Add Listing"}</h2>
          {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel edit</button>}
        </div>

        <Field label="Listing Date" type="date" value={form.listing_date} onChange={(value) => updateForm("listing_date", value)} required />
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
        <Field label="Case Type" value={form.case_type} onChange={(value) => updateForm("case_type", value)} />
        <Field label="Police Station" value={selectedCase?.police_station_name || stationName(masters, form.police_station_id)} readOnly />
        <Field label="Court Hall" value={form.court_hall} onChange={(value) => updateForm("court_hall", value)} />
        <Field label="Outcome" value={form.outcome} onChange={(value) => updateForm("outcome", value)} />
        <Field label="Next Hearing Date" type="date" value={form.next_hearing_date || ""} onChange={(value) => updateForm("next_hearing_date", value)} />
        <div className="check-grid">
          <Check label="IO Informed" checked={form.io_informed} onChange={(value) => updateForm("io_informed", value)} />
          <Check label="DCP Informed" checked={form.dcp_informed} onChange={(value) => updateForm("dcp_informed", value)} />
          <Check label="SPP Informed" checked={form.spp_informed} onChange={(value) => updateForm("spp_informed", value)} />
          <Check label="File Ready" checked={form.file_ready} onChange={(value) => updateForm("file_ready", value)} />
          <Check label="Objections Filed" checked={form.objections_filed} onChange={(value) => updateForm("objections_filed", value)} />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary">
            {editingId ? <Edit size={16} /> : <Plus size={16} />}
            {editingId ? "Update Listing" : "Add Listing"}
          </button>
          <button type="button" className="secondary" onClick={generateForDate}>
            <Wand2 size={16} />
            Generate From Hearings On This Date
          </button>
        </div>
      </form>

      <div className="notification-panel">
        <div>
          <h2>Notification Preview</h2>
          <p>Manual preview for Phase 2. SMS/WhatsApp sending comes later.</p>
        </div>
        <select value={selectedEntryId} onChange={(event) => setSelectedEntryId(event.target.value)}>
          <option value="">Select listed case</option>
          {entries.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.case_no} - {formatDate(entry.listing_date)}</option>
          ))}
        </select>
        <div className="recipient-row">
          {recipientOptions.map((option) => (
            <Check key={option} label={option} checked={recipients.includes(option)} onChange={() => toggleRecipient(option)} />
          ))}
        </div>
        <button className="secondary" onClick={previewNotification}>
          <Bell size={16} />
          Preview Alert
        </button>
      </div>

      <div className="filters">
        <label>
          <Search size={16} />
          <input
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Search case, crime no, police station"
          />
        </label>
        <input type="date" value={filters.listingDate} onChange={(event) => setFilters({ ...filters, listingDate: event.target.value })} />
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
              <th>Listing Date</th>
              <th>Case No</th>
              <th>Case Type</th>
              <th>Police Station</th>
              <th>IO Informed</th>
              <th>DCP Informed</th>
              <th>SPP Informed</th>
              <th>File Ready</th>
              <th>Objections</th>
              <th>Court Hall</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className={`row-${String(entry.risk_level || "Green").toLowerCase()}`}>
                <td><button className="icon-btn" onClick={() => editEntry(entry)}><Edit size={15} /></button></td>
                <td>{formatDate(entry.listing_date)}</td>
                <td>{entry.case_no}</td>
                <td>{entry.case_type}</td>
                <td>{entry.police_station_name}</td>
                <td>{yesNo(entry.io_informed)}</td>
                <td>{yesNo(entry.dcp_informed)}</td>
                <td>{yesNo(entry.spp_informed)}</td>
                <td>{yesNo(entry.file_ready)}</td>
                <td>{yesNo(entry.objections_filed)}</td>
                <td>{entry.court_hall}</td>
                <td>{entry.outcome}</td>
              </tr>
            ))}
            {!loading && !entries.length && (
              <tr><td colSpan="12" className="empty">No daily cause list entries found.</td></tr>
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

function Check({ label, checked, onChange }) {
  return (
    <label className="check compact-check">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function stationName(masters, id) {
  return masters.policeStations.find((station) => String(station.police_station_id) === String(id))?.station_name || "";
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}
