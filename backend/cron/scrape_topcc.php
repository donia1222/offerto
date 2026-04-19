<?php
/**
 * Cron: lunes 06:30 — TopCC publica sus ofertas semanales los lunes por la mañana,
 * no el domingo como el resto. Este script re-scrapea solo TopCC para recoger la KW nueva.
 * 30 6 * * 1 php /path/to/backend/cron/scrape_topcc.php >> /path/to/backend/logs/cron.log 2>&1
 */
define('CRON_MODE', true);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../scrapers/TopCCScraper.php';

$logDir  = __DIR__ . '/../logs';
$logFile = $logDir . '/scraper_' . date('Y-m-d') . '.log';

if (!is_dir($logDir)) mkdir($logDir, 0755, true);

function cronLog(string $msg): void {
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND);
    echo $line;
}

cronLog('=== TopCC Monday refresh iniciado ===');

try {
    $scraper = new TopCCScraper(getDB());
    $count   = $scraper->run();
    cronLog("[TopCC] OK — $count ofertas insertadas/actualizadas");
} catch (Throwable $e) {
    cronLog('[TopCC] ERROR — ' . $e->getMessage());
}

cronLog('=== TopCC Monday refresh finalizado ===');
