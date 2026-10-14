import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccess, homeFor } from "../utils/roles";
import "./AppHeader.css";

// Each person only sees the links their role can open. (Hiding is for tidiness; the server still enforces roles.)
const LINKS = [
  { to: "/report", label: "Report", area: "report" },
  { to: "/view-incidents", label: "Incidents", area: "incidents" },
  { to: "/authority", label: "Review queue", area: "review" },
  { to: "/admin", label: "Admin", area: "admin" },
];

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const links = LINKS.filter((l) => canAccess(user?.role, l.area));
  return (
    <header className="appbar">
      <div className="appbar-left">
        <Link to={homeFor(user?.role)} className="appbar-brand" style={{ textDecoration: 'none', color: 'inherit' }}>TRACE<i>.</i></Link>


        <nav>
          {links.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
        </nav>
      </div>
      <div className="appbar-user">
        <span title="Your alias">{user?.alias_name}</span>
        <button type="button" onClick={signOut}>Log out</button>
      </div>
    </header>
  );
}