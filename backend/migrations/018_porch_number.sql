ALTER TABLE porches ADD COLUMN porch_number INTEGER;

CREATE UNIQUE INDEX unique_porch_number_per_event
  ON porches (event_id, porch_number)
  WHERE porch_number IS NOT NULL;
