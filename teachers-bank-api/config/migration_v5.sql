-- ============================================================
-- Migration V5: Separate Delivered Date from POD Date
-- ============================================================
-- Description: Add delivered_date column to dispatch table
-- This allows tracking:
--   - dispatch_date: When materials were sent
--   - delivered_date: When teacher actually received materials
--   - pod_date: When proof of delivery was officially received
-- ============================================================

-- Add delivered_date column to dispatch table
ALTER TABLE dispatch ADD COLUMN delivered_date DATE NULL AFTER dispatch_date;

-- Add index for faster queries
CREATE INDEX idx_delivered_date ON dispatch(delivered_date);
CREATE INDEX idx_dispatch_status_delivered ON dispatch(status, delivered_date);

-- ============================================================
-- Schema after migration:
-- ============================================================
-- dispatch table now has:
--   id, teacher_id, dispatch_date, delivered_date, pod_date, status, created_at, updated_at
-- ============================================================
