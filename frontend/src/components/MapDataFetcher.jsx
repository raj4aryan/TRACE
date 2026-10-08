import { useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import { fetchNearbyCrimes } from "../services/report.service";

export default function MapDataFetcher({ setIncidents }) {
    const map = useMapEvents({
        // Fires when the user stops dragging or zooming
        moveend: () => loadData(),
    });

    const loadData = async () => {
        // Prevent fetching data if zoomed out past city-level
        if (map.getZoom() < 12) {
            setIncidents([]); 
            return;
        }

        try {
            const data = await fetchNearbyCrimes(map.getBounds());
            if (data.success) {
                setIncidents(data.reports);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Trigger initial load when the map mounts
    useEffect(() => {
        loadData();
    }, []);

    return null; // Renders nothing to the DOM
}