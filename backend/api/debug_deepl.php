<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

$key = env('DEEPL_API_KEY', '');

// Test llamada a DeepL
$body = 'source_lang=FR&target_lang=DE&text=' . urlencode('Salade Pommée');
$ch   = curl_init('https://api-free.deepl.com/v2/translate');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => [
        'Authorization: DeepL-Auth-Key ' . $key,
        'Content-Type: application/x-www-form-urlencoded',
    ],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

jsonOk([
    'key_loaded'   => !empty($key),
    'key_preview'  => $key ? substr($key, 0, 8) . '...' : 'EMPTY',
    'deepl_status' => $httpCode,
    'deepl_result' => json_decode($response, true),
]);
