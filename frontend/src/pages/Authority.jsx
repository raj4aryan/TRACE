import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import AppHeader from "../components/AppHeader";
import ReviewPanel from "../components/ReviewPanel";
import { getPendingReports } from "../services/authority.service";
import { getCoords, getTime, timeAgo, formatAddress } from "../utils/report";
import { TILE_URL, TILE_ATTR, DEFAULT_CENTER, DEFAULT_ZOOM, pinIcon, dotIcon } from "../utils/map";
import "./Authority.css";


// Frames the visible pins whenever the list or filter changes.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 15); return; }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export default function Authority() {
  const mapRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [reviewId, setReviewId] = useState(null); // the report open in the review panel
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await getPendingReports();
      setReports(data.pendingReports || []);
      setUpdatedAt(new Date());
    } catch (err) {
      if (err.status === 403) setError("Your account doesn’t have authority access. Ask an admin to update your role.");
      else if (!err.status) setError("Can’t reach the server. Check your connection and refresh.");
      else if (err.status !== 401) setError("Couldn’t load the queue. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(
    () => [...reports].sort((a, b) => (getTime(b)?.getTime() || 0) - (getTime(a)?.getTime() || 0)),
    [reports]
  );
  const counts = useMemo(() => {
    const c = {};
    sorted.forEach((r) => { c[r.crime_category] = (c[r.crime_category] || 0) + 1; });
    return c;
  }, [sorted]);
  const shown = useMemo(() => (filter === "All" ? sorted : sorted.filter((r) => r.crime_category === filter)), [sorted, filter]);

  const points = useMemo(() => shown.map(getCoords).filter(Boolean), [shown]);

  const select = (r) => {
    setSelectedId(r.incident_id);
    const c = getCoords(r);
    if (c && mapRef.current) mapRef.current.panTo([c.lat, c.lng]);
  };

  const remove = (id) => setReports((rs) => rs.filter((r) => r.incident_id !== id));

  const openReview = (r) => { select(r); setReviewId(r.incident_id); };
  const closeReview = useCallback(() => setReviewId(null), []);
  useEffect(() => { // Esc goes back to the queue
    const onKey = (e) => { if (e.key === "Escape") closeReview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeReview]);

  // decision is "Verified", "Rejected", or null when the report turned out to be gone or already handled.
  const decided = (id, decision, message) => {
    remove(id); setReviewId(null); setSelectedId(null);
    if (message) setNotice(message);
    else if (decision === "Verified") setNotice(`${id} approved. It now counts toward hotspots and risk scores.`);
    else setNotice(`${id} rejected. It stays on record but won’t count toward analytics.`);
  };

  const reviewing = reviewId ? reports.find((r) => r.incident_id === reviewId) : null;

  const mapPanel = (
    <MapContainer ref={mapRef} className="au-gmap" center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} className="dark-map-tiles"/>
      <FitBounds points={points} />
      {shown.map((r) => {
        const c = getCoords(r);
        if (!c) return null;
        const on = r.incident_id === selectedId;
        return (
          <Marker
            key={r.incident_id}
            position={[c.lat, c.lng]}
            icon={on ? pinIcon : dotIcon}
            zIndexOffset={on ? 1000 : 0}
            eventHandlers={{ click: () => select(r) }}
          />
        );
      })}
    </MapContainer>
  );

  return (
    <div className="au">
      <AppHeader />
      <div className="au-body">
        <section className="au-list">
          {reviewing ? (
            <ReviewPanel report={reviewing} onClose={closeReview} onDecided={decided} />
          ) : (<>
          <div className="au-head">
            <div>
              <div className="au-count">{loading && !reports.length ? "…" : sorted.length}</div>
              <div className="au-label">pending {sorted.length === 1 ? "report" : "reports"}</div>
            </div>
            <button className="au-refresh" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
          </div>
          {updatedAt && <div className="au-updated">Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>}

          {sorted.length > 0 && (
            <div className="au-filters" role="group" aria-label="Filter by category">
              {["All", ...Object.keys(counts)].map((c) => (
                <button key={c} className={filter === c ? "on" : ""} onClick={() => setFilter(c)}>
                  {c}{c !== "All" && <span> {counts[c]}</span>}
                </button>
              ))}
            </div>
          )}

          {error && <div className="banner" role="alert">{error}</div>}
          {notice && <div className="au-notice" role="status">{notice}</div>}

          {!error && !loading && shown.length === 0 && (
            <div className="au-empty"><strong>Queue is clear.</strong><br />New citizen reports will show up here.</div>
          )}

          <ul>
            {shown.map((r) => {
              const id = r.incident_id;
              return (
                <li key={id} className={`au-card${id === selectedId ? " sel" : ""}`} onClick={() => openReview(r)}>
                  <div className="au-top">
                    <span className="au-cat">{r.crime_category}</span>
                    <span className="au-time">{timeAgo(getTime(r))}</span>
                  </div>
                  <p className="au-desc">{r.description}</p>
                  <div className="au-meta">
                    {[formatAddress(r.address), r.incident_time && `seen ${new Date(r.incident_time).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`, r.location_type, r.ipc_section?.length > 0 && `IPC ${[].concat(r.ipc_section).join(", ")}`, r.reported_by_alias && `by ${r.reported_by_alias}`].filter(Boolean).join(" · ") || (getCoords(r) ? "Pin only, no address" : "No location")}
                  </div>
                  <div className="au-foot">
                    <code>{id}</code>
                    <button onClick={(e) => { e.stopPropagation(); openReview(r); }}>Review</button>
                  </div>
                </li>
              );
            })}
          </ul>
          </>)}
        </section>
        <section className="au-map">{mapPanel}</section>
      </div>
    </div>
  );
}