<?php
require_once __DIR__ . '/_cors.php';

$url  = 'https://www.aligro.ch/actions?page=1&limit=3';
$opts = stream_context_create([
    'http' => [
        'method'  => 'GET',
        'header'  => "Cookie: aligro_customer_type=2\r\nAccept: application/json\r\n",
        'timeout' => 15,
    ]
]);

$raw = @file_get_contents($url, false, $opts);
$data = json_decode($raw, true);

$items = $data['articles']['items'] ?? [];

$out = [];
foreach (array_slice($items, 0, 3) as $item) {
    $out[] = [
        'nombre_keys'     => array_keys($item['translations'] ?? []),
        'translations'    => $item['translations'] ?? [],
        'images_keys'     => array_keys($item['images'] ?? []),
        'images'          => $item['images'] ?? [],
    ];
}

header('Content-Type: application/json');
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
