<?php
// api/teachers/[id].php
// Handles: GET /api/teachers/{id}, PUT /api/teachers/{id}, DELETE /api/teachers/{id}

require_once '../../config/database.php';
require_once '../../middleware/cors.php';
require_once '../../middleware/barcode.php';

setCORSHeaders();

// Extract ID from URL  (Router sets ?id=X  or use PATH_INFO)
$id = (int)($_GET['id'] ?? 0);
if (!$id) sendError('Teacher ID is required', 400);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getTeacher($id);
        break;
    case 'PUT':
        updateTeacher($id);
        break;
    case 'DELETE':
        deleteTeacher($id);
        break;
    default:
        sendError('Method not allowed', 405);
}

// ─── GET /api/teachers/{id} ───────────────────────────────────────────────────
function getTeacher($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $teacher = $stmt->get_result()->fetch_assoc();

    if (!$teacher) sendError('Teacher not found', 404);

    // Also fetch dispatch history
    $dStmt = $conn->prepare("
        SELECT d.*, 
               (SELECT COUNT(*) FROM followups f WHERE f.dispatch_id = d.id) AS followup_count
        FROM dispatch d
        WHERE d.teacher_id = ?
        ORDER BY d.dispatch_date DESC
    ");
    $dStmt->bind_param('i', $id);
    $dStmt->execute();
    $dispatches = [];
    $result = $dStmt->get_result();
    while ($row = $result->fetch_assoc()) $dispatches[] = $row;

    $conn->close();
    sendSuccess(array_merge($teacher, ['dispatches' => $dispatches]));
}

// ─── PUT /api/teachers/{id} ───────────────────────────────────────────────────
function updateTeacher($id) {
    $body = getRequestBody();

    $conn = getDBConnection();

    // Check exists
    $chk = $conn->prepare("SELECT id FROM teachers WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) sendError('Teacher not found', 404);

    $errors = validateRequired($body, ['teacher_name', 'contact_number']);
    if ($errors) sendError('Validation failed', 422, $errors);

    $stmt = $conn->prepare("
        UPDATE teachers SET
            teacher_name  = ?,
            contact_number = ?,
            address_1     = ?,
            address_2     = ?,
            address_3     = ?,
            dt_code       = ?,
            sub_code      = ?,
            std           = ?,
            year_code     = ?,
            medium        = ?,
            school_name   = ?,
            school_type   = ?,
            isActive      = ?
        WHERE id = ?
    ");

    $isActive = isset($body['isActive']) ? (int)$body['isActive'] : 1;

    $stmt->bind_param(
        'sssssssssssiii',
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
        $body['school_type'] ?? null,
        $isActive,
        $id
    );

    if (!$stmt->execute()) sendError('Failed to update teacher: ' . $stmt->error, 500);

    $sel = $conn->prepare("SELECT * FROM teachers WHERE id = ?");
    $sel->bind_param('i', $id);
    $sel->execute();
    $teacher = $sel->get_result()->fetch_assoc();

    $conn->close();
    sendSuccess($teacher, 'Teacher updated successfully');
}

// ─── DELETE /api/teachers/{id} (soft delete) ──────────────────────────────────
function deleteTeacher($id) {
    $conn = getDBConnection();

    $chk = $conn->prepare("SELECT id FROM teachers WHERE id = ?");
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) sendError('Teacher not found', 404);

    $stmt = $conn->prepare("UPDATE teachers SET isActive = 0 WHERE id = ?");
    $stmt->bind_param('i', $id);

    if (!$stmt->execute()) sendError('Failed to delete teacher', 500);

    $conn->close();
    sendSuccess([], 'Teacher deactivated successfully');
}
