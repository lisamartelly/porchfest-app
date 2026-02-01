import { Routes, Route } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useEffect } from "react";

// Layouts
import PublicLayout from "./components/layouts/PublicLayout";
import DashboardLayout from "./components/layouts/DashboardLayout";

// Public Pages
import HomePage from "./pages/HomePage";
import SchedulePage from "./pages/SchedulePage";
import MapPage from "./pages/MapPage";
import BandApplyPage from "./pages/BandApplyPage";
import PorchApplyPage from "./pages/PorchApplyPage";
import LoginPage from "./pages/auth/LoginPage";
import FAQPage from "./pages/FAQPage";
import BandsPage from "./pages/BandsPage";
import ForBandsPage from "./pages/ForBandsPage";
import ForHostsPage from "./pages/ForHostsPage";

// Dashboard Pages (Admin only)
import AdminDashboard from "./pages/dashboard/AdminDashboard";

// Components
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-porch-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600 mx-auto"></div>
          <p className="mt-4 text-porch-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/bands" element={<BandsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/for-bands" element={<ForBandsPage />} />
        <Route path="/for-hosts" element={<ForHostsPage />} />
        <Route path="/apply/band" element={<BandApplyPage />} />
        <Route path="/apply/porch" element={<PorchApplyPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
