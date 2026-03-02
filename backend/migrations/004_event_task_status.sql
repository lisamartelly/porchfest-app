-- Add status column to event_tasks

-- Up Migration

ALTER TABLE event_tasks
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'to_do'
  CHECK (status IN ('to_do', 'in_progress', 'blocked', 'done'));

CREATE INDEX IF NOT EXISTS idx_event_tasks_status ON event_tasks(status);

-- Down Migration

DROP INDEX IF EXISTS idx_event_tasks_status;
ALTER TABLE event_tasks DROP COLUMN IF EXISTS status;
