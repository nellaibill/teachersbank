<?php
// index.php — Single entry point router
// URL format: index.php?route=api/teachers or index.php?route=api/teachers/5

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/barcode.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// ── Path resolution (3 strategies, in priority order) ─────────────────────────

// Strategy 1: ?route=api/teachers/5  (most reliable, no Apache config needed)
if (!empty($_GET['route'])) {
    $path = trim($_GET['route'], '/');

// Strategy 2: PATH_INFO — index.php/api/teachers (needs AcceptPathInfo On)
} elseif (!empty($_SERVER['PATH_INFO'])) {
    $path = trim($_SERVER['PATH_INFO'], '/');

// Strategy 3: mod_rewrite — REQUEST_URI stripped of base path
} else {
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $scriptDir  = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
    $path       = trim(substr($requestUri, strlen($scriptDir)), '/');
    if (strpos($path, 'index.php') === 0) {
        $path = trim(substr($path, strlen('index.php')), '/');
    }
}

// $path = "api/teachers" or "api/teachers/5"
$segments = array_values(array_filter(explode('/', $path)));
$resource = $segments[1] ?? '';
$id       = isset($segments[2]) && is_numeric($segments[2]) ? (int)$segments[2] : null;

if (!$id && !empty($_GET['id'])) {
    $id = (int)$_GET['id'];
}

switch ($resource) {
    case 'teachers':
        require __DIR__ . '/api/teachers/router.php';
        break;
    case 'dispatch':
        require __DIR__ . '/api/dispatch/router.php';
        break;
    case 'followups':
        require __DIR__ . '/api/followups/router.php';
        break;
    case 'reports':
        require __DIR__ . '/api/reports/router.php';
        break;
    default:
        sendResponse([
            'success'  => true,
            'message'  => 'Teachers Bank API v1.0 — Use ?route=api/resource',
            'debug'    => [
                'path'        => $path,
                'segments'    => $segments,
                'resource'    => $resource,
                'PATH_INFO'   => $_SERVER['PATH_INFO']   ?? 'not set',
                'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'not set',
            ],
            'usage' => [
                'List teachers'    => 'GET  index.php?route=api/teachers',
                'Create teacher'   => 'POST index.php?route=api/teachers',
                'Get teacher'      => 'GET  index.php?route=api/teachers/1',
                'Update teacher'   => 'PUT  index.php?route=api/teachers/1',
                'Delete teacher'   => 'DELETE index.php?route=api/teachers/1',
                'Scan dispatch'    => 'POST index.php?route=api/dispatch',
                'List dispatches'  => 'GET  index.php?route=api/dispatch',
                'List followups'   => 'GET  index.php?route=api/followups',
                'Today followups'  => 'GET  index.php?route=api/followups&date=today',
                'Reports'          => 'GET  index.php?route=api/reports&type=consolidated',
            ]
        ]);
}