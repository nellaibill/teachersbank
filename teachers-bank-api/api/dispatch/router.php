<?php
// api/dispatch/router.php
// CHANGES: po_number added to updateDispatch() allowed fields + all SELECT queries

if ($id) {
    switch ($method) {
        case 'GET': getDispatch($id);    break;
        case 'PUT': updateDispatch($id); break;
        default: sendError('Method not allowed', 405);
    }
} else {
    switch ($method) {
        case 'GET':  listDispatches();  break;
        case 'POST': scanAndDispatch(); break;
        default: sendError('Method not allowed', 405);
    }
}

function scanAndDispatch() {
    $body = getRequestBody();
    if (empty($body['barcode'])) sendError('Barcode is required', 400);

    $conn         = getDBConnection();
    $barcode      = trim($body['barcode']);
    $dispatchDate = $body['dispatch_date'] ?? date('Y-m-d');

    $stmt = $conn->prepare("SELECT * FROM teachers WHERE barcode = ? AND isActive = 1");
    $stmt->bind_param('s', $barcode); $stmt->execute();
    $teacher = $stmt->get_result()->fetch_assoc();
    if (!$teacher) sendError('Invalid barcode — teacher not found.', 404);

    $chk = $conn->prepare("SELECT id FROM dispatch WHERE teacher_id = ? AND dispatch_date = ?");
    $chk->bind_param('is', $teacher['id'], $dispatchDate); $chk->execute();
    if ($chk->get_result()->fetch_assoc())
        sendError('Already dispatched today. Duplicate dispatch rejected.', 409);

    $ins = $conn->prepare("INSERT INTO dispatch (teacher_id, dispatch_date, status) VALUES (?, ?, 'Dispatched')");
    $ins->bind_param('is', $teacher['id'], $dispatchDate);
    if (!$ins->execute()) sendError('Failed to create dispatch: ' . $ins->error, 500);

    $dispatchId   = $conn->insert_id;
    $reminderDate = date('Y-m-d', strtotime($dispatchDate . ' +10 days'));

    $fup = $conn->prepare("INSERT INTO followups (dispatch_id, followup_level, reminder_date, status) VALUES (?, 1, ?, 'Pending')");
    $fup->bind_param('is', $dispatchId, $reminderDate); $fup->execute();

    $sel = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name,
               t.teacher_address, t.pincode, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std
        FROM dispatch d JOIN teachers t ON d.teacher_id = t.id WHERE d.id = ?
    ");
    $sel->bind_param('i', $dispatchId); $sel->execute();
    $dispatch = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess(['dispatch' => $dispatch, 'reminder_date' => $reminderDate], 'Dispatch successful');
}

function listDispatches() {
    $conn = getDBConnection();
    $where = ['1=1'];
    $params = [];
    $types = '';

    $dateFields = ['date', 'from_date', 'to_date'];
    foreach ($dateFields as $dateField) {
        if (!isset($_GET[$dateField]) || $_GET[$dateField] === '') {
            continue;
        }

        $value = (string)$_GET[$dateField];
        $date = DateTime::createFromFormat('Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) {
            sendError("Invalid $dateField. Expected YYYY-MM-DD", 422);
        }
    }

    if (!empty($_GET['from_date']) && !empty($_GET['to_date']) && $_GET['from_date'] > $_GET['to_date']) {
        sendError('from_date cannot be later than to_date', 422);
    }

    if (isset($_GET['page']) && (!is_numeric($_GET['page']) || (int)$_GET['page'] < 1)) {
        sendError('Invalid page. Must be a positive integer', 422);
    }
    if (isset($_GET['limit']) && (!is_numeric($_GET['limit']) || (int)$_GET['limit'] < 1 || (int)$_GET['limit'] > 100)) {
        sendError('Invalid limit. Must be between 1 and 100', 422);
    }

    $page = (int)($_GET['page'] ?? 1);
    $limit = (int)($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;

    if (!empty($_GET['date'])) {
        $where[] = 'd.dispatch_date = ?';
        $params[] = $_GET['date'];
        $types .= 's';
    }

    if (!empty($_GET['status'])) {
        $status = trim((string)$_GET['status']);
        $allowedStatuses = ['Dispatched', 'Delivered', 'Returned', 'Pending'];
        if (!in_array($status, $allowedStatuses, true)) {
            sendError('Invalid status. Allowed values: Dispatched, Delivered, Returned, Pending', 422);
        }

        if ($status === 'Pending') {
            $where[] = "(d.po_number IS NULL OR TRIM(d.po_number) = '')";
        } else {
            $where[] = 'd.status = ?';
            $params[] = $status;
            $types .= 's';
        }
    }

    if (!empty($_GET['teacher_id'])) {
        if (!is_numeric($_GET['teacher_id']) || (int)$_GET['teacher_id'] < 1) {
            sendError('Invalid teacher_id. Must be a positive integer', 422);
        }
        $where[] = 'd.teacher_id = ?';
        $params[] = (int)$_GET['teacher_id'];
        $types .= 'i';
    }

    if (!empty($_GET['from_date'])) {
        $where[] = 'd.dispatch_date >= ?';
        $params[] = $_GET['from_date'];
        $types .= 's';
    }
    if (!empty($_GET['to_date'])) {
        $where[] = 'd.dispatch_date <= ?';
        $params[] = $_GET['to_date'];
        $types .= 's';
    }

    if (!empty($_GET['search'])) {
        $search = '%' . trim((string)$_GET['search']) . '%';
        $where[] = '(t.teacher_name LIKE ? OR t.contact_number LIKE ? OR t.school_name LIKE ? OR t.barcode LIKE ? OR d.po_number LIKE ?)';
        $params[] = $search;
        $params[] = $search;
        $params[] = $search;
        $params[] = $search;
        $params[] = $search;
        $types .= 'sssss';
    }

    $whereSQL = implode(' AND ', $where);

    $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM dispatch d JOIN teachers t ON d.teacher_id = t.id WHERE $whereSQL");
    if ($types) $stmt->bind_param($types, ...$params); $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    $stmt2 = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std, t.teacher_address, t.pincode,
               (SELECT COUNT(*) FROM followups f WHERE f.dispatch_id = d.id) AS followup_count
        FROM dispatch d JOIN teachers t ON d.teacher_id = t.id
        WHERE $whereSQL ORDER BY d.dispatch_date DESC, d.id DESC LIMIT ? OFFSET ?
    ");
    $stmt2->bind_param($types . 'ii', ...[...$params, $limit, $offset]); $stmt2->execute();
    $result = $stmt2->get_result();
    $dispatches = [];
    while ($row = $result->fetch_assoc()) $dispatches[] = $row;

    $conn->close();
    sendSuccess([
        'dispatches' => $dispatches,
        'pagination' => ['total'=>(int)$total,'page'=>$page,'limit'=>$limit,'total_pages'=>(int)ceil($total/$limit)]
    ]);
}

function getDispatch($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name,
               t.teacher_address, t.pincode, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std
        FROM dispatch d JOIN teachers t ON d.teacher_id = t.id WHERE d.id = ?
    ");
    $stmt->bind_param('i', $id); $stmt->execute();
    $dispatch = $stmt->get_result()->fetch_assoc();
    if (!$dispatch) sendError('Dispatch not found', 404);

    $fup = $conn->prepare("SELECT * FROM followups WHERE dispatch_id = ? ORDER BY followup_level");
    $fup->bind_param('i', $id); $fup->execute();
    $followups = []; $res = $fup->get_result();
    while ($row = $res->fetch_assoc()) $followups[] = $row;

    $conn->close();
    sendSuccess(array_merge($dispatch, ['followups' => $followups]));
}

// ── PUT /api/dispatch/{id} ────────────────────────────────────────────────────
function updateDispatch($id) {
    $body = getRequestBody(); $conn = getDBConnection();
    $chk  = $conn->prepare("SELECT id, dispatch_date, status, po_number, delivered_date FROM dispatch WHERE id = ?");
    $chk->bind_param('i', $id); $chk->execute();
    $currentDispatch = $chk->get_result()->fetch_assoc();
    if (!$currentDispatch) sendError('Dispatch not found', 404);

    // Validate: If status is Delivered, delivered_date is required
    $newStatus = $body['status'] ?? $currentDispatch['status'];
    if ($newStatus === 'Delivered' && empty($body['delivered_date']) && empty($currentDispatch['delivered_date'])) {
        sendError('Delivery date is required when status is Delivered', 422);
    }

    // Validate: If status is Dispatched, po_number and po_date are required (if not already set)
    if ($newStatus === 'Dispatched') {
        $poNumberNeeded = empty($body['po_number']) && empty($currentDispatch['po_number']);
        if ($poNumberNeeded) {
            sendError('PO number is required when status is Dispatched', 422);
        }
    }

    // Validate: Delivery date cannot be before dispatch date
    if (!empty($body['delivered_date']) && $newStatus === 'Delivered') {
        $deliveredDate = DateTime::createFromFormat('Y-m-d', $body['delivered_date']);
        $dispatchDate = DateTime::createFromFormat('Y-m-d', $currentDispatch['dispatch_date']);
        if (!$deliveredDate || $deliveredDate->format('Y-m-d') !== $body['delivered_date']) {
            sendError('Delivery date must be a valid date in YYYY-MM-DD format', 422);
        }
        if ($deliveredDate < $dispatchDate) {
            sendError('Delivery date cannot be before dispatch date', 422);
        }
    }

    // Validate: POD date cannot be before dispatch date
    if (!empty($body['pod_date'])) {
        $podDate = DateTime::createFromFormat('Y-m-d', $body['pod_date']);
        $dispatchDate = DateTime::createFromFormat('Y-m-d', $currentDispatch['dispatch_date']);
        if (!$podDate || $podDate->format('Y-m-d') !== $body['pod_date']) {
            sendError('POD date must be a valid date in YYYY-MM-DD format', 422);
        }
        if ($podDate < $dispatchDate) {
            sendError('POD date cannot be before dispatch date', 422);
        }
    }

    $sets = []; $params = []; $types = '';
    foreach (['delivered_date', 'pod_date', 'status', 'po_number'] as $field) {
        if (isset($body[$field])) {
            $sets[]   = "$field = ?";
            $params[] = $body[$field];
            $types   .= 's';
        }
    }
    if (empty($sets)) sendError('No valid fields to update', 400);

    $params[] = $id; $types .= 'i';
    $stmt = $conn->prepare("UPDATE dispatch SET " . implode(', ', $sets) . " WHERE id = ?");
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) sendError('Failed to update dispatch', 500);

    $sel = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name,
               t.teacher_address, t.pincode, t.barcode
        FROM dispatch d JOIN teachers t ON d.teacher_id = t.id WHERE d.id = ?
    ");
    $sel->bind_param('i', $id); $sel->execute();
    $dispatch = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess($dispatch, 'Dispatch updated successfully');
}
