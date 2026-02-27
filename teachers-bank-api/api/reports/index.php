<?php
// api/reports/index.php
// GET /api/reports?type=consolidated|label|dispatch|school_address
// Supports filters: dt_code, sub_code, medium, std, school_type, from_date, to_date, teacher_name, contact

require_once '../../config/database.php';
require_once '../../middleware/cors.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') sendError('Method not allowed', 405);

$type = $_GET['type'] ?? '';

switch ($type) {
    case 'consolidated':
        consolidatedReport();
        break;
    case 'label':
        labelReport();
        break;
    case 'dispatch':
        dispatchReport();
        break;
    case 'school_address':
        schoolAddressReport();
        break;
    default:
        sendError('Invalid report type. Use: consolidated, label, dispatch, school_address', 400);
}

// ─── Shared filter builder ─────────────────────────────────────────────────────
function buildTeacherFilters($prefix = 't') {
    $where  = [];
    $params = [];
    $types  = '';

    if (!empty($_GET['dt_code'])) {
        $where[]  = "$prefix.dt_code = ?";
        $params[] = $_GET['dt_code'];
        $types   .= 's';
    }
    if (!empty($_GET['sub_code'])) {
        $where[]  = "$prefix.sub_code = ?";
        $params[] = $_GET['sub_code'];
        $types   .= 's';
    }
    if (!empty($_GET['medium'])) {
        $where[]  = "$prefix.medium = ?";
        $params[] = $_GET['medium'];
        $types   .= 's';
    }
    if (!empty($_GET['std'])) {
        $where[]  = "$prefix.std = ?";
        $params[] = $_GET['std'];
        $types   .= 's';
    }
    if (!empty($_GET['school_type'])) {
        $where[]  = "$prefix.school_type = ?";
        $params[] = $_GET['school_type'];
        $types   .= 's';
    }
    if (!empty($_GET['teacher_name'])) {
        $where[]  = "$prefix.teacher_name LIKE ?";
        $params[] = '%' . $_GET['teacher_name'] . '%';
        $types   .= 's';
    }
    if (!empty($_GET['contact'])) {
        $where[]  = "$prefix.contact_number LIKE ?";
        $params[] = '%' . $_GET['contact'] . '%';
        $types   .= 's';
    }

    return [$where, $params, $types];
}

// ─── 1. Consolidated Report ───────────────────────────────────────────────────
// Columns: S.No | Teacher Name | Contact | Followup | School Type | District | Medium | Subject | Std | School Name (with address)
function consolidatedReport() {
    $conn = getDBConnection();

    [$where, $params, $types] = buildTeacherFilters();
    $where[] = 't.isActive = 1';

    $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "
        SELECT 
            t.id, t.teacher_name, t.contact_number,
            t.dt_code, t.sub_code, t.std, t.medium, t.year_code,
            t.school_name, t.school_type, t.address_1, t.address_2, t.address_3,
            t.barcode,
            (SELECT COUNT(*) FROM dispatch d WHERE d.teacher_id = t.id) AS total_dispatches,
            (SELECT MAX(d.dispatch_date) FROM dispatch d WHERE d.teacher_id = t.id) AS last_dispatch_date,
            (SELECT f.status FROM followups f 
             JOIN dispatch d ON f.dispatch_id = d.id 
             WHERE d.teacher_id = t.id 
             ORDER BY f.id DESC LIMIT 1) AS latest_followup_status,
            (SELECT f.followup_level FROM followups f 
             JOIN dispatch d ON f.dispatch_id = d.id 
             WHERE d.teacher_id = t.id 
             ORDER BY f.id DESC LIMIT 1) AS latest_followup_level
        FROM teachers t
        $whereSQL
        ORDER BY t.dt_code, t.teacher_name
    ";

    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $rows = [];
    $sno  = 1;
    while ($row = $result->fetch_assoc()) {
        $row['sno'] = $sno++;
        $rows[] = $row;
    }

    $conn->close();
    sendSuccess([
        'report_type' => 'consolidated',
        'total'       => count($rows),
        'records'     => $rows
    ]);
}

// ─── 2. Label Report ──────────────────────────────────────────────────────────
// Returns data formatted for label printing
// Label format: ARL|DT|SUB|MED|STD|ID  + teacher name + address + phone
function labelReport() {
    $conn = getDBConnection();

    [$where, $params, $types] = buildTeacherFilters();
    $where[] = 't.isActive = 1';

    $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "
        SELECT 
            t.id, t.teacher_name, t.contact_number, t.barcode,
            t.address_1, t.address_2, t.address_3,
            t.school_name, t.dt_code, t.sub_code, t.medium, t.std
        FROM teachers t
        $whereSQL
        ORDER BY t.dt_code, t.teacher_name
    ";

    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $labels = [];
    while ($row = $result->fetch_assoc()) {
        $address = implode(', ', array_filter([
            $row['school_name'],
            $row['address_1'],
            $row['address_2'],
            $row['address_3'],
        ]));

        $labels[] = [
            'id'             => $row['id'],
            'barcode'        => $row['barcode'],
            'teacher_name'   => $row['teacher_name'],
            'contact_number' => $row['contact_number'],
            'full_address'   => $address,
            'school_name'    => $row['school_name'],
            'address_1'      => $row['address_1'],
            'address_2'      => $row['address_2'],
            'address_3'      => $row['address_3'],
        ];
    }

    $conn->close();
    sendSuccess([
        'report_type' => 'label',
        'total'       => count($labels),
        'labels'      => $labels
    ]);
}

// ─── 3. Dispatch Report ───────────────────────────────────────────────────────
function dispatchReport() {
    $conn   = getDBConnection();
    $where  = ['1=1'];
    $params = [];
    $types  = '';

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
    if (!empty($_GET['status'])) {
        $where[]  = 'd.status = ?';
        $params[] = $_GET['status'];
        $types   .= 's';
    }

    // Teacher filters
    [$tWhere, $tParams, $tTypes] = buildTeacherFilters();
    $where  = array_merge($where, $tWhere);
    $params = array_merge($params, $tParams);
    $types .= $tTypes;

    $whereSQL = implode(' AND ', $where);

    $sql = "
        SELECT 
            d.id AS dispatch_id, d.dispatch_date, d.pod_date, d.status,
            t.teacher_name, t.contact_number, t.school_name, t.barcode,
            t.dt_code, t.sub_code, t.medium, t.std, t.school_type,
            t.address_1, t.address_2, t.address_3,
            (SELECT GROUP_CONCAT(f.followup_level ORDER BY f.followup_level) 
             FROM followups f WHERE f.dispatch_id = d.id) AS followup_levels,
            (SELECT f.status FROM followups f WHERE f.dispatch_id = d.id ORDER BY f.id DESC LIMIT 1) AS latest_followup
        FROM dispatch d
        JOIN teachers t ON d.teacher_id = t.id
        WHERE $whereSQL
        ORDER BY d.dispatch_date DESC
    ";

    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;

    $conn->close();
    sendSuccess([
        'report_type' => 'dispatch',
        'total'       => count($rows),
        'records'     => $rows
    ]);
}

// ─── 4. School Address Report ─────────────────────────────────────────────────
// Label format: School name + address + pin code + contact
function schoolAddressReport() {
    $conn = getDBConnection();

    [$where, $params, $types] = buildTeacherFilters();
    $where[] = 't.isActive = 1';

    $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "
        SELECT 
            t.id, t.teacher_name, t.contact_number,
            t.school_name, t.address_1, t.address_2, t.address_3,
            t.school_type, t.dt_code
        FROM teachers t
        $whereSQL
        ORDER BY t.dt_code, t.school_name
    ";

    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $row['full_address'] = implode(', ', array_filter([
            $row['school_name'],
            $row['address_1'],
            $row['address_2'],
            $row['address_3']
        ]));
        $rows[] = $row;
    }

    $conn->close();
    sendSuccess([
        'report_type' => 'school_address',
        'total'       => count($rows),
        'records'     => $rows
    ]);
}
