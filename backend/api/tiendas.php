<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

try {
    $pdo  = getDB();
    $stmt = $pdo->query(
        'SELECT id, slug, nombre, logo_url, color_hex AS color, activa, orden
           FROM tiendas
          WHERE activa = 1
          ORDER BY orden ASC, nombre ASC'
    );
    $tiendas = $stmt->fetchAll();

    // Añadir URL completa del logo si es relativa
    foreach ($tiendas as &$t) {
        if ($t['logo_url'] && !str_starts_with($t['logo_url'], 'http')) {
            $t['logo_url'] = IMG_BASE . $t['logo_url'];
        }
    }
    unset($t);

    jsonOk($tiendas);
} catch (Throwable $e) {
    jsonError('Error al obtener tiendas: ' . $e->getMessage(), 500);
}
