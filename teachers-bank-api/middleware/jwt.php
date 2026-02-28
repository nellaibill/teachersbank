<?php
// middleware/jwt.php
// Lightweight JWT implementation — no external library needed.
// Uses HS256 (HMAC-SHA256). Token stored in httpOnly cookie.

define('JWT_SECRET', 'TB_S3CR3T_K3Y_Ch@ng3_Th!s_In_Pr0duct!on_2025');
define('JWT_EXPIRY',  8 * 3600); // 8 hours
define('JWT_COOKIE',  'tb_token');

// ── Encode ────────────────────────────────────────────────────────────────────
function jwtEncode(array $payload): string {
    $header  = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRY;
    $payload = base64UrlEncode(json_encode($payload));
    $sig     = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

// ── Decode & verify ───────────────────────────────────────────────────────────
function jwtDecode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $sig] = $parts;
    $expected = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

    // Constant-time comparison to prevent timing attacks
    if (!hash_equals($expected, $sig)) return null;

    $data = json_decode(base64UrlDecode($payload), true);
    if (!$data || $data['exp'] < time()) return null; // expired

    return $data;
}

// ── Set httpOnly cookie ───────────────────────────────────────────────────────
function jwtSetCookie(string $token): void {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie(JWT_COOKIE, $token, [
        'expires'  => time() + JWT_EXPIRY,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,   // HTTPS only on production
        'httponly' => true,        // Not accessible via JS
        'samesite' => 'Lax',      // CSRF protection
    ]);
}

// ── Clear cookie (logout) ─────────────────────────────────────────────────────
function jwtClearCookie(): void {
    setcookie(JWT_COOKIE, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

// ── Get token from cookie ─────────────────────────────────────────────────────
function jwtGetFromCookie(): ?string {
    return $_COOKIE[JWT_COOKIE] ?? null;
}

// ── Require auth — call at top of protected routes ───────────────────────────
// Returns decoded payload or sends 401 and exits.
function requireAuth(): array {
    $token = jwtGetFromCookie();

    // Also support Authorization: Bearer <token> header (for API clients)
    if (!$token && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
        $bearer = $_SERVER['HTTP_AUTHORIZATION'];
        if (strpos($bearer, 'Bearer ') === 0) {
            $token = substr($bearer, 7);
        }
    }

    if (!$token) {
        sendError('Unauthorized — please log in', 401);
    }

    $payload = jwtDecode($token);
    if (!$payload) {
        jwtClearCookie();
        sendError('Session expired — please log in again', 401);
    }

    return $payload;
}

// ── Require admin role ────────────────────────────────────────────────────────
function requireAdmin(): array {
    $payload = requireAuth();
    if ($payload['role'] !== 'admin') {
        sendError('Forbidden — admin access required', 403);
    }
    return $payload;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}
