import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import AppHeader from "../components/Appheader";
import StatusBadge, { STATUS_INFO } from "../components/StatusBadge";
import { getMyReports, getMyReportDetails } from "../services/report.service";
import { getCoords, getTime, timeAgo, formatAddress } from "../utils/report";
import { TILE_URL, TILE_ATTR, DEFAULT_CENTER, DEFAULT_ZOOM, pinIcon } from "../utils/map";
import "./MyReports.css";

const FILTERS = ["All", "Pending", "Verified", "Rejected"];

// Map markers differ by shape as well as colour: ring = pending, dot = verified, diamond = rejected.
const mk = (html, size) => L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const STATUS_ICON = {
  Pending: mk('<span style="display:block;width:14px;height:14px;border-radius:50%;border:2px solid #8fa5b2;background:#13222c"></span>', 14),
  Verified: mk('<span style="display:block;width:14px;height:14px;border-radius:50%;background:#5fd3a2;border:2px solid #13222c"></span>', 14),
  Rejected: mk('<span style="display:block;width:11px;height:11px;transform:rotate(45deg);background:#ff8a80;border:2px solid #13222c"></span>', 15),
};

const fmt = (d) => d && d.toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Frames the visible reports whenever the list or filter changes.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 15); return; }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 16 });
  }, [map, points]);
  return null;
}

// Moves the map to the report that was just opened.
function GoTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { animate: !prefersReducedMotion(), duration: 0.6 });
  }, [map, target]);
  return null;
}

function Row({ label, children }) {
  return <div className="mr-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

// Filed -> decision. This is a real sequence, so it reads as a track.
function Track({ status, filed, reviewed }) {
  const decided = status !== "Pending";
  return (
    <ol className="mr-track" aria-label="Report progress">
      <li className="done">
        <span className="mr-dot" />
        <div><strong>Filed</strong><span>{fmt(filed) || "Date unknown"}</span></div>
      </li>
      <li className={decided ? `done ${status.toLowerCase()}` : "wait"}>
        <span className="mr-dot" />
        <div>
          <strong>{decided ? status : "Waiting for an authority"}</strong>
          <span>{decided ? fmt(reviewed) || "" : "Not reviewed yet"}</span>
        </div>
      </li>
    </ol>
  );
}

export default function MyReports() {
  const mapRef = useRef(null);
  const initialLoadStarted = useRef(false);
  const listRequestInFlight = useRef(false);

  const [reports, setReports] = useState(null); // null until the first load finishes
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [full, setFull] = useState(null); // the opened report with address, coordinates and review date
  const [detailError, setDetailError] = useState("");

  // Fetch once when this page is opened, then only when the citizen clicks Refresh.
  const load = useCallback(async () => {
    if (listRequestInFlight.current) return; // prevents overlapping requests
    listRequestInFlight.current = true;
    setRefreshing(true);
    setError("");

    try {
      const data = await getMyReports();
      setReports(data.reports || []);
    } catch (err) {
      if (err.status === 401) return; // AuthContext handles expired sessions
      setError(!err.status
        ? "Can’t reach the server. Check your connection and try again."
        : "Couldn’t load your reports. Try again.");
    } finally {
      listRequestInFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // React StrictMode may run mount effects twice in development.
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    void load();
  }, [load]);

  // Report details are fetched on demand when the citizen opens a report.
  // Opening details never causes a background refresh of the entire list.
  useEffect(() => {
    setFull(null); setDetailError("");
    if (!selectedId) return;
    let cancelled = false;
    getMyReportDetails(selectedId)
      .then((d) => { if (!cancelled) setFull(d.incident); })
      .catch((err) => {
        if (cancelled || err.status === 401) return;
        if (err.status === 404) { setDetailError("This report is no longer available. Return to the list and click Refresh to update it."); }
        else setDetailError(!err.status ? "Can’t reach the server. Showing what we already have." : "Couldn’t load the full details. Showing what we already have.");
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  const close = useCallback(() => setSelectedId(null), []);
  useEffect(() => { // Esc goes back to the list
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const counts = useMemo(() => {
    const c = { All: reports?.length || 0, Pending: 0, Verified: 0, Rejected: 0 };
    (reports || []).forEach((r) => { if (c[r.verification_status] !== undefined) c[r.verification_status] += 1; });
    return c;
  }, [reports]);
  const shown = useMemo(
    () => (reports || []).filter((r) => filter === "All" || r.verification_status === filter),
    [reports, filter]
  );
  const points = useMemo(() => shown.map(getCoords).filter(Boolean), [shown]);

  const base = selectedId ? (reports || []).find((r) => r.incident_id === selectedId) : null;
  const report = base ? { ...base, ...full } : null;
  const target = report ? getCoords(report) : null;

  // ---------- pieces ----------
  const list = (
    <>
      <div className="mr-head">
        <div>
          <h1>Your reports</h1>
          <p className="mr-sub">Only you can see this list. Other people see verified reports on the map, without your name.</p>
        </div>
        <button type="button" className="mr-refresh" onClick={load} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button>
      </div>

      {error && <div className="mr-error" role="alert">{error} <button type="button" onClick={load} disabled={refreshing}>Try again</button></div>}

      {reports === null && !error && (
        <div aria-busy="true" aria-label="Loading your reports">
          {[0, 1, 2].map((i) => <div className="mr-skel" key={i} />)}
        </div>
      )}

      {reports && reports.length === 0 && (
        <div className="mr-empty">
          <strong>You haven’t reported anything yet.</strong>
          <p>A crime, a hazard or a heads-up for others. It takes a minute and stays under your alias.</p>
          <Link className="mr-cta" to="/report">Report an incident</Link>
        </div>
      )}

      {reports && reports.length > 0 && (
        <>
          <div className="mr-filters" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button key={f} className={filter === f ? "on" : ""} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f} <span>{counts[f]}</span>
              </button>
            ))}
          </div>
          {shown.length === 0 && <div className="mr-empty small">No {filter.toLowerCase()} reports.</div>}
          <ul className="mr-list">
            {shown.map((r) => {
              const seen = r.incident_time ? new Date(r.incident_time) : null;
              return (
                <li key={r.incident_id}>
                  <button className={`mr-card${r.incident_id === selectedId ? " sel" : ""}`} onClick={() => setSelectedId(r.incident_id)}>
                    <span className="mr-top">
                      <span className="mr-cat">{r.crime_category}</span>
                      <StatusBadge status={r.verification_status} />
                    </span>
                    <span className="mr-desc">{r.description}</span>
                    <span className="mr-meta">
                      Filed {timeAgo(getTime(r)) || "recently"}{seen && <> · seen {seen.toLocaleDateString([], { day: "numeric", month: "short" })}</>}
                    </span>
                    <code className="mr-id">{r.incident_id}</code>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );

  const detail = report && (
    <article className="mr-detail" aria-label={`Report ${report.incident_id}`}>
      <button className="mr-back" onClick={close}>← All reports</button>
      <div className="mr-dtop">
        <h2>{report.crime_category}</h2>
        <StatusBadge status={report.verification_status} />
      </div>
      <div className="mr-idrow">
        <code>{report.incident_id}</code>
        <button onClick={() => navigator.clipboard?.writeText(report.incident_id)}>Copy ID</button>
      </div>

      <Track status={report.verification_status} filed={getTime(report)} reviewed={full?.reviewed_at ? new Date(full.reviewed_at) : null} />
      <p className={`mr-explain ${String(report.verification_status).toLowerCase()}`}>
        {(STATUS_INFO[report.verification_status] || STATUS_INFO.Pending).explain}
      </p>

      {detailError && <div className="mr-error" role="alert">{detailError}</div>}

      <h3>What you reported</h3>
      <p className="mr-body">{report.description}</p>
      <dl>
        <Row label="Seen">{fmt(report.incident_time ? new Date(report.incident_time) : null) || "Not given"}</Row>
        <Row label="Location">
          {!full && !detailError ? <span className="mr-dim">Loading…</span> : (
            <>
              {formatAddress(full?.address) || "No address, pin only"}
              {target && <><br /><a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${target.lat}&mlon=${target.lng}#map=18/${target.lat}/${target.lng}`}>{target.lat.toFixed(5)}, {target.lng.toFixed(5)}</a></>}
            </>
          )}
        </Row>
        {full?.location_type && <Row label="Place type">{full.location_type}</Row>}
        {full?.ipc_section?.length > 0 && <Row label="IPC">{[].concat(full.ipc_section).join(", ")}</Row>}
      </dl>
    </article>
  );

  return (
    <div className="mr">
      <AppHeader />
      <div className="mr-body-grid">
        <section className="mr-col">{detail || list}</section>
        <section className="mr-map" aria-label="Map of your reports">
          <MapContainer ref={mapRef} className="mr-leaflet" center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM}>
            <TileLayer url={TILE_URL} attribution={TILE_ATTR} className="dark-map-tiles"/>
            <FitBounds points={points} />
            <GoTo target={target} />
            {shown.map((r) => {
              const c = getCoords(r);
              if (!c) return null;
              const on = r.incident_id === selectedId;
              return (
                <Marker
                  key={r.incident_id}
                  position={[c.lat, c.lng]}
                  icon={on ? pinIcon : STATUS_ICON[r.verification_status] || STATUS_ICON.Pending}
                  zIndexOffset={on ? 1000 : 0}
                  eventHandlers={{ click: () => setSelectedId(r.incident_id) }}
                />
              );
            })}
          </MapContainer>
          <div className="mr-legend" aria-hidden="true">
            <span><i className="lg-ring" />Pending</span>
            <span><i className="lg-dot" />Verified</span>
            <span><i className="lg-dia" />Rejected</span>
          </div>
        </section>
      </div>
    </div>
  );
}