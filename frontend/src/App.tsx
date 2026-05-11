import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { useAuth } from "./context/AuthContext";

export function App() {
  const { token } = useAuth();
  return token ? <DashboardPage /> : <AuthPage />;
}
