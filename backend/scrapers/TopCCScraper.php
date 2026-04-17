<?php
require_once __DIR__ . '/BaseScraper.php';

class TopCCScraper extends BaseScraper {

    protected string $tiendaSlug = 'topcc';

    private const SITEMAP = 'https://www.topcc.ch/sitemap.xml?sitemap=offers&cHash=4c6a6a074173b95cf32f98a344eab0e1';
    private const BASE    = 'https://www.topcc.ch';

    public function run(): int {
        $this->log('Iniciando scraping TopCC...');

        $urls = $this->getOfferUrls();
        $this->log('URLs encontradas: ' . count($urls));

        $count = 0;
        [$desde, $hasta] = $this->mondayThisSunday();

        foreach ($urls as $url) {
            $data = $this->parseOfferPage($url);
            if (!$data) continue;

            $catSlug     = $this->guessCategoryFromName($data['name']);
            $categoriaId = $this->getCategoriaId($catSlug);

            $ok = $this->upsertOferta([
                ':tienda_id'       => $this->tiendaId,
                ':categoria_id'    => $categoriaId,
                ':nombre_de'       => mb_substr($data['name'], 0, 255),
                ':nombre_fr'       => null,
                ':nombre_it'       => null,
                ':precio_original' => $data['price_orig'],
                ':precio_oferta'   => $data['price_offer'],
                ':descuento_pct'   => $data['discount'],
                ':unidad'          => $data['unit'],
                ':imagen_url'      => $data['image'],
                ':valido_desde'    => $data['valid_from'] ?? $desde,
                ':valido_hasta'    => $data['valid_until'] ?? $hasta,
                ':canton'          => 'all',
                ':fuente_url'      => mb_substr($url, 0, 500),
            ]);
            if ($ok) $count++;

            usleep(300000); // 0.3s entre requests
        }

        $this->log("TopCC finalizado: $count ofertas upserted");
        return $count;
    }

    private function getOfferUrls(): array {
        $xml = $this->fetch(self::SITEMAP);
        if (!$xml) return [];
        preg_match_all('/<loc>([^<]+detail[^<]+)<\/loc>/', $xml, $m);
        return $m[1] ?? [];
    }

    private function parseOfferPage(string $url): ?array {
        $html = $this->fetch($url, ['User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36']);
        if (!$html) return null;

        // Eliminar bloques <style> y <script> para no contaminar los regex
        $html = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html);
        $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);

        // Nombre del producto
        preg_match('/m-price-box-2024__name[^>]*>\s*([^<]+)\s*</i', $html, $nm);
        $name = isset($nm[1]) ? trim(html_entity_decode($nm[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')) : null;

        // Precio oferta: entero + decimales en <sup>
        preg_match('/m-price-box-2024__price[^"]*"[^>]*>\s*(\d+)[^<]*<sup>(\d+)</i', $html, $pm);
        $priceOffer = isset($pm[1], $pm[2]) ? (float) ($pm[1] . '.' . str_pad($pm[2], 2, '0')) : null;

        // Precio original (tachado)
        preg_match('/m-price-box-2024__old-price[^>]*>\s*([^<]+)\s*</i', $html, $op);
        $priceOrig = null;
        if (!empty($op[1])) {
            preg_match('/(\d+)[.,](\d+)/', $op[1], $opd);
            if ($opd) $priceOrig = (float) ($opd[1] . '.' . str_pad($opd[2], 2, '0'));
        }

        // Descuento %
        preg_match('/promo-percent[^>]*>.*?(\d+)\s*%/is', $html, $dp);
        $discount = isset($dp[1]) ? (int) $dp[1] : 0;
        if (!$discount && $priceOrig && $priceOffer && $priceOrig > $priceOffer) {
            $discount = (int) round((($priceOrig - $priceOffer) / $priceOrig) * 100);
        }

        // Imagen OG
        preg_match('/og:image[^>]*content="([^"]+)"/i', $html, $ig);
        $image = $ig[1] ?? null;

        // Unidad (ej: "1 kg", "500 g")
        preg_match('/m-price-box-2024__list-item[^>]*>\s*([^<]+)\s*</i', $html, $ui);
        $unit = isset($ui[1]) ? trim(html_entity_decode($ui[1])) : null;

        // Fechas: buscar "gültig" o DD.MM.YYYY
        preg_match_all('/(\d{2})\.(\d{2})\.(\d{4})/', $html, $dates);
        $validFrom  = null;
        $validUntil = null;
        if (!empty($dates[0])) {
            foreach ($dates[0] as $d) {
                [$day, $month, $year] = explode('.', $d);
                $ts = mktime(0, 0, 0, (int)$month, (int)$day, (int)$year);
                if (!$validFrom) $validFrom = date('Y-m-d', $ts);
                $validUntil = date('Y-m-d', $ts);
            }
        }

        if (!$name || !$priceOffer) return null;

        return [
            'name'        => $name,
            'price_offer' => $priceOffer,
            'price_orig'  => $priceOrig,
            'discount'    => $discount,
            'unit'        => $unit,
            'image'       => $image,
            'valid_from'  => $validFrom,
            'valid_until' => $validUntil,
        ];
    }

    private function guessCategoryFromName(string $name): string {
        $name = mb_strtolower($name);
        $map  = [
            'fleisch'    => ['beef', 'steak', 'entrecôte', 'entrecote', 'fleisch', 'huft', 'poulet', 'veau', 'angus', 'black angus'],
            'gemuese'    => ['erdbeere', 'gemüse', 'frucht', 'fraise', 'tomate', 'salat', 'légume'],
            'milch'      => ['butter', 'käse', 'fromage', 'milch', 'crème', 'yogurt'],
            'bakery'     => ['brot', 'pain', 'bäckerei'],
            'getraenke'  => ['bier', 'wein', 'birra', 'moretti', 'evian', 'wasser', 'wine', 'igt', 'vino', 'spirit', 'american'],
            'snacks'     => ['schokolade', 'snack', 'chips'],
            'haushalt'   => ['reinigung', 'waschmittel'],
            'hygiene'    => ['seife', 'shampoo'],
        ];
        foreach ($map as $cat => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($name, $kw)) return $cat;
            }
        }
        return 'other';
    }
}
