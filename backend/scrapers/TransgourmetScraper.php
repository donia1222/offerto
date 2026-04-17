<?php
require_once __DIR__ . '/BaseScraper.php';

/**
 * Transgourmet / Prodega — extrae ofertas del PDF semanal de acciones.
 * Requiere pdftotext (poppler-utils) instalado en el servidor.
 *
 * Formato del PDF:
 *   Art.-Nr. 115020
 *   Quality Sonnenblumenöl  3.29  -25%  statt 4.45
 *   — o en una sola línea: —
 *   Art.-Nr. 045880  Zwiebeln gross 10 kg netto  0.95
 */
class TransgourmetScraper extends BaseScraper {

    protected string $tiendaSlug = 'transgourmet';

    // URL de nuestro endpoint que devuelve la URL actual del PDF
    private const FOLLETO_API = 'https://web.lweb.ch/oferto/api/folleto.php';

    public function run(): int {
        $this->log('Iniciando scraping Transgourmet PDF...');

        // 1. Obtener URL del PDF
        $pdfUrl = $this->getPdfUrl();
        if (!$pdfUrl) {
            $this->log('ERROR: No se pudo obtener la URL del PDF');
            return 0;
        }
        $this->log("PDF: $pdfUrl");

        // 2. Descargar PDF
        $pdfContent = $this->fetch($pdfUrl, ['Referer: https://www.transgourmet.ch/']);
        if (!$pdfContent || strlen($pdfContent) < 10000) {
            $this->log('ERROR: PDF vacío o demasiado pequeño (' . strlen((string)$pdfContent) . ' bytes)');
            return 0;
        }
        $this->log('PDF descargado: ' . round(strlen($pdfContent) / 1024) . ' KB');

        // 3. Extraer texto con pdftotext
        $tmpFile = sys_get_temp_dir() . '/transgourmet_' . time() . '_' . getmypid() . '.pdf';
        file_put_contents($tmpFile, $pdfContent);
        $text = shell_exec('pdftotext -layout ' . escapeshellarg($tmpFile) . ' - 2>/dev/null');
        unlink($tmpFile);

        if (!$text || strlen($text) < 100) {
            $this->log('ERROR: pdftotext no devolvió texto suficiente');
            return 0;
        }
        $this->log('Texto extraído: ' . strlen($text) . ' chars');

        // 4. Extraer fechas de vigencia del encabezado
        [$validoDesde, $validoHasta] = $this->extractDates($text);
        $this->log("Período: $validoDesde → $validoHasta");

        // 5. Parsear productos
        $products = $this->parseProducts($text);
        $this->log('Productos con descuento encontrados: ' . count($products));

        // 6. Guardar en DB
        $count = 0;
        foreach ($products as $product) {
            $catSlug     = $this->guessCategoryFromName($product['nombre']);
            $categoriaId = $this->getCategoriaId($catSlug);

            $ok = $this->upsertOferta([
                ':tienda_id'       => $this->tiendaId,
                ':categoria_id'    => $categoriaId,
                ':nombre_de'       => mb_substr($product['nombre'], 0, 255),
                ':nombre_fr'       => null,
                ':nombre_it'       => null,
                ':precio_original' => $product['precio_original'],
                ':precio_oferta'   => $product['precio_oferta'],
                ':descuento_pct'   => $product['descuento'],
                ':unidad'          => $product['unidad'],
                ':imagen_url'      => null,
                ':valido_desde'    => $validoDesde,
                ':valido_hasta'    => $validoHasta,
                ':canton'          => 'all',
                ':fuente_url'      => 'transgourmet:art:' . $product['art_nr'],
            ]);
            if ($ok) $count++;
        }

        $this->log("Transgourmet finalizado: $count ofertas upserted");
        return $count;
    }

    // -------------------------------------------------------------------------

    private function getPdfUrl(): ?string {
        $json = @file_get_contents(self::FOLLETO_API);
        if (!$json) return null;
        $data = json_decode($json, true);
        return $data['datos']['pdf_url'] ?? null;
    }

    /**
     * Busca el patrón de fecha "D.M.–D.M.YYYY" o "D.M.YYYY–D.M.YYYY"
     * que aparece en el encabezado del PDF.
     */
    private function extractDates(string $text): array {
        // "20.4.–25.4.2026"  or  "20.4.-25.4.2026"
        if (preg_match(
            '/(\d{1,2})\.(\d{1,2})\.\s*[–\-]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/u',
            $text, $m
        )) {
            $desde = sprintf('%s-%02d-%02d', $m[5], (int)$m[2], (int)$m[1]);
            $hasta = sprintf('%s-%02d-%02d', $m[5], (int)$m[4], (int)$m[3]);
            // Sanity check
            if ($desde <= $hasta) return [$desde, $hasta];
        }

        // Fallback: semana actual
        return $this->mondayThisSunday();
    }

    /**
     * PDF multi-columna (2-3 columnas por página).
     * Estrategia: detectar la posición horizontal de cada Art.-Nr. en la línea
     * y extraer un slice de ~46 chars de las líneas siguientes en esa misma columna.
     * Así evitamos contaminación de datos entre columnas adyacentes.
     */
    private function parseProducts(string $text): array {
        $lines    = explode("\n", $text);
        $n        = count($lines);
        $products = [];
        $seen     = []; // artNr => true  (evitar duplicados)

        for ($i = 0; $i < $n; $i++) {
            $line = $lines[$i];

            // Encontrar TODOS los Art.-Nr. en esta línea (multi-columna)
            $offset = 0;
            while (preg_match('/Art\.-Nr\.\s*(\d{5,6})/i', $line, $m, PREG_OFFSET_CAPTURE, $offset)) {
                $artNr    = $m[1][0];
                $colStart = max(0, $m[0][1] - 3);   // un poco antes del Art.-Nr.
                $colWidth = 46;                       // anchura de cada columna

                if (isset($seen[$artNr])) {
                    $offset = $m[0][1] + strlen($m[0][0]);
                    continue;
                }
                $seen[$artNr] = true;

                // Recoger el slice de columna de las próximas 14 líneas
                $colLines = [];
                for ($j = $i + 1; $j < min($i + 15, $n); $j++) {
                    $seg = $this->colSlice($lines[$j], $colStart, $colWidth);
                    // Parar si encontramos otro Art.-Nr. en la misma columna
                    if (preg_match('/Art\.-Nr\./i', $seg)) break;
                    if ($seg !== '') $colLines[] = $seg;
                }

                $product = $this->parseProductBlock($colLines, $artNr);
                if ($product) $products[] = $product;

                $offset = $m[0][1] + strlen($m[0][0]);
            }
        }

        return $products;
    }

    /**
     * Extrae un slice de texto de la columna indicada.
     * Rellena con espacios si la línea es más corta.
     */
    private function colSlice(string $line, int $start, int $width): string {
        $line = str_pad($line, $start + $width);
        return trim(substr($line, $start, $width));
    }

    /**
     * Parsea los datos de un producto a partir de las líneas de su columna.
     * Maneja:
     *  - Precio completo:  "3.29"  o  "29.99"
     *  - Precio partido:   "3" en una línea + "29" en misma línea = CHF 3.29
     *                      (formato suizo: franco grande + céntimos pequeños)
     *  - Descuento:        "-25%"
     *  - Precio original:  "statt 4.45"
     *  - Nombre:           el resto del texto
     */
    private function parseProductBlock(array $colLines, string $artNr): ?array {
        $descuento      = 0;
        $precioOriginal = null;
        $precioOferta   = null;
        $nameParts      = [];

        foreach ($colLines as $raw) {
            $line = $raw;

            // statt X.XX
            if (preg_match('/statt\s+([\d]+[.,][\d]{2})/i', $line, $sm)) {
                $precioOriginal = (float) str_replace(',', '.', $sm[1]);
                $line = preg_replace('/statt\s+[\d]+[.,][\d]{2}/i', '', $line);
            }

            // -XX%
            if (preg_match('/-\s*(\d{1,2})\s*%/', $line, $dm)) {
                $descuento = (int) $dm[1];
                $line = preg_replace('/-\s*\d{1,2}\s*%/', '', $line);
            }

            // Precio decimal completo: X.YY o XX.YY o XXX.YY
            if ($precioOferta === null && preg_match('/\b(\d{1,3}[.,]\d{2})\b/', $line, $pm)) {
                $candidate = (float) str_replace(',', '.', $pm[1]);
                if ($candidate > 0 && $candidate < 5000) {
                    $precioOferta = $candidate;
                    $line = preg_replace('/\b\d{1,3}[.,]\d{2}\b/', '', $line, 1);
                }
            }

            // Precio partido suizo: línea que contiene SOLO un entero Y un par de dígitos
            // p.ej. "3   29"  → CHF 3.29
            if ($precioOferta === null && preg_match('/^\s*(\d{1,3})\s{1,10}(\d{2})\s*$/', trim($line), $sp)) {
                $candidate = (float) ($sp[1] . '.' . $sp[2]);
                if ($candidate > 0 && $candidate < 5000) {
                    $precioOferta = $candidate;
                    $line = '';
                }
            }

            // Acumular nombre (texto que no es solo números/signos)
            $cleaned = trim(preg_replace('/\s{2,}/', ' ', $line));
            if ($cleaned !== '' && !preg_match('/^[\d\s.,\-+%\/]+$/', $cleaned)) {
                $nameParts[] = $cleaned;
            }
        }

        if ($precioOferta === null || $precioOferta <= 0) return null;

        // Calcular descuento si no estaba explícito
        if ($descuento === 0 && $precioOriginal !== null && $precioOriginal > $precioOferta) {
            $descuento = (int) round(($precioOriginal - $precioOferta) / $precioOriginal * 100);
        }

        if ($descuento < 5) return null;

        $nombre = trim(implode(' ', $nameParts));
        $nombre = trim(preg_replace('/\s{2,}/', ' ', $nombre), " .,/-\t");

        if (mb_strlen($nombre) < 3) return null;

        // Unidad al final del nombre: "10 kg", "12 x 1 l", "1L", etc.
        $unidad = null;
        if (preg_match('/(\d+\s*x\s*[\d.,]+\s*(?:kg|g|l|ml|cl|dl|stk?|pcs|pack))\s*$/i', $nombre, $um)) {
            $unidad = trim($um[1]);
        } elseif (preg_match('/(\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|cl|dl|stk?|st|pcs|pack))\s*$/i', $nombre, $um)) {
            $unidad = trim($um[1]);
        }

        return [
            'art_nr'          => $artNr,
            'nombre'          => mb_substr($nombre, 0, 255),
            'precio_oferta'   => $precioOferta,
            'precio_original' => $precioOriginal,
            'descuento'       => $descuento,
            'unidad'          => $unidad ? mb_substr($unidad, 0, 50) : null,
        ];
    }

    private function guessCategoryFromName(string $name): string {
        $n = mb_strtolower($name);
        $map = [
            'fleisch'    => ['rinds', 'rindfi', 'beef', 'steak', 'poulet', 'huhn', 'hühnchen', 'schwein', 'kalb', 'lamm', 'fleisch', 'wurst', 'schinken', 'salami', 'speck', 'lyoner', 'cervelat', 'bratwurst'],
            'gemuese'    => ['erdbeere', 'himbeere', 'apfel', 'birne', 'banane', 'orange', 'zitrone', 'tomate', 'salat', 'zwiebel', 'karotte', 'kartoffel', 'zucchetti', 'paprika', 'gurke', 'gemüse', 'früchte', 'frucht', 'beere', 'kirsch', 'trauben', 'melone'],
            'milch'      => ['butter', 'käse', 'rahm', 'milch', 'joghurt', 'quark', 'frischkäse', 'mozzarella', 'parmesan', 'gruyère', 'gruyere', 'emmental', 'appenzeller', 'sbrinz', 'tilsiter', 'mascarpone', 'vollrahm'],
            'bakery'     => ['brot', 'brötchen', 'zopf', 'croissant', 'kuchen', 'torte', 'baguette', 'focaccia'],
            'getraenke'  => ['bier', 'wein', 'prosecco', 'champagner', 'wasser', 'saft', 'cola', 'espresso', 'kaffee', 'mineralwasser', 'limonade', 'rivella', 'ice tea'],
            'snacks'     => ['chips', 'nüsse', 'schokolade', 'süss', 'gipfeli', 'praline', 'confiserie'],
            'haushalt'   => ['reiniger', 'waschmittel', 'spülmittel', 'reinigung', 'einweg'],
            'hygiene'    => ['seife', 'shampoo', 'deodorant', 'zahncreme', 'körper'],
            'tierfutter' => ['hundefutter', 'katzenfutter', 'tierfutter', 'petfood'],
        ];

        foreach ($map as $cat => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($n, $kw)) return $cat;
            }
        }
        return 'other';
    }
}
