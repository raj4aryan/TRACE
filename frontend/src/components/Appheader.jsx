import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AppHeader.css";

// Top bar for every signed-in page. Admin links get added with the admin services.
// Links are visible to everyone for now; the server enforces roles and the pages show a clear message on 403.
export default function AppHeader() {
  const { user, signOut } = useAuth();
  return (
    <header className="appbar">
      <div className="appbar-left">
        <div className="appbar-brand">TRACE<i>.</i></div>
        <nav>
          {/* Add the new View incidents tab here */}
          <NavLink to="/view-incidents">View incidents</NavLink>
          
          <NavLink to="/report">Report</NavLink>
          <NavLink to="/authority">Review queue</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </div>
      <div className="appbar-user">
        <span title="Your alias">{user?.alias_name}</span>
        <button type="button" onClick={signOut}>Log out</button>
      </div>
    </header>
  );
}