import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js'
import { users } from '../data/db.js'

export const authRouter = Router()

// Register
authRouter.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['band', 'porch', 'admin']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { email, password, role } = req.body

      // Check if user exists
      if (users.has(email)) {
        return res.status(400).json({ error: 'User already exists' })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Create user
      const id = crypto.randomUUID()
      const user = { id, email, password: hashedPassword, role }
      users.set(email, user)

      // Generate token
      const token = generateToken({ id, email, role })

      res.json({
        token,
        user: {
          id,
          email,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Register error:', error)
      res.status(500).json({ error: 'Registration failed' })
    }
  }
)

// Login
authRouter.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { email, password } = req.body

      // Find user
      const user = users.get(email)
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password)
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      // Generate token
      const token = generateToken({ id: user.id, email: user.email, role: user.role })

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({ error: 'Login failed' })
    }
  }
)

// Get current user
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
})
