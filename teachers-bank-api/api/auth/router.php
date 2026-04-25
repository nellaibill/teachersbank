<?php
// api/auth/router.php
// POST /api/auth/login    — login, sets httpOnly cookie AND returns token in body (for Postman)
// POST /api/auth/logout   — clear cookie
// GET  /api/auth/me       — get current user from token

$authAction = $segments[2] ?? '';

switch ($method) {

    case 'POST':
        if ($authAction === 'echo') {
            // Temporary debug endpoint to inspect the parsed request body
            $body = getRequestBody();
            sendSuccess(['received' => $body], 'Echo');
        }
        if ($authAction === 'login') {
            $body  = getRequestBody();
            $email = trim($body['email'] ?? '');
            $pass  = $body['password'] ?? '';

            if (!$email || !$pass) {
                sendError('Email and password are required', 400);
            }

            $conn = getDBConnection();
            // Query the standard auth schema (name, email)
            $stmt = $conn->prepare(
                'SELECT id, name, email, password, role, isActive FROM users WHERE email = ? LIMIT 1'
            );
            if ($stmt === false) {
                sendError('Database query failed', 500, [$conn->error]);
            }
            $stmt->bind_param('s', $email);
            $stmt->execute();
            $user = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if ($user) {
                $user['name']  = $user['name'] ?? '';
                $user['email'] = $user['email'] ?? '';
            }

            if (!$user || !password_verify($pass, $user['password'])) {
                sendError('Invalid email or password', 401);
            }

            if (!$user['isActive']) {
                sendError('Your account has been deactivated. Contact admin.', 403);
            }

            // Update last_login
            $conn->query("UPDATE users SET last_login = NOW() WHERE id = {$user['id']}");
            $conn->close();

            $payload = [
                'user_id' => $user['id'],
                'name'    => $user['name'],
                'email'   => $user['email'],
                'role'    => $user['role'],
            ];
            $token = jwtEncode($payload);

            // Set httpOnly cookie (for browser/UI)
            jwtSetCookie($token);

            // Also return token in response body (for Postman / mobile apps)
            sendSuccess([
                'token' => $token,
                'user'  => [
                    'id'    => $user['id'],
                    'name'  => $user['name'],
                    'email' => $user['email'],
                    'role'  => $user['role'],
                ]
            ], 'Login successful');

        } elseif ($authAction === 'logout') {
            jwtClearCookie();
            sendSuccess([], 'Logged out successfully');

        } else {
            sendError('Not found', 404);
        }
        break;

    case 'GET':
        if ($authAction === 'me') {
            $payload = requireAuth();

            $conn = getDBConnection();
            $stmt = $conn->prepare(
                'SELECT id, name, email, role, isActive, last_login FROM users WHERE id = ? LIMIT 1'
            );
            if ($stmt === false) {
                sendError('Database query failed', 500, [$conn->error]);
            }
            $stmt->bind_param('i', $payload['user_id']);
            $stmt->execute();
            $user = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            $conn->close();

            if (!$user || !$user['isActive']) {
                jwtClearCookie();
                sendError('Account not found or deactivated', 401);
            }

            // Normalize response shape
            $out = [
                'id'    => $user['id'],
                'name'  => $user['name'] ?? '',
                'email' => $user['email'] ?? '',
                'role'  => $user['role'],
            ];

            sendSuccess(['user' => $out], 'Authenticated');
        } else {
            sendError('Not found', 404);
        }
        break;

    default:
        sendError('Method not allowed', 405);
}