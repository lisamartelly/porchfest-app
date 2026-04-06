-- Add category column to event_tasks

-- Up Migration

ALTER TABLE event_tasks
  ADD COLUMN IF NOT EXISTS category VARCHAR(30)
  CHECK (category IN ('vendors', 'bands', 'porches', 'permits', 'volunteers', 'website', 'merch', 'misc'));

CREATE INDEX IF NOT EXISTS idx_event_tasks_category ON event_tasks(category);

-- Down Migration

DROP INDEX IF EXISTS idx_event_tasks_category;
ALTER TABLE event_tasks DROP COLUMN IF EXISTS category;
