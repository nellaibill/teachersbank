<?php
// api/teachers/router.php
// Called by /index.php with $method and $id already set

// ─── Dispatch by method + id ──────────────────────────────────────────────────
if ($id) {
    switch ($method) {
        case 'GET':    getTeacher($id);    break;
        case 'PUT':    updateTeacher($id); break;
        case 'DELETE': deleteTeacher($id); break;
        default: sendError('Method not allowed', 405);
    }
} else {
    switch ($method) {
        case 'GET':  getTeachers();   break;
        case 'POST': createTeacher(); break;
        default: sendError('Method not allowed', 405);
    }
}

// ─── GET /api/teachers ────────────────────────────────────────────────────────
function getTeachers() {
    $conn   = getDBConnection();
    $where  = ['1=1'];
    $params = [];
    $types  = '';

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

    $page   = max(1, (int)($_GET['page']  ?? 1));
    $limit  = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $whereSQL = implode(' AND ', $where);

    $countSQL = "SELECT COUNT(*) AS total FROM teachers t WHERE $whereSQL";
    $stmt = $conn->prepare($countSQL);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    $dataSQL   = "SELECT t.* FROM teachers t WHERE $whereSQL ORDER BY t.id DESC LIMIT ? OFFSET ?";
    $stmt      = $conn->prepare($dataSQL);
    $allTypes  = $types . 'ii';
    $allParams = array_merge($params, [$limit, $offset]);
    $stmt->bind_param($allTypes, ...$allParams);
    $stmt->execute();
    $result    = $stmt->get_result();

    $teachers = [];
    while ($row = $result->fetch_assoc()) $teachers[] = $row;

    $conn->close();
    sendSuccess([
        'teachers'   => $teachers,
        'pagination' => [
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

    $teacher_name   = $body['teacher_name'];
    $contact_number = $body['contact_number'];
    $address_1      = $body['address_1']   ?? null;
    $address_2      = $body['address_2']   ?? null;
    $address_3      = $body['address_3']   ?? null;
    $dt_code        = $body['dt_code']     ?? null;
    $sub_code       = $body['sub_code']    ?? null;
    $std            = $body['std']         ?? null;
    $year_code      = $body['year_code']   ?? null;
    $medium         = $body['medium']      ?? null;
    $school_name    = $body['school_name'] ?? null;
    $school_type    = $body['school_type'] ?? null;

    $stmt->bind_param(
        'ssssssssssss',
        $teacher_name, $contact_number,
        $address_1, $address_2, $address_3,
        $dt_code, $sub_code, $std, $year_code, $medium,
        $school_name, $school_type
    );

    if (!$stmt->execute()) sendError('Failed to create teacher: ' . $stmt->error, 500);

    $teacherId   = $conn->insert_id;
    $teacherData = array_merge($body, ['id' => $teacherId]);
    $barcode     = generateBarcode($teacherData);

    $upd = $conn->prepare("UPDATE teachers SET barcode = ? WHERE id = ?");
    $upd->bind_param('si', $barcode, $teacherId);
    $upd->execute();

    $sel = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $sel->bind_param('i', $teacherId);
    $sel->execute();
    $teacher = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess($teacher, 'Teacher created successfully');
}

// ─── GET /api/teachers/{id} ───────────────────────────────────────────────────
function getTeacher($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $teacher = $stmt->get_result()->fetch_assoc();
    if (!$teacher) sendError('Teacher not found', 404);

    $dStmt = $conn->prepare("
        SELECT d.*,
               (SELECT COUNT(*) FROM followups f WHERE f.dispatch_id = d.id) AS followup_count
        FROM dispatch d WHERE d.teacher_id = ? ORDER BY d.dispatch_date DESC
    ");
    $dStmt->bind_param('i', $id);
    $dStmt->execute();
    $dispatches = [];
    $res = $dStmt->get_result();
    while ($row = $res->fetch_assoc()) $dispatches[] = $row;

    $conn->close();
    sendSuccess(array_merge($teacher, ['dispatches' => $dispatches]));
}

// ─── PUT /api/teachers/{id} ───────────────────────────────────────────────────
function updateTeacher($id) {
    $body = getRequestBody();
    $conn = getDBConnection();

    $chk = $conn->prepare("SELECT id FROM teachers WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) sendError('Teacher not found', 404);

    $errors = validateRequired($body, ['teacher_name', 'contact_number']);
    if ($errors) sendError('Validation failed', 422, $errors);

    $teacher_name   = $body['teacher_name'];
    $contact_number = $body['contact_number'];
    $address_1      = $body['address_1']   ?? null;
    $address_2      = $body['address_2']   ?? null;
    $address_3      = $body['address_3']   ?? null;
    $dt_code        = $body['dt_code']     ?? null;
    $sub_code       = $body['sub_code']    ?? null;
    $std            = $body['std']         ?? null;
    $year_code      = $body['year_code']   ?? null;
    $medium         = $body['medium']      ?? null;
    $school_name    = $body['school_name'] ?? null;
    $school_type    = $body['school_type'] ?? null;
    $isActive       = isset($body['isActive']) ? (int)$body['isActive'] : 1;

    $stmt = $conn->prepare("
        UPDATE teachers SET
            teacher_name=?, contact_number=?,
            address_1=?, address_2=?, address_3=?,
            dt_code=?, sub_code=?, std=?, year_code=?, medium=?,
            school_name=?, school_type=?, isActive=?
        WHERE id=?
    ");
    $stmt->bind_param(
        'sssssssssssiii',
        $teacher_name, $contact_number,
        $address_1, $address_2, $address_3,
        $dt_code, $sub_code, $std, $year_code, $medium,
        $school_name, $school_type, $isActive, $id
    );

    if (!$stmt->execute()) sendError('Failed to update teacher: ' . $stmt->error, 500);

    $sel = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $sel->bind_param('i', $id);
    $sel->execute();
    $teacher = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess($teacher, 'Teacher updated successfully');
}

// ─── DELETE /api/teachers/{id} ────────────────────────────────────────────────
function deleteTeacher($id) {
    $conn = getDBConnection();
    $chk  = $conn->prepare("SELECT id FROM teachers WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) sendError('Teacher not found', 404);

    $stmt = $conn->prepare("UPDATE teachers SET isActive = 0 WHERE id = ?");
    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) sendError('Failed to deactivate teacher', 500);

    $conn->close();
    sendSuccess([], 'Teacher deactivated successfully');
}
