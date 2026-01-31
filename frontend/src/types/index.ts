export type UserRole = 'band' | 'porch' | 'admin'
export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected'
export type PerformanceStatus = 'scheduled' | 'confirmed' | 'cancelled'

export interface Profile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Band {
  id: string
  profile_id: string
  name: string
  genre: string | null
  bio: string | null
  photo_url: string | null
  music_links: string[]
  member_count: number | null
  equipment_needs: string | null
  status: ApplicationStatus
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
}

export interface Porch {
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
  photo_url: string | null
  status: ApplicationStatus
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
}

export interface Event {
  id: string
  name: string
  date: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface TimeSlot {
  id: string
  event_id: string
  start_time: string
  end_time: string
}

export interface Performance {
  id: string
  band_id: string
  porch_id: string
  time_slot_id: string
  status: PerformanceStatus
  created_at: string
  // Joined data
  band?: Band
  porch?: Porch
  time_slot?: TimeSlot
}

export interface Message {
  id: string
  from_user_id: string
  to_user_id: string
  performance_id: string | null
  content: string
  read_at: string | null
  created_at: string
}

// Form types
export interface BandApplicationData {
  name: string
  genre: string
  bio: string
  music_links: string[]
  member_count: number
  equipment_needs: string
}

export interface PorchApplicationData {
  owner_name: string
  address: string
  city: string
  capacity: number
  has_power: boolean
  parking_notes: string
  accessibility_notes: string
}

