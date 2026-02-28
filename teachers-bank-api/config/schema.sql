-- ============================================================
-- Teachers Bank Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS teachers_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE teachers_bank;

-- ============================================================
-- Teachers Table
-- ============================================================
CREATE TABLE teachers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  teacher_name    VARCHAR(150)  NOT NULL,
  contact_number  VARCHAR(15)   NOT NULL,
  teacher_address TEXT,                    -- combined (was address_1 + address_2)
  pincode         CHAR(6),                 -- exactly 6 digits (was address_3)
  dt_code         VARCHAR(10),             -- single value: "ARL"
  sub_code        VARCHAR(255),            -- CSV multi: "MAT,SCI,PHY"
  std             VARCHAR(100),            -- CSV multi: "6,7,8,9"
  medium          VARCHAR(50),             -- CSV multi: "TM,EM"
  school_name     TEXT,
  school_type     VARCHAR(50),             -- includes CBSE School now
  barcode         TEXT,
  isActive        TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Dispatch Table
-- ============================================================
CREATE TABLE IF NOT EXISTS dispatch (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    dispatch_date DATE,
    pod_date DATE,
    status VARCHAR(50) DEFAULT 'Dispatched',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- Unique constraint to prevent same-day duplicate dispatch
ALTER TABLE dispatch ADD UNIQUE KEY unique_teacher_dispatch_date (teacher_id, dispatch_date);

-- ============================================================
-- Follow-ups Table
-- ============================================================
CREATE TABLE IF NOT EXISTS followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dispatch_id INT NOT NULL,
    followup_level INT NOT NULL DEFAULT 1,
    reminder_date DATE,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dispatch_id) REFERENCES dispatch(id)
);

-- ============================================================
-- Users Table (for authentication)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    role ENUM('admin', 'user') DEFAULT 'user',
    isActive TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default admin user (password: admin123)
INSERT INTO users (username, password, full_name, role) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin');
