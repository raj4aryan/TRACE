import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";
import { registerUser } from "../services/auth.service";

const rules = {
  user_name: (v) => v.trim().length >= 2 || "Enter your full name.",
  email: (v) => /^\S+@\S+\.\S+$/.test(v) || "Enter a valid email address.",
  phone_number: (v) => /^\d{10}$/.test(v) || "Phone number must be 10 digits.",
  aadhaar_id: (v) => /^\d{12}$/.test(v.replace(/\s/g, "")) || "Aadhaar number must be 12 digits.",
  password: (v) => v.length >= 8 || "Use at least 8 characters.",
};

const formatAadhaar = (v) =>
  v.replace(/\D/g, "").slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ");

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ user_name: "", email: "", phone_number: "", aadhaar_id: "", password: "" });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [alias, setAlias] = useState(null);
  const [copied, setCopied] = useState(false);

  const change = (name) => (e) => {
    let v = e.target.value;
    if (name === "phone_number") v = v.replace(/\D/g, "").slice(0, 10);
    if (name === "aadhaar_id") v = formatAadhaar(v);
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
        aadhaar_id: values.aadhaar_id.replace(/\s/g, ""),
        password: values.password,
      });
      setAlias((data.alias_name || (data.message || "").split(":").pop() || "").trim());
    } catch (err) {
      if (err.status === 409) setBanner("An account with this email, phone number or Aadhaar already exists. Try logging in instead.");
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
      text="Your reports are filed under an alias, so police get the location and the facts, not your identity."
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
            <div className="row">
              {field("phone_number", "Phone", { pre: "+91", input: { inputMode: "numeric", autoComplete: "tel-national" } })}
              {field("aadhaar_id", "Aadhaar number", { input: { inputMode: "numeric", placeholder: "0000 0000 0000" } })}
            </div>
            {field(
              "password",
              <>Password <span className="hint">· 8+ characters</span></>,
              { input: { type: showPw ? "text" : "password", autoComplete: "new-password" } },
              <button type="button" onClick={() => setShowPw((s) => !s)}>{showPw ? "Hide" : "Show"}</button>
            )}
            <div className="private">Your Aadhaar number is hashed before it’s stored. It’s only used to stop duplicate accounts.</div>
            <button className="go" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          </form>
          <p className="alt">Already registered? <Link to="/login">Log in</Link></p>
        </>
      )}
    </AuthShell>
  );
}