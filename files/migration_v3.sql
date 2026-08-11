-- ============================================================
-- Migration v3: remarks on teachers + po_number on dispatch
-- Run on teachers_bank database
-- ============================================================

-- 1. Add remarks column to teachers table (optional, nullable)
ALTER TABLE teachers
    ADD COLUMN remarks TEXT NULL AFTER school_type;

-- 2. Add po_number column to dispatch table (optional, nullable)
ALTER TABLE dispatch
    ADD COLUMN po_number VARCHAR(100) NULL AFTER status;
