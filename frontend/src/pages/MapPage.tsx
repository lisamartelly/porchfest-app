import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { api } from '../lib/supabase'
import type { Porch, Performance } from '../types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon
delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function MapPage() {
  const [porches, setPorches] = useState<Porch[]>([])
  const [performances, setPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPorch, setSelectedPorch] = useState<string | null>(null)

  // Default center (you can change this to your city)
  const defaultCenter: [number, number] = [42.3601, -71.0589] // Boston

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [venuesData, scheduleData] = await Promise.all([
        api.get('/api/venues'),
        api.get('/api/schedule'),
      ])
      setPorches(venuesData || [])
      setPerformances(scheduleData.performances || [])
    } catch (error) {
      console.error('Error fetching map data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPerformancesForPorch = (porchId: string) => {
    return performances.filter(p => p.porch_id === porchId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto hidden lg:block">
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-display text-2xl font-bold text-gray-900">Venues</h2>
            <p className="text-gray-600 text-sm mt-1">
              {porches.length} porch{porches.length !== 1 ? 'es' : ''} hosting music
            </p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {porches.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No venues available yet
              </div>
            ) : (
              porches.map(porch => {
                const porchPerformances = getPerformancesForPorch(porch.id)
                return (
                  <button
                    key={porch.id}
                    onClick={() => setSelectedPorch(porch.id)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedPorch === porch.id ? 'bg-porch-50' : ''
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900">{porch.address}</h3>
                    <p className="text-sm text-gray-500">{porch.city}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {porch.has_power && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          ⚡ Power
                        </span>
                      )}
                      {porch.capacity && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          👥 {porch.capacity} capacity
                        </span>
                      )}
                    </div>
                    {porchPerformances.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {porchPerformances.map(perf => (
                          <div key={perf.id} className="text-sm text-porch-700">
                            🎵 {perf.band?.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {porches.map(porch => {
              if (!porch.lat || !porch.lng) return null
              const porchPerformances = getPerformancesForPorch(porch.id)
              
              return (
                <Marker 
                  key={porch.id} 
                  position={[porch.lat, porch.lng]}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-gray-900">{porch.address}</h3>
                      <p className="text-sm text-gray-500">{porch.city}</p>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {porch.has_power && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            ⚡ Power
                          </span>
                        )}
                        {porch.capacity && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            👥 {porch.capacity}
                          </span>
                        )}
                      </div>
                      
                      {porchPerformances.length > 0 && (
                        <div className="mt-3 border-t pt-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Performances:</p>
                          {porchPerformances.map(perf => (
                            <div key={perf.id} className="text-sm">
                              <span className="font-medium">{perf.band?.name}</span>
                              {perf.time_slot && (
                                <span className="text-gray-500 text-xs ml-1">
                                  @ {new Date(perf.time_slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
