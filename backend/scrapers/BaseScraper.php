<?php
abstract class BaseScraper {

    protected PDO $pdo;
    protected int $tiendaId;
    protected string $tiendaSlug;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->tiendaId = $this->getTiendaId();
    }

    abstract public function run(): int;

    protected function getTiendaId(): int {
        $stmt = $this->pdo->prepare('SELECT id FROM tiendas WHERE slug = ? AND activa = 1');
        $stmt->execute([$this->tiendaSlug]);
        $row = $stmt->fetch();
        if (!$row) throw new RuntimeException("Tienda '{$this->tiendaSlug}' no encontrada en la DB");
        return (int) $row['id'];
    }

    protected function getCategoriaId(string $slug): ?int {
        $stmt = $this->pdo->prepare('SELECT id FROM categorias WHERE slug = ?');
        $stmt->execute([$slug]);
        $row = $stmt->fetch();
        return $row ? (int) $row['id'] : null;
    }

    protected function upsertOferta(array $data): bool {
        $sql = "
            INSERT INTO ofertas
                (tienda_id, categoria_id, nombre_de, nombre_fr, nombre_it,
                 precio_original, precio_oferta, descuento_pct, unidad,
                 imagen_url, valido_desde, valido_hasta, canton, fuente_url, activa)
            VALUES
                (:tienda_id, :categoria_id, :nombre_de, :nombre_fr, :nombre_it,
                 :precio_original, :precio_oferta, :descuento_pct, :unidad,
                 :imagen_url, :valido_desde, :valido_hasta, :canton, :fuente_url, 1)
            ON DUPLICATE KEY UPDATE
                nombre_de       = VALUES(nombre_de),
                nombre_fr       = VALUES(nombre_fr),
                nombre_it       = VALUES(nombre_it),
                precio_original = VALUES(precio_original),
                precio_oferta   = VALUES(precio_oferta),
                descuento_pct   = VALUES(descuento_pct),
                unidad          = VALUES(unidad),
                imagen_url      = VALUES(imagen_url),
                valido_hasta    = VALUES(valido_hasta),
                activa          = 1
        ";
        // ON DUPLICATE KEY necesita un índice único: (tienda_id, fuente_url)
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($data);
    }

    protected function fetch(string $url, array $headers = [], array $cookies = []): string|false {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_COOKIE         => implode('; ', array_map(fn($k,$v) => "$k=$v", array_keys($cookies), $cookies)),
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200) return false;
        return $body;
    }

    protected function fetchJson(string $url, array $headers = [], array $cookies = []): array|false {
        $headers[] = 'Accept: application/json';
        $headers[] = 'X-Requested-With: XMLHttpRequest';
        $body = $this->fetch($url, $headers, $cookies);
        if (!$body) return false;
        $data = json_decode($body, true);
        return is_array($data) ? $data : false;
    }

    protected function log(string $msg): void {
        if (defined('CRON_MODE')) {
            $line = '[' . date('H:i:s') . '][' . $this->tiendaSlug . '] ' . $msg . PHP_EOL;
            echo $line;
        }
    }

    protected function mondayThisSunday(): array {
        $monday = date('Y-m-d', strtotime('monday this week'));
        $sunday = date('Y-m-d', strtotime('sunday this week'));
        return [$monday, $sunday];
    }
}
