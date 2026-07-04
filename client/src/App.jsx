import { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MasterHCRegister from "./pages/MasterHCRegister.jsx";
import DailyCauseList from "./pages/DailyCauseList.jsx";
import AlertsNotifications from "./pages/AlertsNotifications.jsx";
import ComplianceTracker from "./pages/ComplianceTracker.jsx";
import AffidavitStatus from "./pages/AffidavitStatus.jsx";
import ContemptRisk from "./pages/ContemptRisk.jsx";
import PersonalAppearance from "./pages/PersonalAppearance.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import { HcmcReportsPage, ReferenceMasterPage, ReferenceReportSummary } from "./pages/ReferencePages.jsx";
import { EveningPreparation, OfficerPerformance, AnalyticsReports, DocumentRepository, MastersSettings, AutomationCenter } from "./pages/RemainingModules.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { apiGet, getStoredSession, setStoredSession } from "./lib/api.js";
import { canAccessPage } from "./lib/permissions.js";

export default function App() {
  const [session, setSession] = useState(getStoredSession());
  const [showLogin, setShowLogin] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("hcmc_theme") || "light");
  const [loading, setLoading] = useState(Boolean(session?.token));

  useEffect(() => {
    async function loadMe() {
      if (!session?.token) return;
      try {
        const data = await apiGet("/auth/me", session.token);
        const next = { ...session, user: data.user };
        setStoredSession(next);
        setSession(next);
      } catch (_error) {
        setStoredSession(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, []);

  useEffect(() => {
    if (session?.user?.role && !canAccessPage(session.user.role, page)) setPage("dashboard");
  }, [session?.user?.role, page]);

  useEffect(() => {
    localStorage.setItem("hcmc_theme", theme);
  }, [theme]);

  function handleLogin(nextSession) {
    setStoredSession(nextSession);
    setSession(nextSession);
    setPage("dashboard");
  }

  function handleLogout() {
    setStoredSession(null);
    setSession(null);
    setPage("dashboard");
  }

  if (loading) return <div className="screen-center">Loading HCMC...</div>;

  if (!session && !showLogin) return <Landing onEnter={() => setShowLogin(true)} />;

  if (!session) return <Login onLogin={handleLogin} />;

  return (
    <ProtectedRoute session={session}>
      <div className="app-shell" data-theme={theme}>
        <Navbar user={session.user} page={page} setPage={setPage} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
        <main className="content">
          {page === "dashboard" && <Dashboard token={session.token} theme={theme} setTheme={setTheme} />}
          {page === "register" && <MasterHCRegister token={session.token} role={session.user.role} />}
          {page === "dailyCauseList" && <DailyCauseList token={session.token} />}
          {page === "alerts" && <AlertsNotifications token={session.token} />}
          {page === "compliance" && <ComplianceTracker token={session.token} />}
          {page === "affidavits" && <AffidavitStatus token={session.token} />}
          {page === "contempt" && <ContemptRisk token={session.token} />}
          {page === "appearance" && <PersonalAppearance token={session.token} />}
          {page === "evening" && <EveningPreparation token={session.token} />}
          {page === "performance" && <OfficerPerformance token={session.token} />}
          {page === "reports" && <ReferenceReportSummary />}
          {page === "hcmcReports" && <HcmcReportsPage />}
          {page === "documents" && <DocumentRepository token={session.token} role={session.user.role} />}
          {page === "settings" && <MastersSettings token={session.token} />}
          {page === "automation" && <AutomationCenter token={session.token} />}
          {page === "audit" && <AuditLogs token={session.token} />}
          {page.startsWith("master-") && <ReferenceMasterPage page={page} />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
