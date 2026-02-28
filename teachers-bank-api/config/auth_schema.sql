-- Run this SQL on your database to add auth support
-- teachers_bank database

CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- bcrypt hashed
    role        ENUM('admin','operator') NOT NULL DEFAULT 'operator',
    isActive    TINYINT(1) NOT NULL DEFAULT 1,
    last_login  TIMESTAMP NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default admin user: admin@teachersbank.com / Admin@123
-- Password hash for "Admin@123"
INSERT INTO users (name, email, password, role) VALUES (
    'Administrator',
    'admin@teachersbank.com',
    '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin'
) ON DUPLICATE KEY UPDATE id=id;

-- NOTE: Change the default password immediately after first login!
