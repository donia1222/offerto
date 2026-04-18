<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('POST required', 405);

$body = json_decode(file_get_contents('php://input'), true);
$token      = trim($body['token']      ?? '');
$stores     = trim($body['stores']     ?? '');
$categories = trim($body['categories'] ?? '');
$watchlist  = trim($body['watchlist']  ?? '');

if (!$token) jsonError('token required');

$db = getDB();
$db->prepare("
    INSERT INTO device_tokens (token, stores, categories, watchlist)
    VALUES (:token, :stores, :categories, :watchlist)
    ON DUPLICATE KEY UPDATE
        stores     = VALUES(stores),
        categories = VALUES(categories),
        watchlist  = VALUES(watchlist),
        updated_at = NOW()
")->execute([
    ':token'      => $token,
    ':stores'     => $stores,
    ':categories' => $categories,
    ':watchlist'  => $watchlist,
]);

jsonOk(['registered' => true]);
