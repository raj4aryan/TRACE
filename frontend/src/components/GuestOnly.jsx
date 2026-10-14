import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeFor, isKnownRole } from "../utils/roles";

// Login and Register are for logged-out visitors; signed-in users go straight to their own home.
// A saved user without a recognised role is treated as logged out, so the login page always renders.
export default function GuestOnly({ children }) {
  const { user } = useAuth();
  return user && isKnownRole(user.role) ? <Navigate to={homeFor(user.role)} replace /> : children;
}