<?php
// api/teachers/index.php
// Handles: GET /api/teachers (list), POST /api/teachers (create)

require_once '../../config/database.php';
require_once '../../middleware/cors.php';
require_once '../../middleware/barcode.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getTeachers();
        break;
    case 'POST':
        createTeacher();
        break;
    default:
        sendError('Method not allowed', 405);
}

// ─── GET /api/teachers ────────────────────────────────────────────────────────
function getTeachers() {
    $conn = getDBConnection();

    // Build dynamic WHERE clause from query params
    $where    = ['1=1'];
    $params   = [];
    $types    = '';

    if (!empty($_GET['search'])) {
        $where[]  = '(t.teacher_name LIKE ? OR t.contact_number LIKE ? OR t.school_name LIKE ?)';
        $s        = '%' . $_GET['search'] . '%';
        $params   = array_merge($params, [$s, $s, $s]);
        $types   .= 'sss';
    }
    if (!empty($_GET['dt_code'])) {
        $where[]  = 't.dt_code = ?';
        $params[] = $_GET['dt_code'];
        $types   .= 's';
    }
    if (!empty($_GET['sub_code'])) {
        $where[]  = 't.sub_code = ?';
        $params[] = $_GET['sub_code'];
        $types   .= 's';
    }
    if (!empty($_GET['std'])) {
        $where[]  = 't.std = ?';
        $params[] = $_GET['std'];
        $types   .= 's';
    }
    if (!empty($_GET['medium'])) {
        $where[]  = 't.medium = ?';
        $params[] = $_GET['medium'];
        $types   .= 's';
    }
    if (!empty($_GET['school_type'])) {
        $where[]  = 't.school_type = ?';
        $params[] = $_GET['school_type'];
        $types   .= 's';
    }
    if (isset($_GET['isActive'])) {
        $where[]  = 't.isActive = ?';
        $params[] = (int)$_GET['isActive'];
        $types   .= 'i';
    }

    // Pagination
    $page  = max(1, (int)($_GET['page']  ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $whereSQL = implode(' AND ', $where);

    // Count
    $countSQL = "SELECT COUNT(*) AS total FROM teachers t WHERE $whereSQL";
    $stmt = $conn->prepare($countSQL);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    // Data
    $dataSQL  = "SELECT t.* FROM teachers t WHERE $whereSQL ORDER BY t.id DESC LIMIT ? OFFSET ?";
    $stmt     = $conn->prepare($dataSQL);
    $allTypes = $types . 'ii';
    $allParams = array_merge($params, [$limit, $offset]);
    $stmt->bind_param($allTypes, ...$allParams);
    $stmt->execute();
    $result = $stmt->get_result();

    $teachers = [];
    while ($row = $result->fetch_assoc()) {
        $teachers[] = $row;
    }

    $conn->close();

    sendSuccess([
        'teachers'    => $teachers,
        'pagination'  => [
            'total'       => (int)$total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ]
    ]);
}

// ─── POST /api/teachers ───────────────────────────────────────────────────────
function createTeacher() {
    $body   = getRequestBody();
    $errors = validateRequired($body, ['teacher_name', 'contact_number']);
    if ($errors) sendError('Validation failed', 422, $errors);

    $conn = getDBConnection();

    $stmt = $conn->prepare("
        INSERT INTO teachers 
            (teacher_name, contact_number, address_1, address_2, address_3,
             dt_code, sub_code, std, year_code, medium, school_name, school_type, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ");

    $stmt->bind_param(
        'ssssssssssss',
        $body['teacher_name'],
        $body['contact_number'],
        $body['address_1']   ?? null,
        $body['address_2']   ?? null,
        $body['address_3']   ?? null,
        $body['dt_code']     ?? null,
        $body['sub_code']    ?? null,
        $body['std']         ?? null,
        $body['year_code']   ?? null,
        $body['medium']      ?? null,
        $body['school_name'] ?? null,
        $body['school_type'] ?? null
    );

    if (!$stmt->execute()) {
        sendError('Failed to create teacher: ' . $stmt->error, 500);
    }

    $teacherId = $conn->insert_id;

    // Generate barcode
    $teacherData = array_merge($body, ['id' => $teacherId]);
    $barcode     = generateBarcode($teacherData);

    // Update barcode
    $upd = $conn->prepare("UPDATE teachers SET barcode = ? WHERE id = ?");
    $upd->bind_param('si', $barcode, $teacherId);
    $upd->execute();

    // Fetch the newly created teacher
    $sel    = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $sel->bind_param('i', $teacherId);
    $sel->execute();
    $teacher = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess($teacher, 'Teacher created successfully');
}
