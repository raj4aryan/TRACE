import { useEffect, useRef, useState } from "react";
import { getReportDetails, decideReport } from "../services/authority.service";
import { getCoords, getTime, formatAddress } from "../utils/report";
import "./ReviewPanel.css";

const SOURCES = { citizen: "Citizen report", Official_FIR: "Official FIR", News_Scrape: "News scrape" };

const fmt = (d) => d && d.toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  };
  return <button type="button" className="rv-copy" onClick={copy} aria-label={`Copy ${label}`}>{done ? "Copied" : "Copy"}</button>;
}

function Row({ label, children }) {
  return <div className="rv-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

export default function ReviewPanel({ report, onClose, onDecided }) {
  const id = report.incident_id;
  const coords = getCoords(report);
  const filed = getTime(report);
  const seen = report.incident_time ? new Date(report.incident_time) : null;
  const address = formatAddress(report.address);
  const ipc = [].concat(report.ipc_section || []).join(", ");

  const [reporter, setReporter] = useState(undefined); // undefined: loading, null: no account behind this report
  const [loadError, setLoadError] = useState("");

  const [note, setNote] = useState("");
  const [armed, setArmed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const armTimer = useRef(null);

  // Load the reporter when a different report is opened.
  useEffect(() => {
    let cancelled = false;
    setReporter(undefined); setLoadError(""); setNote(""); setArmed(null); setDecisionError("");
    getReportDetails(id)
      .then((d) => { if (!cancelled) setReporter(d.reporter ?? null); })
      .catch((err) => {
        if (cancelled || err.status === 401) return;
        setReporter(null);
        setLoadError(err.status === 403 ? "Your role can’t view reporter details." : !err.status ? "Can’t reach the server. Check your connection." : "Couldn’t load the reporter’s details. Try again.");
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => () => clearTimeout(armTimer.current), []);

  const decide = async (decision) => {
    if (armed !== decision) { // a decision can't be undone, so ask once
      setArmed(decision); setDecisionError("");
      clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(null), 4000);
      return;
    }
    setBusy(true); setDecisionError("");
    try {
      await decideReport(id, decision, note.trim());
      onDecided(id, decision);
    } catch (err) {
      if (err.status === 409) onDecided(id, null, "Someone else already reviewed that report. It was removed from your queue.");
      else if (err.status === 404) onDecided(id, null, "That report no longer exists. It was removed from your queue.");
      else if (err.status === 403) setDecisionError("Your role can’t review reports.");
      else if (!err.status) setDecisionError("Can’t reach the server. Try again.");
      else if (err.status !== 401) setDecisionError("Couldn’t save your decision. Try again.");
    } finally {
      setBusy(false); setArmed(null);
    }
  };

  return (
    <article className="rv" aria-label={`Review ${id}`}>
      <div className="rv-bar">
        <button type="button" className="rv-back" onClick={onClose}>← Back to queue</button>
        <span className="rv-status">Pending review</span>
      </div>

      <section className="rv-incident">
        <h2>{report.crime_category}</h2>
        <code className="rv-id">{id}</code>
        <p className="rv-desc">{report.description}</p>
        <dl>
          <Row label="Filed">{fmt(filed) || "Unknown"}</Row>
          <Row label="Seen">{fmt(seen) || "Not given"}</Row>
          <Row label="Location">
            {address || "No address, pin only"}
            {coords && <><br /><a className="rv-link" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=18/${coords.lat}/${coords.lng}`}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</a></>}
          </Row>
          <Row label="Place type">{report.location_type || "Not given"}</Row>
          {ipc && <Row label="IPC">{ipc}</Row>}
          <Row label="Source">{SOURCES[report.source] || report.source || "Unknown"}</Row>
        </dl>
      </section>

      <section className="rv-reporter" aria-label="Reporter details">
        <h3>Reporter</h3>
        {reporter === undefined && <p className="rv-dim">Loading details…</p>}
        {loadError && <div className="rv-error" role="alert">{loadError}</div>}
        {reporter === null && !loadError && <p className="rv-dim">No registered account sits behind this report ({report.reported_by_alias || "no alias"}), so there are no contact details.</p>}
        {reporter && (
          <>
            <dl>
              <Row label="Alias">{reporter.alias_name}</Row>
              <Row label="Name">{reporter.user_name || "Not on file"}</Row>
              <Row label="Phone">
                {reporter.phone_number ? <><a className="rv-link" href={`tel:${reporter.phone_number}`}>{reporter.phone_number}</a> <CopyButton text={reporter.phone_number} label="phone number" /></> : "Not on file"}
              </Row>
              <Row label="Email">
                {reporter.email ? <><a className="rv-link" href={`mailto:${reporter.email}`}>{reporter.email}</a> <CopyButton text={reporter.email} label="email" /></> : "Not on file"}
              </Row>
            </dl>

          </>
        )}
      </section>

      <section className="rv-decide">
        <label htmlFor="rv-note">Note for the record <span className="rv-dim">· optional</span></label>
        <textarea id="rv-note" rows="2" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called the reporter and confirmed the location." />
        {decisionError && <div className="rv-error" role="alert">{decisionError}</div>}
        <div className="rv-actions">
          <button type="button" className={`rv-approve${armed === "Verified" ? " ask" : ""}`} disabled={busy} onClick={() => decide("Verified")}>
            {busy && armed === "Verified" ? "Saving…" : armed === "Verified" ? "Tap again to approve" : "Approve"}
          </button>
          <button type="button" className={`rv-reject${armed === "Rejected" ? " ask" : ""}`} disabled={busy} onClick={() => decide("Rejected")}>
            {busy && armed === "Rejected" ? "Saving…" : armed === "Rejected" ? "Tap again to reject" : "Reject"}
          </button>
        </div>
        <p className="rv-fine">Approved reports count toward hotspots and risk scores. Rejected reports are kept but ignored.</p>
      </section>
    </article>
  );
}