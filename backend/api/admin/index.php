<?php
error_reporting(E_ALL);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode(['error' => "$errstr in $errfile:$errline"]);
    exit;
});
set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
    exit;
});

// API Admin — protegida por secret key
require_once __DIR__ . '/../_cors.php';

// Verificar secret key
$key = $_SERVER['HTTP_X_ADMIN_KEY'] ?? $_GET['key'] ?? '';
if ($key !== 'offerto_admin_2026') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// env() + DB via config (lee host/user/pass del .env)
require_once __DIR__ . '/../../config/db.php';
$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$action = $_GET['action'] ?? '';

header('Content-Type: application/json');

// ── GET stats ────────────────────────────────────────────────────────────────
if ($action === 'stats') {
    try {
        $total     = $pdo->query("SELECT COUNT(*) FROM ofertas WHERE activa=1")->fetchColumn();
        $sinImagen = $pdo->query("SELECT COUNT(*) FROM ofertas WHERE activa=1 AND imagen_local IS NULL")->fetchColumn();
        $ultimoRun = null;
        try {
            $ultimoRun = $pdo->query("SELECT * FROM gemini_runs ORDER BY run_at DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            // tabla gemini_runs aún no existe — ignorar
        }
        echo json_encode([
            'total'      => (int)$total,
            'con_imagen' => (int)$total - (int)$sinImagen,
            'sin_imagen' => (int)$sinImagen,
            'ultimo_run' => $ultimoRun ?: null,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ── GET productos ─────────────────────────────────────────────────────────────
if ($action === 'productos') {
    $tienda    = $_GET['tienda']     ?? '';
    $sinImagen = ($_GET['sin_imagen'] ?? '') === '1';
    $pagina    = max(1, (int)($_GET['pagina'] ?? 1));
    $limite    = 50;
    $offset    = ($pagina - 1) * $limite;

    $where  = 'WHERE o.activa=1';
    $params = [];
    if ($tienda)    { $where .= ' AND t.slug=?'; $params[] = $tienda; }
    if ($sinImagen)   $where .= ' AND o.imagen_local IS NULL';

    $stmt = $pdo->prepare("
        SELECT o.id, o.nombre_de, o.imagen_local, o.valido_hasta,
               t.slug AS tienda_slug, t.nombre AS tienda_nombre,
               c.slug AS categoria_slug
        FROM ofertas o
        LEFT JOIN tiendas t ON t.id=o.tienda_id
        LEFT JOIN categorias c ON c.id=o.categoria_id
        $where ORDER BY o.created_at DESC LIMIT $limite OFFSET $offset
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $total = $pdo->prepare("SELECT COUNT(*) FROM ofertas o LEFT JOIN tiendas t ON t.id=o.tienda_id $where");
    $total->execute($params);

    echo json_encode(['datos' => $rows, 'total' => (int)$total->fetchColumn(), 'pagina' => $pagina]);
    exit;
}

// ── GET imagenes ──────────────────────────────────────────────────────────────
if ($action === 'imagenes') {
    $rows = $pdo->query("SELECT * FROM imagen_banco ORDER BY categoria, slug")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['datos' => $rows]);
    exit;
}

// ── GET logs ──────────────────────────────────────────────────────────────────
if ($action === 'logs') {
    $rows = $pdo->query("SELECT id, run_at, productos_procesados, asignaciones_nuevas, errores, duracion_ms, `trigger` FROM gemini_runs ORDER BY run_at DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['datos' => $rows]);
    exit;
}

// ── POST override ─────────────────────────────────────────────────────────────
if ($action === 'override' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body      = json_decode(file_get_contents('php://input'), true);
    $ofertaId  = (int)($body['oferta_id'] ?? 0);
    $slug      = $body['imagen_slug'] ?? '';
    $valor     = $slug ? "$slug.png" : null;
    $stmt = $pdo->prepare("UPDATE ofertas SET imagen_local=? WHERE id=?");
    $stmt->execute([$valor, $ofertaId]);
    echo json_encode(['ok' => true]);
    exit;
}

// ── PUT imagenes (keywords) ───────────────────────────────────────────────────
if ($action === 'imagen_update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body     = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("UPDATE imagen_banco SET keywords=?, activa=? WHERE id=?");
    $stmt->execute([$body['keywords'], $body['activa'], $body['id']]);
    echo json_encode(['ok' => true]);
    exit;
}

// ── POST assign_images (OpenAI gpt-4o-mini) ───────────────────────────────────
if ($action === 'assign_images') {
    $openaiKey = env('OPENAI_API_KEY', '');
    $start     = microtime(true);

    // Banco de imágenes
    $bank     = $pdo->query("SELECT slug, nombre, categoria, keywords FROM imagen_banco WHERE activa=1")->fetchAll(PDO::FETCH_ASSOC);
    $bankText = implode("\n", array_map(fn($i) => "{$i['slug']} | {$i['nombre']} | {$i['categoria']} | {$i['keywords']}", $bank));

    // Índice de fallback: categoria → slugs disponibles
    $byCategoria = [];
    $bankTokens  = [];
    foreach ($bank as $img) {
        $byCategoria[$img['categoria']][] = $img['slug'];
        $raw = strtolower($img['nombre'] . ' ' . $img['categoria'] . ' ' . $img['keywords']);
        $bankTokens[$img['slug']] = preg_split('/[\s,;]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
    }
    $allSlugs = array_column($bank, 'slug');

    // Mapa de categorias DB → categorias imagen_banco
    $catMap = [
        'milch'    => ['milch', 'kaese'],
        'fleisch'  => ['fleisch', 'fisch', 'wurst'],
        'gemuese'  => ['gemuese'],
        'bakery'   => ['bakery'],
        'getraenke'=> ['getraenke'],
        'snacks'   => ['snacks', 'deli'],
        'haushalt' => ['haushalt'],
        'hygiene'  => ['hygiene'],
    ];

    // Fallback por keywords del nombre del producto
    $keywordFallback = function(string $nombre) use ($bankTokens): ?string {
        $stop  = ['de','du','le','la','les','und','mit','per','pro','con','von','aus','für','die','der','das','ein','une','des'];
        $words = array_filter(
            preg_split('/[\s,\-\/]+/', strtolower($nombre), -1, PREG_SPLIT_NO_EMPTY),
            fn($w) => strlen($w) > 2 && !in_array($w, $stop)
        );
        $best = ['slug' => null, 'score' => 0];
        foreach ($bankTokens as $slug => $tokens) {
            $score = count(array_intersect($words, $tokens));
            if ($score > $best['score']) $best = ['slug' => $slug, 'score' => $score];
        }
        return $best['score'] > 0 ? $best['slug'] : null;
    };

    // Lote de productos (con su categoría para fallback)
    $offset  = (int)($_GET['offset'] ?? 0);
    $ofertas = $pdo->query("
        SELECT o.id, o.nombre_de, c.slug AS cat
        FROM ofertas o
        LEFT JOIN categorias c ON c.id = o.categoria_id
        WHERE o.activa=1 ORDER BY o.id ASC LIMIT 30 OFFSET $offset
    ")->fetchAll(PDO::FETCH_ASSOC);

    if (empty($ofertas)) {
        echo json_encode(['ok' => true, 'message' => 'Sin productos pendientes', 'asignaciones' => 0, 'procesados' => 0]);
        exit;
    }

    $productList = implode("\n", array_map(fn($o) => "- {$o['nombre_de']}", $ofertas));

    $prompt = "Tienes un banco de imágenes genéricas para productos de supermercado (formato: slug | nombre | categoría | keywords):\n\n$bankText\n\nAsigna la imagen más adecuada a cada producto. Si ninguna encaja, usa null.\n\nProductos:\n$productList\n\nResponde SOLO con JSON válido, sin markdown:\n{\"nombre_producto\": \"slug_o_null\"}";

    $payload = json_encode([
        'model'       => 'gpt-4o-mini',
        'temperature' => 0,
        'messages'    => [
            ['role' => 'system', 'content' => 'Eres un asistente que asigna imágenes genéricas a productos de supermercado. Responde solo con JSON válido.'],
            ['role' => 'user',   'content' => $prompt],
        ],
    ]);

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ["Content-Type: application/json", "Authorization: Bearer $openaiKey"],
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        echo json_encode(['error' => "OpenAI HTTP $httpCode: $response"]);
        exit;
    }

    $data = json_decode($response, true);
    $text = $data['choices'][0]['message']['content'] ?? '';
    // Limpia markdown y extrae primer bloque JSON
    $text = preg_replace('/^```(?:json)?\s*|\s*```$/s', '', trim($text));
    if (!str_starts_with(trim($text), '{')) {
        preg_match('/\{.*\}/s', $text, $m);
        $text = $m[0] ?? '{}';
    }

    $assignments = json_decode($text, true);
    if (!$assignments) {
        // Devuelve lote vacío y continúa — no para el proceso
        echo json_encode([
            'ok' => true, 'procesados' => count($ofertas),
            'asignaciones' => 0, 'sin_match' => count($ofertas),
            'duracion_ms' => round((microtime(true) - $start) * 1000),
            'siguiente_offset' => $offset + count($ofertas),
            'warning' => 'JSON inválido de OpenAI, lote saltado',
        ]);
        exit;
    }

    $asignaciones = 0;
    $sinMatch     = 0;
    $stmt = $pdo->prepare("UPDATE ofertas SET imagen_local=? WHERE id=?");
    foreach ($ofertas as $oferta) {
        $slug = $assignments[$oferta['nombre_de']] ?? null;
        if (!$slug || $slug === 'null') {
            $sinMatch++;
            // Fallback 1: keywords del nombre del producto
            $slug = $keywordFallback($oferta['nombre_de']);
        }
        if (!$slug) {
            // Fallback 2: categoría DB → banco (con mapa)
            $cat      = $oferta['cat'] ?? '';
            $bancoCats = $catMap[$cat] ?? [];
            $pool = [];
            foreach ($bancoCats as $bc) {
                $pool = array_merge($pool, $byCategoria[$bc] ?? []);
            }
            // Fallback 3: aleatorio del banco completo
            if (empty($pool)) $pool = $allSlugs;
            $slug = $pool[array_rand($pool)];
        }
        $stmt->execute(["$slug.png", $oferta['id']]);
        $asignaciones++;
    }

    $duracion = round((microtime(true) - $start) * 1000);
    try {
        $log = $pdo->prepare("INSERT INTO gemini_runs (productos_procesados, asignaciones_nuevas, errores, duracion_ms, `trigger`) VALUES (?,?,?,?,?)");
        $log->execute([count($ofertas), $asignaciones, $sinMatch, $duracion, 'openai']);
    } catch (Exception $e) { /* tabla puede no existir */ }

    echo json_encode([
        'ok'               => true,
        'procesados'       => count($ofertas),
        'asignaciones'     => $asignaciones,
        'sin_match'        => $sinMatch,
        'duracion_ms'      => $duracion,
        'siguiente_offset' => $offset + count($ofertas),
    ]);
    exit;
}

echo json_encode(['error' => 'Unknown action']);
