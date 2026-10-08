const BASE = "http://localhost:3500";

// One place for every backend call. Cookies (trace_token) are sent automatically.

export async function request(path, { method = "GET", body } = {}) {
    const res = await fetch(BASE + path, {
        method,
        credentials: "include", // CRITICAL: Attaches the HTTP-Only trace_token cookie
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
    // Parse the JSON response
    const data = await res.json().catch(() => ({}));
    // Throw an error if the status code isn't in the 200 range
    if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}