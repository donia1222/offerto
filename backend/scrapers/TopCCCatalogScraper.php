<?php
require_once __DIR__ . '/BaseScraper.php';

/**
 * Scrapes the full product catalog from shop.topcc.ch (SAP Hybris Commerce).
 * Products stored in ofertas with descuento_pct=0 (or real discount if on sale).
 */
class TopCCCatalogScraper extends BaseScraper {

    protected string $tiendaSlug = 'topcc';

    private const SHOP_BASE = 'https://shop.topcc.ch';
    // Hybris pagination query — filtered to in-stock items at main warehouse
    // %% escapes literal % for sprintf (URL-encoded %3A in the query string)
    private const PAGE_QUERY = '?q=%%3Arelevance%%3AproductTempAvailable%%3Atrue%%3ApointOfServiceStockLevel%%3AHAUPTSITZ&page=%d&mode=LIST';

    public function run(): int {
        $this->log('Iniciando TopCC catalog scraper...');

        // Desactivar registros anteriores antes de scrapear para evitar acumulación
        // de productos de semanas previas con fechas incorrectas.
        $deact = $this->pdo->prepare("UPDATE ofertas SET activa = 0 WHERE tienda_id = ?");
        $deact->execute([$this->tiendaId]);
        $this->log('Registros anteriores desactivados: ' . $deact->rowCount());

        // Use hardcoded categories — avoids homepage fetch that may trigger anti-bot
        $categories = $this->fallbackCategories();
        $this->log('Categories: ' . count($categories));

        [$desde, $hasta] = $this->getCatalogDates();
        $total = 0;
        $emptyCats = 0;

        foreach ($categories as $path => $catSlug) {
            $n = $this->scrapeCategory($path, $catSlug, $desde, $hasta);
            $this->log("  $path → $n products");
            if ($n === 0) $emptyCats++;
            $total += $n;
            usleep(400000);
        }

        $this->log("TopCC catalog done: $total products ($emptyCats empty categories)");
        return $total;
    }

    private function scrapeCategory(string $path, string $catSlug, string $desde, string $hasta): int {
        $categoriaId = $this->getCategoriaId($catSlug);
        $baseUrl     = self::SHOP_BASE . '/' . $path;
        $count       = 0;
        $page        = 1;

        do {
            $url  = $page === 1 ? $baseUrl : $baseUrl . sprintf(self::PAGE_QUERY, $page);
            $html = $this->fetchShopPage($url);
            if (!$html) {
                $this->log("    FETCH FAILED: $url");
                break;
            }
            $this->log("    HTML: " . strlen($html) . "b | productListItem: " . substr_count($html, 'productListItem') . " | url: $url");

            $products = $this->parseProductListing($html);
            if (empty($products)) break;

            foreach ($products as $p) {
                $ok = $this->upsertOferta([
                    ':tienda_id'       => $this->tiendaId,
                    ':categoria_id'    => $categoriaId,
                    ':nombre_de'       => mb_substr($p['name'], 0, 255),
                    ':nombre_fr'       => null,
                    ':nombre_it'       => null,
                    ':precio_original' => $p['price_orig'],
                    ':precio_oferta'   => $p['price'],
                    ':descuento_pct'   => $p['discount'],
                    ':unidad'          => $p['unit'] ? mb_substr($p['unit'], 0, 50) : null,
                    ':imagen_url'      => $p['image'],
                    ':valido_desde'    => $desde,
                    ':valido_hasta'    => $hasta,
                    ':canton'          => 'all',
                    ':fuente_url'      => mb_substr($p['url'], 0, 500),
                ]);
                if ($ok) $count++;
            }

            // Check if next page link exists in current HTML
            $nextPage = $page + 1;
            $hasMore  = str_contains($html, 'page=' . $nextPage);
            $page     = $nextPage;
            if ($page > 30) break;
            if ($hasMore) usleep(300000);
        } while ($hasMore);

        return $count;
    }

    /**
     * Parse SAP Hybris product listing page.
     * Structure: ul.product__listing > li.item-list-item > div.productListItem
     */
    private function parseProductListing(string $html): array {
        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        $xp = new DOMXPath($dom);

        $items    = $xp->query("//*[contains(@class,'productListItem')]");
        $products = [];

        foreach ($items as $item) {
            $p = $this->extractProduct($xp, $item);
            if ($p) $products[] = $p;
        }

        return $products;
    }

    private function extractProduct(DOMXPath $xp, DOMNode $item): ?array {
        // ── Name ──
        // div.item-name > a > span (first span, not .itemUid)
        $nameNodes = $xp->query(".//div[contains(@class,'item-name')]//a/span[not(@class) or @class='']", $item);
        $name = null;
        foreach ($nameNodes as $n) {
            $t = trim($n->textContent);
            if ($t !== '') { $name = $t; break; }
        }
        if (!$name) return null;
        // Clean: remove trailing " ' ' Origin" label (e.g. "Name ' ' Schweizer Fleisch")
        $name = preg_replace("/\s*'\s*'\s*.+$/u", '', $name);
        $name = trim($name);
        if (!$name) return null;

        // ── URL ──
        $urlNode = $xp->query(".//div[contains(@class,'item-name')]//a[@href]", $item)->item(0);
        if (!$urlNode) return null;
        $url = self::SHOP_BASE . $urlNode->getAttribute('href');

        // ── Image ──
        $imgNode = $xp->query(".//div[contains(@class,'item-image')]//img[@src]", $item)->item(0);
        $image   = null;
        if ($imgNode) {
            $src = $imgNode->getAttribute('src');
            $image = $src ? self::SHOP_BASE . $src : null;
        }

        // ── Prices ──
        // On sale: span.salesprice (offer) + span.line-through (original)
        $saleNode = $xp->query(".//*[contains(@class,'salesprice')]", $item)->item(0);
        $origNode = $xp->query(".//*[contains(@class,'line-through')]", $item)->item(0);
        if ($saleNode) {
            $priceOffer = $this->parseChf($saleNode->textContent);
            $priceOrig  = $origNode ? $this->parseChf($origNode->textContent) : null;
        } else {
            // Regular: span.normalPrice
            $normNode   = $xp->query(".//*[contains(@class,'normalPrice')]", $item)->item(0);
            $priceOffer = $normNode ? $this->parseChf($normNode->textContent) : null;
            $priceOrig  = null;
        }

        // Fallback to sourceUnit price (per kg/unit)
        if (!$priceOffer) {
            $srcNode    = $xp->query(".//*[contains(@class,'sourceUnit')]//span", $item)->item(0);
            $priceOffer = $srcNode ? $this->parseChf($srcNode->textContent) : null;
        }
        if (!$priceOffer || $priceOffer <= 0) return null;

        // ── Discount ──
        $discount = 0;
        if ($priceOrig && $priceOrig > $priceOffer) {
            $discount = (int) round(($priceOrig - $priceOffer) / $priceOrig * 100);
        }

        // ── Unit ──
        // div.item-variant-name: "Stück (2.5 KG)" + sourceUnit: "/ Kilogramm"
        $varNameNode = $xp->query(".//*[contains(@class,'item-variant-name')]", $item)->item(0);
        $srcUnitNode = $xp->query(".//*[contains(@class,'sourceUnit')]", $item)->item(0);
        $unit = null;
        if ($varNameNode) {
            $unit = trim(preg_replace('/\s+/', ' ', $varNameNode->textContent));
        }
        if ($srcUnitNode) {
            // "CHF 19,80 / Kilogramm" → extract "/ Kilogramm" part
            preg_match('/\/\s*(\w+)/u', $srcUnitNode->textContent, $um);
            if ($um[1] ?? null) {
                $unit = $unit ? $unit . ' · ' . $um[1] : $um[1];
            }
        }

        return [
            'name'       => $name,
            'url'        => $url,
            'image'      => $image,
            'price'      => $priceOffer,
            'price_orig' => $priceOrig,
            'discount'   => $discount,
            'unit'       => $unit,
        ];
    }

    /**
     * Auto-discover leaf categories from site navigation.
     * Returns [path => our_category_slug]
     */
    private function discoverCategories(): array {
        $html = $this->fetchShopPage(self::SHOP_BASE . '/de');
        if (!$html) {
            $this->log('WARN: could not fetch navigation, using fallback');
            return $this->fallbackCategories();
        }

        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        $xp = new DOMXPath($dom);

        // Nav links that end with /c/{slug} are category pages
        $links = $xp->query("//nav//a[contains(@href,'/c/')]");
        if ($links->length === 0) {
            $links = $xp->query("//a[contains(@href,'/c/')]");
        }

        $categories = [];
        foreach ($links as $link) {
            $href = $link->getAttribute('href');
            // Strip domain
            $href = preg_replace('#^https?://[^/]+#', '', $href);
            $href = ltrim($href, '/');
            if (!$href || isset($categories[$href])) continue;
            // Only leaf categories (not top-level with just /c/ at the end of a short path)
            $catSlug = $this->guessOurSlug($href);
            $categories[$href] = $catSlug;
        }

        if (empty($categories)) return $this->fallbackCategories();
        return $categories;
    }

    private function guessOurSlug(string $path): string {
        $p = strtolower($path);
        $map = [
            'fleisch'    => 'fleisch',
            'rindfleisch'=> 'fleisch',
            'schweine'   => 'fleisch',
            'kalbfleisch'=> 'fleisch',
            'lammfleisch'=> 'fleisch',
            'gefluegel'  => 'fleisch',
            'poulet'     => 'fleisch',
            'charcuteri' => 'fleisch',
            'wurstwaren' => 'fleisch',
            'fisch'      => 'fisch',
            'meeresfru'  => 'fisch',
            'fruch'      => 'gemuese',
            'gemuse'     => 'gemuese',
            'gemüse'     => 'gemuese',
            'salat'      => 'gemuese',
            'krauter'    => 'gemuese',
            'milch'      => 'milch',
            'kase'       => 'milch',
            'käse'       => 'milch',
            'joghurt'    => 'milch',
            'brot'       => 'bakery',
            'backwar'    => 'bakery',
            'teig'       => 'bakery',
            'getr'       => 'getraenke',
            'bier'       => 'getraenke',
            'wein'       => 'getraenke',
            'wasser'     => 'getraenke',
            'softdrink'  => 'getraenke',
            'kaffee'     => 'getraenke',
            'spirituos'  => 'getraenke',
            'snack'      => 'snacks',
            'sussigk'    => 'snacks',
            'süssigk'    => 'snacks',
            'konserv'    => 'snacks',
            'teigwar'    => 'snacks',
            'saucen'     => 'snacks',
            'gewurz'     => 'snacks',
            'haushalt'   => 'haushalt',
            'reinigun'   => 'haushalt',
            'papier'     => 'haushalt',
            'verpackun'  => 'haushalt',
            'hygiene'    => 'hygiene',
            'tierfutter' => 'tierfutter',
        ];
        foreach ($map as $kw => $slug) {
            if (str_contains($p, $kw)) return $slug;
        }
        return 'other';
    }

    /** Hardcoded fallback if nav discovery fails */
    private function fallbackCategories(): array {
        return [
            'de/fleisch-charcuterie-im-topcc-online-shop/fleisch/rindfleisch/c/rindfleisch'              => 'fleisch',
            'de/fleisch-charcuterie-im-topcc-online-shop/fleisch/schweinefleisch/c/schweinefleisch'      => 'fleisch',
            'de/fleisch-charcuterie-im-topcc-online-shop/fleisch/kalbfleisch/c/kalbfleisch'              => 'fleisch',
            'de/fleisch-charcuterie-im-topcc-online-shop/fleisch/poulet-gefluegel/c/poulet-gefluegel'    => 'fleisch',
            'de/fleisch-charcuterie-im-topcc-online-shop/charcuterie/c/charcuterie'                      => 'fleisch',
            'de/fisch-und-meeresfruchte-im-topcc-online-shop/c/fisch-meeresfruchte'                     => 'fisch',
            'de/fruchte-und-gemuse-im-topcc-online-shop/c/fruchte-gemuse'                               => 'gemuese',
            'de/milch-kase-im-topcc-online-shop/c/milch-kase'                                           => 'milch',
            'de/brot-backwaren-im-topcc-online-shop/c/brot-backwaren'                                   => 'bakery',
            'de/getranke-im-topcc-online-shop/c/getranke'                                               => 'getraenke',
            'de/lebensmittel-im-topcc-online-shop/c/lebensmittel'                                       => 'snacks',
            'de/haushalt-reinigung-im-topcc-online-shop/c/haushalt-reinigung'                           => 'haushalt',
        ];
    }

    private function parseChf(string $raw): ?float {
        // "CHF 49,50" or "CHF 49.50"
        if (preg_match('/(\d+)[.,](\d{2})/', $raw, $m)) {
            return (float) ($m[1] . '.' . $m[2]);
        }
        return null;
    }

    private function fetchShopPage(string $url): string|false {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            CURLOPT_HTTPHEADER     => [
                'Accept: text/html,application/xhtml+xml',
                'Accept-Language: de-CH,de;q=0.9',
                'Accept-Encoding: identity',
            ],
            CURLOPT_COOKIEFILE => '',
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200 || !$body) return false;
        return $body;
    }

    private function getCatalogDates(): array {
        return [
            date('Y-m-d', strtotime('monday this week')),
            date('Y-m-d', strtotime('saturday this week')),
        ];
    }
}
