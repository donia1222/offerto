<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

$pdo = getDB();

// Primeros 5 con imagen y últimos 5 sin imagen de Aligro
$stmt = $pdo->query("
    SELECT o.id, o.nombre_de, o.imagen_url
    FROM ofertas o
    JOIN tiendas t ON t.id = o.tienda_id
    WHERE t.slug = 'aligro' AND o.activa = 1
    ORDER BY o.id ASC
    LIMIT 50
");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$conImagen = array_filter($rows, fn($r) => !empty($r['imagen_url']));
$sinImagen = array_filter($rows, fn($r) =>  empty($r['imagen_url']));

jsonOk([
    'total'        => count($rows),
    'con_imagen'   => count($conImagen),
    'sin_imagen'   => count($sinImagen),
    'ejemplos_sin' => array_values(array_slice($sinImagen, 0, 5)),
    'ejemplos_con' => array_values(array_slice($conImagen, 0, 3)),
]);
