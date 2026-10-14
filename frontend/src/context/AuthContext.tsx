import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../api/client";
import { User } from "../types/finance";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const sessionVersion = useRef(0);

  function persistSession(data: { user: User; csrfToken: string }) {
    sessionVersion.current += 1;
    sessionStorage.setItem("finance.csrf", data.csrfToken);
    localStorage.setItem("finance.user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function clearSession() {
    sessionVersion.current += 1;
    sessionStorage.removeItem("finance.csrf");
    sessionStorage.removeItem("finance.token");
    sessionStorage.removeItem("finance.user");
    localStorage.removeItem("finance.token");
    localStorage.removeItem("finance.user");
    setUser(null);
  }

  useEffect(() => {
    const version = sessionVersion.current;
    api
      .get("/auth/session")
      .then(({ data }) => persistSession(data))
      .catch(() => {
        if (sessionVersion.current === version) {
          clearSession();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function persistAuth(
    endpoint: "login" | "register",
    payload: Record<string, string>,
  ) {
    const { data } = await api.post(`/auth/${endpoint}`, payload);
    persistSession(data);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: (email, password) => persistAuth("login", { email, password }),
      register: (name, email, password) =>
        persistAuth("register", { name, email, password }),
      updateUser: (nextUser) => {
        setUser(nextUser);
      },
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          clearSession();
        }
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
