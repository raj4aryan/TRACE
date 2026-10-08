import L from "leaflet";

// Free map stack: Leaflet + OpenStreetMap data. Dark tiles come from CARTO's free basemap (built on OSM).
// Fine for development and modest traffic. For heavy production use, self-host tiles or use a provider's free tier (MapTiler, Stadia).
// export const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
// export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Replace the CARTO URL and Attribution with the default OSM ones
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Default view when nothing is placed yet (India overview).
export const DEFAULT_CENTER = [20.59, 78.96];
export const DEFAULT_ZOOM = 5;

// The orange TRACE pin. Drawn as inline SVG so no marker image files are needed.
export const pinIcon = L.divIcon({
  className: "",
  html: '<svg width="36" height="54" viewBox="-18 -54 36 54"><path d="M0 0 C-14 -20 -18 -28 -18 -36 a18 18 0 1 1 36 0 c0 8 -4 16 -18 36z" fill="#e5522b"/><circle cy="-36" r="6" fill="#13222c"/></svg>',
  iconSize: [36, 54],
  iconAnchor: [18, 54],
});

// Small teal dot for unselected incidents.
export const dotIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:14px;height:14px;border-radius:50%;background:#4cc0c8;border:2px solid #13222c"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Address lookup from OpenStreetMap's free Nominatim service (no key; light use only, ~1 request per second).
// Returns the same shape the CrimeReport model uses, or null if the lookup fails.
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`);
    if (!res.ok) return null;
    const a = (await res.json()).address || {};
    return {
      street_name: a.road || a.pedestrian || a.footway || "",
      landmark: a.amenity || a.building || a.shop || a.tourism || "",
      locality: a.suburb || a.neighbourhood || a.city_district || a.village || "",
      city: a.city || a.town || a.municipality || a.county || "",
      state: a.state || "",
      pincode: /^\d{6}$/.test(a.postcode || "") ? a.postcode : "",
    };
  } catch {
    return null;
  }
}

// Straight-line distance in metres between two { lat, lng } points.
export function distanceMeters(a, b) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}