<?php
/**
 * GET /api/prospekte.php
 * GET /api/prospekte.php?tienda=aligro
 * GET /api/prospekte.php?tienda=aligro,transgourmet,topcc
 *
 * Devuelve catálogos/prospectos de la tabla `prospekte`, ordenados por tienda y fecha.
 */
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

$db = getDB();

// Filtro opcional por tienda (slug o slugs separados por coma)
$tiendaParam = trim($_GET['tienda'] ?? '');
$slugs = $tiendaParam
    ? array_filter(array_map('trim', explode(',', $tiendaParam)))
    : [];

try {
    // Solo activos y no expirados hace más de 2 días
    $where  = ['p.activo = 1', "(p.valido_hasta IS NULL OR p.valido_hasta >= DATE_SUB(CURDATE(), INTERVAL 2 DAY))"];
    $params = [];

    if (!empty($slugs)) {
        $ph     = implode(',', array_fill(0, count($slugs), '?'));
        $where[] = "t.slug IN ($ph)";
        $params  = array_merge($params, $slugs);
    }

    $whereClause = 'WHERE ' . implode(' AND ', $where);

    $sql = "
        SELECT
            p.id,
            t.slug        AS tienda,
            t.nombre      AS tienda_nombre,
            t.color_hex   AS tienda_color,
            p.titulo,
            p.subtitulo,
            p.pdf_url,
            p.web_url,
            p.valido_desde,
            p.valido_hasta,
            p.semana,
            p.tipo,
            DATEDIFF(p.valido_hasta, CURDATE()) AS dias_restantes
        FROM prospekte p
        JOIN tiendas  t ON t.id = p.tienda_id
        $whereClause
        ORDER BY p.tienda_id, p.valido_desde DESC, p.tipo
    ";

    $st = $db->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    // Agrupar por tienda para comodidad del frontend
    $grouped = [];
    foreach ($rows as $r) {
        $slug = $r['tienda'];
        if (!isset($grouped[$slug])) {
            $grouped[$slug] = [
                'tienda'  => $slug,
                'nombre'  => $r['tienda_nombre'],
                'color'   => $r['tienda_color'],
                'items'   => [],
            ];
        }
        unset($r['tienda_nombre'], $r['tienda_color']);
        $grouped[$slug]['items'][] = $r;
    }

    jsonOk(array_values($grouped), count($rows));

} catch (Throwable $e) {
    jsonError('DB error: ' . $e->getMessage(), 500);
}
