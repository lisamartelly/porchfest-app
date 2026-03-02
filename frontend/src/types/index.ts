export type UserRole = 'super-duper-admin' | 'user'
export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected'
export type PerformanceStatus = 'scheduled' | 'confirmed' | 'cancelled'

export interface Profile {
  id: number
  email: string
  role: UserRole
  first_name: string | null
  last_name: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: number
  name: string
  slug: string
  description: string | null
  website: string | null
  contact_email: string | null
  city: string | null
  state: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Band {
  id: number
  event_id: number
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
  id: number
  event_id: number
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
  id: number
  organization_id: number
  name: string
  date: string
  description: string | null
  is_active: boolean
  created_at: string
}

export type OrgRole = 'owner' | 'organizer' | 'reviewer'

export interface OrganizationUser {
  id: number
  user_id: number
  organization_id: number
  role: OrgRole
  created_at: string
}

export interface TimeSlot {
  id: number
  event_id: number
  start_time: string
  end_time: string
}

export interface Performance {
  id: number
  band_id: number
  porch_id: number
  time_slot_id: number
  status: PerformanceStatus
  created_at: string
  // Joined data
  band?: Band
  porch?: Porch
  time_slot?: TimeSlot
}

export interface Message {
  id: number
  from_user_id: number
  to_user_id: number
  performance_id: number | null
  content: string
  read_at: string | null
  created_at: string
}

// Form types
export interface BandApplicationData {
  organization_id: number
  name: string
  genre: string
  bio: string
  music_links: string[]
  member_count: number
  equipment_needs: string
}

export interface PorchApplicationData {
  organization_id: number
  owner_name: string
  address: string
  city: string
  capacity: number
  has_power: boolean
  parking_notes: string
  accessibility_notes: string
}

