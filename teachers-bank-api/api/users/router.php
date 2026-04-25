<?php
// api/users/router.php
// All routes require auth. Create/Edit/Delete/Manage require admin.
//
// GET    /api/users          — list all users (admin/manager view)
// POST   /api/users          — create user (admin only)
// GET    /api/users/{id}     — get user
// PUT    /api/users/{id}     — update user (admin only)
// DELETE /api/users/{id}     — deactivate user (admin only)

if (!function_exists('logUsersApiContext')) {
    function logUsersApiContext(string $stage, array $context = []): void {
        $sanitized = $context;
        if (isset($sanitized['body']) && is_array($sanitized['body'])) {
            if (array_key_exists('password', $sanitized['body'])) {
                $sanitized['body']['password'] = '***';
            }
        }
        error_log('[TeachersBankAPI][users] ' . $stage . ' ' . json_encode($sanitized, JSON_UNESCAPED_UNICODE));
    }
}

if (!function_exists('stmtFetchAssocCompat')) {
    function stmtFetchAssocCompat(mysqli_stmt $stmt): ?array {
        if (method_exists($stmt, 'get_result')) {
            $result = $stmt->get_result();
            return $result ? ($result->fetch_assoc() ?: null) : null;
        }

        $meta = $stmt->result_metadata();
        if (!$meta) {
            return null;
        }

        $row = [];
        $bind = [];
        while ($field = $meta->fetch_field()) {
            $row[$field->name] = null;
            $bind[] = &$row[$field->name];
        }
        call_user_func_array([$stmt, 'bind_result'], $bind);

        if (!$stmt->fetch()) {
            return null;
        }

        $out = [];
        foreach ($row as $k => $v) {
            $out[$k] = $v;
        }
        return $out;
    }
}

if (!function_exists('stmtNumRowsCompat')) {
    function stmtNumRowsCompat(mysqli_stmt $stmt): int {
        $stmt->store_result();
        return $stmt->num_rows;
    }
}

switch ($method) {

    // ── GET ───────────────────────────────────────────────────────────────────
    case 'GET':
        $authUser = requireAuth(); // any logged-in user can call /me equivalent
        $conn = getDBConnection();

        if ($id) {
            // Single user — admin or self
            if ($authUser['role'] !== 'admin' && $authUser['user_id'] !== $id) {
                sendError('Forbidden', 403);
            }
            $stmt = $conn->prepare(
                'SELECT id, name, email, role, isActive, last_login, created_at FROM users WHERE id = ?'
            );
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $user = stmtFetchAssocCompat($stmt);
            $stmt->close();
            $conn->close();

            if (!$user) sendError('User not found', 404);
            sendSuccess(['user' => $user]);

        } else {
            // List — admin or manager (view only)
            requireAdminOrManager();
            $result = $conn->query(
                'SELECT id, name, email, role, isActive, last_login, created_at FROM users ORDER BY id ASC'
            );
            $users = $result->fetch_all(MYSQLI_ASSOC);
            $conn->close();
            sendSuccess(['users' => $users, 'total' => count($users)]);
        }
        break;

    // ── POST — Create user ────────────────────────────────────────────────────
    case 'POST':
        $authUser = requireAdmin();
        $body = getRequestBody();

        logUsersApiContext('create.request', [
            'method' => $method,
            'path' => $_SERVER['REQUEST_URI'] ?? '',
            'actor_id' => $authUser['user_id'] ?? null,
            'actor_role' => $authUser['role'] ?? null,
            'body' => $body,
        ]);

        $errors = validateRequired($body, ['name', 'email', 'password', 'role']);
        if ($errors) {
            logUsersApiContext('create.validation_failed', ['errors' => $errors, 'body' => $body]);
            sendError('Validation failed', 422, $errors);
        }

        if (!in_array($body['role'], ['admin', 'operator', 'manager'])) {
            logUsersApiContext('create.invalid_role', ['role' => $body['role'] ?? null]);
            sendError('Role must be admin, manager, or operator', 400);
        }
        if (!filter_var($body['email'], FILTER_VALIDATE_EMAIL)) {
            logUsersApiContext('create.invalid_email', ['email' => $body['email'] ?? null]);
            sendError('Invalid email address', 400);
        }
        if (strlen($body['password']) < 6) {
            logUsersApiContext('create.short_password', ['password_len' => strlen((string)($body['password'] ?? ''))]);
            sendError('Password must be at least 6 characters', 400);
        }

        $conn = getDBConnection();

        // Check duplicate email
        $stmt = $conn->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->bind_param('s', $body['email']);
        $stmt->execute();
        if (stmtNumRowsCompat($stmt) > 0) {
            $stmt->close(); $conn->close();
            logUsersApiContext('create.duplicate_email', ['email' => $body['email'] ?? null]);
            sendError('Email already exists', 409);
        }
        $stmt->close();

        $name     = sanitize($body['name']);
        $email    = sanitize($body['email']);
        $role     = $body['role'];
        $hash     = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        $isActive = isset($body['isActive']) ? (int)$body['isActive'] : 1;

        $stmt = $conn->prepare(
            'INSERT INTO users (name, email, password, role, isActive) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('ssssi', $name, $email, $hash, $role, $isActive);

        if (!$stmt->execute()) {
            logUsersApiContext('create.insert_failed', [
                'db_error' => $stmt->error,
                'db_errno' => $stmt->errno,
                'conn_error' => $conn->error,
                'email' => $email,
                'role' => $role,
                'isActive' => $isActive,
            ]);
            sendError('Failed to create user: ' . $conn->error, 500);
        }
        $newId = $stmt->insert_id;
        $stmt->close();
        $conn->close();

        logUsersApiContext('create.success', ['new_user_id' => $newId, 'email' => $email, 'role' => $role]);

        sendSuccess(['user' => ['id' => $newId, 'name' => $name, 'email' => $email, 'role' => $role]], 'User created successfully');
        break;

    // ── PUT — Update user ─────────────────────────────────────────────────────
    case 'PUT':
        if (!$id) sendError('User ID required', 400);
        $authUser = requireAuth();

        $body = getRequestBody();
        logUsersApiContext('update.request', [
            'target_user_id' => $id,
            'actor_id' => $authUser['user_id'] ?? null,
            'actor_role' => $authUser['role'] ?? null,
            'body' => $body,
        ]);

        // Admin can edit anyone; operator can only edit themselves (name/password only)
        if ($authUser['role'] !== 'admin' && $authUser['user_id'] !== $id) {
            logUsersApiContext('update.forbidden', ['target_user_id' => $id, 'actor_role' => $authUser['role'] ?? null]);
            sendError('Forbidden', 403);
        }

        $conn = getDBConnection();

        // Fetch existing user
        $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $user = stmtFetchAssocCompat($stmt);
        $stmt->close();
        if (!$user) { $conn->close(); sendError('User not found', 404); }

        // Build update fields
        $fields = [];
        $types  = '';
        $values = [];

        if (!empty($body['name'])) {
            $fields[] = 'name = ?';    $types .= 's'; $values[] = sanitize($body['name']);
        }
        if (!empty($body['email']) && $authUser['role'] === 'admin') {
            if (!filter_var($body['email'], FILTER_VALIDATE_EMAIL)) sendError('Invalid email', 400);
            $fields[] = 'email = ?';   $types .= 's'; $values[] = sanitize($body['email']);
        }
        if (!empty($body['password'])) {
            if (strlen($body['password']) < 6) sendError('Password must be at least 6 characters', 400);
            $fields[] = 'password = ?'; $types .= 's'; $values[] = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }
        // Only admin can change role and isActive
        if ($authUser['role'] === 'admin') {
            if (isset($body['role']) && in_array($body['role'], ['admin', 'operator', 'manager'])) {
                $fields[] = 'role = ?';     $types .= 's'; $values[] = $body['role'];
            }
            if (isset($body['isActive'])) {
                $fields[] = 'isActive = ?'; $types .= 'i'; $values[] = (int)$body['isActive'];
            }
        }

        if (empty($fields)) sendError('No fields to update', 400);

        $types   .= 'i';
        $values[] = $id;
        $sql      = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt     = $conn->prepare($sql);
        $stmt->bind_param($types, ...$values);
        if (!$stmt->execute()) {
            logUsersApiContext('update.execute_failed', [
                'target_user_id' => $id,
                'db_error' => $stmt->error,
                'db_errno' => $stmt->errno,
                'sql' => $sql,
            ]);
            sendError('Failed to update user', 500);
        }
        $stmt->close();
        $conn->close();

        logUsersApiContext('update.success', ['target_user_id' => $id]);

        sendSuccess([], 'User updated successfully');
        break;

    // ── DELETE — Deactivate user ──────────────────────────────────────────────
    case 'DELETE':
        if (!$id) sendError('User ID required', 400);
        $authUser = requireAdmin();

        // Prevent self-deactivation
        if ($authUser['user_id'] === $id) {
            sendError('You cannot deactivate your own account', 400);
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare('UPDATE users SET isActive = 0 WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        $conn->close();

        if ($affected === 0) sendError('User not found', 404);
        sendSuccess([], 'User deactivated successfully');
        break;

    default:
        sendError('Method not allowed', 405);
}
