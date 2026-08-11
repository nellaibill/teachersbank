<?php
// Legacy entrypoint shim.
// Routes direct /api/teachers/index.php requests through the canonical router.

require_once '../../config/database.php';
require_once '../../middleware/cors.php';
require_once '../../middleware/barcode.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id = null;

require __DIR__ . '/router.php';
