<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

$year = (int) date('Y');
$kw   = (int) date('W');

// ── Transgourmet ──────────────────────────────────────────────────────────────
function getTransgourmetUrl(): ?string {
    $html = @file_get_contents('https://www.transgourmet.ch/de/aktionen-broschueren', false,
        stream_context_create(['http' => ['timeout' => 10, 'header' => "User-Agent: Mozilla/5.0\r\n"]])
    );
    if ($html) {
        preg_match_all('/href="(https:\/\/www-static\.transgourmet\.ch\/public\/[^"]*kw\d+[^"]*aktionen[^"]*\.pdf)"/i', $html, $m);
        if (!empty($m[1])) return $m[1][0];
    }
    $kw = (int) date('W');
    $month = date('Y-m');
    return "https://www-static.transgourmet.ch/public/{$month}/kw{$kw}-agh-aktionen-d.pdf";
}

// ── TopCC ─────────────────────────────────────────────────────────────────────
// URL pattern: https://wochenhits.topcc.ch/flugblatt/YYYY/topcc-wochen-hits-YYYY-kwNN/
function getTopCCUrl(): string {
    global $year, $kw;
    $kwPad = str_pad($kw, 2, '0', STR_PAD_LEFT);
    return "https://wochenhits.topcc.ch/flugblatt/{$year}/topcc-wochen-hits-{$year}-kw{$kwPad}/";
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

function getAligroUrl(): ?string {
    $pages = [
        'https://www.aligro.ch/de/prospekte',
        'https://www.aligro.ch/fr/prospectus',
    ];
    foreach ($pages as $url) {
        $html = curlGet($url);
        if (!$html) continue;

        // PDF directo en uploads
        if (preg_match('/(https:\/\/www\.aligro\.ch\/uploads\/documents\/prospectus\/[^\s"\'<>]+\.pdf)/i', $html, $m)) {
            return $m[1];
        }
        if (preg_match('/href="(\/uploads\/documents\/prospectus\/[^"]+\.pdf)"/i', $html, $m)) {
            return 'https://www.aligro.ch' . $m[1];
        }
        // JSON embebido (Next.js / React apps cargan datos en __NEXT_DATA__ o window.__data__)
        if (preg_match('/"url"\s*:\s*"([^"]+\/prospectus\/[^"]+\.pdf)"/i', $html, $m)) {
            $u = $m[1];
            return str_starts_with($u, 'http') ? $u : 'https://www.aligro.ch' . $u;
        }
        if (preg_match('/"path"\s*:\s*"([^"]+\/prospectus\/[^"]+\.pdf)"/i', $html, $m)) {
            $u = $m[1];
            return str_starts_with($u, 'http') ? $u : 'https://www.aligro.ch' . $u;
        }
    }

    // Intentar API interna de Aligro (algunos sitios exponen /api/prospectus o similar)
    $api = curlGet('https://www.aligro.ch/api/prospectus');
    if ($api) {
        $json = json_decode($api, true);
        if (!empty($json['pdf_url']))  return $json['pdf_url'];
        if (!empty($json[0]['url']))   return $json[0]['url'];
        if (!empty($json['url']))      return $json['url'];
    }

    // Fallback: leer desde DB (actualizable via set_aligro.php)
    try {
        $row = getDB()->query("SELECT valor FROM config WHERE clave = 'aligro_pdf_url'")->fetch();
        if ($row) return $row['valor'];
    } catch (\Exception $e) {}
    return null;
}

$monday = date('Y-m-d', strtotime('monday this week'));
$sunday = date('Y-m-d', strtotime('sunday this week'));
$semana = 'KW ' . str_pad($kw, 2, '0', STR_PAD_LEFT);

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
        'pdf_url'      => getTopCCUrl(),
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

// Filtrar los que no tienen URL
$folletos = array_values(array_filter($folletos, fn($f) => $f['pdf_url'] !== null));

jsonOk($folletos);
