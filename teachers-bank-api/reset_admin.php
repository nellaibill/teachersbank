<?php
// reset_admin.php
// ⚠️  Run this file ONCE in your browser to fix the admin password
// Then DELETE this file immediately after running it!
// URL: https://iiplrgscbse.com/teachers-bank-api/reset_admin.php

require_once __DIR__ . '/config/database.php';

$email    = 'admin@teachersbank.com';
$name     = 'Administrator';
$password = 'Admin@123';
$hash     = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
$role     = 'admin';

$conn = getDBConnection();

// Check if user exists
$stmt = $conn->prepare('SELECT id FROM users WHERE email = ?');
$stmt->bind_param('s', $email);
$stmt->execute();
$existing = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($existing) {
    // Update existing user's password
    $stmt = $conn->prepare('UPDATE users SET password = ?, name = ?, role = ?, isActive = 1 WHERE email = ?');
    $stmt->bind_param('ssss', $hash, $name, $role, $email);
    $stmt->execute();
    $stmt->close();
    $action = 'updated';
} else {
    // Insert fresh admin user
    $stmt = $conn->prepare('INSERT INTO users (name, email, password, role, isActive) VALUES (?, ?, ?, ?, 1)');
    $stmt->bind_param('ssss', $name, $email, $hash, $role);
    $stmt->execute();
    $stmt->close();
    $action = 'created';
}

$conn->close();

// Verify the hash works
$verify = password_verify($password, $hash);

echo json_encode([
    'success'  => true,
    'action'   => $action,
    'email'    => $email,
    'password' => $password,
    'hash_ok'  => $verify,
    'message'  => "Admin user $action successfully. DELETE this file now!",
]);
?>