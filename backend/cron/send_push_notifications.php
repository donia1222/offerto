<?php
/**
 * Cron: envía push notifications a dispositivos registrados.
 * Ejecutar: 0 7 * * 1 php /path/cron/send_push_notifications.php
 */
require_once __DIR__ . '/../config/db.php';

$db     = getDB();
$tokens = $db->query("SELECT * FROM device_tokens")->fetchAll();

if (empty($tokens)) exit;

$messages = [];

foreach ($tokens as $row) {
    $token      = $row['token'];
    $stores     = array_filter(explode(',', $row['stores']     ?? ''));
    $categories = array_filter(explode(',', $row['categories'] ?? ''));
    $watchlist  = array_filter(explode(',', $row['watchlist']  ?? ''));

    $storeNames = array_map(fn($s) =>
        $s === 'aligro' ? 'Aligro' : ($s === 'topcc' ? 'TopCC' : 'Transgourmet'),
    $stores);

    // Comprobar tiendas
    foreach ($stores as $slug) {
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM ofertas o
            JOIN tiendas t ON t.id = o.tienda_id
            WHERE t.slug = ? AND o.activa = 1 AND o.valido_hasta >= CURDATE()
        ");
        $stmt->execute([$slug]);
        if ($stmt->fetchColumn() > 0) {
            $messages[] = [
                'to'    => $token,
                'title' => 'Offerto 🏪',
                'body'  => 'Neue Angebote bei ' . implode(', ', $storeNames) . '!',
                'sound' => 'default',
            ];
            break;
        }
    }

    // Comprobar watchlist
    foreach ($watchlist as $term) {
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM ofertas
            WHERE activa = 1 AND valido_hasta >= CURDATE()
            AND (nombre_de LIKE ? OR nombre_fr LIKE ? OR nombre_it LIKE ?)
        ");
        $like = '%' . $term . '%';
        $stmt->execute([$like, $like, $like]);
        if ($stmt->fetchColumn() > 0) {
            $messages[] = [
                'to'    => $token,
                'title' => 'Offerto 👀',
                'body'  => ucfirst($term) . ' ist gerade im Angebot!',
                'sound' => 'default',
            ];
            break;
        }
    }
}

if (empty($messages)) {
    echo "No messages to send.\n";
    exit;
}

// Enviar a Expo Push API (chunks de 100)
foreach (array_chunk($messages, 100) as $chunk) {
    $ch = curl_init('https://exp.host/--/api/v2/push/send');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($chunk),
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    echo "Sent " . count($chunk) . " notifications. Response: $response\n";
}
