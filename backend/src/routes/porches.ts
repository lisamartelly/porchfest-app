import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import type { AuthRequest } from '../middleware/auth.js'

export const porchesRouter = Router()

// In-memory store for development - replace with real database
const porches: Map<string, {
  id: string
  profile_id: string
  owner_name: string
  address: string
  city: string
  lat: number | null
  lng: number | null
  capacity: number | null
  has_power: boolean
  parking_notes: string | null
  accessibility_notes: string | null
  status: string
  created_at: string
}> = new Map()

// Get current user's porch
porchesRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const porch = Array.from(porches.values()).find(p => p.profile_id === req.user!.id)
    res.json(porch || null)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch porch' })
  }
})

// Create or update porch application
porchesRouter.post(
  '/',
  [
    body('owner_name').trim().notEmpty().withMessage('Owner name is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { owner_name, address, city, capacity, has_power, parking_notes, accessibility_notes } = req.body

      // Check if porch already exists for this user
      const existing = Array.from(porches.values()).find(p => p.profile_id === req.user!.id)

      const porchData = {
        id: existing?.id || crypto.randomUUID(),
        profile_id: req.user!.id,
        owner_name,
        address,
        city,
        lat: null, // TODO: Geocode address
        lng: null,
        capacity: capacity || null,
        has_power: has_power || false,
        parking_notes: parking_notes || null,
        accessibility_notes: accessibility_notes || null,
        status: existing?.status === 'rejected' ? 'pending' : existing?.status || 'pending',
        created_at: existing?.created_at || new Date().toISOString(),
      }

      porches.set(porchData.id, porchData)

      res.json(porchData)
    } catch (error) {
      res.status(500).json({ error: 'Failed to save porch' })
    }
  }
)

// Get porch's performances
porchesRouter.get('/performances', async (req: AuthRequest, res) => {
  try {
    // TODO: Implement with real database
    res.json([])
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performances' })
  }
})

// Set porch availability
porchesRouter.post('/availability', async (req: AuthRequest, res) => {
  try {
    // TODO: Implement with real database
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update availability' })
  }
})

// Export porches map for admin routes
export { porches }
