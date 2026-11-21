import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { request } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("mv_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return undefined;
    }
    request("/api/auth/me")
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem("mv_token");
        if (active) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function login(username, password) {
    const data = await request("/api/session/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem("mv_token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  }

  async function register(username, email, password) {
    await request("/api/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ username, email, password }),
    });
    return login(username, password);
  }

  function logout() {
    localStorage.removeItem("mv_token");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}