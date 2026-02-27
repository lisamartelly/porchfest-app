import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export type Role = 'super-duper-admin' | 'user'

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    role: Role
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
        id: number
        email: string
        role: Role
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
  if (req.user?.role !== 'user' && req.user?.role !== 'super-duper-admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

export const superDuperAdminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'super-duper-admin') {
    return res.status(403).json({ error: 'Super-duper-admin access required' })
  }
  next()
}

export const generateToken = (user: { id: number; email: string; role: string }) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}
