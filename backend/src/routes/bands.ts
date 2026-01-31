import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import type { AuthRequest } from '../middleware/auth.js'

export const bandsRouter = Router()

// In-memory store for development - replace with real database
const bands: Map<string, {
  id: string
  profile_id: string
  name: string
  genre: string | null
  bio: string | null
  music_links: string[]
  member_count: number | null
  equipment_needs: string | null
  status: string
  created_at: string
}> = new Map()

// Get current user's band
bandsRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const band = Array.from(bands.values()).find(b => b.profile_id === req.user!.id)
    res.json(band || null)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch band' })
  }
})

// Create or update band application
bandsRouter.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Band name is required'),
    body('genre').trim().notEmpty().withMessage('Genre is required'),
    body('bio').trim().notEmpty().withMessage('Bio is required'),
    body('member_count').isInt({ min: 1, max: 20 }).withMessage('Invalid member count'),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { name, genre, bio, music_links, member_count, equipment_needs } = req.body

      // Check if band already exists for this user
      const existing = Array.from(bands.values()).find(b => b.profile_id === req.user!.id)

      const bandData = {
        id: existing?.id || crypto.randomUUID(),
        profile_id: req.user!.id,
        name,
        genre,
        bio,
        music_links: music_links || [],
        member_count,
        equipment_needs: equipment_needs || null,
        status: existing?.status === 'rejected' ? 'pending' : existing?.status || 'pending',
        created_at: existing?.created_at || new Date().toISOString(),
      }

      bands.set(bandData.id, bandData)

      res.json(bandData)
    } catch (error) {
      res.status(500).json({ error: 'Failed to save band' })
    }
  }
)

// Get band's performances
bandsRouter.get('/performances', async (req: AuthRequest, res) => {
  try {
    // TODO: Implement with real database
    res.json([])
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performances' })
  }
})

// Set band availability
bandsRouter.post('/availability', async (req: AuthRequest, res) => {
  try {
    // TODO: Implement with real database
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update availability' })
  }
})

// Export bands map for admin routes
export { bands }
