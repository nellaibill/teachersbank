-- ============================================================
-- Migration V9: Add created_by / updated_by audit fields
-- Tracks which user created or last updated each record.
-- Values are populated from the JWT 'name' claim at write time.
-- ============================================================

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(150) NULL AFTER updated_at,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(150) NULL AFTER created_by;

ALTER TABLE dispatch
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(150) NULL AFTER updated_at,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(150) NULL AFTER created_by;

ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(150) NULL AFTER updated_at,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(150) NULL AFTER created_by;
