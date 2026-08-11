-- Add manager role with view-only access support
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','operator','manager') NOT NULL DEFAULT 'operator';
