<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

set_time_limit(60);

// 1. Obtener URL del PDF actual
$folleto = @file_get_contents('https://web.lweb.ch/oferto/api/folleto.php');
$data    = json_decode($folleto, true);
$pdfUrl  = $data['datos']['pdf_url'] ?? null;

if (!$pdfUrl) jsonError('No se encontró PDF', 404);

// 2. Descargar PDF
$ch = curl_init($pdfUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_USERAGENT      => 'Mozilla/5.0',
]);
$pdfContent = curl_exec($ch);
$httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$pdfContent) jsonError("No se pudo descargar PDF ($httpCode)", 500);

$size = strlen($pdfContent);

// 3. Intentar extraer texto crudo del PDF (sin librería)
// Los PDFs text-based tienen streams de texto legibles
preg_match_all('/\(([^\)]{3,80})\)/', $pdfContent, $matches);
$rawStrings = array_unique($matches[1]);

// Filtrar strings que parecen texto real (no coordenadas ni basura)
$textLines = array_filter($rawStrings, function($s) {
    $s = trim($s);
    if (strlen($s) < 3) return false;
    // Debe tener letras
    if (!preg_match('/[a-zA-ZäöüÄÖÜéèàáç]/u', $s)) return false;
    return true;
});

// 4. Ver si pdftotext está disponible
$hasPdftotext = !empty(shell_exec('which pdftotext 2>/dev/null'));

// 5. Si hay pdftotext, usarlo
$pdfText = '';
if ($hasPdftotext) {
    $tmpFile = sys_get_temp_dir() . '/transgourmet_' . time() . '.pdf';
    file_put_contents($tmpFile, $pdfContent);
    $pdfText = shell_exec("pdftotext -layout '$tmpFile' - 2>/dev/null");
    unlink($tmpFile);
}

jsonOk([
    'pdf_url'          => $pdfUrl,
    'pdf_size_kb'      => round($size / 1024),
    'has_pdftotext'    => $hasPdftotext,
    'pdftotext_sample' => $pdfText ? mb_substr($pdfText, 0, 2000) : null,
    'raw_strings_count'=> count($textLines),
    'raw_sample'       => array_values(array_slice($textLines, 0, 50)),
]);
