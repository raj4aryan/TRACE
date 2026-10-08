// import { fetchWithAuth } from "./api";

// export const loginUser = async (email, password) => {
//     return await fetchWithAuth("/loginuser", {
//         method: "POST",
//         body: JSON.stringify({ email, password }),
//     });
// };

// export const registerUser = async (userData) => {
//     return await fetchWithAuth("/registeruser", {
//         method: "POST",
//         body: JSON.stringify(userData),
//     });
// };

import { request } from "./api";

export const registerUser = (payload) =>
  request("/registeruser", { method: "POST", body: payload });

// Server sets the trace_token cookie; the body only carries { message, user: { user_name, alias_name } }.
export const loginUser = (payload) =>
  request("/loginuser", { method: "POST", body: payload });