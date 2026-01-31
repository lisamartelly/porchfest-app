import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Band } from '../../types'

export default function BandApplicationForm() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingBand, setExistingBand] = useState<Band | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    genre: '',
    bio: '',
    music_links: [''],
    member_count: 1,
    equipment_needs: '',
  })

  useEffect(() => {
    if (user) {
      fetchExistingBand()
    }
  }, [user])

  const fetchExistingBand = async () => {
    try {
      const data = await api.get('/api/bands/me')
      if (data) {
        setExistingBand(data)
        setFormData({
          name: data.name || '',
          genre: data.genre || '',
          bio: data.bio || '',
          music_links: data.music_links?.length > 0 ? data.music_links : [''],
          member_count: data.member_count || 1,
          equipment_needs: data.equipment_needs || '',
        })
      }
    } catch {
      // No existing band, that's fine
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.post('/api/bands', {
        ...formData,
        music_links: formData.music_links.filter(link => link.trim() !== ''),
      })
      navigate('/dashboard/band')
    } catch (error) {
      console.error('Error saving band:', error)
    } finally {
      setSaving(false)
    }
  }

  const addMusicLink = () => {
    setFormData({ ...formData, music_links: [...formData.music_links, ''] })
  }

  const updateMusicLink = (index: number, value: string) => {
    const newLinks = [...formData.music_links]
    newLinks[index] = value
    setFormData({ ...formData, music_links: newLinks })
  }

  const removeMusicLink = (index: number) => {
    const newLinks = formData.music_links.filter((_, i) => i !== index)
    setFormData({ ...formData, music_links: newLinks.length > 0 ? newLinks : [''] })
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
          {existingBand ? 'Edit Band Profile' : 'Band Application'}
        </h1>
        <p className="text-gray-600 mt-1">
          {existingBand 
            ? 'Update your band information' 
            : 'Tell us about your band to apply for Porchfest'}
        </p>
      </div>

      {existingBand?.status === 'rejected' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">Your application was not approved.</p>
          {existingBand.admin_notes && (
            <p className="text-red-600 text-sm mt-1">Feedback: {existingBand.admin_notes}</p>
          )}
          <p className="text-red-600 text-sm mt-2">You can update your application and resubmit.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Band Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input-field"
            placeholder="The Porch Rockers"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Genre *
          </label>
          <input
            type="text"
            value={formData.genre}
            onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
            className="input-field"
            placeholder="Folk, Rock, Jazz, etc."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio / Description *
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="input-field min-h-[120px]"
            placeholder="Tell us about your band, your style, and what makes you unique..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Members *
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.member_count}
            onChange={(e) => setFormData({ ...formData, member_count: parseInt(e.target.value) || 1 })}
            className="input-field w-32"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Music Links
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Share links to your music (Spotify, Bandcamp, YouTube, SoundCloud, etc.)
          </p>
          <div className="space-y-3">
            {formData.music_links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => updateMusicLink(index, e.target.value)}
                  className="input-field flex-1"
                  placeholder="https://..."
                />
                {formData.music_links.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMusicLink(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addMusicLink}
            className="mt-3 text-sm text-porch-600 hover:text-porch-700 font-medium"
          >
            + Add another link
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Equipment Needs
          </label>
          <textarea
            value={formData.equipment_needs}
            onChange={(e) => setFormData({ ...formData, equipment_needs: e.target.value })}
            className="input-field min-h-[80px]"
            placeholder="Do you need power? Any special requirements?"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : existingBand ? 'Save Changes' : 'Submit Application'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/band')}
            className="btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
