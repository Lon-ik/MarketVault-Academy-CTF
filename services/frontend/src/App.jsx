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
import PathPage from "./pages/Path";
import ProductDetailsPage from "./pages/ProductDetails";
import ProfilePage from "./pages/Profile";
import RegisterPage from "./pages/Register";
import SearchPage from "./pages/Search";
import ShopPage from "./pages/Shop";
import SupportPage from "./pages/Support";
import TrackPage from "./pages/Track";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loading-screen">Проверяю сессию…</div>;
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
          <Route path="/" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<Navigate to="/checkout" replace />} />
          <Route path="/challenges" element={<DashboardPage />} />
          <Route path="/path" element={<PathPage />} />
          <Route path="/track/:id" element={<TrackPage />} />
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
