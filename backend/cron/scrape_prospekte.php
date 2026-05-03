<?php
/**
 * Cron: scraping de catálogos/prospectos (tabla prospekte)
 * Ejecutar: cada lunes a las 07:00 — 0 7 * * 1 php /path/cron/scrape_prospekte.php
 * También se puede ejecutar manualmente: php scrape_prospekte.php
 */
define('CRON_MODE', true);
set_time_limit(120);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../scrapers/ProspekteScraper.php';

$logFile = __DIR__ . '/../logs/prospekte_' . date('Y-m-d') . '.log';

function logLine(string $msg): void {
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    @file_put_contents($logFile, $line, FILE_APPEND);
    echo $line;
}

try {
    logLine('=== Inicio scraping prospekte ===');
    $db      = getDB();
    $scraper = new ProspekteScraper($db);
    $total   = $scraper->run();

    foreach ($scraper->getLogs() as $l) logLine($l);
    logLine("=== Fin: $total entradas guardadas ===");

} catch (Throwable $e) {
    logLine('ERROR: ' . $e->getMessage());
    exit(1);
}
