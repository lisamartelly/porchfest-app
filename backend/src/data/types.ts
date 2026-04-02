export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Band {
  id: number;
  event_id: number;
  band_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  genre: string | null;
  member_count: string | null;
  music_sample_link: string | null;
  bio: string | null;
  set_length: string | null;
  venmo_handle: string | null;
  instagram: string | null;
  spotify: string | null;
  soundcloud: string | null;
  bandcamp: string | null;
  facebook: string | null;
  website: string | null;
  scheduling_notes: string | null;
  equipment_consent: string | null;
  payment_consent: string | null;
  timeline_consent: string | null;
  photo_key: string | null;
  questions_comments: string | null;
  status: string;
  admin_notes: string | null;
  assigned_porch_id: number | null;
  set_start_time: string | null;
  set_end_time: string | null;
  assigned_reviewer_id: number | null;
  reviewer_rating: number | null;
  reviewer_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Porch {
  id: number;
  event_id: number;
  owner_name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  has_power: boolean;
  parking_notes: string | null;
  accessibility_notes: string | null;
  space_description: string | null;
  has_band_in_mind: string | null;
  music_preferences: string | null;
  band_count_preference: string | null;
  rain_date_available: string | null;
  comments: string | null;
  status: string;
  admin_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: number;
  organization_id: number;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  is_active: boolean;
  band_applications_open: string | null;
  band_applications_close: string | null;
  porch_applications_open: string | null;
  porch_applications_close: string | null;
  porch_app_description: string | null;
  porch_app_photo_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationUser {
  id: number;
  user_id: number;
  organization_id: number;
  role: string;
  created_at: Date;
}

export interface TimeSlot {
  id: number;
  event_id: number;
  start_time: Date;
  end_time: Date;
  created_at: Date;
}

export interface Task {
  id: number;
  organization_id: number;
  name: string;
  recurring: boolean;
  created_at: Date;
  updated_at: Date;
}

export type EventTaskStatus = "to_do" | "in_progress" | "blocked" | "done";

export interface EventTask {
  id: number;
  task_id: number;
  event_id: number;
  name: string | null;
  notes: string | null;
  assigned_user_id: number | null;
  due_date: Date | null;
  status: EventTaskStatus;
  created_at: Date;
  updated_at: Date;
}

export interface EventTaskWithDetails extends EventTask {
  task_name: string;
  recurring: boolean;
  assigned_user_email?: string | null;
  assigned_user_first_name?: string | null;
  assigned_user_last_name?: string | null;
  contacts?: TaskContact[];
}

export interface TaskContact {
  id: number;
  event_task_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  business: string | null;
  notes: string | null;
  created_at: Date;
}

export interface BandMagicToken {
  id: number;
  band_id: number;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}
