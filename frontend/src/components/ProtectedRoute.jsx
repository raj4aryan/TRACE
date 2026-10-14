import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccess, homeFor, isKnownRole } from "../utils/roles";

// area is one of the keys in ACCESS (utils/roles.js): "report", "review" or "admin".
// Logged out -> login. Logged in but the wrong role -> that role's own home page.
export default function ProtectedRoute({ area, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || !isKnownRole(user.role)) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!canAccess(user.role, area)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}