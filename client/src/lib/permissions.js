const allRoles = ["JCP", "HCMC_STAFF", "DCP", "ACP", "PI", "IO", "SPP"];

export const pageRoles = {
  dashboard: allRoles,
  register: allRoles,
  dailyCauseList: allRoles,
  alerts: allRoles,
  compliance: allRoles,
  affidavits: allRoles,
  reports: allRoles,
  hcmcReports: allRoles,
  audit: ["JCP", "HCMC_STAFF"],
  "master-case-stages": allRoles,
  "master-case-types": allRoles,
  "master-court-halls": allRoles,
  "master-designations": allRoles,
  "master-divisions": allRoles,
  "master-hc-portal-config": allRoles,
  "master-nature-of-direction": allRoles,
  "master-affidavit-status": allRoles,
  "master-compliance-required": allRoles,
  "master-compliance-status": allRoles,
  "master-nature-of-risk": allRoles,
  "master-order-after-appearance": allRoles,
  "master-permissions": allRoles,
  "master-police-stations": allRoles,
  "master-role-permissions": allRoles,
  "master-roles": allRoles,
  "master-sub-divisions": allRoles,
  "master-zones": allRoles,
  settings: ["JCP", "HCMC_STAFF"],
  automation: ["JCP", "HCMC_STAFF"],
};

export function canAccessPage(role, page) {
  return Boolean(role && pageRoles[page]?.includes(role));
}

export function isReadOnlyRole(role) {
  return role === "SPP";
}
