<?php
/**
 * CORS + JSON headers — include en cada endpoint
 */
require_once __DIR__ . '/../config/constants.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Key');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function jsonOk(mixed $datos, int $total = 0, int $pagina = 1): void {
    echo json_encode([
        'status'  => 'ok',
        'total'   => $total ?: (is_array($datos) ? count($datos) : 0),
        'pagina'  => $pagina,
        'limite'  => ITEMS_PER_PAGE,
        'datos'   => $datos,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode([
        'status'  => 'error',
        'message' => $message,
        'datos'   => null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
