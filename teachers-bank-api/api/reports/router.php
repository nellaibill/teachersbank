<?php
// api/reports/router.php

if ($method !== 'GET') sendError('Method not allowed', 405);

$type = $_GET['type'] ?? '';

switch ($type) {
    case 'consolidated':  consolidatedReport(); break;
    case 'label':         labelReport();        break;
    case 'dispatch':      dispatchReport();     break;
    case 'school_address': schoolAddressReport(); break;
    default:
        sendError('Invalid report type. Use: consolidated, label, dispatch, school_address', 400);
}

function buildTeacherFilters($prefix = 't') {
    $where = []; $params = []; $types = '';
    $filters = ['dt_code','sub_code','medium','std','school_type'];
    foreach ($filters as $f) {
        if (!empty($_GET[$f])) {
            $where[]  = "$prefix.$f = ?";
            $params[] = $_GET[$f];
            $types   .= 's';
        }
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

function consolidatedReport() {
    $conn = getDBConnection();
    [$where, $params, $types] = buildTeacherFilters();
    $where[] = 't.isActive = 1';
    $whereSQL = 'WHERE ' . implode(' AND ', $where);

    $sql = "
        SELECT t.*, 
               (SELECT COUNT(*) FROM dispatch d WHERE d.teacher_id = t.id) AS total_dispatches,
               (SELECT MAX(d.dispatch_date) FROM dispatch d WHERE d.teacher_id = t.id) AS last_dispatch_date,
               (SELECT f.status FROM followups f JOIN dispatch d ON f.dispatch_id = d.id
                WHERE d.teacher_id = t.id ORDER BY f.id DESC LIMIT 1) AS latest_followup_status,
               (SELECT f.followup_level FROM followups f JOIN dispatch d ON f.dispatch_id = d.id
                WHERE d.teacher_id = t.id ORDER BY f.id DESC LIMIT 1) AS latest_followup_level
        FROM teachers t $whereSQL ORDER BY t.dt_code, t.teacher_name
    ";
    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = []; $sno = 1;
    while ($row = $result->fetch_assoc()) { $row['sno'] = $sno++; $rows[] = $row; }
    $conn->close();
    sendSuccess(['report_type' => 'consolidated', 'total' => count($rows), 'records' => $rows]);
}

function labelReport() {
    $conn = getDBConnection();
    [$where, $params, $types] = buildTeacherFilters();
    $where[] = 't.isActive = 1';
    $whereSQL = 'WHERE ' . implode(' AND ', $where);

    $sql = "SELECT t.id, t.teacher_name, t.contact_number, t.barcode,
                   t.address_1, t.address_2, t.address_3,
                   t.school_name, t.dt_code, t.sub_code, t.medium, t.std
            FROM teachers t $whereSQL ORDER BY t.dt_code, t.teacher_name";
    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $labels = [];
    while ($row = $result->fetch_assoc()) {
        $labels[] = array_merge($row, [
            'full_address' => implode(', ', array_filter([$row['school_name'], $row['address_1'], $row['address_2'], $row['address_3']]))
        ]);
    }
    $conn->close();
    sendSuccess(['report_type' => 'label', 'total' => count($labels), 'labels' => $labels]);
}

function dispatchReport() {
    $conn   = getDBConnection();
    $where  = ['1=1']; $params = []; $types = '';

    if (!empty($_GET['from_date'])) { $where[] = 'd.dispatch_date >= ?'; $params[] = $_GET['from_date']; $types .= 's'; }
    if (!empty($_GET['to_date']))   { $where[] = 'd.dispatch_date <= ?'; $params[] = $_GET['to_date'];   $types .= 's'; }
    if (!empty($_GET['status']))    { $where[] = 'd.status = ?';         $params[] = $_GET['status'];    $types .= 's'; }

    [$tWhere, $tParams, $tTypes] = buildTeacherFilters();
    $where  = array_merge($where, $tWhere);
    $params = array_merge($params, $tParams);
    $types .= $tTypes;

    $whereSQL = implode(' AND ', $where);
    $sql = "
        SELECT d.id AS dispatch_id, d.dispatch_date, d.pod_date, d.status,
               t.teacher_name, t.contact_number, t.school_name, t.barcode,
               t.dt_code, t.sub_code, t.medium, t.std, t.school_type,
               t.address_1, t.address_2, t.address_3,
               (SELECT GROUP_CONCAT(f.followup_level ORDER BY f.followup_level) FROM followups f WHERE f.dispatch_id = d.id) AS followup_levels,
               (SELECT f.status FROM followups f WHERE f.dispatch_id = d.id ORDER BY f.id DESC LIMIT 1) AS latest_followup
        FROM dispatch d JOIN teachers t ON d.teacher_id = t.id
        WHERE $whereSQL ORDER BY d.dispatch_date DESC
    ";
    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    $conn->close();
    sendSuccess(['report_type' => 'dispatch', 'total' => count($rows), 'records' => $rows]);
}

function schoolAddressReport() {
    $conn = getDBConnection();
    [$where, $params, $types] = buildTeacherFilters();
    $where[] = 't.isActive = 1';
    $whereSQL = 'WHERE ' . implode(' AND ', $where);

    $sql = "SELECT t.id, t.teacher_name, t.contact_number,
                   t.school_name, t.address_1, t.address_2, t.address_3,
                   t.school_type, t.dt_code
            FROM teachers t $whereSQL ORDER BY t.dt_code, t.school_name";
    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $row['full_address'] = implode(', ', array_filter([$row['school_name'], $row['address_1'], $row['address_2'], $row['address_3']]));
        $rows[] = $row;
    }
    $conn->close();
    sendSuccess(['report_type' => 'school_address', 'total' => count($rows), 'records' => $rows]);
}
