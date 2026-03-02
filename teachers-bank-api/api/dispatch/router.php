<?php
// api/dispatch/router.php

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

    // Find teacher by barcode
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE barcode = ? AND isActive = 1");
    $stmt->bind_param('s', $barcode);
    $stmt->execute();
    $teacher = $stmt->get_result()->fetch_assoc();
    if (!$teacher) sendError('Invalid barcode — teacher not found.', 404);

    // Duplicate check for same day
    $chk = $conn->prepare("SELECT id FROM dispatch WHERE teacher_id = ? AND dispatch_date = ?");
    $chk->bind_param('is', $teacher['id'], $dispatchDate);
    $chk->execute();
    if ($chk->get_result()->fetch_assoc()) {
        sendError('Already dispatched today. Duplicate dispatch rejected.', 409);
    }

    // Insert dispatch
    $ins = $conn->prepare("INSERT INTO dispatch (teacher_id, dispatch_date, status) VALUES (?, ?, 'Dispatched')");
    $ins->bind_param('is', $teacher['id'], $dispatchDate);
    if (!$ins->execute()) sendError('Failed to create dispatch: ' . $ins->error, 500);

    $dispatchId   = $conn->insert_id;
    $reminderDate = date('Y-m-d', strtotime($dispatchDate . ' +10 days'));

    // Auto-create followup level 1
    $fup = $conn->prepare("INSERT INTO followups (dispatch_id, followup_level, reminder_date, status) VALUES (?, 1, ?, 'Pending')");
    $fup->bind_param('is', $dispatchId, $reminderDate);
    $fup->execute();

    // Return full dispatch with teacher info (updated columns)
    $sel = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name,
               t.teacher_address, t.pincode, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std
        FROM dispatch d JOIN teachers t ON d.teacher_id = t.id WHERE d.id = ?
    ");
    $sel->bind_param('i', $dispatchId);
    $sel->execute();
    $dispatch = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess(['dispatch' => $dispatch, 'reminder_date' => $reminderDate], 'Dispatch successful');
}

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

    $page     = max(1, (int)($_GET['page']  ?? 1));
    $limit    = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset   = ($page - 1) * $limit;
    $whereSQL = implode(' AND ', $where);

    $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM dispatch d WHERE $whereSQL");
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    $stmt2 = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std, t.teacher_address, t.pincode,
               (SELECT COUNT(*) FROM followups f WHERE f.dispatch_id = d.id) AS followup_count
        FROM dispatch d JOIN teachers t ON d.teacher_id = t.id
        WHERE $whereSQL ORDER BY d.dispatch_date DESC, d.id DESC LIMIT ? OFFSET ?
    ");
    $stmt2->bind_param($types . 'ii', ...[...$params, $limit, $offset]);
    $stmt2->execute();
    $result = $stmt2->get_result();

    $dispatches = [];
    while ($row = $result->fetch_assoc()) $dispatches[] = $row;

    $conn->close();
    sendSuccess([
        'dispatches' => $dispatches,
        'pagination' => [
            'total'       => (int)$total, 'page' => $page,
            'limit'       => $limit,      'total_pages' => (int)ceil($total / $limit)
        ]
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
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $dispatch = $stmt->get_result()->fetch_assoc();
    if (!$dispatch) sendError('Dispatch not found', 404);

    $fup = $conn->prepare("SELECT * FROM followups WHERE dispatch_id = ? ORDER BY followup_level");
    $fup->bind_param('i', $id);
    $fup->execute();
    $followups = [];
    $res = $fup->get_result();
    while ($row = $res->fetch_assoc()) $followups[] = $row;

    $conn->close();
    sendSuccess(array_merge($dispatch, ['followups' => $followups]));
}

function updateDispatch($id) {
    $body = getRequestBody();
    $conn = getDBConnection();

    $chk = $conn->prepare("SELECT id FROM dispatch WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) sendError('Dispatch not found', 404);

    $sets = []; $params = []; $types = '';
    foreach (['pod_date', 'status'] as $field) {
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

    // Return updated dispatch
    $sel = $conn->prepare("
        SELECT d.*, t.teacher_name, t.contact_number, t.school_name,
               t.teacher_address, t.pincode, t.barcode
        FROM dispatch d JOIN teachers t ON d.teacher_id = t.id WHERE d.id = ?
    ");
    $sel->bind_param('i', $id);
    $sel->execute();
    $dispatch = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess($dispatch, 'Dispatch updated successfully');
}