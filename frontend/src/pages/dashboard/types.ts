export interface BandApplication {
  id: string;
  event_id: string;
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
  has_photo: boolean;
  questions_comments: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  assigned_porch_id: string | null;
  set_start_time: string | null;
  set_end_time: string | null;
  // Reviewer fields
  assigned_reviewer_id: string | null;
  assigned_reviewer_email: string | null;
  reviewer_rating: number | null;
  reviewer_notes: string | null;
}

export interface PorchApplication {
  id: string;
  event_id: string;
  owner_name: string;
  email: string;
  address: string;
  city: string;
  capacity: number | null;
  has_power: boolean;
  parking_notes: string | null;
  accessibility_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export type Status = "pending" | "under_review" | "approved" | "rejected";

export interface EventSettings {
  id: string;
  organization_id: string;
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
  // Reviewer assignment fields
  reviewer_emails: string[];
  reviewers_assigned: boolean;
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
  | "organizations"
  | "manage-admins";

export interface OrgSummary {
  id: string;
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
  id: string;
  email: string;
  role: string;
  created_at: string;
  organizations: { id: string; name: string }[];
}

export interface EventWithOrg {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  is_active: boolean;
  organization_id: string;
  organization?: { id: string; name: string };
  band_applications_open: string | null;
  band_applications_close: string | null;
  porch_applications_open: string | null;
  porch_applications_close: string | null;
  reviewer_emails: string[];
  reviewers_assigned: boolean;
}

export type BandSortOption =
  | "band_name"
  | "created_at"
  | "status"
  | "porch_assignment"
  | "reviewer"
  | "rating";

export type PorchSortOption = "address" | "created_at" | "status" | "owner_name";
