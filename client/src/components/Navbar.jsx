import { BarChart3, Bell, CalendarCheck, CalendarDays, ChevronDown, FileSignature, FileText, LayoutDashboard, ListChecks, LogOut, Moon, Settings, Shield, Sun } from "lucide-react";
import { canAccessPage } from "../lib/permissions.js";

const navSections = [
  {
    items: [
      ["dashboard", "Dashboard", LayoutDashboard],
      ["register", "HC Case Register", FileText],
      ["dailyCauseList", "Daily Cause List", CalendarDays],
      ["alerts", "Alerts & Notifications", Bell],
    ],
  },
  {
    title: "Quick View",
    items: [
      ["compliance", "Court Direction Status", CalendarCheck],
      ["affidavits", "Affidavit Status", FileSignature],
    ],
  },
  {
    title: "Analytics",
    items: [
      ["reports", "Report Summary", BarChart3],
      ["hcmcReports", "HCMC Reports", BarChart3],
      ["audit", "Audit Logs", ListChecks],
    ],
  },
  {
    title: "Administration",
    header: "Masters",
    items: [
      ["master-case-stages", "Case Stages", Settings],
      ["master-case-types", "Case Types", Settings],
      ["master-court-halls", "Court Halls", Settings],
      ["master-designations", "Designations", Settings],
      ["master-divisions", "Divisions", Settings],
      ["master-hc-portal-config", "HC Portal Config", Settings],
      ["master-nature-of-direction", "Nature of Direction", Settings],
      ["master-affidavit-status", "Affidavit Status", Settings],
      ["master-compliance-required", "Compliance required", Settings],
      ["master-compliance-status", "Compliance status", Settings],
      ["master-nature-of-risk", "Nature of risk", Settings],
      ["master-order-after-appearance", "Order after appearance", Settings],
      ["master-permissions", "Permissions", Settings],
      ["master-police-stations", "Police Stations", Settings],
      ["master-role-permissions", "Role Permissions", Settings],
      ["master-roles", "Roles", Settings],
      ["master-sub-divisions", "Sub Divisions", Settings],
      ["master-zones", "Zones", Settings],
    ],
  },
];

export default function Navbar({ user, page, setPage, onLogout, theme, setTheme }) {
  const darkMode = theme === "dark";

  return (
    <aside className="sidebar">
      <div className="brand">
        <Shield size={28} />
        <div>
          <strong>HCMC</strong>
          <span>West Zone</span>
        </div>
      </div>

      <nav className="nav-links">
        {navSections.map((section, index) => {
          const visibleItems = section.items.filter(([id]) => canAccessPage(user?.role, id));
          if (!visibleItems.length) return null;
          return (
            <div className="nav-section" key={section.title || index}>
              {section.title && <span className="nav-section-title">{section.title}</span>}
              {section.header && <div className="nav-group-header"><span>{section.header}</span><ChevronDown size={15} /></div>}
              {visibleItems.map(([id, label, Icon]) => (
                <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="user-card">
        <strong>{user?.name}</strong>
        <span>{user?.role}</span>
        <small>{user?.divisionName || user?.policeStationName || "West Zone"}</small>
      </div>

      <button className="theme-toggle" onClick={() => setTheme(darkMode ? "light" : "dark")} aria-label="Toggle dark mode">
        {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        {darkMode ? "Light mode" : "Dark mode"}
      </button>

      <button className="logout" onClick={onLogout}>
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
