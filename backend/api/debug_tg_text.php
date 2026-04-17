<?php
require_once __DIR__ . '/_cors.php';
set_time_limit(60);

// Descargar PDF
$ch = curl_init('https://www-static.transgourmet.ch/public/2026-04/kw17-agh-aktionen-d.pdf');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_USERAGENT      => 'Mozilla/5.0',
    CURLOPT_HTTPHEADER     => ['Referer: https://www.transgourmet.ch/'],
]);
$pdf  = curl_exec($ch);
curl_close($ch);

$tmp = sys_get_temp_dir() . '/tg_debug.pdf';
file_put_contents($tmp, $pdf);
$text = shell_exec('pdftotext -layout ' . escapeshellarg($tmp) . ' - 2>/dev/null');
unlink($tmp);

// Mostrar primeras 200 líneas con números de línea + hex de cada char especial
$lines = explode("\n", $text);
$out   = [];

foreach (array_slice($lines, 0, 200) as $i => $line) {
    if (trim($line) === '') continue;
    // Marcar caracteres no-ASCII
    $marked = preg_replace_callback('/[^\x20-\x7E]/', function($m) {
        return '[U+' . strtoupper(bin2hex(mb_convert_encoding($m[0], 'UTF-16BE', 'UTF-8'))) . ']';
    }, $line);
    $out[] = sprintf('%04d | %s', $i + 1, $marked);
}

// También buscar líneas que contengan "Art" para ver el patrón exacto
$artLines = [];
foreach ($lines as $i => $line) {
    if (stripos($line, 'art') !== false) {
        $artLines[] = sprintf('%04d | %s', $i + 1, $line);
        if (count($artLines) >= 30) break;
    }
}

jsonOk([
    'total_lines' => count($lines),
    'total_chars' => strlen($text),
    'first_200_lines' => $out,
    'art_lines_sample' => $artLines,
]);
