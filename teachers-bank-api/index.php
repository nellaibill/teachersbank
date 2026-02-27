<?php
// index.php — Single entry point router

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/barcode.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// ── Path extraction ────────────────────────────────────────────────────────────
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

// $path can be:
//   "api/teachers"   → called directly:  index.php/api/teachers
//   "teachers"       → called via rewrite: Next.js strips /api prefix
//   "api/teachers/5" → with ID
//   "teachers/5"     → with ID via rewrite

$segments = array_values(array_filter(explode('/', $path)));

// Detect whether "api" prefix is present and skip it
// segments = ['api','teachers','5']  OR  ['teachers','5']
if (isset($segments[0]) && $segments[0] === 'api') {
    $resource = $segments[1] ?? '';
    $id       = isset($segments[2]) && is_numeric($segments[2]) ? (int)$segments[2] : null;
} else {
    $resource = $segments[0] ?? '';
    $id       = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
}

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
            'debug'     => [
                'path'      => $path,
                'segments'  => $segments,
                'resource'  => $resource,
                'path_info' => $_SERVER['PATH_INFO'] ?? 'not set',
            ],
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