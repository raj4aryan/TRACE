import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { registerUser } from "../services/auth.service";

const rules = {
  user_name: (v) => (v.trim().length >= 2 && v.trim().length <= 100) || "Name must contain 2 to 100 characters.",
  email: (v) => (v.trim().length <= 254 && /^\S+@\S+\.\S+$/.test(v)) || "Enter a valid email address.",
  phone_number: (v) => /^[6-9]\d{9}$/.test(v) || "Enter a valid 10-digit Indian mobile number.",
  password: (v) => (v.length >= 8 && new TextEncoder().encode(v).length <= 72) || "Use at least 8 characters and at most 72 UTF-8 bytes.",
};

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ user_name: "", email: "", phone_number: "", password: "" });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [alias, setAlias] = useState(null);
  const [copied, setCopied] = useState(false);

  const change = (name) => (e) => {
    let v = e.target.value;
    if (name === "phone_number") v = v.replace(/\D/g, "").slice(0, 10);
    setValues((s) => ({ ...s, [name]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
    const found = {};
    for (const k in rules) {
      const r = rules[k](values[k]);
      if (r !== true) found[k] = r;
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const data = await registerUser({
        user_name: values.user_name.trim(),
        email: values.email.trim().toLowerCase(),
        phone_number: values.phone_number,
        password: values.password,
      });
      setAlias((data.alias_name || (data.message || "").split(":").pop() || "").trim());
    } catch (err) {
      if (err.status === 409) setBanner("An account with this email or phone number already exists. Try logging in instead.");
      else if (err.status === 400) setBanner("Some details are missing or invalid. Check each field and try again.");
      else if (!err.status) setBanner("Can’t reach the server. Check your connection and try again.");
      else setBanner("Something went wrong on our side. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(alias); setCopied(true); } catch { /* ignore */ }
  };

  const field = (name, label, props = {}, extra) => (
    <div className={`field${errors[name] ? " bad" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <div className="in">
        {props.pre && <span className="pre">{props.pre}</span>}
        <input id={name} value={values[name]} onChange={change(name)} aria-invalid={!!errors[name]} {...props.input} />
        {extra}
      </div>
      {errors[name] && <div className="msg">{errors[name]}</div>}
    </div>
  );

  return (
    <AuthShell
      headline="See something. Say it without your name."
      text="Your reports carry an alias, and other citizens never see your name. Authorities can see your name, phone and email when they review a report, and every look is logged."
    >
      {alias ? (
        <>
          <h2>You’re in.</h2>
          <p className="sub">This is your alias. Every report you file will carry it instead of your name.</p>
          <div className="tag">
            <small>Your alias</small>
            <code>{alias}</code>
            <button className="copy" type="button" onClick={copy}>{copied ? "Copied" : "Copy alias"}</button>
          </div>
          <button className="go" type="button" onClick={() => navigate("/login")}>Log in to report a crime</button>
        </>
      ) : (
        <>
          <h2>Create your account</h2>
          <p className="sub">You’ll get an alias after signing up. That’s the only name on your reports.</p>
          {banner && <div className="banner" role="alert">{banner}</div>}
          <form onSubmit={submit} noValidate>
            {field("user_name", "Full name", { input: { autoComplete: "name" } })}
            {field("email", "Email", { input: { type: "email", autoComplete: "email" } })}
            {field("phone_number", "Phone", { pre: "+91", input: { inputMode: "numeric", autoComplete: "tel-national" } })}
            {field(
              "password",
              <>Password <span className="hint">· 8+ characters</span></>,
              { input: { type: showPw ? "text" : "password", autoComplete: "new-password" } },
              <button type="button" onClick={() => setShowPw((s) => !s)}>{showPw ? "Hide" : "Show"}</button>
            )}
            <div className="private">TRACE does not collect Aadhaar. Your reports use an alias on the public map. Authorized reviewers may access your contact details when reviewing your report.</div>
            <button className="go" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          </form>
          <p className="alt">Already registered? <Link to="/login">Log in</Link></p>
        </>
      )}
    </AuthShell>
  );
}