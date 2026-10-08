import { request } from "./api";

// returns { pendingReports: [...] }
export const getPendingReports = () => request("/getreports");

// returns { success, incident_id, verification_status: "Verified" }
export const verifyReport = (incidentId) =>
  request(`/updatereport/${encodeURIComponent(incidentId)}`, { method: "PATCH" });