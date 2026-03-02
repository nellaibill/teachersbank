<?php
// api/followups/router.php

if ($id) {
    switch ($method) {
        case 'GET': getFollowup($id);    break;
        case 'PUT': updateFollowup($id); break;
        default: sendError('Method not allowed', 405);
    }
} else {
    switch ($method) {
        case 'GET':  listFollowups();  break;
        case 'POST': createFollowup(); break;
        default: sendError('Method not allowed', 405);
    }
}

function listFollowups() {
    $conn   = getDBConnection();
    $where  = ['1=1'];
    $params = [];
    $types  = '';

    if (!empty($_GET['date'])) {
        $date     = $_GET['date'] === 'today' ? date('Y-m-d') : $_GET['date'];
        $where[]  = 'f.reminder_date = ?';
        $params[] = $date;
        $types   .= 's';
    }
    if (!empty($_GET['status'])) {
        $where[]  = 'f.status = ?';
        $params[] = $_GET['status'];
        $types   .= 's';
    }
    if (!empty($_GET['dispatch_id'])) {
        $where[]  = 'f.dispatch_id = ?';
        $params[] = (int)$_GET['dispatch_id'];
        $types   .= 'i';
    }
    if (!empty($_GET['followup_level'])) {
        $where[]  = 'f.followup_level = ?';
        $params[] = (int)$_GET['followup_level'];
        $types   .= 'i';
    }
    if (!empty($_GET['from_date'])) {
        $where[]  = 'f.reminder_date >= ?';
        $params[] = $_GET['from_date'];
        $types   .= 's';
    }
    if (!empty($_GET['to_date'])) {
        $where[]  = 'f.reminder_date <= ?';
        $params[] = $_GET['to_date'];
        $types   .= 's';
    }

    $page     = max(1, (int)($_GET['page']  ?? 1));
    $limit    = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset   = ($page - 1) * $limit;
    $whereSQL = implode(' AND ', $where);

    $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM followups f WHERE $whereSQL");
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    // Updated: teacher_address + pincode instead of address_1/2/3
    $stmt2 = $conn->prepare("
        SELECT f.*, d.dispatch_date, d.pod_date, d.status AS dispatch_status,
               t.teacher_name, t.contact_number, t.school_name,
               t.teacher_address, t.pincode, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std
        FROM followups f
        JOIN dispatch d ON f.dispatch_id = d.id
        JOIN teachers t ON d.teacher_id = t.id
        WHERE $whereSQL
        ORDER BY f.reminder_date ASC, f.followup_level ASC LIMIT ? OFFSET ?
    ");
    $stmt2->bind_param($types . 'ii', ...[...$params, $limit, $offset]);
    $stmt2->execute();
    $result = $stmt2->get_result();

    $followups = [];
    while ($row = $result->fetch_assoc()) $followups[] = $row;

    $conn->close();
    sendSuccess([
        'followups'  => $followups,
        'pagination' => [
            'total'       => (int)$total, 'page' => $page,
            'limit'       => $limit,      'total_pages' => (int)ceil($total / $limit)
        ]
    ]);
}

function getFollowup($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("
        SELECT f.*, d.dispatch_date, d.pod_date, d.status AS dispatch_status,
               t.teacher_name, t.contact_number, t.school_name,
               t.teacher_address, t.pincode, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std
        FROM followups f
        JOIN dispatch d ON f.dispatch_id = d.id
        JOIN teachers t ON d.teacher_id = t.id
        WHERE f.id = ?
    ");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $followup = $stmt->get_result()->fetch_assoc();
    if (!$followup) sendError('Followup not found', 404);
    $conn->close();
    sendSuccess($followup);
}

function createFollowup() {
    $body   = getRequestBody();
    $errors = validateRequired($body, ['dispatch_id', 'followup_level']);
    if ($errors) sendError('Validation failed', 422, $errors);

    $conn = getDBConnection();
    $chk  = $conn->prepare("SELECT id, dispatch_date FROM dispatch WHERE id = ?");
    $chk->bind_param('i', $body['dispatch_id']);
    $chk->execute();
    $dispatch = $chk->get_result()->fetch_assoc();
    if (!$dispatch) sendError('Dispatch not found', 404);

    $level        = (int)$body['followup_level'];
    $reminderDate = $body['reminder_date'] ?? date('Y-m-d', strtotime($dispatch['dispatch_date'] . " +{$level}0 days"));
    $remarks      = $body['remarks'] ?? null;
    $dispatchId   = (int)$body['dispatch_id'];

    $stmt = $conn->prepare("INSERT INTO followups (dispatch_id, followup_level, reminder_date, remarks, status) VALUES (?, ?, ?, ?, 'Pending')");
    $stmt->bind_param('iiss', $dispatchId, $level, $reminderDate, $remarks);
    if (!$stmt->execute()) sendError('Failed to create followup: ' . $stmt->error, 500);

    $newId = $conn->insert_id;
    $sel   = $conn->prepare("SELECT * FROM followups WHERE id = ?");
    $sel->bind_param('i', $newId);
    $sel->execute();
    $followup = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess($followup, 'Followup created successfully');
}

function updateFollowup($id) {
    $body = getRequestBody();
    $conn = getDBConnection();

    $chk = $conn->prepare("SELECT id, followup_level, dispatch_id FROM followups WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    $current = $chk->get_result()->fetch_assoc();
    if (!$current) sendError('Followup not found', 404);

    $sets = []; $params = []; $types = '';
    foreach (['status', 'remarks', 'reminder_date'] as $field) {
        if (isset($body[$field])) {
            $sets[]   = "$field = ?";
            $params[] = $body[$field];
            $types   .= 's';
        }
    }
    if (empty($sets)) sendError('No valid fields to update', 400);

    $params[] = $id; $types .= 'i';
    $stmt = $conn->prepare("UPDATE followups SET " . implode(', ', $sets) . " WHERE id = ?");
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) sendError('Failed to update followup', 500);

    // Auto-create next level if Informed/Completed and level < 4
    $nextFollowup = null;
    if (isset($body['status']) && in_array($body['status'], ['Informed', 'Completed'])
        && $current['followup_level'] < 4)
    {
        $nextLevel = $current['followup_level'] + 1;
        $dispId    = $current['dispatch_id'];

        $dSel = $conn->prepare("SELECT dispatch_date FROM dispatch WHERE id = ?");
        $dSel->bind_param('i', $dispId);
        $dSel->execute();
        $dRow         = $dSel->get_result()->fetch_assoc();
        $reminderDate = date('Y-m-d', strtotime($dRow['dispatch_date'] . " +{$nextLevel}0 days"));

        $nxt = $conn->prepare("INSERT INTO followups (dispatch_id, followup_level, reminder_date, status) VALUES (?, ?, ?, 'Pending')");
        $nxt->bind_param('iis', $dispId, $nextLevel, $reminderDate);
        $nxt->execute();
        $nxtId = $conn->insert_id;

        $nxtSel = $conn->prepare("SELECT * FROM followups WHERE id = ?");
        $nxtSel->bind_param('i', $nxtId);
        $nxtSel->execute();
        $nextFollowup = $nxtSel->get_result()->fetch_assoc();
    }

    $conn->close();
    sendSuccess(['next_followup' => $nextFollowup], 'Followup updated successfully');
}