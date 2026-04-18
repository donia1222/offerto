<?php
require_once __DIR__ . '/_cors.php';

$body = json_decode(file_get_contents('php://input'), true);
$log  = date('Y-m-d H:i:s') . ' | ' . json_encode($body) . "\n";
file_put_contents(__DIR__ . '/../logs/token_debug.log', $log, FILE_APPEND);
jsonOk(['received' => $body]);
