<?php
// index.php — Single entry point router
// Works with PATH_INFO: index.php/api/teachers (confirmed working on this server)

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/barcode.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// ── Path extraction ────────────────────────────────────────────────────────────
// Strategy 1: PATH_INFO  → set when URL is index.php/api/teachers  ✅ confirmed working
// Strategy 2: ?route=    → fallback for environments without PATH_INFO
// Strategy 3: REQUEST_URI stripping → last resort

if (!empty($_SERVER['PATH_INFO'])) {
    $path = trim($_SERVER['PATH_INFO'], '/');

} elseif (!empty($_GET['route'])) {
    $path = trim($_GET['route'], '/');

} else {
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $scriptDir  = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
    $path       = trim(substr($requestUri, strlen($scriptDir)), '/');
    if (strpos($path, 'index.php') === 0) {
        $path = trim(substr($path, strlen('index.php')), '/');
    }
}

// $path is now "api/teachers" or "api/teachers/5"
$segments = array_values(array_filter(explode('/', $path)));
// [0]="api"  [1]="teachers"  [2]="5" (optional)
$resource = $segments[1] ?? '';
$id       = isset($segments[2]) && is_numeric($segments[2]) ? (int)$segments[2] : null;

// Also support ?id= for compatibility
if (!$id && !empty($_GET['id'])) {
    $id = (int)$_GET['id'];
}

// ── Route ─────────────────────────────────────────────────────────────────────
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
            'success'   => true,
            'message'   => 'Teachers Bank API v1.0',
            'path_info' => $_SERVER['PATH_INFO'] ?? 'not set',
            'path'      => $path,
            'resource'  => $resource,
            'endpoints' => [
                'GET/POST /api/teachers',
                'GET/PUT/DELETE /api/teachers/{id}',
                'GET/POST /api/dispatch',
                'GET/PUT /api/dispatch/{id}',
                'GET/POST /api/followups',
                'GET/PUT /api/followups/{id}',
                'GET /api/reports?type=consolidated|label|dispatch|school_address',
            ]
        ]);
}