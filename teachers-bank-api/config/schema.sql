-- ============================================================
-- Teachers Bank Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS teachers_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE teachers_bank;

-- ============================================================
-- Teachers Table
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    address_1 VARCHAR(255),
    address_2 VARCHAR(255),
    address_3 VARCHAR(255),
    dt_code VARCHAR(10),
    sub_code VARCHAR(10),
    std VARCHAR(10),
    year_code VARCHAR(10),
    medium VARCHAR(5),
    school_name TEXT,
    school_type VARCHAR(50),
    barcode TEXT,
    isActive TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
