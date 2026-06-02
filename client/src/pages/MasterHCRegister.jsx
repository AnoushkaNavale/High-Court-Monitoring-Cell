import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, RefreshCw, Search } from "lucide-react";
import { apiGet, apiPost, apiPut } from "../lib/api.js";

const blankForm = {
  case_no: "",
  case_type: "",
  crime_no: "",
  police_station_id: "",
  sections: "",
  petitioner_accused: "",
  io_name: "",
  sho: "",
  acp: "",
  dcp: "",
  spp_name: "",
  stage: "Pending",
  next_hearing_date: "",
  interim_order: false,
  stay_on_arrest: false,
  personal_appearance_required: false,
  risk_level: "Green",
  status: "Active",
  remarks: "",
};

export default function MasterHCRegister({ token }) {
  const [masters, setMasters] = useState({ policeStations: [], divisions: [], subDivisions: [] });
  const [cases, setCases] = useState([]);
  const [filters, setFilters] = useState({ search: "", policeStationId: "", riskLevel: "" });
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      ).toString();
      const [masterData, caseData] = await Promise.all([
        apiGet("/masters", token),
        apiGet(`/cases${query ? `?${query}` : ""}`, token),
      ]);
      setMasters(masterData);
      setCases(caseData.cases || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedStation = useMemo(
    () => masters.policeStations.find((item) => String(item.police_station_id) === String(form.police_station_id)),
    [masters.policeStations, form.police_station_id]
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editCase(item) {
    setEditingId(item.sl_no);
    setForm({
      ...blankForm,
      ...item,
      next_hearing_date: item.next_hearing_date ? item.next_hearing_date.slice(0, 10) : "",
      disposed_date: item.disposed_date ? item.disposed_date.slice(0, 10) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankForm);
  }

  async function saveCase(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = {
        ...form,
        police_station_id: Number(form.police_station_id),
      };
      if (editingId) {
        await apiPut(`/cases/${editingId}`, payload, token);
        setNotice("Case updated.");
      } else {
        await apiPost("/cases", payload, token);
        setNotice("Case added to Master HC Register.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Master HC Register</h1>
          <p>Add and track West Zone High Court cases.</p>
        </div>
        <button className="secondary" onClick={load}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <form className="case-form" onSubmit={saveCase}>
        <div className="form-title">
          <h2>{editingId ? "Edit Case" : "Add Case"}</h2>
          {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel edit</button>}
        </div>
        <Field label="Case No" value={form.case_no} onChange={(v) => updateForm("case_no", v)} required />
        <Field label="Case Type" value={form.case_type} onChange={(v) => updateForm("case_type", v)} />
        <Field label="Crime No" value={form.crime_no} onChange={(v) => updateForm("crime_no", v)} />
        <label>
          Police Station
          <select value={form.police_station_id} onChange={(e) => updateForm("police_station_id", e.target.value)} required>
            <option value="">Select PS</option>
            {masters.policeStations.map((station) => (
              <option key={station.police_station_id} value={station.police_station_id}>
                {station.station_name}
              </option>
            ))}
          </select>
        </label>
        <Field label="Division" value={selectedStation?.division_name || ""} readOnly />
        <Field label="Sub-Division" value={selectedStation?.sub_division_name || ""} readOnly />
        <Field label="Sections" value={form.sections} onChange={(v) => updateForm("sections", v)} />
        <Field label="Petitioner/Accused" value={form.petitioner_accused} onChange={(v) => updateForm("petitioner_accused", v)} />
        <Field label="IO Name" value={form.io_name} onChange={(v) => updateForm("io_name", v)} />
        <Field label="SHO" value={form.sho} onChange={(v) => updateForm("sho", v)} />
        <Field label="ACP" value={form.acp} onChange={(v) => updateForm("acp", v)} />
        <Field label="DCP" value={form.dcp} onChange={(v) => updateForm("dcp", v)} />
        <Field label="SPP Name" value={form.spp_name} onChange={(v) => updateForm("spp_name", v)} />
        <Field label="Stage" value={form.stage} onChange={(v) => updateForm("stage", v)} />
        <Field label="Next Hearing Date" type="date" value={form.next_hearing_date || ""} onChange={(v) => updateForm("next_hearing_date", v)} />
        <label>
          Risk Level
          <select value={form.risk_level} onChange={(e) => updateForm("risk_level", e.target.value)}>
            {["Red", "Orange", "Yellow", "Green"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={(e) => updateForm("status", e.target.value)}>
            {["Active", "Disposed", "Stayed"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={form.interim_order} onChange={(e) => updateForm("interim_order", e.target.checked)} /> Interim Order</label>
        <label className="check"><input type="checkbox" checked={form.stay_on_arrest} onChange={(e) => updateForm("stay_on_arrest", e.target.checked)} /> Stay on Arrest</label>
        <label className="check"><input type="checkbox" checked={form.personal_appearance_required} onChange={(e) => updateForm("personal_appearance_required", e.target.checked)} /> Personal Appearance</label>
        <label className="wide">
          Remarks
          <textarea value={form.remarks || ""} onChange={(e) => updateForm("remarks", e.target.value)} rows="3" />
        </label>
        <button type="submit" className="primary">
          {editingId ? <Edit size={16} /> : <Plus size={16} />}
          {editingId ? "Update Case" : "Add Case"}
        </button>
      </form>

      <div className="filters">
        <label>
          <Search size={16} />
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search case, crime no, petitioner"
          />
        </label>
        <select value={filters.policeStationId} onChange={(e) => setFilters({ ...filters, policeStationId: e.target.value })}>
          <option value="">All police stations</option>
          {masters.policeStations.map((station) => (
            <option key={station.police_station_id} value={station.police_station_id}>{station.station_name}</option>
          ))}
        </select>
        <select value={filters.riskLevel} onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}>
          <option value="">All risks</option>
          {["Red", "Orange", "Yellow", "Green"].map((value) => <option key={value}>{value}</option>)}
        </select>
        <button className="secondary" onClick={load}>Apply</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Sl No</th>
              <th>Case No</th>
              <th>Case Type</th>
              <th>Crime No</th>
              <th>Police Station</th>
              <th>Petitioner/Accused</th>
              <th>IO Name</th>
              <th>Stage</th>
              <th>Next Hearing</th>
              <th>Risk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.sl_no} className={`row-${String(item.risk_level || "Green").toLowerCase()}`}>
                <td><button className="icon-btn" onClick={() => editCase(item)}><Edit size={15} /></button></td>
                <td>{item.sl_no}</td>
                <td>{item.case_no}</td>
                <td>{item.case_type}</td>
                <td>{item.crime_no}</td>
                <td>{item.police_station_name}</td>
                <td>{item.petitioner_accused}</td>
                <td>{item.io_name}</td>
                <td>{item.stage}</td>
                <td>{formatDate(item.next_hearing_date)}</td>
                <td><span className={`risk ${String(item.risk_level || "Green").toLowerCase()}`}>{item.risk_level}</span></td>
                <td>{item.status}</td>
              </tr>
            ))}
            {!loading && !cases.length && (
              <tr><td colSpan="12" className="empty">No register cases found.</td></tr>
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

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}
