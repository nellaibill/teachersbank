<?php
function setCORSHeaders() {
    $allowed_origins = [
        'http://localhost:3000',
        'http://localhost',
        'https://iiplrgscbse.com',
        'http://iiplrgscbse.com',
    ];

    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    // Access-Control-Allow-Origin is handled at the Apache level in .htaccess
    // to ensure a single, consistent header and avoid duplicate values.

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
    header('Access-Control-Max-Age: 86400');
    header('Content-Type: application/json');

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
    $data = json_decode($input, true);
    if (is_array($data)) return $data;
    // Fallback to $_POST for form-encoded requests
    if (!empty($_POST)) return $_POST;
    // Try parsing URL-encoded body as a last resort
    parse_str($input, $parsed);
    if (!empty($parsed)) return $parsed;
    return [];
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