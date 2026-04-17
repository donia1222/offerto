<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

try {
    // GET /lista/{user_token}
    if ($method === 'GET') {
        $token = trim($_GET['user_token'] ?? '');
        if (!$token) jsonError('user_token requerido');

        $stmt = $pdo->prepare("
            SELECT
                lc.id,
                lc.oferta_id,
                lc.cantidad,
                lc.comprado,
                o.nombre_de,
                o.nombre_fr,
                o.nombre_it,
                o.precio_oferta,
                o.precio_original,
                o.descuento_pct  AS descuento,
                o.unidad,
                o.imagen_url,
                o.valido_hasta,
                DATEDIFF(o.valido_hasta, CURDATE()) AS dias_restantes,
                t.slug      AS tienda_slug,
                t.nombre    AS tienda_nombre,
                t.color_hex AS tienda_color
            FROM listas_compra lc
            JOIN ofertas o ON o.id = lc.oferta_id
            JOIN tiendas t ON t.id = o.tienda_id
            WHERE lc.user_token = ?
              AND o.valido_hasta >= CURDATE()
            ORDER BY t.slug, lc.created_at DESC
        ");
        $stmt->execute([$token]);
        $rows = $stmt->fetchAll();

        $items = array_map(function ($r) {
            $img = $r['imagen_url'];
            if ($img && !str_starts_with($img, 'http')) {
                $img = IMG_BASE . $img;
            }
            return [
                'id'       => (int) $r['id'],
                'ofertaId' => (int) $r['oferta_id'],
                'cantidad' => (int) $r['cantidad'],
                'comprado' => (bool) $r['comprado'],
                'oferta'   => [
                    'nombre'         => $r['nombre_de'],
                    'nombre_fr'      => $r['nombre_fr'],
                    'nombre_it'      => $r['nombre_it'],
                    'precio_oferta'  => (float) $r['precio_oferta'],
                    'precio_original'=> $r['precio_original'] ? (float) $r['precio_original'] : null,
                    'descuento'      => (int) $r['descuento'],
                    'unidad'         => $r['unidad'],
                    'imagen'         => $img,
                    'valido_hasta'   => $r['valido_hasta'],
                    'dias_restantes' => (int) $r['dias_restantes'],
                    'tienda'         => [
                        'slug'   => $r['tienda_slug'],
                        'nombre' => $r['tienda_nombre'],
                        'color'  => $r['tienda_color'],
                    ],
                ],
            ];
        }, $rows);

        jsonOk($items);
    }

    // POST /lista  — añadir o actualizar cantidad
    elseif ($method === 'POST') {
        $body     = json_decode(file_get_contents('php://input'), true) ?? [];
        $token    = trim($body['user_token'] ?? '');
        $ofertaId = (int) ($body['oferta_id'] ?? 0);
        $cantidad = max(1, (int) ($body['cantidad'] ?? 1));

        if (!$token || !$ofertaId) jsonError('user_token y oferta_id requeridos');

        // Verificar que la oferta existe y está activa
        $check = $pdo->prepare('SELECT id FROM ofertas WHERE id = ? AND activa = 1 AND valido_hasta >= CURDATE()');
        $check->execute([$ofertaId]);
        if (!$check->fetch()) jsonError('Oferta no encontrada o expirada', 404);

        // Upsert
        $stmt = $pdo->prepare("
            INSERT INTO listas_compra (user_token, oferta_id, cantidad)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)
        ");
        $stmt->execute([$token, $ofertaId, $cantidad]);

        jsonOk(['added' => true, 'oferta_id' => $ofertaId, 'cantidad' => $cantidad]);
    }

    // DELETE /lista?user_token=X&oferta_id=Y
    elseif ($method === 'DELETE') {
        $token    = trim($_GET['user_token'] ?? '');
        $ofertaId = (int) ($_GET['oferta_id'] ?? 0);

        if (!$token || !$ofertaId) jsonError('user_token y oferta_id requeridos');

        $stmt = $pdo->prepare('DELETE FROM listas_compra WHERE user_token = ? AND oferta_id = ?');
        $stmt->execute([$token, $ofertaId]);

        jsonOk(['deleted' => true]);
    }

    else {
        jsonError('Método no permitido', 405);
    }

} catch (Throwable $e) {
    jsonError('Error en lista: ' . $e->getMessage(), 500);
}
