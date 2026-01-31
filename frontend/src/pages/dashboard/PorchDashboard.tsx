import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Porch, Performance } from '../../types'

export default function PorchDashboard() {
  const { user } = useAuthStore()
  const [porch, setPorch] = useState<Porch | null>(null)
  const [performances, setPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchPorchData()
    }
  }, [user])

  const fetchPorchData = async () => {
    try {
      const porchData = await api.get('/api/porches/me')
      setPorch(porchData)

      if (porchData) {
        const perfData = await api.get('/api/porches/performances')
        setPerformances(perfData || [])
      }
    } catch (error) {
      console.error('Error fetching porch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge-pending">Pending Review</span>
      case 'under_review':
        return <span className="badge-pending">Under Review</span>
      case 'approved':
        return <span className="badge-approved">Approved</span>
      case 'rejected':
        return <span className="badge-rejected">Rejected</span>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600"></div>
      </div>
    )
  }

  if (!porch) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🏡</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">Welcome to Porchfest!</h1>
        <p className="text-gray-600 mb-8">
          You haven't submitted your porch application yet. Tell us about your space to get started!
        </p>
        <Link to="/dashboard/porch/apply" className="btn-secondary">
          Apply Now
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900">Porch Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your porch venue and scheduled performances</p>
      </div>

      {/* Status Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Application Status</h3>
          {getStatusBadge(porch.status)}
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Scheduled Performances</h3>
          <p className="text-3xl font-bold text-forest-600">{performances.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Capacity</h3>
          <p className="text-lg font-medium text-gray-900">{porch.capacity || 'Not specified'} people</p>
        </div>
      </div>

      {/* Porch Info */}
      <div className="card p-6 mb-8">
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-display text-2xl font-bold text-gray-900">{porch.address}</h2>
          <Link to="/dashboard/porch/apply" className="text-porch-600 hover:text-porch-700 text-sm font-medium">
            Edit Details
          </Link>
        </div>
        
        <p className="text-gray-600 mb-4">{porch.city}</p>
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${porch.has_power ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-gray-700">
              {porch.has_power ? 'Power outlet available' : 'No power outlet'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Owner:</span>
            <span className="ml-2 text-gray-900">{porch.owner_name}</span>
          </div>
        </div>
        
        {porch.parking_notes && (
          <div className="mt-4">
            <span className="text-sm text-gray-500">Parking Notes:</span>
            <p className="text-gray-700 mt-1">{porch.parking_notes}</p>
          </div>
        )}
        
        {porch.accessibility_notes && (
          <div className="mt-4">
            <span className="text-sm text-gray-500">Accessibility:</span>
            <p className="text-gray-700 mt-1">{porch.accessibility_notes}</p>
          </div>
        )}
      </div>

      {/* Performances */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-display text-xl font-bold text-gray-900">Scheduled Performances</h2>
        </div>
        
        {performances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {porch.status === 'approved' 
              ? "No performances scheduled yet. Check back after you've set your availability!"
              : "Performances will be assigned once your application is approved."}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {performances.map(perf => (
              <div key={perf.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      🎸 {perf.band?.name}
                    </p>
                    {perf.band?.genre && (
                      <p className="text-sm text-gray-500 mt-1">
                        {perf.band.genre} • {perf.band.member_count} members
                      </p>
                    )}
                    {perf.time_slot && (
                      <p className="text-sm text-porch-600 mt-2">
                        🕐 {new Date(perf.time_slot.start_time).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    perf.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    perf.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {perf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
