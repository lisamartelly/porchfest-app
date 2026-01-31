import { useState, useEffect } from 'react'
import { api } from '../lib/supabase'
import type { Performance, TimeSlot } from '../types'

export default function SchedulePage() {
  const [performances, setPerformances] = useState<Performance[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState<string>('all')

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const data = await api.get('/api/schedule')
      setPerformances(data.performances || [])
      setTimeSlots(data.timeSlots || [])
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const genres = ['all', ...new Set(performances.map(p => p.band?.genre).filter(Boolean))]
  
  const filteredPerformances = selectedGenre === 'all' 
    ? performances 
    : performances.filter(p => p.band?.genre === selectedGenre)

  const groupedByTimeSlot = timeSlots.map(slot => ({
    slot,
    performances: filteredPerformances.filter(p => p.time_slot_id === slot.id)
  })).filter(group => group.performances.length > 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Festival Schedule
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Plan your day exploring live music across the neighborhood
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter by Genre:</label>
          <select 
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="input-field w-48"
          >
            {genres.map(genre => (
              <option key={genre} value={genre}>
                {genre === 'all' ? 'All Genres' : genre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule */}
      {groupedByTimeSlot.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">📅</span>
          </div>
          <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
            Schedule Coming Soon
          </h3>
          <p className="text-gray-600">
            Check back later for the full festival lineup!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByTimeSlot.map(({ slot, performances }) => (
            <div key={slot.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-porch-600 to-porch-700 px-6 py-4">
                <h3 className="font-display text-xl font-bold text-white">
                  {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                {performances.map(performance => (
                  <div key={performance.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-display text-xl font-bold text-gray-900 mb-1">
                          {performance.band?.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          {performance.band?.genre && (
                            <span className="bg-porch-100 text-porch-700 px-3 py-1 rounded-full">
                              {performance.band.genre}
                            </span>
                          )}
                          {performance.band?.member_count && (
                            <span>👥 {performance.band.member_count} members</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            📍 {performance.porch?.address}
                          </p>
                          <p className="text-sm text-gray-500">
                            {performance.porch?.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
