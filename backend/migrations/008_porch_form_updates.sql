-- Add new porch application form fields and organizer configuration columns

-- New porch application fields
ALTER TABLE porches ADD COLUMN phone VARCHAR(50);
ALTER TABLE porches ADD COLUMN space_description TEXT;
ALTER TABLE porches ADD COLUMN has_band_in_mind VARCHAR(10);
ALTER TABLE porches ADD COLUMN music_preferences TEXT;
ALTER TABLE porches ADD COLUMN band_count_preference TEXT;
ALTER TABLE porches ADD COLUMN rain_date_available VARCHAR(10);
ALTER TABLE porches ADD COLUMN comments TEXT;

-- Organizer configuration for porch application form
ALTER TABLE events ADD COLUMN porch_app_description TEXT;
ALTER TABLE events ADD COLUMN porch_app_photo_key VARCHAR(500);
