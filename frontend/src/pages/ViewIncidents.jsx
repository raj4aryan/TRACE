import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import AppHeader from "../components/Appheader";
import MapDataFetcher from "../components/MapDataFetcher";
import { TILE_URL, TILE_ATTR, dotIcon } from "../utils/map";
import "leaflet/dist/leaflet.css";

export default function ViewIncidents() {
    const [incidents, setIncidents] = useState([]);
    const [center, setCenter] = useState(null);
    const [status, setStatus] = useState("Requesting location access...");

    useEffect(() => {
        if (!navigator.geolocation) {
            setStatus("Geolocation is not supported by your browser. Using default location.");
            setCenter([18.5204, 73.8567]); // Fallback coordinates
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Successfully got user location
                setCenter([position.coords.latitude, position.coords.longitude]);
            },
            (error) => {
                // User denied permission or request timed out
                setStatus("Location access denied or failed. Using default location.");
                setCenter([18.5204, 73.8567]); // Fallback coordinates
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    // 1. Show a loading screen while waiting for user permission
    if (!center) {
        return (
            <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
                <AppHeader />
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "#888", fontSize: "1.2rem" }}>{status}</p>
                </div>
            </div>
        );
    }

    // 2. Render the map only after we have the coordinates
    return (
        <div className="view-incidents-page" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <AppHeader />
            
            <div style={{ flex: 1, position: "relative" }}>
                <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url={TILE_URL} attribution={TILE_ATTR} className="dark-map-tiles" />
                    
                    {/* The MapDataFetcher will now automatically calculate bounds based on the user's actual location */}
                    <MapDataFetcher setIncidents={setIncidents} />
                    
                    {incidents.map((crime) => (
                        <Marker 
                            key={crime.incident_id} 
                            position={[crime.location.coordinates[1], crime.location.coordinates[0]]} 
                            icon={dotIcon}
                        >
                            <Popup>
                                <div style={{ minWidth: "150px" }}>
                                    <h4 style={{ margin: "0 0 5px 0", color: "#e5522b" }}>{crime.crime_category}</h4>
                                    <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
                                        {new Date(crime.incident_time).toLocaleDateString()}
                                    </p>
                                    <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>{crime.description}</p>
                                    <small style={{ color: "#888" }}>ID: {crime.incident_id}</small>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}