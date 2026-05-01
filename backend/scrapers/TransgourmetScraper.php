<?php
require_once __DIR__ . '/BaseScraper.php';

/**
 * Transgourmet / Prodega — extrae ofertas del PDF semanal de acciones.
 * 
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

        // 3. Guardar PDF en disco temporalmente
        $tmpFile = sys_get_temp_dir() . '/transgourmet_' . time() . '_' . getmypid() . '.pdf';
        file_put_contents($tmpFile, $pdfContent);

        // 3a. Extraer texto con pdftotext
        $text = shell_exec('pdftotext -layout ' . escapeshellarg($tmpFile) . ' - 2>/dev/null');

        // 3b. Extraer imágenes del PDF y emparejarlas con los productos por página
        $artToImageUrl = [];
        $ptImgPath = trim((string) shell_exec('which pdfimages 2>/dev/null'));
        if (!$ptImgPath) {
            foreach (['/usr/bin/pdfimages', '/usr/local/bin/pdfimages', '/opt/homebrew/bin/pdfimages'] as $p) {
                if (file_exists($p)) { $ptImgPath = $p; break; }
            }
        }
        if ($ptImgPath) {
            $listOutput = shell_exec($ptImgPath . ' -list ' . escapeshellarg($tmpFile) . ' 2>/dev/null') ?? '';
            $tmpImgDir  = sys_get_temp_dir() . '/tg_imgs_' . time() . '_' . getmypid();
            @mkdir($tmpImgDir, 0755, true);
            $imgBase = $tmpImgDir . '/img';
            shell_exec($ptImgPath . ' -j ' . escapeshellarg($tmpFile) . ' ' . escapeshellarg($imgBase) . ' 2>/dev/null');
            $imgMeta        = $this->parsePdfImagesList($listOutput, $imgBase);
            $artToImageFile = $this->matchByPage($text, $imgMeta);

            // Guardar en backend/images/transgourmet/ → accesible en APP_URL/images/transgourmet/
            $imgDir = __DIR__ . '/../images/transgourmet/';
            @mkdir($imgDir, 0755, true);
            foreach ($artToImageFile as $artNr => $imgFile) {
                $dest = $imgDir . $artNr . '.jpg';
                if (copy($imgFile, $dest)) {
                    $artToImageUrl[$artNr] = APP_URL . '/images/transgourmet/' . $artNr . '.jpg';
                }
            }
            $this->log('pdfimages: ' . count($artToImageUrl) . ' imágenes guardadas');
            $this->cleanupImgDir($tmpImgDir);
        } else {
            $this->log('pdfimages no disponible — sin imágenes');
        }

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

        // 6. Guardar en DB — sin imagen hasta tener acceso API de Transgourmet
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
                ':imagen_url'      => $artToImageUrl[$product['art_nr']] ?? null,
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
        foreach ($data['datos'] ?? [] as $entry) {
            if (($entry['tienda'] ?? '') === 'transgourmet' && !empty($entry['pdf_url'])) {
                return $entry['pdf_url'];
            }
        }
        return null;
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

    /**
     * Parsea el HTML generado por pdftohtml -c y empareja cada Art.-Nr. con
     * la imagen que aparece más cercana encima de él en la misma columna.
     * Retorna [ art_nr => ruta_absoluta_imagen ]
     */
    /**
     * Parsea la salida de "pdfimages -list" y retorna array de imágenes con
     * su página, número secuencial, encoding y tamaño estimado.
     * Solo incluye imágenes JPEG de producto (enc=jpeg, size>8KB).
     */
    private function parsePdfImagesList(string $listOutput, string $imgBase): array {
        $result = [];
        foreach (explode("\n", $listOutput) as $line) {
            $cols = preg_split('/\s+/', trim($line));
            if (count($cols) < 2) continue;
            if (!ctype_digit($cols[0])) continue;
            $page = (int)$cols[0];
            $num  = (int)$cols[1];

            // Si pdfimages -j creó el archivo como .jpg, es JPEG de producto
            $imgFile = $imgBase . '-' . sprintf('%03d', $num) . '.jpg';
            if (!file_exists($imgFile)) continue;
            $size = filesize($imgFile);
            if ($size < 4096) continue; // descartar imágenes muy pequeñas

            $result[] = ['page' => $page, 'num' => $num, 'file' => $imgFile, 'size' => $size];
        }
        $this->log('parsePdfImagesList: ' . count($result) . ' imágenes JPEG con página asignada');
        return $result;
    }

    /**
     * Divide texto por páginas (\f) y dentro de cada página empareja
     * imágenes con productos por índice. Retorna [art_nr => image_file].
     */
    private function matchByPage(string $text, array $imgMeta): array {
        // Agrupar imágenes por página, ordenadas por num (secuencia en PDF)
        $imgByPage = [];
        foreach ($imgMeta as $img) {
            $imgByPage[$img['page']][] = $img;
        }

        $result = [];
        $pages  = explode("\f", $text);

        foreach ($pages as $pageIdx => $pageText) {
            $pageNum  = $pageIdx + 1;
            $products = $this->parseProducts($pageText);
            $imgs     = $imgByPage[$pageNum] ?? [];

            // Si hay más imágenes que productos en la página, quedarse con las N más grandes
            $n = count($products);
            if (count($imgs) > $n && $n > 0) {
                usort($imgs, fn($a, $b) => $b['size'] - $a['size']);
                $imgs = array_slice($imgs, 0, $n);
                // Restaurar orden secuencial
                usort($imgs, fn($a, $b) => $a['num'] - $b['num']);
            }

            foreach ($products as $prodIdx => $product) {
                if (isset($imgs[$prodIdx])) {
                    $result[$product['art_nr']] = $imgs[$prodIdx]['file'];
                }
            }
        }

        return $result;
    }

    private function cleanupImgDir(string $dir): void {
        foreach (glob($dir . '/*') ?: [] as $f) @unlink($f);
        @rmdir($dir);
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
