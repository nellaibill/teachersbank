-- ============================================================
-- Migration V6: Add PO Date to Dispatch Table
-- ============================================================
-- Description: Add po_date column to dispatch table
-- This allows tracking:
--   - po_number: Purchase Order number
--   - po_date: Date of the Purchase Order
--   - dispatch_date: When materials were sent
--   - delivered_date: When teacher received materials
--   - pod_date: When proof of delivery was officially received
-- ============================================================

-- Add po_date column to dispatch table
ALTER TABLE dispatch ADD COLUMN po_date DATE NULL AFTER po_number;

-- Add indexes for faster queries
CREATE INDEX idx_po_date ON dispatch(po_date);
CREATE INDEX idx_po_number ON dispatch(po_number);

-- ============================================================
-- Schema after migration:
-- ============================================================
-- dispatch table now has:
--   id, teacher_id, dispatch_date, delivered_date, pod_date, status, 
--   po_number, po_date, created_at, updated_at
-- ============================================================
