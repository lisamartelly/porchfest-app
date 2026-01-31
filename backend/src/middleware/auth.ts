import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: 'band' | 'porch' | 'admin'
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string
        email: string
        role: 'band' | 'porch' | 'admin'
      }
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      }
      
      next()
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

export const generateToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}
