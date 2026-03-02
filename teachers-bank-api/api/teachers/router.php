<?php
// api/teachers/router.php

// ── Master Data ───────────────────────────────────────────────────────────────
define('DISTRICTS', [
    'ALR' => 'Ariyalur',       'CGP' => 'Chengalpattu',   'CHN' => 'Chennai',
    'CBE' => 'Coimbatore',     'CUD' => 'Cuddalore',      'DPI' => 'Dharmapuri',
    'DGL' => 'Dindigul',       'ERD' => 'Erode',          'KLK' => 'Kallakurichi',
    'KPM' => 'Kanchipuram',    'KKI' => 'Kanyakumari',    'KRL' => 'Karaikal',
    'KRR' => 'Karur',          'KGI' => 'Krishnagiri',    'MDU' => 'Madurai',
    'MYD' => 'Mayiladuthurai', 'NPM' => 'Nagapattinam',   'NKL' => 'Namakkal',
    'NLG' => 'Nilgiris',       'PLR' => 'Perambalur',     'PDY' => 'Pondicherry',
    'PDK' => 'Pudukottai',     'RPM' => 'Ramanathapuram', 'RPT' => 'Ranipet',
    'SLM' => 'Salem',          'SGI' => 'Sivagangai',     'TJR' => 'Thanjavur',
    'TEN' => 'Tenkasi',        'TNI' => 'Theni',          'TVM' => 'Thiruvannamalai',
    'TUT' => 'Thoothukudi',    'TRY' => 'Tiruchirappalli','TVL' => 'Tirunelveli',
    'TPT' => 'Tirupathur',     'TPR' => 'Tiruppur',       'TLR' => 'Tiruvallur',
    'TVR' => 'Tiruvarur',      'VLR' => 'Vellore',        'VPM' => 'Villupuram',
    'VNR' => 'Virudhunagar',
]);

define('SUBJECTS', [
    'TAM' => 'Tamil',              'ENG' => 'English',          'MAT' => 'Maths',
    'SCI' => 'Science',            'SS'  => 'Social Science',   'PHY' => 'Physics',
    'CHE' => 'Chemistry',          'BIO' => 'Biology',          'BOT' => 'Botany',
    'ZOO' => 'Zoology',            'CS'  => 'Computer Science', 'CA'  => 'Computer Applications',
    'BM'  => 'Business Maths',     'ECO' => 'Economics',        'COM' => 'Commerce',
    'ACC' => 'Accountancy',        'HIS' => 'History',
]);

define('STANDARDS',    ['6','7','8','9','10','11','12']);
define('MEDIUMS',      ['TM' => 'Tamil Medium', 'EM' => 'English Medium']);
define('SCHOOL_TYPES', ['Govt. School','Govt. Aided School','Matriculation School','Corporation School','CBSE School']);

// ── Helpers ───────────────────────────────────────────────────────────────────
function normaliseCsv($value, array $allowed): string {
    $items = is_array($value) ? $value : array_map('trim', explode(',', (string)$value));
    return implode(',', array_unique(array_filter($items, fn($v) => in_array($v, $allowed))));
}

function validatePincode($pin): bool {
    return preg_match('/^\d{6}$/', (string)$pin) === 1;
}

function expandTeacher(array $t): array {
    $t['sub_code_arr'] = $t['sub_code'] ? explode(',', $t['sub_code']) : [];
    $t['std_arr']      = $t['std']      ? explode(',', $t['std'])      : [];
    $t['medium_arr']   = $t['medium']   ? explode(',', $t['medium'])   : [];
    return $t;
}

// ── All fields mandatory validation ──────────────────────────────────────────
function validateTeacher(array $body, bool $isCreate = true): array {
    $errors = [];

    if (empty(trim($body['teacher_name']   ?? ''))) $errors[] = 'Teacher name is required';
    if (empty(trim($body['contact_number'] ?? ''))) $errors[] = 'Contact number is required';
    if (empty(trim($body['teacher_address']?? ''))) $errors[] = 'Teacher address is required';
    if (empty(trim($body['pincode']        ?? ''))) {
        $errors[] = 'Pincode is required';
    } elseif (!validatePincode($body['pincode'])) {
        $errors[] = 'Pincode must be exactly 6 numeric digits';
    }
    if (empty($body['dt_code']) || !array_key_exists($body['dt_code'], DISTRICTS)) {
        $errors[] = 'District is required';
    }

    // sub_code: at least one valid subject
    $subs = is_array($body['sub_code'] ?? null)
        ? $body['sub_code']
        : array_map('trim', explode(',', $body['sub_code'] ?? ''));
    if (empty(array_filter($subs, fn($s) => array_key_exists($s, SUBJECTS)))) {
        $errors[] = 'At least one subject is required';
    }

    // std: at least one valid standard
    $stds = is_array($body['std'] ?? null)
        ? $body['std']
        : array_map('trim', explode(',', $body['std'] ?? ''));
    if (empty(array_filter($stds, fn($s) => in_array($s, STANDARDS)))) {
        $errors[] = 'At least one standard is required';
    }

    // medium: at least one valid medium
    $meds = is_array($body['medium'] ?? null)
        ? $body['medium']
        : array_map('trim', explode(',', $body['medium'] ?? ''));
    if (empty(array_filter($meds, fn($m) => array_key_exists($m, MEDIUMS)))) {
        $errors[] = 'At least one medium is required';
    }

    if (empty(trim($body['school_name'] ?? ''))) $errors[] = 'School name is required';
    if (empty($body['school_type']) || !in_array($body['school_type'], SCHOOL_TYPES)) {
        $errors[] = 'School type is required';
    }

    return $errors;
}

// ── Route dispatch ────────────────────────────────────────────────────────────
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

// ── GET /api/teachers ─────────────────────────────────────────────────────────
function getTeachers() {
    $conn   = getDBConnection();
    $where  = ['1=1'];
    $params = [];
    $types  = '';

    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        $where[]  = '(t.teacher_name LIKE ? OR t.contact_number LIKE ? OR t.school_name LIKE ? OR t.teacher_address LIKE ?)';
        $params   = array_merge($params, [$s, $s, $s, $s]);
        $types   .= 'ssss';
    }
    if (!empty($_GET['dt_code'])) {
        $where[]  = 't.dt_code = ?';
        $params[] = $_GET['dt_code'];
        $types   .= 's';
    }
    if (!empty($_GET['sub_code'])) {
        $where[]  = 'FIND_IN_SET(?, t.sub_code)';
        $params[] = $_GET['sub_code'];
        $types   .= 's';
    }
    if (!empty($_GET['std'])) {
        $where[]  = 'FIND_IN_SET(?, t.std)';
        $params[] = $_GET['std'];
        $types   .= 's';
    }
    if (!empty($_GET['medium'])) {
        $where[]  = 'FIND_IN_SET(?, t.medium)';
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

    $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM teachers t WHERE $whereSQL");
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    $stmt = $conn->prepare("SELECT t.* FROM teachers t WHERE $whereSQL ORDER BY t.id DESC LIMIT ? OFFSET ?");
    $stmt->bind_param($types . 'ii', ...[...$params, $limit, $offset]);
    $stmt->execute();
    $result = $stmt->get_result();

    $teachers = [];
    while ($row = $result->fetch_assoc()) $teachers[] = expandTeacher($row);

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

// ── POST /api/teachers ────────────────────────────────────────────────────────
function createTeacher() {
    $body   = getRequestBody();
    $errors = validateTeacher($body, true);
    if ($errors) sendError('Validation failed', 422, $errors);

    $conn = getDBConnection();

    $teacher_name    = sanitize($body['teacher_name']);
    $contact_number  = sanitize($body['contact_number']);
    $teacher_address = sanitize($body['teacher_address']);
    $pincode         = $body['pincode'];
    $dt_code         = $body['dt_code'];
    $school_name     = sanitize($body['school_name']);
    $school_type     = $body['school_type'];
    $sub_code        = normaliseCsv($body['sub_code'] ?? [], array_keys(SUBJECTS));
    $std             = normaliseCsv($body['std']      ?? [], STANDARDS);
    $medium          = normaliseCsv($body['medium']   ?? [], array_keys(MEDIUMS));

    $stmt = $conn->prepare("
        INSERT INTO teachers
            (teacher_name, contact_number, teacher_address, pincode,
             dt_code, sub_code, std, medium, school_name, school_type, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ");
    $stmt->bind_param('ssssssssss',
        $teacher_name, $contact_number, $teacher_address, $pincode,
        $dt_code, $sub_code, $std, $medium, $school_name, $school_type
    );
    if (!$stmt->execute()) sendError('Failed to create teacher: ' . $stmt->error, 500);

    $teacherId = $conn->insert_id;
    $barcode = generateBarcode(['id' => $teacherId]);

    $upd = $conn->prepare("UPDATE teachers SET barcode = ? WHERE id = ?");
    $upd->bind_param('si', $barcode, $teacherId);
    $upd->execute();

    $sel = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $sel->bind_param('i', $teacherId);
    $sel->execute();
    $teacher = expandTeacher($sel->get_result()->fetch_assoc());

    $conn->close();
    sendSuccess($teacher, 'Teacher created successfully');
}

// ── GET /api/teachers/{id} ────────────────────────────────────────────────────
function getTeacher($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $teacher = $stmt->get_result()->fetch_assoc();
    if (!$teacher) sendError('Teacher not found', 404);
    $teacher = expandTeacher($teacher);

    $dStmt = $conn->prepare("
        SELECT d.*, (SELECT COUNT(*) FROM followups f WHERE f.dispatch_id = d.id) AS followup_count
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

// ── PUT /api/teachers/{id} ────────────────────────────────────────────────────
function updateTeacher($id) {
    $body   = getRequestBody();
    $conn   = getDBConnection();

    $chk = $conn->prepare("SELECT id FROM teachers WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) sendError('Teacher not found', 404);

    $errors = validateTeacher($body, false);
    if ($errors) sendError('Validation failed', 422, $errors);

    $teacher_name    = sanitize($body['teacher_name']);
    $contact_number  = sanitize($body['contact_number']);
    $teacher_address = sanitize($body['teacher_address']);
    $pincode         = $body['pincode'];
    $dt_code         = $body['dt_code'];
    $school_name     = sanitize($body['school_name']);
    $school_type     = $body['school_type'];
    $isActive        = isset($body['isActive']) ? (int)$body['isActive'] : 1;
    $sub_code        = normaliseCsv($body['sub_code'] ?? [], array_keys(SUBJECTS));
    $std             = normaliseCsv($body['std']      ?? [], STANDARDS);
    $medium          = normaliseCsv($body['medium']   ?? [], array_keys(MEDIUMS));

    $stmt = $conn->prepare("
        UPDATE teachers SET
            teacher_name=?, contact_number=?, teacher_address=?, pincode=?,
            dt_code=?, sub_code=?, std=?, medium=?,
            school_name=?, school_type=?, isActive=?
        WHERE id=?
    ");
    $stmt->bind_param('ssssssssssii',
        $teacher_name, $contact_number, $teacher_address, $pincode,
        $dt_code, $sub_code, $std, $medium,
        $school_name, $school_type, $isActive, $id
    );
    if (!$stmt->execute()) sendError('Failed to update teacher: ' . $stmt->error, 500);

    $sel = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $sel->bind_param('i', $id);
    $sel->execute();
    $teacher = expandTeacher($sel->get_result()->fetch_assoc());

    $conn->close();
    sendSuccess($teacher, 'Teacher updated successfully');
}

// ── DELETE /api/teachers/{id} ─────────────────────────────────────────────────
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