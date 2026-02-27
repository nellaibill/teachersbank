<?php
// api/followups/index.php
// GET  /api/followups        — List followups (filterable by date, status, dispatch_id)
// POST /api/followups        — Create a new followup level
// PUT  /api/followups?id=X   — Update followup status/remarks/reminder
// GET  /api/followups?id=X   — Get single followup

require_once '../../config/database.php';
require_once '../../middleware/cors.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id'] ?? 0);

switch ($method) {
    case 'GET':
        $id ? getFollowup($id) : listFollowups();
        break;
    case 'POST':
        createFollowup();
        break;
    case 'PUT':
        if (!$id) sendError('Followup ID required', 400);
        updateFollowup($id);
        break;
    default:
        sendError('Method not allowed', 405);
}

// ─── GET /api/followups ───────────────────────────────────────────────────────
function listFollowups() {
    $conn   = getDBConnection();
    $where  = ['1=1'];
    $params = [];
    $types  = '';

    // Filter by today's reminders by default if ?date=today
    if (!empty($_GET['date'])) {
        $date = $_GET['date'] === 'today' ? date('Y-m-d') : $_GET['date'];
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

    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $whereSQL = implode(' AND ', $where);

    $countSQL = "SELECT COUNT(*) AS total FROM followups f WHERE $whereSQL";
    $stmt = $conn->prepare($countSQL);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    $sql = "
        SELECT f.*,
               d.dispatch_date, d.pod_date, d.status AS dispatch_status,
               t.teacher_name, t.contact_number, t.school_name,
               t.address_1, t.address_2, t.address_3, t.barcode
        FROM followups f
        JOIN dispatch d ON f.dispatch_id = d.id
        JOIN teachers t ON d.teacher_id = t.id
        WHERE $whereSQL
        ORDER BY f.reminder_date ASC, f.followup_level ASC
        LIMIT ? OFFSET ?
    ";

    $stmt2     = $conn->prepare($sql);
    $allTypes  = $types . 'ii';
    $allParams = array_merge($params, [$limit, $offset]);
    $stmt2->bind_param($allTypes, ...$allParams);
    $stmt2->execute();
    $result    = $stmt2->get_result();

    $followups = [];
    while ($row = $result->fetch_assoc()) $followups[] = $row;

    $conn->close();
    sendSuccess([
        'followups'  => $followups,
        'pagination' => [
            'total'       => (int)$total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ]
    ]);
}

// ─── GET /api/followups?id=X ─────────────────────────────────────────────────
function getFollowup($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("
        SELECT f.*,
               d.dispatch_date, d.pod_date, d.status AS dispatch_status,
               t.teacher_name, t.contact_number, t.school_name, t.barcode
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

// ─── POST /api/followups ──────────────────────────────────────────────────────
// Create next level followup manually
// Body: { "dispatch_id": 1, "followup_level": 2, "reminder_date": "2026-03-10", "remarks": "..." }
function createFollowup() {
    $body   = getRequestBody();
    $errors = validateRequired($body, ['dispatch_id', 'followup_level']);
    if ($errors) sendError('Validation failed', 422, $errors);

    $conn = getDBConnection();

    // Verify dispatch exists
    $chk = $conn->prepare("SELECT id, dispatch_date FROM dispatch WHERE id = ?");
    $chk->bind_param('i', $body['dispatch_id']);
    $chk->execute();
    $dispatch = $chk->get_result()->fetch_assoc();
    if (!$dispatch) sendError('Dispatch not found', 404);

    // Default reminder: dispatch_date + (level * 10) days
    $level        = (int)$body['followup_level'];
    $reminderDate = $body['reminder_date'] ?? date('Y-m-d', strtotime($dispatch['dispatch_date'] . " +{$level}0 days"));
    $remarks      = $body['remarks'] ?? null;

    $stmt = $conn->prepare("
        INSERT INTO followups (dispatch_id, followup_level, reminder_date, remarks, status)
        VALUES (?, ?, ?, ?, 'Pending')
    ");
    $stmt->bind_param('iiss', $body['dispatch_id'], $level, $reminderDate, $remarks);

    if (!$stmt->execute()) sendError('Failed to create followup: ' . $stmt->error, 500);

    $newId = $conn->insert_id;
    $sel   = $conn->prepare("SELECT * FROM followups WHERE id = ?");
    $sel->bind_param('i', $newId);
    $sel->execute();
    $followup = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess($followup, 'Followup created successfully');
}

// ─── PUT /api/followups?id=X ─────────────────────────────────────────────────
// Update status / remarks / reminder_date
function updateFollowup($id) {
    $body = getRequestBody();
    $conn = getDBConnection();

    $chk = $conn->prepare("SELECT id FROM followups WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) sendError('Followup not found', 404);

    $allowed = ['status', 'remarks', 'reminder_date'];
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

    // If marking as Informed/Completed and level < 4, auto-create next level followup
    $autoCreateNext = false;
    if (isset($body['status']) && in_array($body['status'], ['Informed', 'Completed'])) {
        // Get current followup level and dispatch_id
        $cur = $conn->prepare("SELECT followup_level, dispatch_id FROM followups WHERE id = ?");
        $cur->bind_param('i', $id);
        $cur->execute();
        $current = $cur->get_result()->fetch_assoc();

        if ($current && $current['followup_level'] < 4) {
            $autoCreateNext = $current;
        }
    }

    $params[] = $id;
    $types   .= 'i';
    $sql      = "UPDATE followups SET " . implode(', ', $sets) . " WHERE id = ?";
    $stmt     = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if (!$stmt->execute()) sendError('Failed to update followup', 500);

    // Auto-create next level if needed
    $nextFollowup = null;
    if ($autoCreateNext) {
        $nextLevel    = $autoCreateNext['followup_level'] + 1;
        $dispId       = $autoCreateNext['dispatch_id'];

        // Get dispatch date
        $dSel = $conn->prepare("SELECT dispatch_date FROM dispatch WHERE id = ?");
        $dSel->bind_param('i', $dispId);
        $dSel->execute();
        $dRow = $dSel->get_result()->fetch_assoc();

        $reminderDate = date('Y-m-d', strtotime($dRow['dispatch_date'] . " +{$nextLevel}0 days"));

        $nxt = $conn->prepare("
            INSERT INTO followups (dispatch_id, followup_level, reminder_date, status)
            VALUES (?, ?, ?, 'Pending')
        ");
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
