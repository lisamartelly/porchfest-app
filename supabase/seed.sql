-- Seed data for development/testing
-- Run this after migrations to populate sample data

-- Note: You'll need to create users through Supabase Auth first
-- Then update the profile IDs below with real user IDs

-- Sample event
INSERT INTO events (id, name, date, description, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Porchfest 2026', '2026-06-15', 'Annual neighborhood music festival!', true);

-- Sample time slots for the event
INSERT INTO time_slots (id, event_id, start_time, end_time) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', '2026-06-15 12:00:00-04', '2026-06-15 13:00:00-04'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2026-06-15 13:00:00-04', '2026-06-15 14:00:00-04'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', '2026-06-15 14:00:00-04', '2026-06-15 15:00:00-04'),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', '2026-06-15 15:00:00-04', '2026-06-15 16:00:00-04'),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', '2026-06-15 16:00:00-04', '2026-06-15 17:00:00-04'),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', '2026-06-15 17:00:00-04', '2026-06-15 18:00:00-04');

-- To add sample bands and porches, first create users through Supabase Auth,
-- then insert their profiles and band/porch records.

-- Example (replace UUIDs with real user IDs after creating auth users):
/*
-- Create profile for a band user
INSERT INTO profiles (id, email, role) VALUES
  ('band-user-uuid-here', 'band@example.com', 'band');

-- Create the band
INSERT INTO bands (profile_id, name, genre, bio, member_count, status) VALUES
  ('band-user-uuid-here', 'The Porch Rockers', 'Folk Rock', 'Local favorites playing acoustic tunes!', 4, 'approved');

-- Create profile for a porch owner
INSERT INTO profiles (id, email, role) VALUES
  ('porch-user-uuid-here', 'porch@example.com', 'porch');

-- Create the porch
INSERT INTO porches (profile_id, owner_name, address, city, capacity, has_power, status, lat, lng) VALUES
  ('porch-user-uuid-here', 'Jane Smith', '123 Main St', 'Cambridge', 30, true, 'approved', 42.3736, -71.1097);

-- Create admin profile
INSERT INTO profiles (id, email, role) VALUES
  ('admin-user-uuid-here', 'admin@example.com', 'admin');
*/

