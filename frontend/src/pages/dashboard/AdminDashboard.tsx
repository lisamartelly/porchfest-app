import { useState, useEffect } from 'react'
import { api } from '../../lib/supabase'
import type { Band, Porch } from '../../types'

export default function AdminDashboard() {
  const [bands, setBands] = useState<Band[]>([])
  const [porches, setPorches] = useState<Porch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bands' | 'porches'>('bands')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [bandData, porchData] = await Promise.all([
        api.get('/api/admin/bands'),
        api.get('/api/admin/porches'),
      ])
      setBands(bandData || [])
      setPorches(porchData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateBandStatus = async (bandId: string, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/api/admin/bands/${bandId}/status`, { status })
      setBands(bands.map(b => b.id === bandId ? { ...b, status } : b))
    } catch (error) {
      console.error('Error updating band status:', error)
    }
  }

  const updatePorchStatus = async (porchId: string, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/api/admin/porches/${porchId}/status`, { status })
      setPorches(porches.map(p => p.id === porchId ? { ...p, status } : p))
    } catch (error) {
      console.error('Error updating porch status:', error)
    }
  }

  const filteredBands = filter === 'all' ? bands : bands.filter(b => b.status === filter)
  const filteredPorches = filter === 'all' ? porches : porches.filter(p => p.status === filter)

  const pendingBands = bands.filter(b => b.status === 'pending').length
  const pendingPorches = porches.filter(p => p.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Review applications and manage the festival</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Bands</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingBands}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Porches</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingPorches}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Approved Bands</h3>
          <p className="text-3xl font-bold text-green-600">{bands.filter(b => b.status === 'approved').length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Approved Porches</h3>
          <p className="text-3xl font-bold text-green-600">{porches.filter(p => p.status === 'approved').length}</p>
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('bands')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'bands' ? 'bg-porch-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bands ({bands.length})
          </button>
          <button
            onClick={() => setActiveTab('porches')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'porches' ? 'bg-porch-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Porches ({porches.length})
          </button>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="input-field w-48"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {activeTab === 'bands' ? (
          filteredBands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No bands to display</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredBands.map(band => (
                <div key={band.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{band.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          band.status === 'approved' ? 'bg-green-100 text-green-700' :
                          band.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {band.status}
                        </span>
                      </div>
                      
                      {band.genre && <p className="text-sm text-porch-600 mb-2">{band.genre}</p>}
                      {band.bio && <p className="text-gray-600 text-sm mb-3">{band.bio}</p>}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>👥 {band.member_count || '?'} members</span>
                        {band.equipment_needs && <span>🔌 {band.equipment_needs}</span>}
                        <span>📅 Applied {new Date(band.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {band.music_links && band.music_links.length > 0 && (
                        <div className="mt-3 flex gap-2">
                          {band.music_links.map((link, i) => (
                            <a
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-porch-600 hover:text-porch-700 underline"
                            >
                              🎵 Listen {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {band.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateBandStatus(band.id, 'approved')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => updateBandStatus(band.id, 'rejected')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredPorches.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No porches to display</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPorches.map(porch => (
                <div key={porch.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{porch.address}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          porch.status === 'approved' ? 'bg-green-100 text-green-700' :
                          porch.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {porch.status}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{porch.city}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>👤 {porch.owner_name}</span>
                        <span>👥 Capacity: {porch.capacity || '?'}</span>
                        <span>{porch.has_power ? '⚡ Has power' : '🔋 No power'}</span>
                        <span>📅 Applied {new Date(porch.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {porch.parking_notes && (
                        <p className="mt-2 text-sm text-gray-600">🚗 {porch.parking_notes}</p>
                      )}
                      
                      {porch.accessibility_notes && (
                        <p className="mt-1 text-sm text-gray-600">♿ {porch.accessibility_notes}</p>
                      )}
                    </div>

                    {porch.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updatePorchStatus(porch.id, 'approved')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => updatePorchStatus(porch.id, 'rejected')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
