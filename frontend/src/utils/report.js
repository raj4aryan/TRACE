// Report documents may store coordinates flat (latitude/longitude) or as GeoJSON ({ location: { coordinates: [lng, lat] } }).
export function getCoords(r) {
  const lat = Number(r.latitude ?? r.location?.coordinates?.[1]);
  const lng = Number(r.longitude ?? r.location?.coordinates?.[0]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// Timestamp field name varies; Mongoose timestamps give createdAt.
export function getTime(r) {
  const t = r.createdAt ?? r.timestamp ?? r.reported_at ?? r.created_at;
  const d = t ? new Date(t) : null;
  return d && !isNaN(d) ? d : null;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(date) {
  if (!date) return "";
  const s = Math.round((date - Date.now()) / 1000);
  const steps = [["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, secs] of steps) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return "just now";
}

// The model stores address as an object { street_name, landmark, locality, city, state, pincode }. Older data may be a plain string.
export function formatAddress(a) {
  if (!a) return "";
  if (typeof a === "string") return a;
  return [a.street_name, a.landmark, a.locality, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}