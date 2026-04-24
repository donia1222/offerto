<?php
/**
 * Asigna imagen_local a productos nuevos (imagen_local IS NULL).
 * Se ejecuta automáticamente al final de scrape_weekly.php.
 * También puede correr manual: php cron/assign_images.php
 *
 * Cron standalone (opcional): 0 8 * * 0 php /path/to/backend/cron/assign_images.php
 */
define('CRON_MODE', true);
require_once __DIR__ . '/../config/db.php';

$logDir  = __DIR__ . '/../logs';
$logFile = $logDir . '/assign_images_' . date('Y-m-d') . '.log';
if (!is_dir($logDir)) mkdir($logDir, 0755, true);

function assignLog(string $msg): void {
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND);
    echo $line;
}

try {
    $pdo       = getDB();
    $openaiKey = env('OPENAI_API_KEY', '');

    // Banco de imágenes
    $bank     = $pdo->query("SELECT slug, nombre, categoria, keywords FROM imagen_banco WHERE activa=1")->fetchAll(PDO::FETCH_ASSOC);
    $bankText = implode("\n", array_map(fn($i) => "{$i['slug']} | {$i['nombre']} | {$i['categoria']} | {$i['keywords']}", $bank));

    // Índice de fallback por categoría
    $byCategoria = [];
    foreach ($bank as $img) $byCategoria[$img['categoria']][] = $img['slug'];
    $allSlugs = array_column($bank, 'slug');

    // Total productos sin imagen
    $total = (int)$pdo->query("SELECT COUNT(*) FROM ofertas WHERE activa=1 AND imagen_local IS NULL")->fetchColumn();
    if ($total === 0) {
        assignLog("Sin productos nuevos — nada que asignar.");
        exit(0);
    }
    assignLog("Productos sin imagen: $total — procesando en lotes de 30...");

    $offset       = 0;
    $totalAsigned = 0;

    while (true) {
        $ofertas = $pdo->query("
            SELECT o.id, o.nombre_de, c.slug AS cat
            FROM ofertas o
            LEFT JOIN categorias c ON c.id = o.categoria_id
            WHERE o.activa=1 AND o.imagen_local IS NULL
            ORDER BY o.id ASC LIMIT 30
        ")->fetchAll(PDO::FETCH_ASSOC);

        if (empty($ofertas)) break;

        $productList = implode("\n", array_map(fn($o) => "- {$o['nombre_de']}", $ofertas));
        $prompt = "Tienes un banco de imágenes genéricas para productos de supermercado (formato: slug | nombre | categoría | keywords):\n\n$bankText\n\nAsigna la imagen más adecuada a cada producto. Si ninguna encaja bien, usa null.\n\nProductos:\n$productList\n\nResponde SOLO con JSON válido, sin markdown:\n{\"nombre_producto\": \"slug_o_null\"}";

        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => ["Content-Type: application/json", "Authorization: Bearer $openaiKey"],
            CURLOPT_POSTFIELDS     => json_encode([
                'model'       => 'gpt-4o-mini',
                'temperature' => 0,
                'messages'    => [
                    ['role' => 'system', 'content' => 'Asigna imágenes genéricas a productos de supermercado. Responde solo con JSON válido.'],
                    ['role' => 'user',   'content' => $prompt],
                ],
            ]),
            CURLOPT_TIMEOUT => 60,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $assignments = [];
        if ($httpCode === 200) {
            $data = json_decode($response, true);
            $text = $data['choices'][0]['message']['content'] ?? '';
            $text = preg_replace('/^```(?:json)?\s*|\s*```$/s', '', trim($text));
            if (!str_starts_with(trim($text), '{')) {
                preg_match('/\{.*\}/s', $text, $m);
                $text = $m[0] ?? '{}';
            }
            $assignments = json_decode($text, true) ?: [];
        } else {
            assignLog("OpenAI error HTTP $httpCode — usando fallback por categoría para este lote");
        }

        $stmt = $pdo->prepare("UPDATE ofertas SET imagen_local=? WHERE id=?");
        $loteAsigned = 0;
        foreach ($ofertas as $oferta) {
            $slug = $assignments[$oferta['nombre_de']] ?? null;
            if (!$slug || $slug === 'null') {
                $cat  = $oferta['cat'] ?? '';
                $pool = $byCategoria[$cat] ?? $allSlugs;
                $slug = $pool[array_rand($pool)];
            }
            $stmt->execute(["$slug.png", $oferta['id']]);
            $loteAsigned++;
        }
        $totalAsigned += $loteAsigned;
        assignLog("Lote offset $offset: " . count($ofertas) . " procesados, $loteAsigned asignados");
        $offset += count($ofertas);
    }

    // Log en BD
    try {
        $pdo->prepare("INSERT INTO gemini_runs (productos_procesados, asignaciones_nuevas, errores, duracion_ms, `trigger`) VALUES (?,?,?,?,?)")
            ->execute([$totalAsigned, $totalAsigned, 0, 0, 'cron']);
    } catch (Exception $e) {}

    assignLog("=== Asignación completada: $totalAsigned imágenes asignadas ===");

} catch (Throwable $e) {
    assignLog("ERROR: " . $e->getMessage());
    exit(1);
}
