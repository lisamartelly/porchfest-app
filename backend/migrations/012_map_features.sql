-- Up Migration: Map features - sound management fields, event default location, map publish toggle

-- Porch sound management fields
ALTER TABLE porches ADD COLUMN sound_radius_meters INTEGER DEFAULT 50;
ALTER TABLE porches ADD COLUMN sound_direction_degrees INTEGER;
ALTER TABLE porches ADD COLUMN sound_cone_width_degrees INTEGER DEFAULT 360;

-- Event default location (appended to freetext addresses for geocoding accuracy)
ALTER TABLE events ADD COLUMN default_city VARCHAR(100);
ALTER TABLE events ADD COLUMN default_state VARCHAR(50);

-- Public map toggle
ALTER TABLE events ADD COLUMN map_published BOOLEAN DEFAULT false;

-- Down Migration
ALTER TABLE porches DROP COLUMN IF EXISTS sound_radius_meters;
ALTER TABLE porches DROP COLUMN IF EXISTS sound_direction_degrees;
ALTER TABLE porches DROP COLUMN IF EXISTS sound_cone_width_degrees;
ALTER TABLE events DROP COLUMN IF EXISTS default_city;
ALTER TABLE events DROP COLUMN IF EXISTS default_state;
ALTER TABLE events DROP COLUMN IF EXISTS map_published;
