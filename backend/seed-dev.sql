-- Development seed data — sample events, porches, and bands
-- Run manually: psql $DATABASE_URL -f seed-dev.sql
-- This is NOT a migration — it's for local development only.

-- Event
INSERT INTO events (id, organization_id, name, date, start_time, end_time, description, is_active, band_applications_open, band_applications_close, porch_applications_open, porch_applications_close, reviewer_emails, reviewers_assigned, created_at) VALUES
('event-001', 'org-001', 'Somerville Porchfest 2026', '2026-05-16', '12:00', '18:00', 'Annual neighborhood music festival featuring local bands on porches throughout Somerville.', true, '2026-04-01', '2026-06-01', '2026-02-01', '2026-07-01', '{}', false, '2026-01-01T00:00:00.000Z')
ON CONFLICT DO NOTHING;

-- Porches
INSERT INTO porches (id, event_id, owner_name, email, address, city, lat, lng, capacity, has_power, parking_notes, accessibility_notes, status, admin_notes, created_at) VALUES
('porch-001', 'event-001', 'Susan Miller', 'susan.miller@email.com', '123 Oak Street', 'Somerville', 42.3876, -71.0995, 50, true, 'Street parking available, 2hr limit', 'Wheelchair accessible ramp on left side', 'approved', 'Great location, central to festival area', '2026-01-10T08:00:00.000Z'),
('porch-002', 'event-001', 'Robert Johnson', 'rob.j@email.com', '456 Maple Avenue', 'Somerville', 42.3901, -71.1012, 30, true, 'Driveway can fit 2 cars', NULL, 'approved', NULL, '2026-01-11T12:30:00.000Z'),
('porch-003', 'event-001', 'Linda Chen', 'linda.chen@email.com', '789 Elm Road', 'Somerville', 42.3855, -71.0978, 75, true, 'Large lot next door (ask permission)', 'Flat lawn area, no stairs', 'approved', 'Largest porch space, good for headliners', '2026-01-12T15:00:00.000Z'),
('porch-004', 'event-001', 'Mike Thompson', 'mike.t@email.com', '321 Pine Street', 'Somerville', 42.3889, -71.1034, 25, false, NULL, '3 steps to porch', 'pending', NULL, '2026-01-18T10:00:00.000Z'),
('porch-005', 'event-001', 'Emily Davis', 'emily.d@email.com', '654 Birch Lane', 'Somerville', 42.3912, -71.0956, 40, true, 'Street parking only', NULL, 'under_review', 'Confirming power outlet location', '2026-01-21T09:30:00.000Z')
ON CONFLICT DO NOTHING;

-- Bands
INSERT INTO bands (id, event_id, band_name, contact_name, contact_email, contact_phone, genre, member_count, music_sample_link, bio, set_length, venmo_handle, instagram, spotify, soundcloud, bandcamp, facebook, website, scheduling_notes, equipment_consent, payment_consent, timeline_consent, has_photo, photo_filename, questions_comments, status, admin_notes, assigned_porch_id, set_start_time, set_end_time, assigned_reviewer_id, assigned_reviewer_email, reviewer_rating, reviewer_notes, created_at) VALUES
('band-001', 'event-001', 'The Porch Rockers', 'Jake Thompson', 'jake@porchrockers.com', '555-0101', 'Rock', '4', 'https://soundcloud.com/porchrockers/demo', 'High-energy rock band from downtown. We bring the party to every porch!', '45', '@porchrockers', '@theporchrockers', NULL, 'porchrockers', NULL, NULL, 'https://porchrockers.com', 'Available all day, prefer afternoon slots', 'agree', 'agree', 'agree', true, 'porchrockers.jpg', NULL, 'approved', 'Great demo, confirmed for main stage porch', 'porch-003', '14:00', '14:45', NULL, NULL, NULL, NULL, '2026-01-15T10:00:00.000Z'),
('band-002', 'event-001', 'Acoustic Sunrise', 'Maria Santos', 'maria@acousticsunrise.com', '555-0102', 'Folk/Acoustic', '2', 'https://spotify.com/acousticsunrise', 'Duo playing original folk songs with guitar and violin harmonies.', '30', '@acousticsunrise', '@acoustic_sunrise', 'acousticsunrise', NULL, 'acousticsunrise', NULL, NULL, 'Morning slots preferred', 'agree', 'agree', 'agree', true, 'acousticsunrise.jpg', 'We can also do a kids set if needed!', 'approved', NULL, 'porch-001', '12:00', '12:30', NULL, NULL, NULL, NULL, '2026-01-16T14:30:00.000Z'),
('band-003', 'event-001', 'Jazz Collective', 'Marcus Williams', 'marcus@jazzcollective.net', '555-0103', 'Jazz', '5', 'https://bandcamp.com/jazzcollective', 'Five-piece jazz ensemble bringing smooth sounds to the neighborhood.', '60', NULL, '@jazzcollective', NULL, NULL, 'jazzcollective', 'jazzcollectiveband', 'https://jazzcollective.net', 'Need at least 10x10 space for setup', 'agree', 'agree', 'agree', false, NULL, 'Do you have any porches with shade?', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-20T09:15:00.000Z'),
('band-004', 'event-001', 'The Garage Kids', 'Tommy Chen', 'tommy@garagekids.band', '555-0104', 'Punk', '3', 'https://soundcloud.com/garagekids', 'Loud, fast, and fun. We promise to keep it under 85db!', '30', '@garagekidsband', '@garage_kids', NULL, 'garagekids', NULL, NULL, NULL, NULL, 'agree', 'agree', 'agree', true, 'garagekids.jpg', NULL, 'under_review', 'Need to confirm volume levels', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-22T16:45:00.000Z'),
('band-005', 'event-001', 'Bluegrass Battalion', 'Earl Patterson', 'earl@bluegrassbattalion.com', '555-0105', 'Bluegrass', '4', 'https://youtube.com/bluegrassbattalion', 'Traditional bluegrass with a modern twist. Banjos, fiddles, and good times.', '45', '@bluegrassbattalion', NULL, NULL, NULL, NULL, 'bluegrassbattalion', 'https://bluegrassbattalion.com', 'Any time works for us!', 'agree', 'agree', 'agree', false, NULL, NULL, 'rejected', 'Unfortunately fully booked this year, invited for next year', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-25T11:00:00.000Z')
ON CONFLICT DO NOTHING;

-- Time Slots
INSERT INTO time_slots (id, event_id, start_time, end_time) VALUES
('slot-001', 'event-001', '2026-05-16T12:00:00.000Z', '2026-05-16T13:00:00.000Z'),
('slot-002', 'event-001', '2026-05-16T13:00:00.000Z', '2026-05-16T14:00:00.000Z'),
('slot-003', 'event-001', '2026-05-16T14:00:00.000Z', '2026-05-16T15:00:00.000Z'),
('slot-004', 'event-001', '2026-05-16T15:00:00.000Z', '2026-05-16T16:00:00.000Z'),
('slot-005', 'event-001', '2026-05-16T16:00:00.000Z', '2026-05-16T17:00:00.000Z'),
('slot-006', 'event-001', '2026-05-16T17:00:00.000Z', '2026-05-16T18:00:00.000Z')
ON CONFLICT DO NOTHING;
