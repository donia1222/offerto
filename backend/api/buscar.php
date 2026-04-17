<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

function proxyImg(?string $url): ?string {
    if (!$url) return null;
    if (!str_starts_with($url, 'http')) $url = IMG_BASE . $url;
    if (!str_contains($url, APP_URL)) {
        return API_URL . '/img.php?url=' . urlencode($url);
    }
    return $url;
}

$q        = trim($_GET['q']        ?? '');
$categoria = trim($_GET['categoria'] ?? '');

if (strlen($q) < 2) {
    jsonOk([]);
}

try {
    $pdo  = getDB();
    $like = '%' . $q . '%';

    $where  = ['o.activa = 1', 'o.valido_hasta >= CURDATE()', '(o.nombre_de LIKE ? OR o.nombre_fr LIKE ? OR o.nombre_it LIKE ?)'];
    $params = [$like, $like, $like];

    if ($categoria) {
        $where[]  = 'c.slug = ?';
        $params[] = $categoria;
    }

    $whereSQL = 'WHERE ' . implode(' AND ', $where);
    $limite   = min((int) ($_GET['limite'] ?? 200), 200);

    $stmt = $pdo->prepare("
        SELECT
            o.id,
            t.slug AS tienda_slug, t.nombre AS tienda_nombre, t.logo_url AS tienda_logo, t.color_hex AS tienda_color,
            c.slug AS categoria_slug, c.icon AS categoria_icon,
            o.nombre_de, o.nombre_fr, o.nombre_it,
            o.precio_original, o.precio_oferta, o.descuento_pct AS descuento,
            o.unidad, o.imagen_url, o.valido_desde, o.valido_hasta,
            DATEDIFF(o.valido_hasta, CURDATE()) AS dias_restantes,
            o.canton
        FROM ofertas o
        LEFT JOIN tiendas    t ON t.id = o.tienda_id
        LEFT JOIN categorias c ON c.id = o.categoria_id
        $whereSQL
        ORDER BY o.precio_oferta ASC
        LIMIT $limite
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $datos = array_map(function($row) {
        $img  = proxyImg($row['imagen_url']);
        $logo = proxyImg($row['tienda_logo']);
        return [
            'id'             => (int) $row['id'],
            'tienda'         => ['slug' => $row['tienda_slug'], 'nombre' => $row['tienda_nombre'], 'logo' => $logo, 'color' => $row['tienda_color']],
            'categoria'      => $row['categoria_slug'] ? ['slug' => $row['categoria_slug'], 'icon' => $row['categoria_icon']] : null,
            'nombre'         => $row['nombre_de'] ?: ($row['nombre_fr'] ?: $row['nombre_it']),
            'nombre_fr'      => $row['nombre_fr'],
            'nombre_it'      => $row['nombre_it'],
            'precio_original'=> $row['precio_original'] ? (float) $row['precio_original'] : null,
            'precio_oferta'  => (float) $row['precio_oferta'],
            'descuento'      => (int) $row['descuento'],
            'unidad'         => $row['unidad'],
            'imagen'         => $img,
            'valido_desde'   => $row['valido_desde'],
            'valido_hasta'   => $row['valido_hasta'],
            'dias_restantes' => (int) $row['dias_restantes'],
            'canton'         => $row['canton'],
        ];
    }, $rows);

    jsonOk($datos, count($datos));

} catch (Throwable $e) {
    jsonError('Suchfehler: ' . $e->getMessage(), 500);
}
