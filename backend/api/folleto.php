<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

// Rollover: desde sábado 18:00 o cualquier hora del domingo, tratar la próxima KW como "esta semana"
$dow      = (int) date('N');                            // 1=lun … 7=dom
$hour     = (int) date('H');
$rollover = ($dow === 7) || ($dow === 6 && $hour >= 18);

$baseTs = strtotime($rollover ? 'monday next week' : 'monday this week');
$year   = (int) date('o', $baseTs);                     // ISO year de la semana base
$kw     = (int) date('W', $baseTs);

// ── Transgourmet ──────────────────────────────────────────────────────────────
function getTransgourmetUrl(): ?string {
    $html = @file_get_contents('https://www.transgourmet.ch/de/aktionen-broschueren', false,
        stream_context_create(['http' => ['timeout' => 10, 'header' => "User-Agent: Mozilla/5.0\r\n"]])
    );
    if ($html) {
        // Buscar todos los PDFs con su KW y elegir el más cercano a la semana base
        if (preg_match_all('/href="(https:\/\/www-static\.transgourmet\.ch\/public\/[^"]*kw(\d+)[^"]*aktionen[^"]*\.pdf)"/i', $html, $m, PREG_SET_ORDER)) {
            global $kw;
            // Preferir match exacto con la KW base
            foreach ($m as $hit) {
                if ((int) $hit[2] === $kw) return $hit[1];
            }
            return $m[0][1];
        }
    }
    global $kw;
    $month = date('Y-m');
    $kwPad = str_pad($kw, 2, '0', STR_PAD_LEFT);
    return "https://www-static.transgourmet.ch/public/{$month}/kw{$kwPad}-agh-aktionen-d.pdf";
}

// ── TopCC ─────────────────────────────────────────────────────────────────────
function getTopCCUrl(int $weekOffset = 0): string {
    global $year, $kw;
    $targetKw   = $kw + $weekOffset;
    $targetYear = $year;
    if ($targetKw > 52) { $targetKw -= 52; $targetYear++; }
    $kwPad = str_pad($targetKw, 2, '0', STR_PAD_LEFT);
    return "https://wochenhits.topcc.ch/flugblatt/{$targetYear}/topcc-wochen-hits-{$targetYear}-kw{$kwPad}/";
}

function topCCUrlExists(string $url): bool {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_NOBODY         => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_USERAGENT      => 'Mozilla/5.0',
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code === 200;
}

// ── Aligro ────────────────────────────────────────────────────────────────────
function curlGet(string $url): string|false {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_HTTPHEADER     => [
            'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: de-CH,de;q=0.9',
        ],
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return $res;
}

// Busca el PDF del flyer semanal Aligro (DE: "PROFI-Aktionen", FR: "Actions PRO")
// cuya fecha cae dentro del rango [from, to] (YYYY-MM-DD). null si no hay match.
function getAligroUrlForRange(string $from, string $to): ?string {
    // /documents/prospectus con Accept-Language: de-CH hace meta-refresh a /de/dokumente/prospekte
    // — vamos directo a las dos URLs (DE primero, FR como fallback).
    $pages = [
        'https://www.aligro.ch/de/dokumente/prospekte',
        'https://www.aligro.ch/fr/documents/prospectus',
    ];

    $monthsDe = [
        'januar'=>1,'februar'=>2,'märz'=>3,'marz'=>3,'april'=>4,'mai'=>5,'juni'=>6,
        'juli'=>7,'august'=>8,'september'=>9,'oktober'=>10,'november'=>11,'dezember'=>12,
    ];
    $monthsFr = [
        'janvier'=>1,'février'=>2,'fevrier'=>2,'mars'=>3,'avril'=>4,'mai'=>5,'juin'=>6,
        'juillet'=>7,'août'=>8,'aout'=>8,'septembre'=>9,'octobre'=>10,'novembre'=>11,'décembre'=>12,'decembre'=>12,
    ];
    $fromTs = strtotime($from);
    $toTs   = strtotime($to);

    foreach ($pages as $pageUrl) {
        $html = curlGet($pageUrl);
        if (!$html) continue;
        if (!preg_match_all('/<article class="prospectus[^"]*">(.*?)<\/article>/is', $html, $articles)) continue;

        foreach ($articles[1] as $block) {
            // Flyer semanal (excluimos P&G mensual)
            if (!preg_match('/PROFI-Aktionen|Actions\s+PRO/i', $block)) continue;
            if (!preg_match('/href="(\/uploads\/documents\/prospectus\/[^"]+\.pdf)"/i', $block, $h)) continue;

            $startTs = $endTs = null;

            // DE: "vom 20. bis 25. April 2026" | "vom 27. April bis 2. Mai 2026"
            if (preg_match(
                '/vom\s+(\d{1,2})\.\s*(?:([a-zäöü]+)\s+)?bis\s+(\d{1,2})\.\s*([a-zäöü]+)\s+(\d{4})/iu',
                $block, $d
            )) {
                $em = $monthsDe[mb_strtolower($d[4])] ?? null;
                $sm = ($d[2] !== '') ? ($monthsDe[mb_strtolower($d[2])] ?? $em) : $em;
                if ($em && $sm) {
                    $startTs = mktime(0, 0, 0, $sm, (int) $d[1], (int) $d[5]);
                    $endTs   = mktime(23, 59, 59, $em, (int) $d[3], (int) $d[5]);
                }
            }
            // FR: "du 20 au 25 avril 2026" | "du 27 avril au 2 mai 2026"
            elseif (preg_match(
                '/du\s+(\d{1,2})(?:\s+([a-zéû]+))?\s+au\s+(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/iu',
                $block, $d
            )) {
                $em = $monthsFr[mb_strtolower($d[4])] ?? null;
                $sm = (isset($d[2]) && $d[2] !== '') ? ($monthsFr[mb_strtolower($d[2])] ?? $em) : $em;
                if ($em && $sm) {
                    $startTs = mktime(0, 0, 0, $sm, (int) $d[1], (int) $d[5]);
                    $endTs   = mktime(23, 59, 59, $em, (int) $d[3], (int) $d[5]);
                }
            }

            if ($startTs === null) continue;
            if ($endTs >= $fromTs && $startTs <= $toTs) {
                return 'https://www.aligro.ch' . $h[1];
            }
        }
    }
    return null;
}

function getAligroUrl(): ?string {
    global $monday, $sunday;
    $u = getAligroUrlForRange($monday, $sunday);
    if ($u) return $u;

    // Fallback: primer flyer semanal que aparezca en la página DE
    $html = curlGet('https://www.aligro.ch/de/dokumente/prospekte');
    if ($html && preg_match(
        '/<article class="prospectus[^"]*">.*?(?:PROFI-Aktionen|Actions\s+PRO).*?href="(\/uploads\/documents\/prospectus\/[^"]+\.pdf)"/is',
        $html, $m
    )) return 'https://www.aligro.ch' . $m[1];

    // Último recurso: DB
    try {
        $row = getDB()->query("SELECT valor FROM config WHERE clave = 'aligro_pdf_url'")->fetch();
        if ($row) return $row['valor'];
    } catch (\Exception $e) {}
    return null;
}

$monday     = date('Y-m-d', $baseTs);
$sunday     = date('Y-m-d', strtotime('+6 days', $baseTs));
$nextMonday = date('Y-m-d', strtotime('+7 days',  $baseTs));
$nextSunday = date('Y-m-d', strtotime('+13 days', $baseTs));
$semana     = 'KW ' . str_pad($kw, 2, '0', STR_PAD_LEFT);
$nextKw     = $kw + 1 > 52 ? 1 : $kw + 1;
$nextSemana = 'KW ' . str_pad($nextKw, 2, '0', STR_PAD_LEFT);

// ── Esta semana ──
$folletos = [
    [
        'tienda'       => 'transgourmet',
        'nombre'       => 'Transgourmet / Prodega',
        'semana'       => $semana,
        'pdf_url'      => getTransgourmetUrl(),
        'tipo'         => 'pdf',
        'valido_desde' => $monday,
        'valido_hasta' => $sunday,
    ],
    [
        'tienda'       => 'topcc',
        'nombre'       => 'TopCC',
        'semana'       => $semana,
        'pdf_url'      => getTopCCUrl(0),
        'tipo'         => 'web',
        'valido_desde' => $monday,
        'valido_hasta' => $sunday,
    ],
    [
        'tienda'       => 'aligro',
        'nombre'       => 'Aligro',
        'semana'       => $semana,
        'pdf_url'      => getAligroUrl(),
        'tipo'         => 'pdf',
        'valido_desde' => $monday,
        'valido_hasta' => $sunday,
    ],
];

// ── Próxima semana: TopCC (patrón predecible, siempre incluir) ──
$folletos[] = [
    'tienda'       => 'topcc',
    'nombre'       => 'TopCC',
    'semana'       => $nextSemana,
    'pdf_url'      => getTopCCUrl(1),
    'tipo'         => 'web',
    'valido_desde' => $nextMonday,
    'valido_hasta' => $nextSunday,
];

// Transgourmet ya publica el PDF de la próxima semana en su sitio durante el fin de semana
// → no duplicar como entry separado de "próxima semana"

// Filtrar los que no tienen URL
$folletos = array_values(array_filter($folletos, fn($f) => $f['pdf_url'] !== null));

jsonOk($folletos);
