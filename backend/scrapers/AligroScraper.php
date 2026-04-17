<?php
require_once __DIR__ . '/BaseScraper.php';
require_once __DIR__ . '/DeepLTranslator.php';

class AligroScraper extends BaseScraper {

    protected string $tiendaSlug = 'aligro';

    private const BASE_URL  = 'https://www.aligro.ch';
    private const PAGE_SIZE = 48;

    // Mapeo categorías Aligro → slugs de nuestra DB
    private const CAT_MAP = [
        1010 => 'gemuese',   // Fruits & légumes
        1011 => 'gemuese',   // Légumes
        1012 => 'gemuese',   // Champignons
        1013 => 'gemuese',   // Prêts à l'emploi
        1020 => 'fleisch',   // Viande
        1021 => 'fleisch',   // Volaille
        1022 => 'fleisch',   // Charcuterie
        1030 => 'fleisch',   // Poisson & crustacés
        1040 => 'milch',     // Produits laitiers
        1041 => 'milch',     // Fromage
        1042 => 'milch',     // Oeufs
        1050 => 'bakery',    // Boulangerie
        1060 => 'getraenke', // Boissons
        1070 => 'snacks',    // Epicerie
        1080 => 'haushalt',  // Entretien
        1090 => 'hygiene',   // Hygiène
        1100 => 'tierfutter',// Animaux
    ];

    public function run(?int $onlyPage = null): int {
        $this->log('Iniciando scraping Aligro...');

        [$validoDesde, $validoHasta] = $this->getValidityDates();
        $this->log("Período: $validoDesde → $validoHasta");

        $translator = new DeepLTranslator($this->pdo);
        $count      = 0;
        $startPage  = $onlyPage ?? 1;
        $page       = $startPage;

        do {
            $url  = self::BASE_URL . "/actions?page=$page&limit=" . self::PAGE_SIZE;
            $data = $this->fetchJson($url, [], ['aligro_customer_type' => '2']);

            if (!$data || empty($data['articles']['items'])) break;

            $items = $data['articles']['items'];
            $total = (int) $data['articles']['total_items'];

            // Filtrar items válidos y recoger nombres FR para traducir en batch
            $validItems = [];
            $namesToTranslate = [];

            foreach ($items as $item) {
                $parsed = $this->parseItem($item, $validoDesde, $validoHasta);
                if ($parsed) {
                    $validItems[]       = $parsed;
                    $namesToTranslate[] = $parsed['nombre_fr'];
                }
            }

            // Traducir todos los nombres de la página en una sola llamada API
            if (!empty($namesToTranslate)) {
                $translated = $translator->translateBatch($namesToTranslate, 'FR', 'DE');
                foreach ($validItems as $i => $parsed) {
                    $parsed[':nombre_de'] = mb_substr($translated[$i] ?? $parsed['nombre_fr'], 0, 255);
                    unset($parsed['nombre_fr']); // quitar campo auxiliar antes del upsert
                    if ($this->upsertOferta($parsed)) $count++;
                }
            }

            $this->log("Página $page: " . count($items) . " artículos | Insertados: $count");

            if ($onlyPage !== null) break;
            $page++;
            $maxPages = (int) ceil($total / self::PAGE_SIZE);

        } while ($page <= $maxPages);

        $this->log("Aligro finalizado: $count ofertas upserted");
        return $count;
    }

    /** Parsea un item y devuelve array listo para upsert, o null si se debe saltar */
    private function parseItem(array $item, string $desde, string $hasta): ?array {
        $price = $item['mainArticleDetailPrice'] ?? null;
        if (!$price) return null;

        $precioOriginal = (float) ($price['salesPriceTTC']    ?? 0);
        $precioOferta   = (float) ($price['discountPriceTTC'] ?? 0);
        if ($precioOferta <= 0) return null;

        $descuento = isset($price['discountRatePrivate'])
            ? (int) round((float) $price['discountRatePrivate'] * 100)
            : ($precioOriginal > $precioOferta
                ? (int) round((($precioOriginal - $precioOferta) / $precioOriginal) * 100)
                : 0);

        if ($descuento < 5) return null;

        $fr = $item['translations']['fr'] ?? [];
        if (empty($fr)) return null;

        $nombreFr = trim($fr['description'] ?? '');
        if (!$nombreFr) return null;

        $unidad    = $fr['weightVolume'] ?? $fr['quantityLabel'] ?? $fr['packaging'] ?? null;

        // Intentar main primero, luego all[0]
        $main   = is_array($item['images']['main'] ?? null) ? $item['images']['main'] : [];
        $first  = is_array(($item['images']['all'] ?? [])[0] ?? null) ? ($item['images']['all'])[0] : [];
        $imagen = $main['image/jpeg']  ?? $main['image/webp']
               ?? $first['image/jpeg'] ?? $first['image/webp']
               ?? null;
        $catCode   = (int) ($item['article']['articleGroup']['code'] ?? 0);
        $fuenteUrl = $item['href']['self'] ?? null;
        if (!$fuenteUrl) return null;

        return [
            ':tienda_id'       => $this->tiendaId,
            ':categoria_id'    => $this->getCategoriaId(self::CAT_MAP[$catCode] ?? 'other'),
            ':nombre_de'       => mb_substr($nombreFr, 0, 255), // será reemplazado por traducción
            ':nombre_fr'       => mb_substr($nombreFr, 0, 255),
            'nombre_fr'        => $nombreFr,                    // campo auxiliar para batch
            ':nombre_it'       => null,
            ':precio_original' => $precioOriginal > $precioOferta ? $precioOriginal : null,
            ':precio_oferta'   => $precioOferta,
            ':descuento_pct'   => $descuento,
            ':unidad'          => $unidad ? mb_substr($unidad, 0, 50) : null,
            ':imagen_url'      => $imagen,
            ':valido_desde'    => $desde,
            ':valido_hasta'    => $hasta,
            ':canton'          => 'all',
            ':fuente_url'      => mb_substr($fuenteUrl, 0, 500),
        ];
    }

    private function getValidityDates(): array {
        // Aligro publica por semanas: lunes a domingo
        $monday = date('Y-m-d', strtotime('monday this week'));
        $sunday = date('Y-m-d', strtotime('sunday this week'));
        return [$monday, $sunday];
    }
}
