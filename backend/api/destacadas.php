<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

try {
    $pdo = getDB();

    $stmt = $pdo->query("
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
        WHERE o.activa = 1
          AND o.valido_hasta >= CURDATE()
          AND o.descuento_pct > 0
        ORDER BY o.descuento_pct DESC
        LIMIT 20
    ");

    $rows  = $stmt->fetchAll();
    $datos = array_map('formatOferta', $rows);

    jsonOk($datos);

} catch (Throwable $e) {
    jsonError('Error al obtener destacadas: ' . $e->getMessage(), 500);
}

function formatOferta(array $row): array {
    $img = $row['imagen_url'];
    if ($img && !str_starts_with($img, 'http')) {
        $img = IMG_BASE . $img;
    }
    $logo = $row['tienda_logo'];
    if ($logo && !str_starts_with($logo, 'http')) {
        $logo = IMG_BASE . $logo;
    }
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
        'nombre'          => $row['nombre_de'],
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
