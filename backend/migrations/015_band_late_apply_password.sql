ALTER TABLE events
  ADD COLUMN band_late_apply_password_hash VARCHAR(255),
  ADD COLUMN band_late_apply_enabled BOOLEAN DEFAULT false;
