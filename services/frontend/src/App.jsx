import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import FlagToast from "./components/FlagToast";
import Layout from "./components/Layout";
import ChallengePage from "./pages/Challenge";
import CheckoutPage from "./pages/Checkout";
import DashboardPage from "./pages/Dashboard";
import LeaderboardPage from "./pages/Leaderboard";
import LoginPage from "./pages/Login";
import NotFoundPage from "./pages/NotFound";
import ProfilePage from "./pages/Profile";
import RegisterPage from "./pages/Register";
import SearchPage from "./pages/Search";
import SupportPage from "./pages/Support";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loading-screen">Инициализация сессии…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/challenge/:slug" element={<ChallengePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <FlagToast />
    </>
  );
}