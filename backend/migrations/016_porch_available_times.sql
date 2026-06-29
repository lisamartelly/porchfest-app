-- Porch available times: lightweight markers indicating when a porch
-- is available for a band. Used by the scheduler for visual slot tracking
-- and empty-slot counting. Completely decoupled from band scheduling.

CREATE TABLE porch_available_times (
  id         SERIAL PRIMARY KEY,
  porch_id   INTEGER NOT NULL REFERENCES porches(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT porch_available_times_valid_range CHECK (start_time < end_time)
);

CREATE INDEX idx_porch_available_times_porch ON porch_available_times(porch_id);
