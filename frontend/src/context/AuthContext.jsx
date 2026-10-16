import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from "react";

import { logoutUser } from "../services/auth.service";

const AuthContext = createContext(null);
const KEY = "trace_user";

// The JWT lives in an HTTP-only cookie, so JS can't read it. We keep only the public
// profile (user_name, alias_name, role if the server sends it) to know who is signed in.
// Load stored user information
const load = () => {
  try {
    const user = JSON.parse(localStorage.getItem(KEY));

    return user?.role ? user : null; // an older saved login without a role must log in again
  } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(load);

  const signIn = useCallback((u) => {
    setUser(u);
    try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* storage blocked */ }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    try { 
      localStorage.removeItem(KEY); 
    } catch { /* ignore */ }
    // TODO: call a backend logout route once it exists, so the cookie is cleared too.
  }, []);

   // LOGOUT
  const signOut = useCallback(async () => {

    // Ask backend to remove HTTP-only cookie.
    // If the request fails, do not falsely report
    // that the server-side logout succeeded.
    await logoutUser();

    clearSession();

  }, [clearSession]);

  // api.js fires this on any 401 from a protected route.
 // HANDLE EXPIRED SESSION
  useEffect(() => {

    window.addEventListener(
      "trace:unauthorized",
      clearSession
    );

    return () => {
      window.removeEventListener(
        "trace:unauthorized",
        clearSession
      );
    };

  }, [clearSession]);


  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        clearSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);