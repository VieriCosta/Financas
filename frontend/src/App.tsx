import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { useAuth } from "./context/AuthContext";

export function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300">Validando sessao...</div>;
  }

  return user ? <DashboardPage /> : <AuthPage />;
}
