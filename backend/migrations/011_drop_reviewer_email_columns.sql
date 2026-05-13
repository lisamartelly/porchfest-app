-- Remove legacy email-based reviewer columns.
-- Reviewer assignments now use only bands.assigned_reviewer_id (FK to users).
ALTER TABLE events DROP COLUMN IF EXISTS reviewer_emails;
ALTER TABLE events DROP COLUMN IF EXISTS reviewers_assigned;
ALTER TABLE bands DROP COLUMN IF EXISTS assigned_reviewer_email;
