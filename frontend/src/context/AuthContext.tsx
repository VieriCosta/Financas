import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { api } from "../api/client";
import { User } from "../types/finance";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => {
    const storedToken = sessionStorage.getItem("finance.token") ?? localStorage.getItem("finance.token");
    localStorage.removeItem("finance.token");
    return storedToken;
  });
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem("finance.user") ?? localStorage.getItem("finance.user");
    localStorage.removeItem("finance.user");
    if (!stored) return null;

    try {
      return JSON.parse(stored) as User;
    } catch {
      sessionStorage.removeItem("finance.token");
      sessionStorage.removeItem("finance.user");
      return null;
    }
  });

  async function persistAuth(endpoint: "login" | "register", payload: Record<string, string>) {
    const { data } = await api.post(`/auth/${endpoint}`, payload);
    sessionStorage.setItem("finance.token", data.token);
    sessionStorage.setItem("finance.user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login: (email, password) => persistAuth("login", { email, password }),
      register: (name, email, password) => persistAuth("register", { name, email, password }),
      logout: () => {
        sessionStorage.removeItem("finance.token");
        sessionStorage.removeItem("finance.user");
        setToken(null);
        setUser(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
