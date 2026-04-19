<?php
require_once __DIR__ . '/BaseScraper.php';
require_once __DIR__ . '/DeepLTranslator.php';

/**
 * Scraper para el prospecto PDF semanal de Aligro.
 * Extrae ~380 productos de la semana actual directamente del PDF oficial.
 * Complementa a AligroScraper (API) que extrae ~1400 productos adicionales.
 */
class AligroPdfScraper extends BaseScraper {

    protected string $tiendaSlug = 'aligro';

    private const IMG_BASE = 'https://www.aligro.ch/media/cache/article_thumbnail_jpeg/uploads/articles';

    // Mapeo de cabeceras de categoría del PDF → slug de nuestra DB (FR + DE headers)
    private const CAT_MAP = [
        // French headers
        'FRUITS'        => 'gemuese',
        'LÉGUMES'       => 'gemuese',
        'POISSONNERIE'  => 'fleisch',
        'BOUCHERIE'     => 'fleisch',
        'CHARCUTERIE'   => 'fleisch',
        'TRAITEUR'      => 'other',
        'FROMAGERIE'    => 'milch',
        'FROMAGERIE / CRÉMERIE' => 'milch',
        'BOULANGERIE'   => 'bakery',
        'BOISSONS'      => 'getraenke',
        'ÉPICERIE'      => 'snacks',
        'ÉPICERIE / BISCUITS' => 'snacks',
        'ENTRETIEN'     => 'haushalt',
        'HYGIÈNE'       => 'hygiene',
        'ANIMAUX'       => 'tierfutter',
        // German headers
        'FRÜCHTE'           => 'gemuese',
        'GEMÜSE'            => 'gemuese',
        'FISCHEREI'         => 'fisch',
        'FISCHABTEILUNG'    => 'fisch',
        'POISSONNERIE'      => 'fisch',
        'METZGEREI'         => 'fleisch',
        'CHARCUTERIE / WURSTWAREN' => 'fleisch',
        'WURSTWAREN'        => 'fleisch',
        'KÄSEREI'           => 'milch',
        'KÄSEREI / MOLKEREI'=> 'milch',
        'MOLKEREI'          => 'milch',
        'FRISCHPRODUKTE'    => 'milch',
        'BÄCKEREI'          => 'bakery',
        'GETRÄNKE'          => 'getraenke',
        'ALKOHOL'           => 'getraenke',
        'LEBENSMITTEL'      => 'snacks',
        'REINIGUNG'         => 'haushalt',
        'NON-FOOD'          => 'haushalt',
        'HYGIENE'           => 'hygiene',
        'TIERE'             => 'tierfutter',
        'TIERPFLEGE'        => 'tierfutter',
        'DELIKATESSEN'      => 'other',
    ];

    public function run(): int {
        $this->log('Iniciando AligroPdfScraper...');

        $pdfUrl = $this->getPdfUrl();
        if (!$pdfUrl) {
            $this->log('ERROR: No se encontró URL del PDF de Aligro');
            return 0;
        }
        $this->log("PDF: $pdfUrl");

        $tmpPdf  = sys_get_temp_dir() . '/aligro_week.pdf';
        $tmpTxt  = sys_get_temp_dir() . '/aligro_week.txt';

        // Download PDF (disable SSL verify — Aligro CDN has cert chain issues on some servers)
        $ch = curl_init($pdfUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_USERAGENT      => 'Mozilla/5.0',
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $pdf = curl_exec($ch);
        curl_close($ch);
        if (!$pdf) {
            $this->log('ERROR: No se pudo descargar el PDF');
            return 0;
        }
        file_put_contents($tmpPdf, $pdf);

        $pdfSize = strlen($pdf);
        $isPdf   = str_starts_with($pdf, '%PDF');
        $this->log("PDF descargado: {$pdfSize} bytes, isPDF=" . ($isPdf ? 'yes' : 'NO'));
        if (!$isPdf) {
            $this->log('ERROR: respuesta no es PDF: ' . substr($pdf, 0, 100));
            return 0;
        }

        // Check if pdftotext is available
        $ptPath = trim((string) shell_exec('which pdftotext 2>/dev/null'));
        $this->log('pdftotext path: ' . ($ptPath ?: 'NOT FOUND'));
        if (!$ptPath) {
            // Try common paths
            foreach (['/usr/bin/pdftotext', '/usr/local/bin/pdftotext', '/opt/homebrew/bin/pdftotext'] as $p) {
                if (file_exists($p)) { $ptPath = $p; break; }
            }
        }
        if (!$ptPath) {
            $this->log('ERROR: pdftotext no está instalado en el servidor');
            return 0;
        }

        // Extract text with pdftotext -raw
        exec($ptPath . ' -raw ' . escapeshellarg($tmpPdf) . ' ' . escapeshellarg($tmpTxt) . ' 2>&1', $out, $rc);
        $txtSize = file_exists($tmpTxt) ? filesize($tmpTxt) : 0;
        $this->log("pdftotext rc=$rc, txtSize={$txtSize}, out=" . implode(' ', $out));
        if ($rc !== 0 || $txtSize === 0) {
            $this->log('ERROR: pdftotext falló (rc=' . $rc . ')');
            @unlink($tmpPdf);
            return 0;
        }

        $rawText = file_get_contents($tmpTxt);
        @unlink($tmpPdf);
        @unlink($tmpTxt);

        $products = $this->parseText($rawText);
        $this->log('Productos parseados del PDF: ' . count($products));

        [$validoDesde, $validoHasta] = $this->getValidityDates($rawText);
        $this->log("Período: $validoDesde → $validoHasta");

        $count = 0;
        foreach ($products as $idx => $p) {
            $row = [
                ':tienda_id'       => $this->tiendaId,
                ':categoria_id'    => $this->getCategoriaId($p['categoria']),
                ':nombre_de'       => mb_substr($p['nombre_fr'], 0, 255),
                ':nombre_fr'       => null,
                ':nombre_it'       => null,
                ':precio_original' => null,
                ':precio_oferta'   => $p['precio'],
                ':descuento_pct'   => $p['descuento'],
                ':unidad'          => $p['unidad'] ? mb_substr($p['unidad'], 0, 50) : null,
                ':imagen_url'      => $p['imagen'],
                ':valido_desde'    => $validoDesde,
                ':valido_hasta'    => $validoHasta,
                ':canton'          => 'all',
                ':fuente_url'      => 'https://www.aligro.ch/produits/' . $p['art'],
            ];
            if ($this->upsertOferta($row)) $count++;
        }

        $this->log("AligroPdfScraper finalizado: $count ofertas upserted");
        return $count;
    }

    /** Parses the raw pdftotext output and returns array of product data */
    private function parseText(string $rawText): array {
        // Normalize page breaks and control chars
        $text  = str_replace("\x0c", "\n", $rawText);
        $lines = explode("\n", $text);

        $artRe       = '/^\s*(\d{3,6})\s*$/';
        $priceIntRe  = '/^\s*(\d+)\.\s*$/';          // "16."  (two-line DE format)
        $priceDecRe  = '/^\s*(\d{1,2})\s*$/';        // "96"   (second line)
        $priceOneRe  = '/^\s*(\d+)\.\s+(\d{1,2})\s*$/'; // "16. 96" (one-line FR format)
        $discRe      = '/^(\d{1,2})%/';
        // Article number embedded at end of a description line (starts with \x03)
        $artInDescRe = '/[\x03].*?\s(\d{3,6})\s*$/';

        $products   = [];
        $currentCat = 'other';
        $n          = count($lines);

        for ($i = 0; $i < $n; $i++) {
            $line = $lines[$i];
            $ls   = trim($line);

            // Track category headers
            $catSlug = $this->detectCategory($ls);
            if ($catSlug) {
                $currentCat = $catSlug;
                continue;
            }

            // Try to match article number on its own line
            if (preg_match($artRe, $ls, $m)) {
                $art = (int) $m[1];
            } elseif (strpos($line, "\x03") !== false && preg_match($artInDescRe, $line, $m)) {
                $art = (int) $m[1];
            } else {
                continue;
            }

            if ($art < 100) continue;

            // Forward scan: price → unit → discount
            $price = null; $unit = null; $discount = null;
            for ($j = $i + 1; $j < min($i + 10, $n); $j++) {
                $l = trim($lines[$j]);
                if ($price === null) {
                    // Two-line DE format: "16." then "96" on the next line
                    if (preg_match($priceIntRe, $l, $pm) && isset($lines[$j + 1])) {
                        $nextL = trim($lines[$j + 1]);
                        if (preg_match($priceDecRe, $nextL, $pm2)) {
                            $price = (float) ($pm[1] . '.' . str_pad($pm2[1], 2, '0', STR_PAD_RIGHT));
                            $j++; // skip the decimal line
                            continue;
                        }
                    }
                    // One-line FR format: "16. 96"
                    if (preg_match($priceOneRe, $l, $pm)) {
                        $price = (float) ($pm[1] . '.' . str_pad($pm[2], 2, '0', STR_PAD_RIGHT));
                    }
                } else {
                    if (preg_match($discRe, $l, $dm)) {
                        $discount = (int) $dm[1];
                        break;
                    } elseif ($l && $unit === null && !preg_match($artRe, $l)
                               && !preg_match($priceIntRe, $l) && !preg_match($priceOneRe, $l)
                               && !in_array($l, ['PRO', '2L', '1/2', 'PRIX', 'KG', 'ST', 'STK'])) {
                        $unit = $l;
                    }
                }
            }

            // Backward scan: product name
            $name = null;
            for ($k = $i - 1; $k >= max(0, $i - 7); $k--) {
                $l   = $lines[$k];
                $ls2 = trim($l);
                if (str_starts_with($l, "\x03")) continue;
                if (!$ls2 || strlen($ls2) < 3) continue;
                if (preg_match($artRe, $ls2) || preg_match($priceOneRe, $ls2) || preg_match($priceIntRe, $ls2)) continue;
                if (preg_match($discRe, $ls2)) continue;
                if ($this->detectCategory($ls2)) continue;
                // Skip quantity/description fragments
                if (preg_match('/^(ca\.|S\.\s*\d|Genève|Chavan|Sion |Matr|PRO$|www\.|p\.\s|\()/i', $ls2)) continue;
                if (preg_match('/^\d+\+?\s*(Jahre|Monate|Wochen|Stück|x\b)/i', $ls2)) continue; // "1+ Jahre", "3 x"
                if (preg_match('/^(ca|ab|bis|aus|ohne|mit|für|und|vom|von|oder)\b/i', $ls2)) continue;
                if (preg_match('/^\d+[\.,]\d+\s*[a-z]/i', $ls2)) continue; // "2.5 kg" etc
                // Skip wine/food classification codes: "DOC 2021, 6 x", "DOP 2019", "IGT", "AOC"
                if (preg_match('/^(DOC|DOP|IGT|AOC|AOP|PDO|PGI|DAC)\b/i', $ls2)) continue;
                // Skip lines ending with quantity "... 6 x" or "... 3 x"
                if (preg_match('/,\s*\d+\s*x\s*$/i', $ls2)) continue;
                if (strlen($ls2) < 5) continue;
                $name = $ls2;
                break;
            }

            if (!$art || !$price || $price <= 0 || !$name || !$discount) continue;
            if ($discount < 5 || $discount > 80) continue;

            $prefix = substr((string) $art, 0, 3);
            $imagen = self::IMG_BASE . "/$prefix/{$art}_FR_1.jpeg";

            $products[] = [
                'art'       => $art,
                'nombre_fr' => $name,
                'precio'    => $price,
                'unidad'    => $unit,
                'descuento' => $discount,
                'imagen'    => $imagen,
                'categoria' => $currentCat,
            ];
        }


        // Deduplicate by article number (keep first occurrence)
        $seen = [];
        $deduped = [];
        foreach ($products as $p) {
            if (!isset($seen[$p['art']])) {
                $seen[$p['art']] = true;
                $deduped[] = $p;
            }
        }
        return $deduped;
    }

    /** Detect if a line is a category header and return the category slug */
    private function detectCategory(string $line): ?string {
        if (!$line || strlen($line) < 4) return null;
        // Category headers are ALL CAPS French words
        $upper = mb_strtoupper($line);
        if ($upper !== $line) return null;

        foreach (self::CAT_MAP as $key => $slug) {
            if (str_contains($line, $key)) return $slug;
        }
        return null;
    }

    /** Extract validity dates from PDF header — handles both FR and DE formats */
    private function getValidityDates(string $rawText): array {
        // French: "du 20.4 au 25.4.2026"
        if (preg_match('/\bdu\s+(\d{1,2})\.(\d{1,2})\.?\s+au\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\b/i', $rawText, $m)) {
            $year  = (int) $m[5];
            $desde = sprintf('%04d-%02d-%02d', $year, (int)$m[2], (int)$m[1]);
            $hasta = sprintf('%04d-%02d-%02d', $year, (int)$m[4], (int)$m[3]);
            $this->log("Fechas detectadas (FR): $desde → $hasta");
            return [$desde, $hasta];
        }
        // German: "vom 20.4. bis 25.4.2026"
        if (preg_match('/\bvom\s+(\d{1,2})\.(\d{1,2})\.?\s+bis\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\b/i', $rawText, $m)) {
            $year  = (int) $m[5];
            $desde = sprintf('%04d-%02d-%02d', $year, (int)$m[2], (int)$m[1]);
            $hasta = sprintf('%04d-%02d-%02d', $year, (int)$m[4], (int)$m[3]);
            $this->log("Fechas detectadas (DE): $desde → $hasta");
            return [$desde, $hasta];
        }
        // Fallback: current Monday→Saturday
        $monday   = date('Y-m-d', strtotime('monday this week'));
        $saturday = date('Y-m-d', strtotime('saturday this week'));
        $this->log("Fechas: fallback Monday→Saturday $monday → $saturday");
        return [$monday, $saturday];
    }

    /** Get the current Aligro weekly catalog PDF URL — picks the largest PDF on the page */
    private function getPdfUrl(): ?string {
        foreach (['https://www.aligro.ch/documents/prospectus', 'https://www.aligro.ch/de/prospekte'] as $pageUrl) {
            $html = $this->fetch($pageUrl);
            if (!$html) continue;

            // Collect all unique PDF paths
            $paths = [];
            preg_match_all('/(\/uploads\/documents\/prospectus\/[^"\'<>\s]+\.pdf)/i', $html, $m);
            foreach ($m[1] as $p) $paths[$p] = 0;
            preg_match_all('/(https:\/\/www\.aligro\.ch\/uploads\/documents\/prospectus\/[^"\'<>\s]+\.pdf)/i', $html, $m2);
            foreach ($m2[1] as $p) $paths[parse_url($p, PHP_URL_PATH)] = 0;

            if (empty($paths)) continue;

            // Check size of each PDF via HEAD request
            foreach (array_unique(array_keys($paths)) as $path) {
                $fullUrl = 'https://www.aligro.ch' . $path;
                $ch = curl_init($fullUrl);
                curl_setopt_array($ch, [
                    CURLOPT_NOBODY         => true,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT        => 10,
                    CURLOPT_USERAGENT      => 'Mozilla/5.0',
                    CURLOPT_SSL_VERIFYPEER => false,
                ]);
                curl_exec($ch);
                $size = (int) curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
                curl_close($ch);
                $paths[$path] = $size;
                $this->log("PDF found: $path ({$size} bytes)");
            }

            // Pick the largest PDF (German weekly catalog)
            arsort($paths);
            $best = array_key_first(array_filter($paths, fn($s) => $s > 5_000_000));
            if ($best) {
                $this->log("Seleccionado PDF: $best ({$paths[$best]} bytes)");
                return 'https://www.aligro.ch' . $best;
            }
        }

        // Fallback from DB config table
        try {
            $row = $this->pdo->query("SELECT valor FROM config WHERE clave = 'aligro_pdf_url'")->fetch();
            if ($row) return $row['valor'];
        } catch (\Exception $e) {}

        return null;
    }

    private function getValidityDatesFromWeek(): array {
        $monday = date('Y-m-d', strtotime('monday this week'));
        $sunday = date('Y-m-d', strtotime('sunday this week'));
        return [$monday, $sunday];
    }
}
