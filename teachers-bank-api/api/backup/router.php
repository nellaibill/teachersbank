<?php
// api/backup/router.php

error_log('Backup router.php is being executed');

if ($method !== 'GET') {
    error_log('Backup endpoint: Method not allowed - ' . $method);
    sendError('Method not allowed', 405);
}

$conn = getDBConnection();
if (!$conn) {
    error_log('Backup endpoint: Database connection failed');
    sendError('Database connection failed', 500);
}

set_time_limit(0);

$timestamp = date('Ymd_His');
$filename = "teachers_bank_backup_{$timestamp}.sql";

// Set headers for download
header('Content-Type: application/sql; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Pragma: no-cache');
header('Expires: 0');
header('Cache-Control: no-cache, no-store, must-revalidate');

error_log('Backup endpoint: Headers set, starting SQL dump generation');

echo "-- Teachers Bank SQL Backup\n";
echo "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
echo "SET NAMES utf8mb4;\n";
echo "SET FOREIGN_KEY_CHECKS = 0;\n\n";

$tables = [];
$tablesResult = $conn->query('SHOW TABLES');
while ($tablesResult && ($row = $tablesResult->fetch_array(MYSQLI_NUM))) {
    $tables[] = $row[0];
}

foreach ($tables as $table) {
    $safeTable = '`' . str_replace('`', '``', $table) . '`';

    $createResult = $conn->query("SHOW CREATE TABLE $safeTable");
    $createRow = $createResult ? $createResult->fetch_assoc() : null;
    $createSql = $createRow['Create Table'] ?? null;

    if (!$createSql) {
        continue;
    }

    echo "-- ----------------------------\n";
    echo "-- Table structure for $table\n";
    echo "-- ----------------------------\n";
    echo "DROP TABLE IF EXISTS $safeTable;\n";
    echo $createSql . ";\n\n";

    $dataResult = $conn->query("SELECT * FROM $safeTable");
    if (!$dataResult || $dataResult->num_rows === 0) {
        continue;
    }

    echo "-- ----------------------------\n";
    echo "-- Records for $table\n";
    echo "-- ----------------------------\n";

    while ($record = $dataResult->fetch_assoc()) {
        $columns = [];
        $values = [];

        foreach ($record as $column => $value) {
            $columns[] = '`' . str_replace('`', '``', $column) . '`';
            if ($value === null) {
                $values[] = 'NULL';
            } else {
                $values[] = "'" . $conn->real_escape_string((string)$value) . "'";
            }
        }

        echo "INSERT INTO $safeTable (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ");\n";
    }

    echo "\n";
}

echo "SET FOREIGN_KEY_CHECKS = 1;\n";

$conn->close();
exit;
