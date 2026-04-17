<?php
/**
 * Endpoint temporal para ejecutar el scraper de Transgourmet manualmente.
 * DELETE este archivo después de confirmar que funciona.
 */
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

define('CRON_MODE', true);  // activa logs

require_once __DIR__ . '/../scrapers/BaseScraper.php';
require_once __DIR__ . '/../scrapers/TransgourmetScraper.php';

set_time_limit(120);

$log = [];
// Redirect echo output to our log array
ob_start();

try {
    $scraper = new TransgourmetScraper(getDB());
    $count   = $scraper->run();
    $output  = ob_get_clean();
    jsonOk([
        'count'  => $count,
        'output' => $output,
    ]);
} catch (Throwable $e) {
    $output = ob_get_clean();
    jsonError('Error: ' . $e->getMessage() . "\n" . $output, 500);
}
