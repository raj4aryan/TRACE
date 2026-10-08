import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);
const KEY = "trace_user";

// The JWT lives in an HTTP-only cookie, so JS can't read it. We keep only the public
// profile (user_name, alias_name, role if the server sends it) to know who is signed in.
const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(load);

  const signIn = useCallback((u) => {
    setUser(u);
    try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* storage blocked */ }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    // TODO: call a backend logout route once it exists, so the cookie is cleared too.
  }, []);

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);