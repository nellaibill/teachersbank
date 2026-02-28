<?php
// api/users/router.php
// All routes require auth. Create/Edit/Delete/Manage require admin.
//
// GET    /api/users          — list all users (admin only)
// POST   /api/users          — create user (admin only)
// GET    /api/users/{id}     — get user
// PUT    /api/users/{id}     — update user (admin only)
// DELETE /api/users/{id}     — deactivate user (admin only)

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
            $user = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            $conn->close();

            if (!$user) sendError('User not found', 404);
            sendSuccess(['user' => $user]);

        } else {
            // List — admin only
            requireAdmin();
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
        requireAdmin();
        $body = getRequestBody();

        $errors = validateRequired($body, ['name', 'email', 'password', 'role']);
        if ($errors) sendError('Validation failed', 422, $errors);

        if (!in_array($body['role'], ['admin', 'operator'])) {
            sendError('Role must be admin or operator', 400);
        }
        if (!filter_var($body['email'], FILTER_VALIDATE_EMAIL)) {
            sendError('Invalid email address', 400);
        }
        if (strlen($body['password']) < 6) {
            sendError('Password must be at least 6 characters', 400);
        }

        $conn = getDBConnection();

        // Check duplicate email
        $stmt = $conn->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->bind_param('s', $body['email']);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $stmt->close(); $conn->close();
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
            sendError('Failed to create user: ' . $conn->error, 500);
        }
        $newId = $stmt->insert_id;
        $stmt->close();
        $conn->close();

        sendSuccess(['user' => ['id' => $newId, 'name' => $name, 'email' => $email, 'role' => $role]], 'User created successfully');
        break;

    // ── PUT — Update user ─────────────────────────────────────────────────────
    case 'PUT':
        if (!$id) sendError('User ID required', 400);
        $authUser = requireAuth();

        // Admin can edit anyone; operator can only edit themselves (name/password only)
        if ($authUser['role'] !== 'admin' && $authUser['user_id'] !== $id) {
            sendError('Forbidden', 403);
        }

        $body = getRequestBody();
        $conn = getDBConnection();

        // Fetch existing user
        $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
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
            if (isset($body['role']) && in_array($body['role'], ['admin', 'operator'])) {
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
        $stmt->execute();
        $stmt->close();
        $conn->close();

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
