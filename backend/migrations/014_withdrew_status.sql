-- Add a "withdrew" application status for bands and porches.

-- Up Migration

ALTER TABLE bands DROP CONSTRAINT IF EXISTS bands_status_check;
ALTER TABLE bands ADD CONSTRAINT bands_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrew'));

ALTER TABLE porches DROP CONSTRAINT IF EXISTS porches_status_check;
ALTER TABLE porches ADD CONSTRAINT porches_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrew'));

-- Down Migration

ALTER TABLE bands DROP CONSTRAINT IF EXISTS bands_status_check;
ALTER TABLE bands ADD CONSTRAINT bands_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'));

ALTER TABLE porches DROP CONSTRAINT IF EXISTS porches_status_check;
ALTER TABLE porches ADD CONSTRAINT porches_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'));
