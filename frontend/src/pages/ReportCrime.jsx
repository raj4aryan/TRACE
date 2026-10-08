import { useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import AppHeader from "../components/Appheader";
import { reportCrime } from "../services/report.service";
import { formatAddress } from "../utils/report";
import { TILE_URL, TILE_ATTR, DEFAULT_CENTER, DEFAULT_ZOOM, pinIcon, reverseGeocode, distanceMeters } from "../utils/map";
import "../components/AuthShell.css"; // shared form, banner and receipt styles
import "./ReportCrime.css";

// Sent as `crime_category`. Match these to the values your model accepts.
const GROUPS = [
  { title: "Crime", items: ["Larceny", "Robbery", "Assault", "Burglary", "Motor Vehicle Theft", "Vandalism"] },
  { title: "Awareness & hazards", items: ["Alert", "Turn right", "Missing turn sign board", "Water body in front", "Pothole", "Broken streetlight"] },
];
const ALL_TYPES = GROUPS.flatMap((g) => g.items);
const ADDR_FIELDS = [["street_name", "Street"], ["landmark", "Landmark"], ["locality", "Locality"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"]];
const EMPTY_FORM = {
  crime_category: "", description: "", location_type: "", ipc_section: "",
  address: { street_name: "", landmark: "", locality: "", city: "", state: "", pincode: "" },
};
// Quick chips fill the time picker with a sensible guess; the person can adjust it.
const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const daysAgoAt = (days, hour) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, 0, 0, 0); return d; };
const WHEN_QUICK = {
  "Just now": () => new Date(),
  "Earlier today": () => { const start = new Date(); start.setHours(0, 0, 0, 0); return new Date(Math.max(Date.now() - 3 * 3600e3, start.getTime())); },
  "Last night": () => daysAgoAt(1, 21),
  Yesterday: () => daysAgoAt(1, 12),
};
const LOCATION_TYPES = ["", "Street", "Home", "Shop or market", "Transit stop", "Park", "Other"];
const SOURCE = "citizen"; // `source` is required by the API; adjust to your backend's expected value.


function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function ReportCrime() {
  const mapRef = useRef(null);
  const addressEdited = useRef(false);
  const addrFor = useRef(null);   // the pin the current address was looked up for
  const addrReq = useRef(0);      // id of the latest lookup, so slow older answers are ignored
  const addrTimer = useRef(null);
  const [addrStatus, setAddrStatus] = useState(""); // "", "loading" or "failed"

  const [point, setPoint] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [locating, setLocating] = useState(false);
  const [seenAt, setSeenAt] = useState(""); // datetime-local value, sent as incident_time
  const [seenChip, setSeenChip] = useState(null);

  const set = (name) => (e) => {
    setForm((s) => ({ ...s, [name]: e.target.value }));
  };

  const setAddr = (k) => (e) => {
    addressEdited.current = true;
    const v = k === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value;
    setForm((s) => ({ ...s, address: { ...s.address, [k]: v } }));
  };

  const nowLocal = toLocalInput(new Date());
  const customType = ALL_TYPES.includes(form.crime_category) ? "" : form.crime_category;

  const place = (lat, lng, zoomIn) => {
    setPoint({ lat, lng });
    setErrors((s) => ({ ...s, point: "" }));
    const map = mapRef.current;
    if (map) zoomIn ? map.setView([lat, lng], 16) : map.panTo([lat, lng]);

    // A tiny nudge keeps what the person typed. Moving somewhere new replaces the address, because the old one describes the old spot.
    if (addressEdited.current && addrFor.current && distanceMeters(addrFor.current, { lat, lng }) < 50) return;

    clearTimeout(addrTimer.current);
    const id = ++addrReq.current;
    setForm((s) => ({ ...s, address: { ...EMPTY_FORM.address } }));
    setAddrStatus("loading");
    addrTimer.current = setTimeout(async () => { // short delay: free Nominatim allows about one request per second
      const found = await reverseGeocode(lat, lng);
      if (id !== addrReq.current) return; // a newer pin was placed meanwhile
      addressEdited.current = false;
      addrFor.current = { lat, lng };
      if (found) { setForm((s) => ({ ...s, address: found })); setAddrStatus(""); }
      else setAddrStatus("failed");
    }, 500);
  };

  const locate = () => {
    if (!navigator.geolocation) return setBanner("This browser can’t share your location. Tap the map to place the pin.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); place(p.coords.latitude, p.coords.longitude, true); },
      () => { setLocating(false); setBanner("Location access was blocked. Tap the map to place the pin instead."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
    const found = {};
    if (!point) found.point = "Tap the map to mark where it happened.";
    if (form.address.pincode && form.address.pincode.length !== 6) found.pincode = "Pincode must be 6 digits.";
    if (!form.crime_category.trim()) found.crime_category = "Pick what happened or type it in.";
    if (form.description.trim().length < 10) found.description = "Say what happened in at least a short sentence.";
    if (seenAt && new Date(seenAt) > new Date()) found.seenAt = "That time is in the future.";
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      source: SOURCE,
      crime_category: form.crime_category.trim(),
      description: form.description.trim(),
      latitude: point.lat,
      longitude: point.lng,
    };
    if (form.location_type) payload.location_type = form.location_type;
    const addr = Object.fromEntries(Object.entries(form.address).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    if (addr.pincode) addr.pincode = Number(addr.pincode);
    if (Object.keys(addr).length) payload.address = addr; // object, matching the model
    const ipc = form.ipc_section.split(",").map((x) => x.trim()).filter(Boolean);
    if (ipc.length) payload.ipc_section = ipc; // array of strings, matching the model
    if (seenAt) payload.incident_time = new Date(seenAt).toISOString(); // when they actually saw it

    setBusy(true);
    try {
      const data = await reportCrime(payload);
      setReceipt(data.incident_id);
    } catch (err) {
      if (err.status === 400) setBanner("Some details are missing. Check the pin, category and description.");
      else if (err.status === 401) setBanner("Your session has ended. Log in again to file this report.");
      else if (!err.status) setBanner("Can’t reach the server. Your details are still here. Try again.");
      else setBanner("Something went wrong on our side. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    clearTimeout(addrTimer.current); addrReq.current++; addrFor.current = null; setAddrStatus("");
    setReceipt(null); setPoint(null); addressEdited.current = false; setSeenAt(""); setSeenChip(null);
    setForm(EMPTY_FORM);
  };

  const mapPanel = (
    <MapContainer ref={mapRef} className="rp-gmap" center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} zoomControl>
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} className="dark-map-tiles"/>
      <ClickToPlace onPick={(lat, lng) => place(lat, lng)} />
      {point && (
        <Marker
          position={[point.lat, point.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); place(ll.lat, ll.lng); } }}
        />
      )}
    </MapContainer>
  );

  return (
    <div className="rp">
      <AppHeader />
      <div className="rp-body">
        <section className="rp-form">
          {receipt ? (
            <>
              <h2>Report filed</h2>
              <p className="sub">An authority will review it. It stays pending until they verify it.</p>
              <div className="tag">
                <small>Incident ID</small>
                <code>{receipt}</code>
                <button className="copy" type="button" onClick={() => navigator.clipboard?.writeText(receipt)}>Copy ID</button>
              </div>
              <button className="go" type="button" onClick={reset}>File another report</button>
            </>
          ) : (
            <>
              <h2>Report an incident</h2>
              <p className="sub">A crime, a hazard, or a heads-up for others. It’s filed under your alias, not your name.</p>
              {banner && <div className="banner" role="alert">{banner}</div>}
              <form onSubmit={submit} noValidate>
                <div className={`field${errors.crime_category ? " bad" : ""}`}>
                  <label id="cat-l">What happened?</label>
                  <div role="radiogroup" aria-labelledby="cat-l">
                    {GROUPS.map((g) => (
                      <div key={g.title} className="rp-group">
                        <div className="rp-grouptitle">{g.title}</div>
                        <div className="rp-chips">
                          {g.items.map((c) => (
                            <label key={c} className={`rp-chip${form.crime_category === c ? " on" : ""}`}>
                              <input type="radio" name="cat" value={c} checked={form.crime_category === c} onChange={set("crime_category")} />{c}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="in rp-custom">
                    <input
                      aria-label="Or type what happened"
                      placeholder="Or type it yourself, e.g. Open manhole"
                      maxLength={40}
                      value={customType}
                      onChange={(e) => setForm((s) => ({ ...s, crime_category: e.target.value }))}
                    />
                  </div>
                  {errors.crime_category && <div className="msg">{errors.crime_category}</div>}
                </div>

                <div className={`field${errors.point ? " bad" : ""}`}>
                  <label>Where?</label>
                  <div className="rp-where">
                    <span>{point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "No pin placed yet"}</span>
                    <button type="button" onClick={locate} disabled={locating}>{locating ? "Locating…" : "Use my location"}</button>
                  </div>
                  {errors.point && <div className="msg">{errors.point}</div>}
                </div>

                <div className={`field${errors.description ? " bad" : ""}`}>
                  <label htmlFor="description">What did you see? <span className="hint">· and when you saw it</span></label>
                  <div className="rp-when">
                    <span>Seen:</span>
                    {Object.keys(WHEN_QUICK).map((w) => (
                      <button
                        type="button" key={w} className={seenChip === w ? "on" : ""}
                        onClick={() => { setSeenAt(toLocalInput(WHEN_QUICK[w]())); setSeenChip(w); setErrors((e) => ({ ...e, seenAt: "" })); }}
                      >{w}</button>
                    ))}
                    <input
                      type="datetime-local"
                      max={nowLocal}
                      value={seenAt}
                      aria-label="Exact time you saw it"
                      onChange={(e) => { setSeenAt(e.target.value); setSeenChip(null); }}
                    />
                    {seenAt && <button type="button" className="rp-clear" aria-label="Clear time" onClick={() => { setSeenAt(""); setSeenChip(null); }}>✕</button>}
                  </div>
                  {seenChip && <div className="rp-whenhint">Approximate. Change the time if you remember it exactly.</div>}
                  {errors.seenAt && <div className="msg">{errors.seenAt}</div>}
                  <div className="in">
                    <textarea
                      id="description"
                      rows="5"
                      value={form.description}
                      onChange={set("description")}
                      aria-invalid={!!errors.description}
                      placeholder={"What happened, and when did you see it?\ne.g. Around 8:40 pm, two men on a bike snatched a bag near the bus stop.\ne.g. This morning at 7: a sharp right turn with no sign board, a pond right in front."}
                    />
                  </div>
                  {errors.description && <div className="msg">{errors.description}</div>}
                </div>

                <details className="rp-addr" open={errors.pincode ? true : undefined}>
                  <summary>
                    <span className="rp-addr-title">Address <span className="hint">· optional, fills in from your pin</span></span>
                    <span className="rp-addr-sum">{addrStatus === "loading" ? "Looking up the address…" : addrStatus === "failed" ? "Couldn’t find an address for this spot. Add it if you like." : formatAddress(form.address) || "No address yet"}</span>
                  </summary>
                  <div className="rp-addr-grid">
                    {ADDR_FIELDS.map(([k, label]) => (
                      <div className={`field${k === "pincode" && errors.pincode ? " bad" : ""}`} key={k}>
                        <label htmlFor={`addr-${k}`}>{label}</label>
                        <div className="in"><input id={`addr-${k}`} value={form.address[k]} onChange={setAddr(k)} inputMode={k === "pincode" ? "numeric" : undefined} /></div>
                        {k === "pincode" && errors.pincode && <div className="msg">{errors.pincode}</div>}
                      </div>
                    ))}
                  </div>
                </details>

                <div className="row">
                  <div className="field">
                    <label htmlFor="location_type">Place type <span className="hint">· optional</span></label>
                    <div className="in dark">
                      <select id="location_type" className="dsel" value={form.location_type} onChange={set("location_type")}>
                        {LOCATION_TYPES.map((t) => <option key={t} value={t}>{t || "Not sure"}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="ipc_section">IPC section <span className="hint">· optional</span></label>
                    <div className="in"><input id="ipc_section" value={form.ipc_section} onChange={set("ipc_section")} placeholder="e.g. 379, 392" /></div>
                  </div>
                </div>

                <button className="go" type="submit" disabled={busy}>{busy ? "Filing report…" : "File report"}</button>
              </form>
            </>
          )}
        </section>
        <section className="rp-map">{mapPanel}</section>
      </div>
    </div>
  );
}