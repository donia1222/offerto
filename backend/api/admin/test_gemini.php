<?php
// DIAGNOSTICO TEMPORAL — BORRAR DESPUES
header('Content-Type: application/json');

require_once __DIR__ . '/../../config/db.php'; // carga env
$key = env('GEMINI_API_KEY', '');

// Lista modelos disponibles
$ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models?key=$key&pageSize=50");
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$models = json_decode($resp, true);
$names = array_column($models['models'] ?? [], 'name');

// Filtra solo los que soportan generateContent
$flash = array_filter($names, fn($n) => str_contains($n, 'flash') || str_contains($n, 'pro'));

echo json_encode([
    'http_code'       => $code,
    'key_prefix'      => substr($key, 0, 10) . '...',
    'flash_models'    => array_values($flash),
    'all_models'      => array_values($names),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
