import { request } from "./api";

// returns { pendingReports: [...] }
export const getPendingReports = () => request("/getreports");

// returns { success, incident_id, verification_status: "Verified" }
export const verifyReport = (incidentId) =>
  request(`/updatereport/${encodeURIComponent(incidentId)}`, { method: "PATCH" });

// returns { reporter: { alias_name, user_name, email, phone_number, aadhaar_registered } | null }
export const getReportDetails = (incidentId) =>
  request(`/reportdetails/${encodeURIComponent(incidentId)}`);

// decision: "Verified" | "Rejected". returns { success, incident_id, verification_status }
export const decideReport = (incidentId, decision, note) =>
  request(`/updatereport/${encodeURIComponent(incidentId)}`, { method: "PATCH", body: { decision, note: note || undefined } });