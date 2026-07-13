-- Add schedule_status to bands and porches for tracking scheduling workflow.
-- Values: 'needs_attention', 'in_progress', 'finalized'
-- NULL means band is not yet scheduled (or porch has no status set).

ALTER TABLE bands
  ADD COLUMN schedule_status TEXT
  CHECK (schedule_status IN ('needs_attention', 'in_progress', 'finalized'));

ALTER TABLE porches
  ADD COLUMN schedule_status TEXT
  CHECK (schedule_status IN ('needs_attention', 'in_progress', 'finalized'));

-- Backfill: any band that already has a schedule gets 'needs_attention'
UPDATE bands
  SET schedule_status = 'needs_attention'
  WHERE assigned_porch_id IS NOT NULL
    AND set_start_time IS NOT NULL
    AND set_end_time IS NOT NULL;
