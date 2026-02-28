<?php
// index.php — Single entry point router

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/jwt.php';
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

$segments = array_values(array_filter(explode('/', $path)));

// Handle both /api/teachers and /teachers (Next.js rewrite strips /api prefix)
if (isset($segments[0]) && $segments[0] === 'api') {
    $resource = $segments[1] ?? '';
    $id       = isset($segments[2]) && is_numeric($segments[2]) ? (int)$segments[2] : null;
} else {
    $resource = $segments[0] ?? '';
    $id       = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
}

if (!$id && !empty($_GET['id'])) {
    $id = (int)$_GET['id'];
}

// ── Route ─────────────────────────────────────────────────────────────────────
switch ($resource) {

    case 'auth':
        // Public — no auth required (login/logout/me)
        require __DIR__ . '/api/auth/router.php';
        break;

    case 'users':
        // Auth checked inside router (admin required for most actions)
        require __DIR__ . '/api/users/router.php';
        break;

    case 'teachers':
        requireAuth();
        require __DIR__ . '/api/teachers/router.php';
        break;

    case 'dispatch':
        requireAuth();
        require __DIR__ . '/api/dispatch/router.php';
        break;

    case 'followups':
        requireAuth();
        require __DIR__ . '/api/followups/router.php';
        break;

    case 'reports':
        requireAuth();
        require __DIR__ . '/api/reports/router.php';
        break;

    default:
        sendResponse([
            'success'  => true,
            'message'  => 'Teachers Bank API v1.0',
            'debug'    => [
                'path'      => $path,
                'segments'  => $segments,
                'resource'  => $resource,
                'path_info' => $_SERVER['PATH_INFO'] ?? 'not set',
            ],
            'endpoints' => [
                'POST /api/auth/login',
                'POST /api/auth/logout',
                'GET  /api/auth/me',
                'GET/POST /api/users',
                'GET/PUT  /api/users/{id}',
                'DELETE   /api/users/{id}',
                'GET/POST /api/teachers',
                'GET/PUT/DELETE /api/teachers/{id}',
                'GET/POST /api/dispatch',
                'GET/PUT  /api/dispatch/{id}',
                'GET/POST /api/followups',
                'GET/PUT  /api/followups/{id}',
                'GET /api/reports?type=consolidated|label|dispatch|school_address',
            ]
        ]);
}
