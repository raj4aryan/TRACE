import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { loginUser } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const change = (name) => (e) => setValues((s) => ({ ...s, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
    const found = {};
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) found.email = "Enter the email you registered with.";
    if (!values.password) found.password = "Enter your password.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const data = await loginUser({ email: values.email.trim().toLowerCase(), password: values.password });
      signIn(data.user);
      navigate(location.state?.from || "/report", { replace: true });
    } catch (err) {
      if (err.status === 401) setBanner("Email or password is incorrect. Check both and try again.");
      else if (err.status === 400) setBanner("Enter both your email and password.");
      else if (!err.status) setBanner("Can’t reach the server. Check your connection and try again.");
      else setBanner("Something went wrong on our side. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      headline="Welcome back. Your alias is waiting."
      text="Log in to file reports, follow what’s happening near you, and keep your name out of it."
    >
      <h2>Log in</h2>
      <p className="sub">Use the email and password you registered with.</p>
      {banner && <div className="banner" role="alert">{banner}</div>}
      <form onSubmit={submit} noValidate>
        <div className={`field${errors.email ? " bad" : ""}`}>
          <label htmlFor="email">Email</label>
          <div className="in">
            <input id="email" type="email" autoComplete="email" value={values.email} onChange={change("email")} aria-invalid={!!errors.email} />
          </div>
          {errors.email && <div className="msg">{errors.email}</div>}
        </div>
        <div className={`field${errors.password ? " bad" : ""}`}>
          <label htmlFor="password">Password</label>
          <div className="in">
            <input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" value={values.password} onChange={change("password")} aria-invalid={!!errors.password} />
            <button type="button" onClick={() => setShowPw((s) => !s)}>{showPw ? "Hide" : "Show"}</button>
          </div>
          {errors.password && <div className="msg">{errors.password}</div>}
        </div>
        <button className="go" type="submit" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="alt">New to TRACE? <Link to="/register">Create an account</Link></p>
    </AuthShell>
  );
}