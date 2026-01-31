import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Band, Performance } from '../../types'

export default function BandDashboard() {
  const { user } = useAuthStore()
  const [band, setBand] = useState<Band | null>(null)
  const [performances, setPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchBandData()
    }
  }, [user])

  const fetchBandData = async () => {
    try {
      const bandData = await api.get('/api/bands/me')
      setBand(bandData)

      if (bandData) {
        const perfData = await api.get('/api/bands/performances')
        setPerformances(perfData || [])
      }
    } catch (error) {
      console.error('Error fetching band data:', error)
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

  if (!band) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 bg-porch-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🎸</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">Welcome to Porchfest!</h1>
        <p className="text-gray-600 mb-8">
          You haven't submitted your band application yet. Tell us about your music to get started!
        </p>
        <Link to="/dashboard/band/apply" className="btn-primary">
          Apply Now
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900">Band Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your band profile and performances</p>
      </div>

      {/* Status Card */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Application Status</h3>
          {getStatusBadge(band.status)}
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Scheduled Performances</h3>
          <p className="text-3xl font-bold text-porch-600">{performances.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Genre</h3>
          <p className="text-lg font-medium text-gray-900">{band.genre || 'Not specified'}</p>
        </div>
      </div>

      {/* Band Info */}
      <div className="card p-6 mb-8">
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-display text-2xl font-bold text-gray-900">{band.name}</h2>
          <Link to="/dashboard/band/apply" className="text-porch-600 hover:text-porch-700 text-sm font-medium">
            Edit Profile
          </Link>
        </div>
        
        {band.bio && (
          <p className="text-gray-600 mb-4">{band.bio}</p>
        )}
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Members:</span>
            <span className="ml-2 text-gray-900">{band.member_count || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-gray-500">Equipment Needs:</span>
            <span className="ml-2 text-gray-900">{band.equipment_needs || 'None specified'}</span>
          </div>
        </div>
        
        {band.music_links && band.music_links.length > 0 && (
          <div className="mt-4">
            <span className="text-sm text-gray-500">Music Links:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {band.music_links.map((link, i) => (
                <a 
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-porch-600 hover:text-porch-700 underline"
                >
                  Link {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Performances */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-display text-xl font-bold text-gray-900">Your Performances</h2>
        </div>
        
        {performances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {band.status === 'approved' 
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
                      📍 {perf.porch?.address}, {perf.porch?.city}
                    </p>
                    {perf.time_slot && (
                      <p className="text-sm text-gray-500 mt-1">
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
