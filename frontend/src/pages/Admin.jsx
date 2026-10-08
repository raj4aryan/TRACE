import { useState } from "react";
import AppHeader from "../components/Appheader";
import { deleteReport, authorizeRole } from "../services/admin.service";
import { ROLES } from "../utils/roles";
import "../components/AuthShell.css"; // shared form and banner styles
import "./Admin.css";

const time = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function Admin() {
  const [tab, setTab] = useState("reports");
  const [log, setLog] = useState([]);
  const addLog = (text, ok = true) => setLog((l) => [{ t: time(), text, ok }, ...l].slice(0, 20));

  // --- delete report ---
  const [incidentId, setIncidentId] = useState("");
  const [armed, setArmed] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState(null);

  const startDelete = (e) => {
    e.preventDefault();
    if (!incidentId.trim()) return setDelMsg({ bad: true, text: "Enter the incident ID to delete." });
    setDelMsg(null); setArmed(true);
  };
  const confirmDelete = async () => {
    const id = incidentId.trim();
    setDelBusy(true);
    try {
      await deleteReport(id);
      setDelMsg({ text: `${id} was deleted.` }); addLog(`Deleted report ${id}`);
      setIncidentId(""); setArmed(false);
    } catch (err) {
      const text =
        err.status === 404 ? "No report with that ID. It may already be deleted."
        : err.status === 403 ? "Your role can’t delete reports."
        : err.status === 400 ? "That ID isn’t valid."
        : !err.status ? "Can’t reach the server. Try again."
        : err.status === 401 ? "" : "Something went wrong. Try again.";
      if (text) { setDelMsg({ bad: true, text }); addLog(`Failed to delete ${id}: ${text}`, false); }
      setArmed(false);
    } finally { setDelBusy(false); }
  };

  // --- change role ---
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleMsg, setRoleMsg] = useState(null);

  const submitRole = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setRoleMsg({ bad: true, text: "Enter the user’s email address." });
    setRoleBusy(true); setRoleMsg(null);
    try {
      const data = await authorizeRole(email.trim().toLowerCase(), role);
      const who = data.user?.alias_name || email.trim();
      setRoleMsg({ text: `${who} is now ${data.user?.role || role}.` });
      addLog(`Set ${who} to ${data.user?.role || role}`);
      setEmail("");
    } catch (err) {
      const text =
        err.status === 404 ? "No user with that email."
        : err.status === 403 ? "Your role can’t change user roles."
        : err.status === 400 ? "The server rejected that role or email. Check the role list in utils/roles.js."
        : !err.status ? "Can’t reach the server. Try again."
        : err.status === 401 ? "" : "Something went wrong. Try again.";
      if (text) { setRoleMsg({ bad: true, text }); addLog(`Role change failed for ${email.trim()}: ${text}`, false); }
    } finally { setRoleBusy(false); }
  };

  return (
    <div className="ad">
      <AppHeader />
      <main className="ad-main">
        <h1>Admin</h1>
        <p className="sub">Changes here are permanent. Every action is logged below for this session.</p>

        <div className="ad-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "reports"} className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>Delete a report</button>
          <button role="tab" aria-selected={tab === "roles"} className={tab === "roles" ? "on" : ""} onClick={() => setTab("roles")}>Change a role</button>
        </div>

        {tab === "reports" ? (
          <form className="ad-panel" onSubmit={startDelete} noValidate>
            <div className="field">
              <label htmlFor="iid">Incident ID</label>
              <div className="in"><input id="iid" value={incidentId} placeholder="INC-2026-10-03-…" onChange={(e) => { setIncidentId(e.target.value); setArmed(false); }} /></div>
            </div>
            {delMsg && <div className={delMsg.bad ? "banner" : "au-ok"} role="status">{delMsg.text}</div>}
            {armed ? (
              <div className="ad-danger">
                <p>This permanently deletes <code>{incidentId.trim()}</code>. It can’t be restored.</p>
                <div>
                  <button type="button" className="ad-del" onClick={confirmDelete} disabled={delBusy}>{delBusy ? "Deleting…" : "Delete permanently"}</button>
                  <button type="button" className="ad-cancel" onClick={() => setArmed(false)} disabled={delBusy}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="go" type="submit">Review deletion</button>
            )}
          </form>
        ) : (
          <form className="ad-panel" onSubmit={submitRole} noValidate>
            <div className="field">
              <label htmlFor="em">User’s email</label>
              <div className="in"><input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <div className="field">
              <label htmlFor="rl">New role</label>
              <div className="in dark">
                <select id="rl" className="dsel" value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {roleMsg && <div className={roleMsg.bad ? "banner" : "au-ok"} role="status">{roleMsg.text}</div>}
            <button className="go" type="submit" disabled={roleBusy}>{roleBusy ? "Updating…" : "Update role"}</button>
            <p className="ad-note">The user needs to log in again for the new role to take effect.</p>
          </form>
        )}

        <section className="ad-log" aria-label="Session activity">
          <h3>Session activity</h3>
          {log.length === 0 ? <p>Nothing yet.</p> : (
            <ul>{log.map((l, i) => <li key={i} className={l.ok ? "" : "fail"}><time>{l.t}</time> {l.text}</li>)}</ul>
          )}
        </section>
      </main>
    </div>
  );
}