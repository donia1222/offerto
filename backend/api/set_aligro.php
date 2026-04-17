<?php
/**
 * Actualiza la URL del PDF de Aligro en la DB.
 * Uso (cada lunes): https://web.lweb.ch/oferto/api/set_aligro.php?url=https://www.aligro.ch/uploads/...pdf
 *
 * Protegido con token secreto para evitar acceso no autorizado.
 */
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/env.php';

// Token de seguridad — defínelo en .env como ADMIN_TOKEN=tuTokenSecreto
$token = env('ADMIN_TOKEN', '');
if ($token === '' || ($_GET['token'] ?? '') !== $token) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$url = trim($_GET['url'] ?? '');

if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'URL inválida']);
    exit;
}

if (!str_ends_with(strtolower($url), '.pdf')) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'La URL debe apuntar a un PDF']);
    exit;
}

$db = getDB();
$db->prepare("INSERT INTO config (clave, valor) VALUES ('aligro_pdf_url', ?)
              ON DUPLICATE KEY UPDATE valor = ?, updated_at = NOW()")
   ->execute([$url, $url]);

jsonOk(['clave' => 'aligro_pdf_url', 'valor' => $url]);
