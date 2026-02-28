<?php
// reset_admin_password.php
$conn = new mysqli('localhost', 'root', '', 'teachers_bank');
if ($conn->connect_error) {
    echo 'DBERR:' . $conn->connect_error;
    exit(1);
}
$hash = password_hash('Admin@123', PASSWORD_BCRYPT);
$stmt = $conn->prepare('UPDATE users SET password = ? WHERE email = ?');
$email = 'admin@teachersbank.com';
if (!$stmt) {
    echo 'PREPERR: ' . $conn->error;
    exit(1);
}
$stmt->bind_param('ss', $hash, $email);
$stmt->execute();
echo 'UPDATED:' . $stmt->affected_rows;
$stmt->close();
$conn->close();
