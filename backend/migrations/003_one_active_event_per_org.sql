-- Enforce one active event per organization

-- Up Migration

-- Fix any existing violations: keep only the most recent active event per org
UPDATE events e1
SET is_active = false
WHERE e1.is_active = true
  AND EXISTS (
    SELECT 1 FROM events e2
    WHERE e2.organization_id = e1.organization_id
      AND e2.is_active = true
      AND e2.id > e1.id
  );

-- Unique partial index: only one row per organization can have is_active = true
CREATE UNIQUE INDEX idx_events_one_active_per_org
  ON events (organization_id)
  WHERE is_active = true;

-- Down Migration

DROP INDEX IF EXISTS idx_events_one_active_per_org;
