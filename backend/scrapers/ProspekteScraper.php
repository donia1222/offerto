<?php

/**
 * ProspekteScraper — recoge TODOS los catálogos PDF/web de Aligro, Transgourmet y TopCC
 * y los guarda en la tabla `prospekte`.
 *
 * Uso:
 *   $s = new ProspekteScraper(getDB());
 *   $n = $s->run();        // scraping de las 3 tiendas
 *   $n = $s->runStore('aligro');
 */
class ProspekteScraper {

    private PDO   $pdo;
    private array $tiendaCache = [];
    private array $logs        = [];

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    // ── Punto de entrada ──────────────────────────────────────────────────────

    public function run(): int {
        $total  = 0;
        $total += $this->scrapeAligro();
        $total += $this->scrapeTransgourmet();
        $total += $this->scrapeTopCC();
        return $total;
    }

    public function runStore(string $slug): int {
        return match ($slug) {
            'aligro'       => $this->scrapeAligro(),
            'transgourmet' => $this->scrapeTransgourmet(),
            'topcc'        => $this->scrapeTopCC(),
            default        => 0,
        };
    }

    public function getLogs(): array { return $this->logs; }

    // ── Aligro ────────────────────────────────────────────────────────────────

    private function scrapeAligro(): int {
        $this->log('Aligro: iniciando scraping...');
        $tiendaId = $this->getTiendaId('aligro');
        if (!$tiendaId) { $this->log('Aligro: tienda no encontrada en DB'); return 0; }
        $this->deactivateStore($tiendaId);

        // URL única — contiene ciudades claramente en <p><b>Título</b><br>Ciudades</p>
        $html = $this->curlGet('https://www.aligro.ch/documents/prospectus');
        if (!$html) { $this->log('Aligro: no se pudo obtener la página'); return 0; }

        if (!preg_match_all('/<article[^>]*class="[^"]*prospectus[^"]*"[^>]*>(.*?)<\/article>/is', $html, $articles)) {
            $this->log('Aligro: no se encontraron artículos');
            return 0;
        }

        $seen  = [];
        $count = 0;

        foreach ($articles[1] as $block) {
            if (!preg_match('/PROFI-Aktionen|Actions\s+PRO/i', $block)) continue;

            // Título: en <b> dentro de <p>; fallback <h2>/<h3>
            $titulo = null;
            if (preg_match('/<p[^>]*>.*?<b[^>]*>(.*?)<\/b>/is', $block, $tm)) {
                $titulo = trim(strip_tags($tm[1]));
            }
            $titulo = $titulo
                   ?: trim(strip_tags($this->extractTag($block, 'h2') ?? ''))
                   ?: trim(strip_tags($this->extractTag($block, 'h3') ?? ''))
                   ?: 'Actions PRO';

            // Ciudades/región: texto después de <br> dentro del mismo <p>
            $subtitulo = null;
            if (preg_match('/<p[^>]*>.*?<br\s*\/?>\s*(.*?)<\/p>/is', $block, $rm)) {
                $cities = trim(html_entity_decode(strip_tags($rm[1]), ENT_QUOTES, 'UTF-8'));
                if (strlen($cities) > 2) $subtitulo = mb_substr($cities, 0, 500);
            }

            [$from, $to] = $this->parseAligroDates($block);
            $semana = $from ? 'KW' . date('W', strtotime($from)) : null;

            preg_match_all('/href="(\/uploads\/documents\/prospectus\/[^"]+\.pdf)"/i', $block, $pdfM);
            if (empty($pdfM[1])) continue;

            // array_unique porque el mismo PDF aparece en la imagen, descarga y vista
            foreach (array_unique($pdfM[1]) as $pdfPath) {
                $pdfUrl = 'https://www.aligro.ch' . $pdfPath;
                if (isset($seen[$pdfUrl])) continue;
                $seen[$pdfUrl] = true;

                $urlKey = substr($pdfPath, 0, 200);
                if ($this->upsert([
                    'tienda_id'    => $tiendaId,
                    'titulo'       => mb_substr($titulo, 0, 255),
                    'subtitulo'    => $subtitulo,
                    'pdf_url'      => $pdfUrl,
                    'web_url'      => null,
                    'url_key'      => $urlKey,
                    'valido_desde' => $from,
                    'valido_hasta' => $to,
                    'semana'       => $semana,
                    'tipo'         => 'aktionen',
                ])) {
                    $count++;
                    $this->log("Aligro: [{$semana}] " . ($subtitulo ?? 'sin región') . " → $pdfUrl");
                }
            }
        }

        $this->log("Aligro: $count entradas guardadas");
        return $count;
    }

    /** Extrae fechas "du X au Y mois AAAA" o "vom X. bis Y. Monat AAAA" */
    private function parseAligroDates(string $block): array {
        $lang = 'fr';
        $monthsDe = [
            'januar'=>1,'februar'=>2,'märz'=>3,'marz'=>3,'april'=>4,'mai'=>5,'juni'=>6,
            'juli'=>7,'august'=>8,'september'=>9,'oktober'=>10,'november'=>11,'dezember'=>12,
        ];
        $monthsFr = [
            'janvier'=>1,'février'=>2,'fevrier'=>2,'mars'=>3,'avril'=>4,'mai'=>5,'juin'=>6,
            'juillet'=>7,'août'=>8,'aout'=>8,'septembre'=>9,'octobre'=>10,'novembre'=>11,
            'décembre'=>12,'decembre'=>12,
        ];
        $plain = strip_tags($block);

        // FR: "du 4 au 9 mai 2026" | "du 27 avril au 2 mai 2026"
        if (preg_match('/\bdu\s+(\d{1,2})(?:\s+([a-zéûîô]+))?\s+au\s+(\d{1,2})\s+([a-zéûîô]+)\s+(\d{4})/iu', $plain, $d)) {
            $em = $monthsFr[mb_strtolower($d[4])] ?? null;
            $sm = (isset($d[2]) && $d[2] !== '') ? ($monthsFr[mb_strtolower($d[2])] ?? $em) : $em;
            if ($em && $sm) {
                return [
                    sprintf('%04d-%02d-%02d', (int)$d[5], $sm, (int)$d[1]),
                    sprintf('%04d-%02d-%02d', (int)$d[5], $em, (int)$d[3]),
                ];
            }
        }
        // DE: "vom 4. bis 9. Mai 2026" | "vom 27. April bis 2. Mai 2026"
        if (preg_match('/\bvom\s+(\d{1,2})\.\s*(?:([a-zäöü]+)\s+)?bis\s+(\d{1,2})\.\s*([a-zäöü]+)\s+(\d{4})/iu', $plain, $d)) {
            $em = $monthsDe[mb_strtolower($d[4])] ?? null;
            $sm = (isset($d[2]) && $d[2] !== '') ? ($monthsDe[mb_strtolower($d[2])] ?? $em) : $em;
            if ($em && $sm) {
                return [
                    sprintf('%04d-%02d-%02d', (int)$d[5], $sm, (int)$d[1]),
                    sprintf('%04d-%02d-%02d', (int)$d[5], $em, (int)$d[3]),
                ];
            }
        }

        // Fallback: semana actual
        return [
            date('Y-m-d', strtotime('monday this week')),
            date('Y-m-d', strtotime('saturday this week')),
        ];
    }

    // ── Transgourmet ──────────────────────────────────────────────────────────

    // Filenames that contain these fragments are evergreen marketing brochures, not weekly offers
    private const TG_SKIP_FRAGMENTS = [
        'marktbericht', 'tg-care', 'tg_care', 'sortimentsbroschuere',
        'cook-magazin', 'cook_magazin', 'cook_agh_mag', 'smart_cuisine',
        'einweggeschirr', 'armee', 'outdoor_katalog',
    ];

    private function scrapeTransgourmet(): int {
        $this->log('Transgourmet: iniciando scraping...');
        $tiendaId = $this->getTiendaId('transgourmet');
        if (!$tiendaId) { $this->log('Transgourmet: tienda no encontrada en DB'); return 0; }
        $this->deactivateStore($tiendaId);

        $html = $this->curlGet('https://www.transgourmet.ch/de/aktionen-broschueren');
        if (!$html) { $this->log('Transgourmet: no se pudo obtener la página'); return 0; }

        $count   = 0;
        $seen    = [];
        $currentKw = (int) date('W');
        $currentYear = (int) date('Y');

        // Todos los PDFs de static.transgourmet.ch
        preg_match_all(
            '/href="(https:\/\/www-static\.transgourmet\.ch\/public\/[^"]+\.pdf)"/i',
            $html, $m
        );

        foreach (array_unique($m[1] ?? []) as $pdfUrl) {
            if (isset($seen[$pdfUrl])) continue;
            $seen[$pdfUrl] = true;

            $file = basename($pdfUrl);
            $fl   = strtolower($file);

            // Saltar catálogos evergreen (material de marketing, no ofertas semanales)
            $skip = false;
            foreach (self::TG_SKIP_FRAGMENTS as $fragment) {
                if (str_contains($fl, $fragment)) { $skip = true; break; }
            }
            if ($skip) continue;

            $tipo = $this->detectTgTipo($file);
            $kw   = $this->extractKwFromFilename($file);

            // Saltar todos los katalog (frischfisch, weinfestival, etc.)
            if ($tipo === 'katalog') continue;

            // Saltar KWs demasiado viejas (más de 4 semanas atrás)
            if ($kw) {
                $kwAge = $currentKw - $kw;
                // Ajuste si cruzamos año (KW52 → KW01)
                if ($kwAge < -10) $kwAge += 52;
                if ($kwAge > 4) continue;
            }

            // Intentar inferir el año del path de la URL (ej. /2026-04/)
            $year = $currentYear;
            if (preg_match('#/(\d{4})-\d{2}/#', $pdfUrl, $ym)) {
                $year = (int) $ym[1];
            }

            [$from, $to] = $kw ? $this->kwToDates($kw, $year) : $this->currentWeekDates();
            $semana = $kw ? 'KW' . str_pad($kw, 2, '0', STR_PAD_LEFT) : null;
            $titulo = $this->buildTgTitulo($tipo, $semana);
            $urlKey = substr($file, 0, 200);

            if ($this->upsert([
                'tienda_id'    => $tiendaId,
                'titulo'       => $titulo,
                'subtitulo'    => null,
                'pdf_url'      => $pdfUrl,
                'web_url'      => 'https://www.transgourmet.ch/de/aktionen-broschueren',
                'url_key'      => $urlKey,
                'valido_desde' => $from,
                'valido_hasta' => $to,
                'semana'       => $semana,
                'tipo'         => $tipo,
            ])) {
                $count++;
                $this->log("Transgourmet: [$semana] $tipo → $pdfUrl");
            }
        }

        $this->log("Transgourmet: $count entradas guardadas");
        return $count;
    }

    private function detectTgTipo(string $filename): string {
        $f = strtolower($filename);
        if (str_contains($f, 'aktionen'))  return 'aktionen';
        if (str_contains($f, 'baeckerei') || str_contains($f, 'bäckerei')) return 'baeckerei';
        if (str_contains($f, 'kiosk'))     return 'kiosk';
        if (str_contains($f, 'guide'))     return 'guide';
        if (str_contains($f, 'beilage'))   return 'beilage';
        if (str_contains($f, 'aktuell'))   return 'aktionen';
        return 'katalog';
    }

    private function buildTgTitulo(string $tipo, ?string $semana): string {
        $labels = [
            'aktionen'  => 'Aktionen',
            'baeckerei' => 'Bäckerei',
            'kiosk'     => 'Kiosk',
            'guide'     => 'Guide / Magazin',
            'beilage'   => 'Beilage',
            'katalog'   => 'Katalog',
        ];
        $label = $labels[$tipo] ?? ucfirst($tipo);
        return $semana ? "Transgourmet $label $semana" : "Transgourmet $label";
    }

    // ── TopCC ─────────────────────────────────────────────────────────────────

    private function scrapeTopCC(): int {
        $this->log('TopCC: iniciando scraping...');
        $tiendaId = $this->getTiendaId('topcc');
        if (!$tiendaId) { $this->log('TopCC: tienda no encontrada en DB'); return 0; }
        $this->deactivateStore($tiendaId);

        $count = 0;
        $year  = (int) date('Y');
        $kw    = (int) date('W');

        // Semana actual + próxima (patrón de URL predecible — wochenhits.topcc.ch bloquea HEAD/Range)
        for ($offset = 0; $offset <= 1; $offset++) {
            $targetKw = $kw + $offset;
            $targetY  = $year;
            if ($targetKw > 52) { $targetKw -= 52; $targetY++; }
            $kwPad  = str_pad($targetKw, 2, '0', STR_PAD_LEFT);
            $semana = 'KW' . $kwPad;

            $webUrl = "https://wochenhits.topcc.ch/flugblatt/{$targetY}/topcc-wochen-hits-{$targetY}-kw{$kwPad}/";
            [$from, $to] = $this->kwToDates($targetKw, $targetY);

            $urlKey = "topcc-wochenhits-{$targetY}-kw{$kwPad}";
            if ($this->upsert([
                'tienda_id'    => $tiendaId,
                'titulo'       => "TopCC Wochen-Hits $semana",
                'subtitulo'    => null,
                'pdf_url'      => null,
                'web_url'      => $webUrl,
                'url_key'      => $urlKey,
                'valido_desde' => $from,
                'valido_hasta' => $to,
                'semana'       => $semana,
                'tipo'         => 'wochenhits',
            ])) {
                $count++;
                $this->log("TopCC: [$semana] wochenhits → $webUrl");
            }
        }

        // Beilagen: scrape de la página principal para obtener beilagen recientes
        $count += $this->scrapeTopCCBeilagen($tiendaId);

        $this->log("TopCC: $count entradas guardadas");
        return $count;
    }

    private function scrapeTopCCBeilagen(int $tiendaId): int {
        $html = $this->curlGet('https://wochenhits.topcc.ch/');
        if (!$html) return 0;

        $count = 0;
        $seen  = [];
        $year  = (int) date('Y');

        // Buscar links a beilagen: /beilagen/YYYY/topcc-beilage-*-kwXX/
        preg_match_all(
            '#https?://wochenhits\.topcc\.ch/beilagen/(\d{4})/(topcc-beilage-[^/"]+)/?#i',
            $html, $m, PREG_SET_ORDER
        );

        foreach ($m as $hit) {
            $webUrl = rtrim($hit[0], '/') . '/';
            if (isset($seen[$webUrl])) continue;
            $seen[$webUrl] = true;

            $slug   = $hit[2]; // topcc-beilage-genuss-zum-mitnehmen-2026-kw16-17
            $y      = (int) $hit[1];

            // Extraer KW del slug (puede ser "kw16-17" = semanas 16-17)
            $kw   = null;
            $kwTo = null;
            if (preg_match('/kw(\d+)(?:-(\d+))?/i', $slug, $km)) {
                $kw   = (int) $km[1];
                $kwTo = isset($km[2]) ? (int)$km[2] : $kw;
            }

            [$from] = $kw   ? $this->kwToDates($kw,   $y) : $this->currentWeekDates();
            [, $to] = $kwTo ? $this->kwToDates($kwTo, $y) : $this->currentWeekDates();

            $semana = $kw ? 'KW' . str_pad($kw, 2, '0', STR_PAD_LEFT) : null;

            // Título desde slug: topcc-beilage-weinlagerverkauf → "Beilage Weinlagerverkauf"
            $titlePart = preg_replace(['/^topcc-beilage-/', '/-\d{4}-kw\d+.*$/', '/-/'], ['', '', ' '], $slug);
            $titulo    = 'TopCC Beilage ' . ucwords(trim($titlePart));

            $urlKey = substr($slug, 0, 200);

            if ($this->upsert([
                'tienda_id'    => $tiendaId,
                'titulo'       => mb_substr($titulo, 0, 255),
                'subtitulo'    => null,
                'pdf_url'      => null,
                'web_url'      => $webUrl,
                'url_key'      => $urlKey,
                'valido_desde' => $from,
                'valido_hasta' => $to,
                'semana'       => $semana,
                'tipo'         => 'beilage',
            ])) {
                $count++;
                $this->log("TopCC Beilage: [$semana] $titulo");
            }
        }

        return $count;
    }

    // ── DB helpers ────────────────────────────────────────────────────────────

    /** Marca todas las entradas de una tienda como inactivas antes de re-scrapear */
    private function deactivateStore(int $tiendaId): void {
        $st = $this->pdo->prepare('UPDATE prospekte SET activo = 0 WHERE tienda_id = ?');
        $st->execute([$tiendaId]);
        $this->log("deactivated {$st->rowCount()} entradas previas (tienda_id={$tiendaId})");
    }

    private function upsert(array $d): bool {
        $sql = "
            INSERT INTO prospekte
                (tienda_id, titulo, subtitulo, pdf_url, web_url, url_key, valido_desde, valido_hasta, semana, tipo)
            VALUES
                (:tienda_id, :titulo, :subtitulo, :pdf_url, :web_url, :url_key, :valido_desde, :valido_hasta, :semana, :tipo)
            ON DUPLICATE KEY UPDATE
                titulo       = VALUES(titulo),
                subtitulo    = VALUES(subtitulo),
                valido_desde = VALUES(valido_desde),
                valido_hasta = VALUES(valido_hasta),
                semana       = VALUES(semana),
                activo       = 1,
                scraped_at   = CURRENT_TIMESTAMP
        ";
        $st = $this->pdo->prepare($sql);
        $st->execute([
            ':tienda_id'    => $d['tienda_id'],
            ':titulo'       => $d['titulo'],
            ':subtitulo'    => $d['subtitulo'],
            ':pdf_url'      => $d['pdf_url'],
            ':web_url'      => $d['web_url'],
            ':url_key'      => $d['url_key'],
            ':valido_desde' => $d['valido_desde'],
            ':valido_hasta' => $d['valido_hasta'],
            ':semana'       => $d['semana'],
            ':tipo'         => $d['tipo'],
        ]);
        return $st->rowCount() > 0;
    }

    private function getTiendaId(string $slug): ?int {
        if (isset($this->tiendaCache[$slug])) return $this->tiendaCache[$slug];
        $st = $this->pdo->prepare('SELECT id FROM tiendas WHERE slug = ?');
        $st->execute([$slug]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        $id  = $row ? (int) $row['id'] : null;
        $this->tiendaCache[$slug] = $id;
        return $id;
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private function curlGet(string $url): string|false {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            CURLOPT_HTTPHEADER     => [
                'Accept: text/html,application/xhtml+xml',
                'Accept-Language: de-CH,de;q=0.9',
            ],
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($code === 200 && $body) ? $body : false;
    }

    private function urlExists(string $url): bool {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            CURLOPT_RANGE          => '0-0', // GET pero solo primeros bytes — más rápido que HEAD
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return in_array($code, [200, 206], true);
    }

    // ── Date helpers ──────────────────────────────────────────────────────────

    /** Lunes y domingo de la ISO week KW en el año dado */
    private function kwToDates(int $kw, int $year): array {
        $dt = new DateTime();
        $dt->setISODate($year, $kw, 1);
        $from = $dt->format('Y-m-d');
        $dt->setISODate($year, $kw, 7);
        $to = $dt->format('Y-m-d');
        return [$from, $to];
    }

    private function currentWeekDates(): array {
        return [
            date('Y-m-d', strtotime('monday this week')),
            date('Y-m-d', strtotime('saturday this week')),
        ];
    }

    /** Extrae KW numérico de nombres de archivo como "kw19-bgh-aktionen-d.pdf" */
    private function extractKwFromFilename(string $filename): ?int {
        if (preg_match('/kw(\d{1,2})/i', $filename, $m)) return (int) $m[1];
        return null;
    }

    // ── Misc helpers ──────────────────────────────────────────────────────────

    private function extractTag(string $html, string $tag): ?string {
        if (preg_match('/<' . $tag . '[^>]*>(.*?)<\/' . $tag . '>/is', $html, $m)) {
            return $m[1];
        }
        return null;
    }

    private function log(string $msg): void {
        $this->logs[] = '[' . date('H:i:s') . '] ' . $msg;
    }
}
