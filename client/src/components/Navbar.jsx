import { AlertTriangle, BarChart3, Bell, CalendarCheck, CalendarDays, FileArchive, FileSignature, FileText, LayoutDashboard, ListChecks, LogOut, Settings, Shield, UserCheck, Users } from "lucide-react";

export default function Navbar({ user, page, setPage, onLogout }) {
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
        <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>
          <LayoutDashboard size={18} />
          Dashboard
        </button>
        <button className={page === "register" ? "active" : ""} onClick={() => setPage("register")}>
          <FileText size={18} />
          Master Register
        </button>
        <button className={page === "dailyCauseList" ? "active" : ""} onClick={() => setPage("dailyCauseList")}>
          <CalendarDays size={18} />
          Daily Cause List
        </button>
        <button className={page === "compliance" ? "active" : ""} onClick={() => setPage("compliance")}>
          <CalendarCheck size={18} />
          Compliance Tracker
        </button>
        <button className={page === "affidavits" ? "active" : ""} onClick={() => setPage("affidavits")}>
          <FileSignature size={18} />
          Affidavit Status
        </button>
        <button className={page === "contempt" ? "active" : ""} onClick={() => setPage("contempt")}>
          <AlertTriangle size={18} />
          Contempt Risk
        </button>
        <button className={page === "appearance" ? "active" : ""} onClick={() => setPage("appearance")}>
          <UserCheck size={18} />
          Personal Appearance
        </button>
        <button className={page === "evening" ? "active" : ""} onClick={() => setPage("evening")}><ListChecks size={18}/>Evening Log</button>
        <button className={page === "performance" ? "active" : ""} onClick={() => setPage("performance")}><Users size={18}/>Officer Performance</button>
        <button className={page === "reports" ? "active" : ""} onClick={() => setPage("reports")}>
          <BarChart3 size={18} />
          Reports
        </button>
        <button className={page === "documents" ? "active" : ""} onClick={() => setPage("documents")}><FileArchive size={18}/>Documents</button>
        <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")}><Settings size={18}/>Masters & Settings</button>
        <button className={page === "automation" ? "active" : ""} onClick={() => setPage("automation")}><Bell size={18}/>Automation</button>
      </nav>

      <div className="user-card">
        <strong>{user?.name}</strong>
        <span>{user?.role}</span>
        <small>{user?.divisionName || user?.policeStationName || "West Zone"}</small>
      </div>

      <button className="logout" onClick={onLogout}>
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
