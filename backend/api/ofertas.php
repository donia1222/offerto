<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

try {
    $pdo = getDB();

    // --- Detalle por ID ---
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("
            SELECT o.id,
                t.slug AS tienda_slug, t.nombre AS tienda_nombre, t.logo_url AS tienda_logo, t.color_hex AS tienda_color,
                c.slug AS categoria_slug, c.icon AS categoria_icon,
                o.nombre_de, o.nombre_fr, o.nombre_it,
                o.precio_original, o.precio_oferta, o.descuento_pct AS descuento,
                o.unidad, o.imagen_url, o.valido_desde, o.valido_hasta,
                DATEDIFF(o.valido_hasta, CURDATE()) AS dias_restantes, o.canton
            FROM ofertas o
            LEFT JOIN tiendas    t ON t.id = o.tienda_id
            LEFT JOIN categorias c ON c.id = o.categoria_id
            WHERE o.id = ?
        ");
        $stmt->execute([(int) $_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) jsonError('Oferta no encontrada', 404);
        jsonOk(formatOferta($row));
    }

    // --- Parámetros de filtro ---
    $tiendas     = isset($_GET['tienda'])       ? explode(',', $_GET['tienda'])  : [];
    $categorias  = isset($_GET['categoria'])    ? explode(',', $_GET['categoria']) : [];
    $minDesc     = isset($_GET['min_descuento']) ? (int) $_GET['min_descuento']  : 0;
    $canton      = $_GET['canton']  ?? 'all';
    $orden       = $_GET['orden']   ?? 'descuento';
    $pagina      = max(1, (int) ($_GET['pagina'] ?? 1));
    $limite      = isset($_GET['limite']) ? min((int) $_GET['limite'], 200) : ITEMS_PER_PAGE;
    $offset      = ($pagina - 1) * $limite;

    // --- WHERE dinámico ---
    $where  = ['o.activa = 1', 'o.valido_hasta >= CURDATE()'];
    $params = [];

    if ($tiendas) {
        $ph = implode(',', array_fill(0, count($tiendas), '?'));
        $where[]  = "t.slug IN ($ph)";
        $params   = array_merge($params, $tiendas);
    }
    if ($categorias) {
        $ph = implode(',', array_fill(0, count($categorias), '?'));
        $where[]  = "c.slug IN ($ph)";
        $params   = array_merge($params, $categorias);
    }
    if ($minDesc > 0) {
        $where[]  = 'o.descuento_pct >= ?';
        $params[] = $minDesc;
    }
    if ($canton !== 'all') {
        $where[]  = "(o.canton = 'all' OR o.canton = ?)";
        $params[] = $canton;
    }

    $whereSQL = 'WHERE ' . implode(' AND ', $where);

    // --- ORDER BY ---
    $orderSQL = match($orden) {
        'fecha'  => 'ORDER BY o.valido_hasta ASC',
        'precio' => 'ORDER BY o.precio_oferta ASC',
        default  => 'ORDER BY o.descuento_pct DESC',
    };

    // --- COUNT total ---
    $countStmt = $pdo->prepare("
        SELECT COUNT(*) FROM ofertas o
        LEFT JOIN tiendas    t ON t.id = o.tienda_id
        LEFT JOIN categorias c ON c.id = o.categoria_id
        $whereSQL
    ");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    // --- SELECT datos ---
    $stmt = $pdo->prepare("
        SELECT
            o.id,
            t.slug      AS tienda_slug,
            t.nombre    AS tienda_nombre,
            t.logo_url  AS tienda_logo,
            t.color_hex AS tienda_color,
            c.slug      AS categoria_slug,
            c.icon      AS categoria_icon,
            o.nombre_de,
            o.nombre_fr,
            o.nombre_it,
            o.precio_original,
            o.precio_oferta,
            o.descuento_pct  AS descuento,
            o.unidad,
            o.imagen_url,
            o.valido_desde,
            o.valido_hasta,
            DATEDIFF(o.valido_hasta, CURDATE()) AS dias_restantes,
            o.canton
        FROM ofertas o
        LEFT JOIN tiendas    t ON t.id = o.tienda_id
        LEFT JOIN categorias c ON c.id = o.categoria_id
        $whereSQL
        $orderSQL
        LIMIT $limite OFFSET $offset
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $datos = array_map('formatOferta', $rows);

    jsonOk($datos, $total, $pagina);

} catch (Throwable $e) {
    jsonError('Error al obtener ofertas: ' . $e->getMessage(), 500);
}

function proxyImg(?string $url): ?string {
    if (!$url) return null;
    if (!str_starts_with($url, 'http')) $url = IMG_BASE . $url;
    // Wrap external CDN images through our proxy to avoid rate-limiting
    if (!str_contains($url, APP_URL)) {
        return API_URL . '/img.php?url=' . urlencode($url);
    }
    return $url;
}

function formatOferta(array $row): array {
    $img = proxyImg($row['imagen_url']);
    $logo = proxyImg($row['tienda_logo']);
    return [
        'id'       => (int) $row['id'],
        'tienda'   => [
            'slug'   => $row['tienda_slug'],
            'nombre' => $row['tienda_nombre'],
            'logo'   => $logo,
            'color'  => $row['tienda_color'],
        ],
        'categoria' => $row['categoria_slug'] ? [
            'slug' => $row['categoria_slug'],
            'icon' => $row['categoria_icon'],
        ] : null,
        'nombre'          => $row['nombre_de'] ?: ($row['nombre_fr'] ?: $row['nombre_it']),
        'nombre_fr'       => $row['nombre_fr'],
        'nombre_it'       => $row['nombre_it'],
        'precio_original' => $row['precio_original'] ? (float) $row['precio_original'] : null,
        'precio_oferta'   => (float) $row['precio_oferta'],
        'descuento'       => (int) $row['descuento'],
        'unidad'          => $row['unidad'],
        'imagen'          => $img,
        'valido_desde'    => $row['valido_desde'],
        'valido_hasta'    => $row['valido_hasta'],
        'dias_restantes'  => (int) $row['dias_restantes'],
        'canton'          => $row['canton'],
    ];
}
