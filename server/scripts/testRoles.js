const roles = ["JCP", "DCP", "ACP", "PI", "IO", "SPP"];
const baseUrl = process.env.TEST_API_URL || "http://localhost:5000/api";
const password = process.env.ROLE_TEST_PASSWORD;

async function main() {
  if (!password) throw new Error("Set ROLE_TEST_PASSWORD before running role tests");
  for (const role of roles) {
    const email = `qa.${role.toLowerCase()}@hcmc.local`;
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
    });
    if (!login.ok) throw new Error(`${role} login failed: HTTP ${login.status}`);
    const session = await login.json();
    if (session.user.role !== role) throw new Error(`${role} returned role ${session.user.role}`);
    for (const endpoint of ["/auth/me", "/cases?pageSize=1", "/daily-cause-list?pageSize=1", "/compliance?pageSize=1"]) {
      const response = await fetch(`${baseUrl}${endpoint}`, { headers: { Authorization: `Bearer ${session.token}` } });
      if (!response.ok) throw new Error(`${role} ${endpoint} failed: HTTP ${response.status}`);
    }
    const mastersResponse = await fetch(`${baseUrl}/masters`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (!mastersResponse.ok) throw new Error(`${role} masters failed: HTTP ${mastersResponse.status}`);
    const masters = await mastersResponse.json();
    if (["DCP", "ACP", "PI", "IO"].includes(role) && masters.divisions.length !== 1) {
      throw new Error(`${role} master-data scope exposed ${masters.divisions.length} divisions`);
    }
    for (const endpoint of ["/operations/analytics", "/operations/documents", "/operations/alerts?pageSize=1"]) {
      const response = await fetch(`${baseUrl}${endpoint}`, { headers: { Authorization: `Bearer ${session.token}` } });
      if (!response.ok) throw new Error(`${role} ${endpoint} failed: HTTP ${response.status}`);
    }

    const performance = await fetch(`${baseUrl}/operations/performance`, { headers: { Authorization: `Bearer ${session.token}` } });
    const canViewPerformance = ["JCP", "DCP", "ACP"].includes(role);
    if (performance.status !== (canViewPerformance ? 200 : 403)) {
      throw new Error(`${role} performance access expected ${canViewPerformance ? 200 : 403}, received ${performance.status}`);
    }

    const settings = await fetch(`${baseUrl}/operations/settings`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (settings.status !== (role === "JCP" ? 200 : 403)) {
      throw new Error(`${role} settings access policy failed: HTTP ${settings.status}`);
    }

    const automation = await fetch(`${baseUrl}/automation/status`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (automation.status !== (role === "JCP" ? 200 : 403)) {
      throw new Error(`${role} automation access policy failed: HTTP ${automation.status}`);
    }

    const auditLogs = await fetch(`${baseUrl}/operations/audit-logs`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (auditLogs.status !== (role === "JCP" ? 200 : 403)) {
      throw new Error(`${role} audit access policy failed: HTTP ${auditLogs.status}`);
    }

    for (const endpoint of ["/cases/upload", "/operations/documents"]) {
      const uploadAttempt = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const expected = role === "PI" ? 400 : 403;
      if (uploadAttempt.status !== expected) {
        throw new Error(`${role} ${endpoint} upload policy expected ${expected}, received ${uploadAttempt.status}`);
      }
    }

    if (role === "SPP") {
      const writeAttempt = await fetch(`${baseUrl}/compliance`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (writeAttempt.status !== 403) throw new Error(`SPP write guard expected 403, received ${writeAttempt.status}`);
    }
    console.log(`${role}: passed`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
