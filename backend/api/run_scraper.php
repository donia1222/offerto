<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
set_time_limit(300);
ignore_user_abort(true);

// SOLO PARA PRUEBAS — eliminar en producción
// ?page=1  → procesa solo esa página (48 artículos)
// sin parámetro → procesa todas
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../scrapers/BaseScraper.php';
require_once __DIR__ . '/../scrapers/AligroScraper.php';
require_once __DIR__ . '/../scrapers/TopCCScraper.php';

$scraper = $_GET['scraper'] ?? 'aligro';
$onlyPage = isset($_GET['page']) ? (int) $_GET['page'] : null;

try {
    $results = [];
    if ($scraper === 'all' || $scraper === 'aligro') {
        $s = new AligroScraper(getDB());
        $results['aligro'] = $s->run($onlyPage);
    }
    if ($scraper === 'all' || $scraper === 'topcc') {
        $s = new TopCCScraper(getDB());
        $results['topcc'] = $s->run();
    }
    jsonOk($results);
} catch (Throwable $e) {
    jsonError($e->getMessage(), 500);
}
