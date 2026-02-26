import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useEffect } from "react";

import DashboardLayout from "./components/layouts/DashboardLayout";

import BandApplyPage from "./pages/BandApplyPage";
import PorchApplyPage from "./pages/PorchApplyPage";
import LoginPage from "./pages/auth/LoginPage";

import AdminDashboard from "./pages/dashboard/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/bandapplication/:slug" element={<BandApplyPage />} />
      <Route path="/porchapplication/:slug" element={<PorchApplyPage />} />

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
