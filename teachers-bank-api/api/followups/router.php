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
    $today  = date('Y-m-d');

    if (!empty($_GET['date'])) {
        $date = $_GET['date'] === 'today' ? date('Y-m-d') : $_GET['date'];
        if (!empty($_GET['to_date']) || !empty($_GET['from_date'])) {
            $where[] = 'f.reminder_date >= ?';
        } else {
            $where[] = 'f.reminder_date = ?';
        }
        $params[] = $date;
        $types   .= 's';
    }
    if (!empty($_GET['status'])) {
        if ($_GET['status'] === 'Processing') {
            $where[]  = "(f.status = ? OR f.status = 'Informed')";
            $params[] = 'Processing';
            $types   .= 's';
        } else {
            $where[]  = 'f.status = ?';
            $params[] = $_GET['status'];
            $types   .= 's';
        }
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
    if (!empty($_GET['overdue_only'])) {
        $where[]  = 'f.status = ?';
        $params[] = 'Pending';
        $types   .= 's';
        $where[]  = 'f.reminder_date < ?';
        $params[] = $today;
        $types   .= 's';
    }

    $page     = max(1, (int)($_GET['page']  ?? 1));
    $limit    = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset   = ($page - 1) * $limit;
    $baseJoin = "
        FROM followups f
        JOIN (
            SELECT dispatch_id, MAX(id) AS latest_id
            FROM followups
            GROUP BY dispatch_id
        ) latest ON latest.latest_id = f.id
    ";
    $whereSQL = implode(' AND ', $where);

    $stmt = $conn->prepare("SELECT COUNT(*) AS total $baseJoin WHERE $whereSQL");
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    $stmt2 = $conn->prepare("
        SELECT f.*, d.dispatch_date, d.pod_date, d.status AS dispatch_status,
               t.teacher_name, t.contact_number, t.school_name,
               t.teacher_address, t.pincode, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std, t.classifications
        $baseJoin
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

    attachLevelHistory($conn, $followups);

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
               t.dt_code, t.sub_code, t.medium, t.std, t.classifications
        FROM followups f
        JOIN dispatch d ON f.dispatch_id = d.id
        JOIN teachers t ON d.teacher_id = t.id
        WHERE f.id = ?
    ");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $followup = $stmt->get_result()->fetch_assoc();
    if (!$followup) sendError('Followup not found', 404);
    $rows = [$followup];
    attachLevelHistory($conn, $rows);
    $followup = $rows[0];
    $conn->close();
    sendSuccess($followup);
}

function attachLevelHistory($conn, array &$followups) {
    if (empty($followups)) return;

    $dispatchIds = [];
    foreach ($followups as $row) {
        $dispatchIds[(int)$row['dispatch_id']] = true;
    }

    $ids = array_keys($dispatchIds);
    if (empty($ids)) return;

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));
    $historyStmt = $conn->prepare("
        SELECT id, dispatch_id, followup_level, reminder_date, status, remarks, updated_at
        FROM followups
        WHERE dispatch_id IN ($placeholders)
        ORDER BY dispatch_id ASC, id DESC
    ");
    $historyStmt->bind_param($types, ...$ids);
    $historyStmt->execute();
    $historyResult = $historyStmt->get_result();

    $historyMap = [];
    while ($history = $historyResult->fetch_assoc()) {
        $dispatchId = (int)$history['dispatch_id'];
        if (!isset($historyMap[$dispatchId])) $historyMap[$dispatchId] = [];
        $historyMap[$dispatchId][] = $history;
    }

    foreach ($followups as &$row) {
        $historyRows = $historyMap[(int)$row['dispatch_id']] ?? [];
        $row['level_history'] = array_values($historyRows);
    }
}

function ensureReminderDateIsNotPast($reminderDate) {
    if ($reminderDate === null || $reminderDate === '') {
        return;
    }

    $date = DateTime::createFromFormat('Y-m-d', $reminderDate);
    if (!$date || $date->format('Y-m-d') !== $reminderDate) {
        sendError('Reminder date must be a valid date in YYYY-MM-DD format', 422);
    }

    $today = new DateTime('today');
    if ($date < $today) {
        sendError('Reminder date cannot be in the past', 422);
    }
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

    ensureReminderDateIsNotPast($reminderDate);

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

    if (isset($body['status']) && $body['status'] === 'Informed') {
        $body['status'] = 'Processing';
    }

    $chk = $conn->prepare("SELECT id, followup_level, dispatch_id, reminder_date, remarks, status FROM followups WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    $current = $chk->get_result()->fetch_assoc();
    if (!$current) sendError('Followup not found', 404);
    if (!isset($body['status']) && !array_key_exists('remarks', $body) && !isset($body['reminder_date'])) {
        sendError('No valid fields to update', 400);
    }

    $status = $body['status'] ?? $current['status'];
    $remarks = array_key_exists('remarks', $body) ? $body['remarks'] : $current['remarks'];
    $reminderDate = $body['reminder_date'] ?? $current['reminder_date'];
    $dispatchId = (int)$current['dispatch_id'];

    if (!in_array($status, ['Completed', 'No Answer'], true)) {
        ensureReminderDateIsNotPast($reminderDate);
    }

    $levelStmt = $conn->prepare("SELECT COALESCE(MAX(followup_level), 0) AS max_level FROM followups WHERE dispatch_id = ?");
    $levelStmt->bind_param('i', $dispatchId);
    $levelStmt->execute();
    $levelRow = $levelStmt->get_result()->fetch_assoc();
    $nextLevel = ((int)($levelRow['max_level'] ?? 0)) + 1;

    $insert = $conn->prepare("INSERT INTO followups (dispatch_id, followup_level, reminder_date, remarks, status) VALUES (?, ?, ?, ?, ?)");
    $insert->bind_param('iisss', $dispatchId, $nextLevel, $reminderDate, $remarks, $status);
    if (!$insert->execute()) sendError('Failed to create followup', 500);

    $newId = $conn->insert_id;
    $newSel = $conn->prepare("SELECT * FROM followups WHERE id = ?");
    $newSel->bind_param('i', $newId);
    $newSel->execute();
    $nextFollowup = $newSel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess(['next_followup' => $nextFollowup], 'Followup updated successfully');
}
