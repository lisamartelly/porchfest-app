-- Track whether an accepted band has confirmed their acceptance.
-- NULL = no response yet, TRUE = confirmed, FALSE = canceled.

-- Up Migration

ALTER TABLE bands ADD COLUMN IF NOT EXISTS acceptance_confirmed BOOLEAN;

-- Down Migration

ALTER TABLE bands DROP COLUMN IF EXISTS acceptance_confirmed;
