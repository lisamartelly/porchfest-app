export interface BandApplication {
  id: number;
  event_id: number;
  band_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  genre: string;
  member_count: string;
  music_sample_link: string;
  bio: string;
  set_length: string;
  venmo_handle: string | null;
  instagram: string | null;
  spotify: string | null;
  soundcloud: string | null;
  bandcamp: string | null;
  facebook: string | null;
  website: string | null;
  scheduling_notes: string | null;
  photo_key: string | null;
  questions_comments: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  assigned_porch_id: number | null;
  set_start_time: string | null;
  set_end_time: string | null;
  // Reviewer fields
  assigned_reviewer_id: number | null;
  reviewer_rating: number | null;
  reviewer_notes: string | null;
}

export interface PorchApplication {
  id: number;
  event_id: number;
  owner_name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
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
  created_at: string;
}

export type Status = "pending" | "under_review" | "approved" | "rejected";

export interface EventSettings {
  id: number;
  organization_id: number;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  is_active: boolean;
  // Application date fields
  band_applications_open: string | null;
  band_applications_close: string | null;
  porch_applications_open: string | null;
  porch_applications_close: string | null;
  // Porch application form configuration
  porch_app_description: string | null;
  porch_app_photo_key: string | null;
}

export type FilterStatus =
  | "all"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

export type Section =
  | "overview"
  | "bands"
  | "porches"
  | "assignments"
  | "my-reviews"
  | "scheduler"
  | "events"
  | "tasks"
  | "organizations"
  | "manage-users";

export interface OrgSummary {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  role?: string;
  org_role?: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  organizations?: { id: number; name: string }[];
}

export interface EventWithOrg {
  id: number;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  is_active: boolean;
  organization_id: number;
  organization?: { id: number; name: string };
  band_applications_open: string | null;
  band_applications_close: string | null;
  porch_applications_open: string | null;
  porch_applications_close: string | null;
  porch_app_description: string | null;
  porch_app_photo_key: string | null;
}

export interface ReviewerUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export type BandSortOption =
  | "band_name"
  | "created_at"
  | "status"
  | "porch_assignment"
  | "reviewer"
  | "rating";

export type PorchSortOption = "address" | "created_at" | "status" | "owner_name";

export interface TaskTemplate {
  id: number;
  organization_id: number;
  name: string;
  recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskContact {
  id: number;
  event_task_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  business: string | null;
  notes: string | null;
  created_at: string;
}

export type EventTaskStatus = "to_do" | "in_progress" | "blocked" | "done";

export interface EventTaskItem {
  id: number;
  task_id: number;
  event_id: number;
  name: string | null;
  notes: string | null;
  assigned_user_id: number | null;
  due_date: string | null;
  status: EventTaskStatus;
  task_name: string;
  recurring: boolean;
  assigned_user_email: string | null;
  assigned_user_first_name: string | null;
  assigned_user_last_name: string | null;
  contacts: TaskContact[];
  created_at: string;
  updated_at: string;
  event_name?: string;
  event_date?: string;
}
