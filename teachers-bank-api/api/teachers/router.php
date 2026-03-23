<?php
// api/teachers/router.php
// CHANGES: remarks field added to createTeacher() and updateTeacher()

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

define('SUBJECT_STANDARD_MAP', [
    'TAM' => ['6','7','8','9','10','11','12'],
    'ENG' => ['6','7','8','9','10','11','12'],
    'MAT' => ['6','7','8','9','10','11','12'],
    'SCI' => ['6','7','8','9','10'],
    'SS'  => ['6','7','8','9','10'],
    'PHY' => ['11','12'],
    'CHE' => ['11','12'],
    'BIO' => ['11','12'],
    'BOT' => ['11','12'],
    'ZOO' => ['11','12'],
    'CS'  => ['11','12'],
    'CA'  => ['11','12'],
    'BM'  => ['11','12'],
    'ECO' => ['11','12'],
    'COM' => ['11','12'],
    'ACC' => ['11','12'],
    'HIS' => ['11','12'],
]);

define('STANDARDS', ['6','7','8','9','10','11','12']);
define('MEDIUMS', ['TM' => 'Tamil Medium', 'EM' => 'English Medium']);
define('SCHOOL_TYPES', ['Govt. School','Govt. Aided School','Matriculation School','Corporation School','CBSE School']);

function normaliseCsv($value, array $allowed): string {
    $items = is_array($value) ? $value : array_map('trim', explode(',', (string)$value));
    return implode(',', array_unique(array_filter($items, fn($v) => in_array($v, $allowed, true))));
}

function validatePincode($pin): bool {
    return preg_match('/^\d{6}$/', (string)$pin) === 1;
}

function parseClassificationEntries($value): array {
    if (is_string($value) && trim($value) !== '') {
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $value = $decoded;
        } else {
            $entries = [];
            foreach (explode(';', $value) as $rawEntry) {
                $rawEntry = trim($rawEntry);
                if ($rawEntry === '') continue;

                [$std, $medium, $subjectsRaw] = array_pad(array_map('trim', explode('|', $rawEntry, 3)), 3, '');
                $subjects = array_values(array_unique(array_filter(array_map(
                    'trim',
                    explode(',', $subjectsRaw)
                ), fn($subject) => array_key_exists($subject, SUBJECTS))));

                if (!in_array($std, STANDARDS, true) || !array_key_exists($medium, MEDIUMS) || empty($subjects)) continue;

                $subjects = array_values(array_filter($subjects, fn($subject) => in_array($std, SUBJECT_STANDARD_MAP[$subject] ?? STANDARDS, true)));
                if (empty($subjects)) continue;

                $entries[] = [
                    'std' => $std,
                    'medium' => $medium,
                    'subjects' => $subjects,
                ];
            }

            return $entries;
        }
    }

    if (!is_array($value)) return [];

    $entries = [];
    foreach ($value as $entry) {
        if (!is_array($entry)) continue;

        $std = trim((string)($entry['std'] ?? ''));
        $medium = trim((string)($entry['medium'] ?? ''));
        $subjects = $entry['subjects'] ?? [];
        if (!is_array($subjects)) $subjects = explode(',', (string)$subjects);

        $subjects = array_values(array_unique(array_filter(array_map(
            fn($subject) => trim((string)$subject),
            $subjects
        ), fn($subject) => array_key_exists($subject, SUBJECTS))));

        if (!in_array($std, STANDARDS, true) || !array_key_exists($medium, MEDIUMS) || empty($subjects)) continue;

        $allowedSubjects = SUBJECT_STANDARD_MAP;
        $subjects = array_values(array_filter($subjects, fn($subject) => in_array($std, $allowedSubjects[$subject] ?? STANDARDS, true)));
        if (empty($subjects)) continue;

        $entries[] = [
            'std' => $std,
            'medium' => $medium,
            'subjects' => $subjects,
        ];
    }

    return $entries;
}

function deriveLegacyClassifications(array $body): array {
    $subs = is_array($body['sub_code'] ?? null) ? $body['sub_code'] : array_map('trim', explode(',', (string)($body['sub_code'] ?? '')));
    $stds = is_array($body['std'] ?? null) ? $body['std'] : array_map('trim', explode(',', (string)($body['std'] ?? '')));
    $meds = is_array($body['medium'] ?? null) ? $body['medium'] : array_map('trim', explode(',', (string)($body['medium'] ?? '')));

    $subs = array_values(array_filter($subs, fn($subject) => array_key_exists($subject, SUBJECTS)));
    $stds = array_values(array_filter($stds, fn($std) => in_array($std, STANDARDS, true)));
    $meds = array_values(array_filter($meds, fn($medium) => array_key_exists($medium, MEDIUMS)));

    $entries = [];
    foreach ($stds as $std) {
        $validSubjects = array_values(array_filter($subs, fn($subject) => in_array($std, SUBJECT_STANDARD_MAP[$subject] ?? STANDARDS, true)));
        if (empty($validSubjects)) continue;

        foreach ($meds as $medium) {
            $entries[] = [
                'std' => $std,
                'medium' => $medium,
                'subjects' => $validSubjects,
            ];
        }
    }

    return $entries;
}

function getTeacherClassificationsFromBody(array $body): array {
    $entries = parseClassificationEntries($body['classification_map'] ?? ($body['classifications'] ?? null));
    if (!empty($entries)) return $entries;
    return deriveLegacyClassifications($body);
}

function flattenClassifications(array $entries): array {
    $subjects = [];
    $standards = [];
    $mediums = [];

    foreach ($entries as $entry) {
        $standards[] = $entry['std'];
        $mediums[] = $entry['medium'];
        foreach ($entry['subjects'] as $subject) $subjects[] = $subject;
    }

    $classificationMap = implode(';', array_map(
        fn($entry) => $entry['std'] . '|' . $entry['medium'] . '|' . implode(',', array_values(array_unique($entry['subjects']))),
        array_values($entries)
    ));

    return [
        'sub_code' => implode(',', array_values(array_unique($subjects))),
        'std' => implode(',', array_values(array_unique($standards))),
        'medium' => implode(',', array_values(array_unique($mediums))),
        'classifications' => $classificationMap,
    ];
}

function expandTeacher(array $teacher): array {
    $teacher['sub_code_arr'] = $teacher['sub_code'] ? explode(',', $teacher['sub_code']) : [];
    $teacher['std_arr'] = $teacher['std'] ? explode(',', $teacher['std']) : [];
    $teacher['medium_arr'] = $teacher['medium'] ? explode(',', $teacher['medium']) : [];

    $classifications = parseClassificationEntries($teacher['classifications'] ?? null);
    if (empty($classifications) && !empty($teacher['std_arr']) && !empty($teacher['medium_arr']) && !empty($teacher['sub_code_arr'])) {
        $classifications = deriveLegacyClassifications($teacher);
    }

    $teacher['classifications'] = $classifications;
    $teacher['classification_map'] = flattenClassifications($classifications)['classifications'];
    return $teacher;
}

function validateTeacher(array $body): array {
    $errors = [];

    if (empty(trim($body['teacher_name'] ?? ''))) $errors[] = 'Teacher name is required';
    if (empty(trim($body['contact_number'] ?? ''))) $errors[] = 'Contact number is required';
    if (empty(trim($body['teacher_address'] ?? ''))) $errors[] = 'Teacher address is required';

    if (empty(trim($body['pincode'] ?? ''))) {
        $errors[] = 'Pincode is required';
    } elseif (!validatePincode($body['pincode'])) {
        $errors[] = 'Pincode must be exactly 6 numeric digits';
    }

    if (empty($body['dt_code']) || !array_key_exists($body['dt_code'], DISTRICTS)) $errors[] = 'District is required';
    if (empty(trim($body['school_name'] ?? ''))) $errors[] = 'School name is required';
    if (empty($body['school_type']) || !in_array($body['school_type'], SCHOOL_TYPES, true)) $errors[] = 'School type is required';
    if (empty(getTeacherClassificationsFromBody($body))) $errors[] = 'At least one valid classification row is required';

    return $errors;
}

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

function getTeachers() {
    $conn = getDBConnection();
    $where = ['1=1'];
    $params = [];
    $types = '';

    if (!empty($_GET['search'])) {
        $search = '%' . $_GET['search'] . '%';
        $where[] = '(t.teacher_name LIKE ? OR t.contact_number LIKE ? OR t.school_name LIKE ? OR t.teacher_address LIKE ?)';
        $params = array_merge($params, [$search, $search, $search, $search]);
        $types .= 'ssss';
    }
    if (!empty($_GET['dt_code']))    { $where[] = 't.dt_code = ?';            $params[] = $_GET['dt_code'];     $types .= 's'; }
    if (!empty($_GET['sub_code']))   { $where[] = 'FIND_IN_SET(?, t.sub_code)'; $params[] = $_GET['sub_code'];  $types .= 's'; }
    if (!empty($_GET['std']))        { $where[] = 'FIND_IN_SET(?, t.std)';      $params[] = $_GET['std'];       $types .= 's'; }
    if (!empty($_GET['medium']))     { $where[] = 'FIND_IN_SET(?, t.medium)';   $params[] = $_GET['medium'];    $types .= 's'; }
    if (!empty($_GET['school_type'])){ $where[] = 't.school_type = ?';          $params[] = $_GET['school_type']; $types .= 's'; }
    if (isset($_GET['isActive']))    { $where[] = 't.isActive = ?';             $params[] = (int)$_GET['isActive']; $types .= 'i'; }

    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
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
    sendSuccess(['teachers' => $teachers, 'pagination' => ['total' => (int)$total, 'page' => $page, 'limit' => $limit, 'total_pages' => (int)ceil($total / $limit)]]);
}

function createTeacher() {
    $body = getRequestBody();
    $errors = validateTeacher($body);
    if ($errors) sendError('Validation failed', 422, $errors);

    $conn = getDBConnection();
    $classifications = getTeacherClassificationsFromBody($body);
    $flattened = flattenClassifications($classifications);

    $teacher_name = sanitize($body['teacher_name']);
    $contact_number = sanitize($body['contact_number']);
    $teacher_address = sanitize($body['teacher_address']);
    $pincode = $body['pincode'];
    $dt_code = $body['dt_code'];
    $school_name = sanitize($body['school_name']);
    $school_type = $body['school_type'];
    $remarks = !empty($body['remarks']) ? sanitize($body['remarks']) : null;

    $stmt = $conn->prepare("
        INSERT INTO teachers
            (teacher_name, contact_number, teacher_address, pincode,
             dt_code, sub_code, std, medium, classifications, school_name, school_type, remarks, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ");
    $stmt->bind_param(
        'ssssssssssss',
        $teacher_name, $contact_number, $teacher_address, $pincode,
        $dt_code, $flattened['sub_code'], $flattened['std'], $flattened['medium'], $flattened['classifications'],
        $school_name, $school_type, $remarks
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

function getTeacher($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $teacher = $stmt->get_result()->fetch_assoc();
    if (!$teacher) sendError('Teacher not found', 404);
    $teacher = expandTeacher($teacher);

    $dispatchStmt = $conn->prepare("
        SELECT d.*, (SELECT COUNT(*) FROM followups f WHERE f.dispatch_id = d.id) AS followup_count
        FROM dispatch d WHERE d.teacher_id = ? ORDER BY d.dispatch_date DESC
    ");
    $dispatchStmt->bind_param('i', $id);
    $dispatchStmt->execute();
    $dispatches = [];
    $result = $dispatchStmt->get_result();
    while ($row = $result->fetch_assoc()) $dispatches[] = $row;

    $conn->close();
    sendSuccess(array_merge($teacher, ['dispatches' => $dispatches]));
}

function updateTeacher($id) {
    $body = getRequestBody();
    $conn = getDBConnection();

    $checkStmt = $conn->prepare("SELECT id FROM teachers WHERE id = ?");
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    if (!$checkStmt->get_result()->fetch_assoc()) sendError('Teacher not found', 404);

    $errors = validateTeacher($body);
    if ($errors) sendError('Validation failed', 422, $errors);

    $classifications = getTeacherClassificationsFromBody($body);
    $flattened = flattenClassifications($classifications);

    $teacher_name = sanitize($body['teacher_name']);
    $contact_number = sanitize($body['contact_number']);
    $teacher_address = sanitize($body['teacher_address']);
    $pincode = $body['pincode'];
    $dt_code = $body['dt_code'];
    $school_name = sanitize($body['school_name']);
    $school_type = $body['school_type'];
    $isActive = isset($body['isActive']) ? (int)$body['isActive'] : 1;
    $remarks = array_key_exists('remarks', $body)
        ? (empty($body['remarks']) ? null : sanitize($body['remarks']))
        : null;

    $stmt = $conn->prepare("
        UPDATE teachers SET
            teacher_name=?, contact_number=?, teacher_address=?, pincode=?,
            dt_code=?, sub_code=?, std=?, medium=?, classifications=?,
            school_name=?, school_type=?, remarks=?, isActive=?
        WHERE id=?
    ");
    $stmt->bind_param(
        'ssssssssssssii',
        $teacher_name, $contact_number, $teacher_address, $pincode,
        $dt_code, $flattened['sub_code'], $flattened['std'], $flattened['medium'], $flattened['classifications'],
        $school_name, $school_type, $remarks, $isActive, $id
    );
    if (!$stmt->execute()) sendError('Failed to update teacher: ' . $stmt->error, 500);

    $sel = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $sel->bind_param('i', $id);
    $sel->execute();
    $teacher = expandTeacher($sel->get_result()->fetch_assoc());

    $conn->close();
    sendSuccess($teacher, 'Teacher updated successfully');
}

function deleteTeacher($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT id FROM teachers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) sendError('Teacher not found', 404);

    $stmt = $conn->prepare("UPDATE teachers SET isActive = 0 WHERE id = ?");
    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) sendError('Failed to deactivate teacher', 500);

    $conn->close();
    sendSuccess([], 'Teacher deactivated successfully');
}
