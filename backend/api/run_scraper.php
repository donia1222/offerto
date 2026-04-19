<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
set_time_limit(600);
ignore_user_abort(true);

define('CRON_MODE', true);
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../scrapers/BaseScraper.php';
require_once __DIR__ . '/../scrapers/DeepLTranslator.php';
require_once __DIR__ . '/../scrapers/AligroScraper.php';
require_once __DIR__ . '/../scrapers/AligroPdfScraper.php';
require_once __DIR__ . '/../scrapers/TopCCScraper.php';
require_once __DIR__ . '/../scrapers/TopCCCatalogScraper.php';

// ?scraper=aligro_pdf    → PDF scraper de Aligro (prospecto semanal) [default]
// ?scraper=aligro_api    → API scraper de Aligro (solo manual)
// ?scraper=topcc         → TopCC weekly offers
// ?scraper=topcc_catalog → TopCC full product catalog (shop.topcc.ch)
// ?scraper=all           → todos
$scraper = $_GET['scraper'] ?? 'aligro_pdf';

try {
    $results = [];
    $db      = getDB();

    if ($scraper === 'aligro_api') {
        $s = new AligroScraper($db);
        $results['aligro_api'] = $s->run();
    }
    if ($scraper === 'all' || $scraper === 'aligro_pdf' || $scraper === 'aligro_all') {
        $s = new AligroPdfScraper($db);
        $results['aligro_pdf'] = $s->run();
    }
    if ($scraper === 'all' || $scraper === 'topcc') {
        $s = new TopCCScraper($db);
        $results['topcc'] = $s->run();
    }
    if ($scraper === 'all' || $scraper === 'topcc_catalog') {
        $s = new TopCCCatalogScraper($db);
        $results['topcc_catalog'] = $s->run();
    }

    jsonOk($results);
} catch (Throwable $e) {
    jsonError($e->getMessage(), 500);
}
