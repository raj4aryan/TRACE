import { request } from "./api";

// returns { pendingReports: [...] }
export const getPendingReports = () => request("/api/incidents/pending");

// returns { success, incident_id, verification_status: "Verified" }
export const verifyReport = (incidentId) =>
  request(`/api/incidents/${encodeURIComponent(incidentId)}/verification`, { method: "PATCH" });

// returns { reporter: { alias_name, user_name, email, phone_number, aadhaar_registered } | null }
export const getReportDetails = (incidentId) =>
  request(`/api/incidents/${encodeURIComponent(incidentId)}/reporter`);

// decision: "Verified" | "Rejected". returns { success, incident_id, verification_status }
export const decideReport = (incidentId, decision, note) =>
  request(`/api/incidents/${encodeURIComponent(incidentId)}/verification`, { method: "PATCH", body: { decision, note: note || undefined } });