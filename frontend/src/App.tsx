import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'

// Layouts
import PublicLayout from './components/layouts/PublicLayout'
import DashboardLayout from './components/layouts/DashboardLayout'

// Public Pages
import HomePage from './pages/HomePage'
import SchedulePage from './pages/SchedulePage'
import MapPage from './pages/MapPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Dashboard Pages
import BandDashboard from './pages/dashboard/BandDashboard'
import PorchDashboard from './pages/dashboard/PorchDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import BandApplicationForm from './pages/dashboard/BandApplicationForm'
import PorchApplicationForm from './pages/dashboard/PorchApplicationForm'

// Components
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { initialize, loading } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-porch-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600 mx-auto"></div>
          <p className="mt-4 text-porch-700 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        {/* Band Routes */}
        <Route path="/dashboard/band" element={<BandDashboard />} />
        <Route path="/dashboard/band/apply" element={<BandApplicationForm />} />
        
        {/* Porch Owner Routes */}
        <Route path="/dashboard/porch" element={<PorchDashboard />} />
        <Route path="/dashboard/porch/apply" element={<PorchApplicationForm />} />
        
        {/* Admin Routes */}
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  )
}

export default App

