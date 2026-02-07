import { useState, useEffect } from 'react'
import { api } from '../lib/api'
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-12 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl md:text-5xl mb-4"
            style={{ 
              fontFamily: 'Carena, Pacifico, cursive',
              color: '#000',
            }}
          >
            Festival Schedule
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Plan your day exploring live music across the neighborhood
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4 justify-center items-center">
          <label className="font-bold text-black">Filter by Genre:</label>
          <select 
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="px-4 py-2 border-2 border-black rounded-lg bg-white font-medium"
          >
            {genres.map(genre => (
              <option key={genre} value={genre}>
                {genre === 'all' ? 'All Genres' : genre}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule */}
        {groupedByTimeSlot.length === 0 ? (
          <div className="text-center py-20">
            <div 
              className="w-24 h-24 bg-[#fafb9d] flex items-center justify-center mx-auto mb-6"
              style={{ borderRadius: '60px 20px' }}
            >
              <span className="text-5xl">📅</span>
            </div>
            <h3 
              className="text-2xl md:text-3xl mb-2"
              style={{ fontFamily: 'Carena, Pacifico, cursive' }}
            >
              Schedule Coming Soon
            </h3>
            <p className="text-gray-700">
              Check back later for the full festival lineup!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByTimeSlot.map(({ slot, performances }) => (
              <div 
                key={slot.id} 
                className="overflow-hidden"
                style={{ 
                  backgroundColor: '#fafb9d',
                  borderRadius: '60px 20px',
                }}
              >
                <div className="px-6 py-4" style={{ backgroundColor: 'rgb(21, 172, 172)' }}>
                  <h3 
                    className="text-xl font-bold text-white text-center"
                    style={{ fontFamily: 'Carena, Pacifico, cursive' }}
                  >
                    {new Date(slot.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {' - '}
                    {new Date(slot.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </h3>
                </div>
                
                <div className="divide-y divide-black/10">
                  {performances.map(performance => (
                    <div key={performance.id} className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 
                            className="text-xl font-bold text-black mb-1"
                            style={{ fontFamily: 'Carena, Pacifico, cursive' }}
                          >
                            {performance.band?.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                            {performance.band?.genre && (
                              <span className="bg-[#dfff9c] text-black px-3 py-1 rounded-full font-medium">
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
                            <p className="font-medium text-black">
                              📍 {performance.porch?.address}
                            </p>
                            <p className="text-sm text-gray-600">
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
    </div>
  )
}
