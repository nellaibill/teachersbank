-- Ensure teacher classification data exists for reports, follow-ups, and label generation
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS classifications LONGTEXT NULL AFTER medium;
