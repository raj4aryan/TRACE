import { request } from "./api";

// payload: { source, crime_category, description, longitude, latitude, location_type?, address?, ipc_section? }
// returns:  { message, incident_id }
export const reportCrime = (payload) =>
  request("/reportcrime", { method: "POST", body: payload });

// Append to the bottom of report.service.js
export const fetchNearbyCrimes = async (bounds) => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    // Adjust the port if your backend runs on something other than 5000
    const response = await fetch(
        `http://localhost:3500/nearbyincidents/nearby?swLng=${sw.lng}&swLat=${sw.lat}&neLng=${ne.lng}&neLat=${ne.lat}`
    );
    
    if (!response.ok) throw new Error("Failed to fetch reports");
    return await response.json();
};