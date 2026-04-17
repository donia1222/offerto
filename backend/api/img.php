<?php
/**
 * Image proxy with local cache.
 * Usage: /api/img.php?url=https://...
 * Caches to /backend/images/cache/ and serves from there.
 */

$url = trim($_GET['url'] ?? '');
if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400); exit;
}

// Only allow known store domains
$allowed = ['aligro.ch', 'topcc.ch', 'transgourmet.ch', 'prodega.ch'];
$host = parse_url($url, PHP_URL_HOST);
$ok   = false;
foreach ($allowed as $d) { if (str_ends_with($host, $d)) { $ok = true; break; } }
if (!$ok) { http_response_code(403); exit; }

// Cache file path
$cacheDir = __DIR__ . '/../images/cache/';
if (!is_dir($cacheDir)) mkdir($cacheDir, 0755, true);

$cacheFile = $cacheDir . md5($url) . '.jpg';

// Serve from cache if exists
if (file_exists($cacheFile)) {
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=604800'); // 7 days
    readfile($cacheFile);
    exit;
}

// Fetch from origin
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_USERAGENT      => 'Mozilla/5.0',
    CURLOPT_HTTPHEADER     => ['Referer: https://www.aligro.ch/'],
]);
$data = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($code !== 200 || !$data) {
    http_response_code(404); exit;
}

// Save to cache
file_put_contents($cacheFile, $data);

// Serve
$mime = str_contains($type, 'webp') ? 'image/webp' : 'image/jpeg';
header("Content-Type: $mime");
header('Cache-Control: public, max-age=604800');
echo $data;
