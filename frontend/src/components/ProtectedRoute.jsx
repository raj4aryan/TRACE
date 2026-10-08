import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// roles is optional, e.g. <ProtectedRoute roles={["authorityOne"]}>. Needs `role` in the login response.
export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/report" replace />;
  return children;
}