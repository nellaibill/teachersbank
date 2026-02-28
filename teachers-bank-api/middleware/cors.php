<?php
function setCORSHeaders() {
    // Allow these origins — add your production domain here too
    $allowed_origins = [
        'http://localhost:3000',
        'http://localhost',
        'https://iiplrgscbse.com',
        'http://iiplrgscbse.com',
    ];

    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    if (in_array($origin, $allowed_origins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        // Allow all during development — restrict in production
        header('Access-Control-Allow-Origin: *');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
    header('Access-Control-Max-Age: 86400');
    header('Content-Type: application/json');

    // Handle preflight OPTIONS request immediately
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function sendSuccess($data = [], $message = 'Success') {
    sendResponse(['success' => true, 'message' => $message, 'data' => $data]);
}

function sendError($message = 'Error', $statusCode = 400, $errors = []) {
    sendResponse(['success' => false, 'message' => $message, 'errors' => $errors], $statusCode);
}

function getRequestBody() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function validateRequired($data, $fields) {
    $errors = [];
    foreach ($fields as $field) {
        if (empty($data[$field])) {
            $errors[] = "$field is required";
        }
    }
    return $errors;
}

function sanitize($value) {
    return htmlspecialchars(strip_tags(trim($value)));
}