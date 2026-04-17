<?php
/**
 * Cron: cada lunes a las 06:00
 * 0 6 * * 1 php /path/to/backend/cron/scrape_weekly.php >> /path/to/backend/logs/cron.log 2>&1
 */
define('CRON_MODE', true);
require_once __DIR__ . '/../config/db.php';

$logDir  = __DIR__ . '/../logs';
$logFile = $logDir . '/scraper_' . date('Y-m-d') . '.log';

if (!is_dir($logDir)) mkdir($logDir, 0755, true);

function cronLog(string $msg): void {
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND);
    echo $line;
}

$scrapers = [
    'Migros'        => __DIR__ . '/../scrapers/MigrosScraper.php',
    'Coop'          => __DIR__ . '/../scrapers/CoopScraper.php',
    'Lidl'          => __DIR__ . '/../scrapers/LidlScraper.php',
    'Aldi'          => __DIR__ . '/../scrapers/AldiScraper.php',
    'Denner'        => __DIR__ . '/../scrapers/DennerScraper.php',
    'Aligro'        => __DIR__ . '/../scrapers/AligroScraper.php',
    'TopCC'         => __DIR__ . '/../scrapers/TopCCScraper.php',
    'Transgourmet'  => __DIR__ . '/../scrapers/TransgourmetScraper.php',
];

cronLog('=== Scraping semanal iniciado ===');

foreach ($scrapers as $name => $file) {
    if (!file_exists($file)) {
        cronLog("[$name] SKIP — archivo no encontrado: $file");
        continue;
    }
    cronLog("[$name] Iniciando...");
    try {
        require_once $file;
        $class   = $name . 'Scraper';
        $scraper = new $class(getDB());
        $count   = $scraper->run();
        cronLog("[$name] OK — $count ofertas insertadas/actualizadas");
    } catch (Throwable $e) {
        cronLog("[$name] ERROR — " . $e->getMessage());
    }
}

cronLog('=== Scraping semanal finalizado ===');
