<?php
// api/dispatch/index.php
// POST /api/dispatch        — Scan barcode and create dispatch
// GET  /api/dispatch        — List dispatches with filters
// PUT  /api/dispatch/{id}   — Update POD date / status

require_once '../../config/database.php';
require_once '../../middleware/cors.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id'] ?? 0);

switch ($method) {
    case 'GET':
        $id ? getDispatch($id) : listDispatches();
        break;
    case 'POST':
        scanAndDispatch();
        break;
    case 'PUT':
        if (!$id) sendError('Dispatch ID required', 400);
        updateDispatch($id);
        break;
    default:
        sendError('Method not allowed', 405);
}

// ─── POST /api/dispatch ───────────────────────────────────────────────────────
// Body: { "barcode": "ARL|EN6|X|EM|01|000001", "dispatch_date": "2026-02-27" }
function scanAndDispatch() {
    $body = getRequestBody();

    if (empty($body['barcode'])) sendError('Barcode is required', 400);

    $conn         = getDBConnection();
    $barcode      = trim($body['barcode']);
    $dispatchDate = $body['dispatch_date'] ?? date('Y-m-d');

    // 1. Find teacher by barcode
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE barcode = ? AND isActive = 1");
    $stmt->bind_param('s', $barcode);
    $stmt->execute();
    $teacher = $stmt->get_result()->fetch_assoc();

    if (!$teacher) {
        sendError('Invalid barcode. Teacher not found.', 404);
    }

    // 2. Check same-day duplicate dispatch
    $chk = $conn->prepare("
        SELECT id FROM dispatch 
        WHERE teacher_id = ? AND dispatch_date = ?
    ");
    $chk->bind_param('is', $teacher['id'], $dispatchDate);
    $chk->execute();

    if ($chk->get_result()->fetch_assoc()) {
        sendError('Already dispatched today. Duplicate dispatch rejected.', 409);
    }

    // 3. Insert dispatch record
    $ins = $conn->prepare("
        INSERT INTO dispatch (teacher_id, dispatch_date, status)
        VALUES (?, ?, 'Dispatched')
    ");
    $ins->bind_param('is', $teacher['id'], $dispatchDate);

    if (!$ins->execute()) {
        sendError('Failed to create dispatch: ' . $ins->error, 500);
    }

    $dispatchId = $conn->insert_id;

    // 4. Create follow-up Level 1 with reminder = dispatch_date + 10 days
    $reminderDate = date('Y-m-d', strtotime($dispatchDate . ' +10 days'));
    $fup = $conn->prepare("
        INSERT INTO followups (dispatch_id, followup_level, reminder_date, status)
        VALUES (?, 1, ?, 'Pending')
    ");
    $fup->bind_param('is', $dispatchId, $reminderDate);
    $fup->execute();

    // 5. Fetch full dispatch record
    $sel = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name, t.address_1, t.address_2, t.address_3
        FROM dispatch d
        JOIN teachers t ON d.teacher_id = t.id
        WHERE d.id = ?
    ");
    $sel->bind_param('i', $dispatchId);
    $sel->execute();
    $dispatch = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess([
        'dispatch'      => $dispatch,
        'reminder_date' => $reminderDate,
    ], 'Dispatch successful');
}

// ─── GET /api/dispatch ────────────────────────────────────────────────────────
function listDispatches() {
    $conn   = getDBConnection();
    $where  = ['1=1'];
    $params = [];
    $types  = '';

    if (!empty($_GET['date'])) {
        $where[]  = 'd.dispatch_date = ?';
        $params[] = $_GET['date'];
        $types   .= 's';
    }
    if (!empty($_GET['status'])) {
        $where[]  = 'd.status = ?';
        $params[] = $_GET['status'];
        $types   .= 's';
    }
    if (!empty($_GET['teacher_id'])) {
        $where[]  = 'd.teacher_id = ?';
        $params[] = (int)$_GET['teacher_id'];
        $types   .= 'i';
    }
    if (!empty($_GET['from_date'])) {
        $where[]  = 'd.dispatch_date >= ?';
        $params[] = $_GET['from_date'];
        $types   .= 's';
    }
    if (!empty($_GET['to_date'])) {
        $where[]  = 'd.dispatch_date <= ?';
        $params[] = $_GET['to_date'];
        $types   .= 's';
    }

    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $whereSQL = implode(' AND ', $where);

    $countSQL = "SELECT COUNT(*) AS total FROM dispatch d WHERE $whereSQL";
    $stmt = $conn->prepare($countSQL);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    $sql = "
        SELECT d.*, 
               t.teacher_name, t.contact_number, t.school_name, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std,
               (SELECT COUNT(*) FROM followups f WHERE f.dispatch_id = d.id) AS followup_count
        FROM dispatch d
        JOIN teachers t ON d.teacher_id = t.id
        WHERE $whereSQL
        ORDER BY d.dispatch_date DESC, d.id DESC
        LIMIT ? OFFSET ?
    ";

    $stmt2     = $conn->prepare($sql);
    $allTypes  = $types . 'ii';
    $allParams = array_merge($params, [$limit, $offset]);
    $stmt2->bind_param($allTypes, ...$allParams);
    $stmt2->execute();
    $result    = $stmt2->get_result();

    $dispatches = [];
    while ($row = $result->fetch_assoc()) $dispatches[] = $row;

    $conn->close();
    sendSuccess([
        'dispatches' => $dispatches,
        'pagination' => [
            'total'       => (int)$total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ]
    ]);
}

// ─── GET /api/dispatch?id={id} ────────────────────────────────────────────────
function getDispatch($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name, t.barcode,
               t.address_1, t.address_2, t.address_3
        FROM dispatch d
        JOIN teachers t ON d.teacher_id = t.id
        WHERE d.id = ?
    ");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $dispatch = $stmt->get_result()->fetch_assoc();

    if (!$dispatch) sendError('Dispatch not found', 404);

    // Fetch followups
    $fup = $conn->prepare("SELECT * FROM followups WHERE dispatch_id = ? ORDER BY followup_level");
    $fup->bind_param('i', $id);
    $fup->execute();
    $followups = [];
    $result    = $fup->get_result();
    while ($row = $result->fetch_assoc()) $followups[] = $row;

    $conn->close();
    sendSuccess(array_merge($dispatch, ['followups' => $followups]));
}

// ─── PUT /api/dispatch?id={id} ────────────────────────────────────────────────
// Update POD date and/or status
function updateDispatch($id) {
    $body = getRequestBody();
    $conn = getDBConnection();

    $chk = $conn->prepare("SELECT id FROM dispatch WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) sendError('Dispatch not found', 404);

    $allowed = ['pod_date', 'status'];
    $sets    = [];
    $params  = [];
    $types   = '';

    foreach ($allowed as $field) {
        if (isset($body[$field])) {
            $sets[]   = "$field = ?";
            $params[] = $body[$field];
            $types   .= 's';
        }
    }

    if (empty($sets)) sendError('No valid fields to update', 400);

    $params[] = $id;
    $types   .= 'i';

    $sql  = "UPDATE dispatch SET " . implode(', ', $sets) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if (!$stmt->execute()) sendError('Failed to update dispatch', 500);

    $conn->close();
    sendSuccess([], 'Dispatch updated successfully');
}
