const masterDescription = "Zones, Divisions, Sub Divisions, Police Stations, Case Types, Case Stages, Designations, Nature of Direction, Court Halls, and HC Portal Config.";

const masters = {
  "master-case-stages": ["Case Stages", "Case Stages master data", "Search case stages...", ["NAME ▲", "ACTIONS"], ["Bulk Upload", "＋ Add Case Stage", "Export PDF", "Export Excel"]],
  "master-case-types": ["Case Types", "Case Types master data", "Search case types...", ["NAME ▲", "ACTIONS"], ["Bulk Upload", "＋ Add Case Type", "Export PDF", "Export Excel"]],
  "master-court-halls": ["Court Halls", "Court Halls master data", "Search court halls...", ["NAME ▲", "ACTIONS"], ["Bulk Upload", "＋ Add Court Hall", "Export PDF", "Export Excel"]],
  "master-designations": ["Designations", "Designations master data", "Search designations...", ["NAME ▲", "ACTIONS"], ["Bulk Upload", "＋ Add Designation", "Export PDF", "Export Excel"]],
  "master-divisions": ["Divisions", "Divisions master data", "Search divisions...", ["NAME ▲", "ZONE ↕", "ACTIONS"], ["Bulk Upload", "＋ Add Division", "Export PDF", "Export Excel"]],
  "master-hc-portal-config": ["HC Portal Config", "HC Portal Config master data", "Search hc portal config...", ["NAME ▲", "BASE URL ↕", "ACTIONS"], ["＋ Add HC Portal Config", "Export PDF", "Export Excel"]],
  "master-nature-of-direction": ["Nature of Direction", "Nature of Direction master data", "Search nature of direction...", ["NAME ▲", "ACTIONS"], ["＋ Add Nature of Direction", "Export PDF", "Export Excel"]],
  "master-permissions": ["Permissions", "Permissions master data", "Search permissions...", ["PERMISSION ▲", "GROUP ↕"], ["Export PDF", "Export Excel"]],
  "master-police-stations": ["Police Stations", "Police Stations master data", "Search police stations...", ["NAME ▲", "SUB DIVISION ↕", "ZONE ↕", "DIVISION ↕", "ACTIONS"], ["Bulk Upload", "＋ Add Police Station", "Export PDF", "Export Excel"]],
  "master-role-permissions": ["Role Permissions", "Role Permissions master data", "Search role permissions...", ["ROLE ▲", "ASSIGNED PERMISSIONS ↕", "ACTIONS"], ["Export PDF", "Export Excel"]],
  "master-roles": ["Roles", "Roles master data", "Search roles...", ["ROLE ▲", "NAME ↕", "ACTIONS"], ["＋ Add Role", "Export PDF", "Export Excel"]],
  "master-sub-divisions": ["Sub Divisions", "Sub Divisions master data", "Search sub divisions...", ["NAME ▲", "DIVISION ↕", "ZONE ↕", "ACTIONS"], ["Bulk Upload", "＋ Add Sub Division", "Export PDF", "Export Excel"]],
  "master-zones": ["Zones", "Zones master data", "Search zones...", ["NAME ▲", "ACTIONS"], ["Bulk Upload", "＋ Add Zone", "Export PDF", "Export Excel"]],
};

const workflowLookups = {
  "master-affidavit-status": ["Affidavit Status", "Search affidavit status...", ["Compliance Pending", "Disposed/Closed", "Filed Before Court", "Others", "Remarks Pending", "Under Preparation"], "＋ Add Affidavit Status"],
  "master-compliance-required": ["Compliance required", "Search compliance required...", ["No", "Not Required", "Required", "Yes"], "＋ Add Compliance required"],
  "master-compliance-status": ["Compliance status", "Search compliance status...", ["Completed", "In Progress", "Others", "Overdue", "Partially Completed"], "＋ Add Compliance status"],
  "master-nature-of-risk": ["Nature of risk", "Search nature of risk...", ["Compliance Delay", "Court Direction Pending", "Deadline Expired", "Information Incomplete", "Order Violation", "Others", "Remarks Pending", "Status Pending"], "＋ Add Nature of risk"],
  "master-order-after-appearance": ["Order after appearance", "Search order after appearance...", ["Adjourned", "Appearance Exempted", "Closed", "Compliance Directed", "Further Appearance Required", "Others", "Warning Issued"], "＋ Add Order after appearance"],
};

export function ReferenceMasterPage({ page }) {
  if (workflowLookups[page]) {
    const [title, search, rows, addLabel] = workflowLookups[page];
    return (
      <ReferenceTablePage
        title={title}
        kicker="Workflow Lookups master data"
        description={`Add, edit, or disable ${title} values used in workflow forms. Set Active to No to hide a value on new entries.`}
        searchPlaceholder={search}
        actions={[addLabel, "Export PDF", "Export Excel"]}
        headers={["LABEL ▲", "ACTIVE ↕", "ACTIONS"]}
        rows={rows.map((label) => [label, "Active", "Edit"])}
      />
    );
  }

  const config = masters[page] || masters["master-zones"];
  const [title, kicker, searchPlaceholder, headers, actions] = config;
  return (
    <ReferenceTablePage
      title={title}
      kicker={kicker}
      description={masterDescription}
      searchPlaceholder={searchPlaceholder}
      actions={actions}
      headers={headers}
    />
  );
}

export function HcmcReportsPage() {
  return (
    <ReferenceTablePage
      title="HCMC Reports"
      kicker="Module: Affidavit Status"
      description="Report: Status-wise"
      searchPlaceholder="Select module"
      actions={["Status-wise", "Police station-wise", "Pending affidavits", "Delay analysis", "Division-wise", "Sub-division-wise", "Apply", "Reset", "Export PDF", "Export Excel"]}
      headers={["Sl No.", "Status", "Count"]}
      filters={["MODULE", "DIVISION", "SUB DIVISION", "POLICE STATION"]}
    />
  );
}

export function ReferenceReportSummary() {
  return (
    <ReferenceTablePage
      title="Report Summary"
      kicker="HC Case Report"
      description="HC register count grouped by division, sub division, police station, and case type."
      searchPlaceholder="All stations"
      actions={["HC Case Report", "Daily Cause List Report", "↻ Reset", "Export PDF", "Export Excel"]}
      headers={["Sl No.", "Division", "Sub division", "Police station", "HC case count", "Case type"]}
      filters={["DIVISION", "SUB DIVISION", "POLICE STATION", "CASE TYPE"]}
    />
  );
}

function ReferenceTablePage({ title, kicker, description, searchPlaceholder, actions, headers, filters, rows = [] }) {
  const filterLabels = filters || ["SEARCH"];
  const visibleRows = rows.length ? rows : [["No records loaded", "", "", "", ""]];
  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="header-actions">
          {actions.map((action) => <button className={action.includes("Export") || action.includes("Reset") ? "secondary" : ""} key={action}>{action}</button>)}
        </div>
      </div>
      <div className="reference-kicker">{kicker}</div>
      <div className="filters reference-filters">
        {filterLabels.map((label) => (
          <label key={label}>
            {label}
            <input placeholder={label === "SEARCH" ? searchPlaceholder : "All"} />
          </label>
        ))}
        <label>
          Rows
          <input value="10" readOnly />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex}>{headers.map((header, index) => <td key={header}>{row[index] || ""}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
