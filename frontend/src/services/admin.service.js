import { request } from "./api";

// returns { success }
export const deleteReport = (incidentId) =>
  request(`/deletereport/${encodeURIComponent(incidentId)}`, { method: "DELETE" });

// returns { success, user: { alias_name, role } }
export const authorizeRole = (target_email, requested_role) =>
  request("/authorizerole", { method: "PATCH", body: { target_email, requested_role } });