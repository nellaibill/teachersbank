<?php
// Legacy entrypoint shim.
// Routes direct /api/teachers/single.php?id={id} requests through the canonical router.

require_once '../../config/database.php';
require_once '../../middleware/cors.php';
require_once '../../middleware/barcode.php';

setCORSHeaders();

$id = (int)($_GET['id'] ?? 0);
if (!$id) sendError('Teacher ID is required', 400);

$method = $_SERVER['REQUEST_METHOD'];

require __DIR__ . '/router.php';
