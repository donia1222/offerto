<?php
require_once __DIR__ . '/BaseScraper.php';
require_once __DIR__ . '/DeepLTranslator.php';

class AligroScraper extends BaseScraper {

    protected string $tiendaSlug = 'aligro';

    private const BASE_URL   = 'https://www.aligro.ch';
    private const LIMIT      = 192; // max allowed by API

    // All active promotion categories (discovered from /actions API)
    private const CATEGORIES = [
        '1010-fruits',
        '1011-legumes',
        '1013-prets-a-l-emploi',
        '1015-surgeles-fruits-legumes',
        '1110-boeuf',
        '1111-porc',
        '1112-volaille-et-lapin',
        '1113-veau',
        '1114-agneau-autres-viandes',
        '1115-cheval',
        '1117-saucisses',
        '1118-charcuterie',
        '1119-surgeles-viande-charcuterie',
        '1210-poissons-fruits-de-mer-frais',
        '1214-surgeles-poissons-fruits-de-mer',
        '1310-fromages',
        '1311-lait-beurre-creme',
        '1312-yoghourts-autres-produits-laitiers',
        '1314-traiteur-et-divers',
        '1315-traiteur-surgeles',
        '1410-pains-frais',
        '1413-pains-biscottes',
        '1416-surgeles-boulangerie-patisserie',
        '1610-bieres',
        '1611-limonades-sodas',
        '1616-eaux-minerales',
        '1910-produits-de-base',
        '1911-condiments',
        '1912-conserves-plats-prepares',
        '2010-snacks-sales',
        '2011-chocolats',
        '2213-soin-du-visage',
        '2310-lessives',
        '2311-produits-vaisselle',
        '2312-produits-de-nettoyage',
        '2410-vaisselle-jetable',
        '2412-materiel-d-emballage',
    ];

    // Mapeo categorías Aligro → slugs de nuestra DB
    private const CAT_MAP = [
        1010 => 'gemuese',    // Fruits
        1011 => 'gemuese',    // Légumes
        1013 => 'gemuese',    // Prêts à l'emploi
        1015 => 'gemuese',    // Surgelés fruits & légumes
        1110 => 'fleisch',    // Boeuf
        1111 => 'fleisch',    // Porc
        1112 => 'fleisch',    // Volaille et lapin
        1113 => 'fleisch',    // Veau
        1114 => 'fleisch',    // Agneau & autres viandes
        1115 => 'fleisch',    // Cheval
        1117 => 'fleisch',    // Saucisses
        1118 => 'fleisch',    // Charcuterie
        1119 => 'fleisch',    // Surgelés viande & charcuterie
        1210 => 'fisch',      // Poissons & fruits de mer frais
        1214 => 'fisch',      // Surgelés poissons & fruits de mer
        1310 => 'milch',      // Fromages
        1311 => 'milch',      // Lait, beurre, crème
        1312 => 'milch',      // Yoghourts & autres produits laitiers
        1314 => 'other',      // Traiteur et divers
        1315 => 'other',      // Traiteur surgelés
        1410 => 'bakery',     // Pains frais
        1413 => 'bakery',     // Pains & biscottes
        1416 => 'bakery',     // Surgelés boulangerie & pâtisserie
        1610 => 'getraenke',  // Bières
        1611 => 'getraenke',  // Limonades & sodas
        1616 => 'getraenke',  // Eaux minérales
        1910 => 'snacks',     // Produits de base
        1911 => 'snacks',     // Condiments
        1912 => 'snacks',     // Conserves & plats préparés
        2010 => 'snacks',     // Snacks salés
        2011 => 'snacks',     // Chocolats
        2213 => 'hygiene',    // Soin du visage
        2310 => 'haushalt',   // Lessives
        2311 => 'haushalt',   // Produits vaisselle
        2312 => 'haushalt',   // Produits de nettoyage
        2410 => 'haushalt',   // Vaisselle jetable
        2412 => 'haushalt',   // Matériel d'emballage
    ];

    public function run(?int $onlyPage = null): int {
        $this->log('Iniciando scraping Aligro...');

        [$validoDesde, $validoHasta] = $this->getValidityDates();
        $this->log("Período: $validoDesde → $validoHasta");

        $translator = new DeepLTranslator($this->pdo);
        $count      = 0;

        foreach (self::CATEGORIES as $catSlug) {
            $page = 1;
            do {
                $url  = self::BASE_URL . "/actions/$catSlug?page=$page&limit=" . self::LIMIT;
                $data = $this->fetchJson($url, [], ['aligro_customer_type' => '2']);

                if (!$data || empty($data['articles']['items'])) break;

                $items = $data['articles']['items'];
                $total = (int) $data['articles']['total_items'];

                $validItems       = [];
                $namesToTranslate = [];

                foreach ($items as $item) {
                    $parsed = $this->parseItem($item, $validoDesde, $validoHasta);
                    if ($parsed) {
                        $validItems[]       = $parsed;
                        $namesToTranslate[] = $parsed['nombre_fr'];
                    }
                }

                if (!empty($namesToTranslate)) {
                    $translated = $translator->translateBatch($namesToTranslate, 'FR', 'DE');
                    foreach ($validItems as $i => $parsed) {
                        $parsed[':nombre_de'] = mb_substr($translated[$i] ?? $parsed['nombre_fr'], 0, 255);
                        unset($parsed['nombre_fr']);
                        if ($this->upsertOferta($parsed)) $count++;
                    }
                }

                $this->log("$catSlug p$page: " . count($items) . " artículos | Total: $count");

                $maxPages = (int) ceil($total / self::LIMIT);
                $page++;
            } while ($page <= $maxPages);
        }

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

        $unidad = $fr['weightVolume'] ?? $fr['quantityLabel'] ?? $fr['packaging'] ?? null;

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
            ':nombre_de'       => mb_substr($nombreFr, 0, 255), // replaced by translation
            ':nombre_fr'       => mb_substr($nombreFr, 0, 255),
            'nombre_fr'        => $nombreFr,                    // aux field for batch translate
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
        // Aligro publishes weekly: Monday to Sunday
        $monday = date('Y-m-d', strtotime('monday this week'));
        $sunday = date('Y-m-d', strtotime('sunday this week'));
        return [$monday, $sunday];
    }
}
