<?php
require_once __DIR__ . '/_cors.php';

function fetchHtml(string $url): ?string {
    $ctx = stream_context_create(['http' => [
        'timeout' => 10,
        'header'  => "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36\r\n",
        'follow_location' => 1,
    ]]);
    $html = @file_get_contents($url, false, $ctx);
    return $html ?: null;
}

function weekRange(): array {
    return [
        'semana'      => 'KW ' . date('W'),
        'valido_desde' => date('Y-m-d', strtotime('monday this week')),
        'valido_hasta' => date('Y-m-d', strtotime('sunday this week')),
    ];
}

// ── Transgourmet ──────────────────────────────────────────────────────────────
function getTransgourmetKatalog(): array {
    $w = weekRange();
    $html = fetchHtml('https://www.transgourmet.ch/de/aktionen-broschueren');
    $pdf  = null;

    if ($html) {
        preg_match_all('/href="(https:\/\/www-static\.transgourmet\.ch\/public\/[^"]*kw\d+[^"]*aktionen[^"]*\.pdf)"/i', $html, $m);
        if (!empty($m[1])) $pdf = $m[1][0];
    }

    if (!$pdf) {
        $kw    = (int) date('W');
        $month = date('Y-m');
        $pdf   = "https://www-static.transgourmet.ch/public/{$month}/kw{$kw}-agh-aktionen-d.pdf";
    }

    return array_merge($w, [
        'tienda'      => 'transgourmet',
        'nombre'      => 'Transgourmet / Prodega',
        'pdf_url'     => $pdf,
        'website_url' => 'https://www.transgourmet.ch/de/aktionen-broschueren',
        'color'       => '#E2001A',
    ]);
}

// ── Aligro ────────────────────────────────────────────────────────────────────
function getAligroKatalog(): array {
    $w    = weekRange();
    $html = fetchHtml('https://www.aligro.ch/aktionen');
    $pdf  = null;

    if ($html) {
        // Buscar enlaces a PDF en la página
        preg_match('/href="([^"]*\.pdf[^"]*)"/i', $html, $m);
        if (!empty($m[1])) {
            $pdf = strpos($m[1], 'http') === 0 ? $m[1] : 'https://www.aligro.ch' . $m[1];
        }
    }

    return array_merge($w, [
        'tienda'      => 'aligro',
        'nombre'      => 'Aligro',
        'pdf_url'     => $pdf,
        'website_url' => 'https://www.aligro.ch/aktionen',
        'color'       => '#E30613',
    ]);
}

// ── TopCC ─────────────────────────────────────────────────────────────────────
function getTopCCKatalog(): array {
    $w    = weekRange();
    $html = fetchHtml('https://www.topcc.ch/de/aktionen');
    $pdf  = null;

    if ($html) {
        preg_match('/href="([^"]*\.pdf[^"]*)"/i', $html, $m);
        if (!empty($m[1])) {
            $pdf = strpos($m[1], 'http') === 0 ? $m[1] : 'https://www.topcc.ch' . $m[1];
        }
    }

    return array_merge($w, [
        'tienda'      => 'topcc',
        'nombre'      => 'TopCC',
        'pdf_url'     => $pdf,
        'website_url' => 'https://www.topcc.ch/de/aktionen',
        'color'       => '#003882',
    ]);
}

jsonOk([
    getAligroKatalog(),
    getTopCCKatalog(),
    getTransgourmetKatalog(),
]);
