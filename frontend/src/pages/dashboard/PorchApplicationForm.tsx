import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Porch } from '../../types'

export default function PorchApplicationForm() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingPorch, setExistingPorch] = useState<Porch | null>(null)
  
  const [formData, setFormData] = useState({
    owner_name: '',
    address: '',
    city: '',
    capacity: 20,
    has_power: false,
    parking_notes: '',
    accessibility_notes: '',
  })

  useEffect(() => {
    if (user) {
      fetchExistingPorch()
    }
  }, [user])

  const fetchExistingPorch = async () => {
    try {
      const data = await api.get('/api/porches/me')
      if (data) {
        setExistingPorch(data)
        setFormData({
          owner_name: data.owner_name || '',
          address: data.address || '',
          city: data.city || '',
          capacity: data.capacity || 20,
          has_power: data.has_power || false,
          parking_notes: data.parking_notes || '',
          accessibility_notes: data.accessibility_notes || '',
        })
      }
    } catch {
      // No existing porch, that's fine
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.post('/api/porches', formData)
      navigate('/dashboard/porch')
    } catch (error) {
      console.error('Error saving porch:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900">
          {existingPorch ? 'Edit Porch Details' : 'Porch Application'}
        </h1>
        <p className="text-gray-600 mt-1">
          {existingPorch 
            ? 'Update your porch information' 
            : 'Tell us about your porch to host performances'}
        </p>
      </div>

      {existingPorch?.status === 'rejected' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">Your application was not approved.</p>
          {existingPorch.admin_notes && (
            <p className="text-red-600 text-sm mt-1">Feedback: {existingPorch.admin_notes}</p>
          )}
          <p className="text-red-600 text-sm mt-2">You can update your application and resubmit.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name *
          </label>
          <input
            type="text"
            value={formData.owner_name}
            onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
            className="input-field"
            placeholder="Jane Smith"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="input-field"
            placeholder="123 Main Street"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="input-field"
            placeholder="Cambridge"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audience Capacity
          </label>
          <p className="text-sm text-gray-500 mb-2">
            How many people can comfortably gather to watch?
          </p>
          <input
            type="number"
            min="5"
            max="200"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 20 })}
            className="input-field w-32"
          />
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.has_power}
              onChange={(e) => setFormData({ ...formData, has_power: e.target.checked })}
              className="w-5 h-5 text-porch-600 rounded border-gray-300 focus:ring-porch-500"
            />
            <div>
              <span className="font-medium text-gray-700">Power outlet available</span>
              <p className="text-sm text-gray-500">Can bands plug in amplifiers or equipment?</p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parking Notes
          </label>
          <textarea
            value={formData.parking_notes}
            onChange={(e) => setFormData({ ...formData, parking_notes: e.target.value })}
            className="input-field min-h-[80px]"
            placeholder="Street parking available, nearby lot at..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accessibility Notes
          </label>
          <textarea
            value={formData.accessibility_notes}
            onChange={(e) => setFormData({ ...formData, accessibility_notes: e.target.value })}
            className="input-field min-h-[80px]"
            placeholder="Steps to porch, wheelchair accessibility, etc."
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-secondary disabled:opacity-50"
          >
            {saving ? 'Saving...' : existingPorch ? 'Save Changes' : 'Submit Application'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/porch')}
            className="btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
