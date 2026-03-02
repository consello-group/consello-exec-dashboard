"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  password: string | null;
  mounted: boolean;
  login: (pwd: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  password: null,
  mounted: false,
  login: async () => false,
  logout: () => {},
});

const SESSION_KEY = "consello_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setPassword(stored);
    setMounted(true);
  }, []);

  const login = useCallback(async (pwd: string): Promise<boolean> => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    if (res.ok) {
      sessionStorage.setItem(SESSION_KEY, pwd);
      setPassword(pwd);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setPassword(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(password),
        password,
        mounted,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
