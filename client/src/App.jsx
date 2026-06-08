import { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MasterHCRegister from "./pages/MasterHCRegister.jsx";
import DailyCauseList from "./pages/DailyCauseList.jsx";
import ComplianceTracker from "./pages/ComplianceTracker.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { apiGet, getStoredSession, setStoredSession } from "./lib/api.js";

export default function App() {
  const [session, setSession] = useState(getStoredSession());
  const [showLogin, setShowLogin] = useState(false);
  const [page, setPage] = useState("dashboard");
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
      <div className="app-shell">
        <Navbar user={session.user} page={page} setPage={setPage} onLogout={handleLogout} />
        <main className="content">
          {page === "dashboard" && <Dashboard token={session.token} />}
          {page === "register" && <MasterHCRegister token={session.token} />}
          {page === "dailyCauseList" && <DailyCauseList token={session.token} />}
          {page === "compliance" && <ComplianceTracker token={session.token} />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
