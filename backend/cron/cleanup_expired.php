<?php
/**
 * Cron: cada día a las 00:00
 * 0 0 * * * php /path/to/backend/cron/cleanup_expired.php >> /path/to/backend/logs/cron.log 2>&1
 */
define('CRON_MODE', true);
require_once __DIR__ . '/../config/db.php';

$logDir  = __DIR__ . '/../logs';
$logFile = $logDir . '/cleanup_' . date('Y-m-d') . '.log';

if (!is_dir($logDir)) mkdir($logDir, 0755, true);

function cronLog(string $msg): void {
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND);
    echo $line;
}

try {
    $pdo = getDB();

    // Marcar como inactivas las ofertas expiradas (no borrar — histórico)
    $stmt = $pdo->prepare("
        UPDATE ofertas SET activa = 0
        WHERE valido_hasta < CURDATE() AND activa = 1
    ");
    $stmt->execute();
    $updated = $stmt->rowCount();
    cronLog("Ofertas expiradas marcadas como inactivas: $updated");

    // Limpiar items de lista que ya no tienen oferta activa
    $stmt2 = $pdo->query("
        DELETE lc FROM listas_compra lc
        JOIN ofertas o ON o.id = lc.oferta_id
        WHERE o.activa = 0
    ");
    $cleaned = $stmt2->rowCount();
    cronLog("Items de lista eliminados (oferta expirada): $cleaned");

    cronLog('Limpieza completada OK');

} catch (Throwable $e) {
    cronLog('ERROR en cleanup: ' . $e->getMessage());
    exit(1);
}
