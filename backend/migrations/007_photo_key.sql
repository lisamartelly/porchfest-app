-- Replace photo_filename + has_photo with photo_key (S3 object key)
ALTER TABLE bands ADD COLUMN photo_key VARCHAR(512);

-- Migrate existing filenames to photo_key (best-effort; they weren't real S3 keys)
UPDATE bands SET photo_key = photo_filename WHERE photo_filename IS NOT NULL;

ALTER TABLE bands DROP COLUMN photo_filename;
ALTER TABLE bands DROP COLUMN has_photo;
