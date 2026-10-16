import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccess, homeFor } from "../utils/roles";
import "./Appheader.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Each person only sees the links their role can open. (Hiding is for tidiness; the server still enforces roles.)
const LINKS = [
  { to: "/report", label: "Report", area: "report" },
  { to: "/view-incidents", label: "Incidents", area: "incidents" },
  { to: "/authority", label: "Review queue", area: "review" },
  { to: "/admin", label: "Admin", area: "admin" },
];

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);

  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
  if (loggingOut) return;

  setLoggingOut(true);
  setLogoutError("");

  try {
    await signOut();

    navigate("/login", {
      replace: true
    });

  } catch (error) {
    console.error("Logout failed:", error);

    if (error instanceof TypeError) {
      setLogoutError(
        "Unable to connect to TRACE server. Please check your connection and try again."
      );
    } else {
      setLogoutError(
        "Logout failed. Please try again."
      );
    }

  } 
  finally {
    setLoggingOut(false);
  }
};

  const links = LINKS.filter((l) => canAccess(user?.role, l.area));
 return (
  <>
    <header className="appbar">

      <div className="appbar-left">

        <Link
          to={homeFor(user?.role)}
          className="appbar-brand"
        >
          TRACE<i>.</i>
        </Link>

        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}
        </nav>

      </div>

      <div className="appbar-user">

        <span title="Your alias">
          {user?.alias_name}
        </span>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>

      </div>

    </header>

    {/* LOGOUT ERROR NOTIFICATION */}
    {logoutError && (
      <div className="logout-error-banner" role="alert">

        <span>⚠️ {logoutError}</span>

        <button
          type="button"
          onClick={() => setLogoutError("")}
        >
          ✕
        </button>

      </div>
    )}

  </>
  );
}