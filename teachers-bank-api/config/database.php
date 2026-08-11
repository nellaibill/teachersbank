<?php
// config/database.php

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'teachers_bank');

function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]);
        exit;
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

class CompatMysqliResult {
    private $rows = [];
    private $index = 0;
    public $num_rows = 0;

    public function __construct(array $rows) {
        $this->rows = array_values($rows);
        $this->num_rows = count($this->rows);
    }

    public function fetch_assoc() {
        if ($this->index >= $this->num_rows) {
            return null;
        }

        $row = $this->rows[$this->index];
        $this->index++;
        return $row;
    }

    public function fetch_all($mode = MYSQLI_ASSOC) {
        return $this->rows;
    }
}

function stmt_get_result($stmt) {
    if (method_exists($stmt, 'get_result')) {
        $result = @$stmt->get_result();
        if ($result !== false) {
            return $result;
        }
    }

    $meta = $stmt->result_metadata();
    if (!$meta) {
        return new CompatMysqliResult([]);
    }

    $row = [];
    $fields = [];
    $bind = [];

    while ($field = $meta->fetch_field()) {
        $fields[] = $field->name;
        $row[$field->name] = null;
        $bind[] = &$row[$field->name];
    }

    if (!empty($bind)) {
        call_user_func_array([$stmt, 'bind_result'], $bind);
    }

    $rows = [];
    while ($stmt->fetch()) {
        $copy = [];
        foreach ($fields as $name) {
            $copy[$name] = $row[$name];
        }
        $rows[] = $copy;
    }

    if (method_exists($meta, 'free')) {
        $meta->free();
    }

    return new CompatMysqliResult($rows);
}
