-- ============================================================
-- Migration v4: grouped teacher classifications
-- Run on teachers_bank database
-- ============================================================

ALTER TABLE teachers
    ADD COLUMN classifications LONGTEXT NULL AFTER medium;
