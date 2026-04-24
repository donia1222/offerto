<?php
// Seed tanda 9 y 10 — BORRAR DESPUES DE EJECUTAR
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/db.php';
$pdo = getDB();

$rows = [
    // TANDA 9
    ['chips',           'Chips',               'snacks',   'chips, kartoffelchips, crisps, snack, knabbergebäck'],
    ['knaeckebrot',     'Knäckebrot',          'bakery',   'knäckebrot, crispbread, vollkorn, brot, kräcker'],
    ['kekse',           'Kekse',               'snacks',   'kekse, cookies, biscuits, gebäck, süssgebäck'],
    ['waffel',          'Waffel',              'snacks',   'waffel, waffle, waffeln, knusperwaffel'],
    ['brezel',          'Brezel',              'snacks',   'brezel, bretzel, pretzel, laugenbrezel, salzgebäck'],
    ['muesliriegel',    'Müsliriegel',         'snacks',   'müsliriegel, riegel, cerealriegel, energieriegel, snackbar'],
    ['trockenfruechte', 'Trockenfrüchte',      'snacks',   'trockenfrüchte, getrocknete früchte, rosinen, aprikosen, pflaumen'],
    ['mandeln',         'Mandeln',             'snacks',   'mandeln, almonds, nüsse, geröstete mandeln, mandelkerne'],
    ['cashews',         'Cashews',             'snacks',   'cashews, cashewnüsse, nüsse, cashewkerne, knabbergebäck'],
    ['hummus',          'Hummus',              'deli',     'hummus, kichererbsendip, dip, aufstrich'],
    ['guacamole',       'Guacamole',           'deli',     'guacamole, avocadodip, dip, avocado, mexikanisch'],
    ['tzatziki',        'Tzatziki',            'deli',     'tzatziki, joghurtdip, gurke, dip, griechisch'],
    ['kaffeekapsel',    'Kaffeekapseln',       'getraenke','kaffeekapseln, kapseln, nespresso, dolce gusto, kaffeepads'],
    ['teebeutel',       'Teebeutel',           'getraenke','teebeutel, tee, herbal tea, schwarztee, grüntee, kräutertee'],
    ['fruchtsaft',      'Fruchtsaft',          'getraenke','fruchtsaft, orangensaft, apfelsaft, saft, juice, fruchtnektar'],
    ['reiswaffeln',     'Reiswaffeln',         'snacks',   'reiswaffeln, rice cakes, reiskuchen, leichtgebäck'],
    ['popcorn',         'Popcorn',             'snacks',   'popcorn, mais, snack, kino, gesalzen, süss'],
    ['salzstangen',     'Salzstangen',         'snacks',   'salzstangen, grissini, breadsticks, laugengebäck'],
    ['gemuesesaft',     'Gemüsesaft',          'getraenke','gemüsesaft, tomatensaft, gemüse drink, grüner saft'],
    ['karottensaft',    'Karottensaft',        'getraenke','karottensaft, möhrensaft, karotte, saft, carrot juice'],
    // TANDA 10
    ['lachsfilet',          'Lachsfilet',          'fisch',   'lachsfilet, lachs, salmon, frischer lachs'],
    ['kabeljau',            'Kabeljau',             'fisch',   'kabeljau, cod, dorsch, weissfisch, fisch'],
    ['forelle',             'Forelle',              'fisch',   'forelle, trout, regenbogenforelle, fisch'],
    ['scampi',              'Scampi',               'fisch',   'scampi, langostinos, garnelen, meeresfrüchte, kaisergranat'],
    ['schweinskotelett',    'Schweinskotelette',    'fleisch', 'schweinskotelette, schweinekotelett, pork chop, kotelette'],
    ['putenfilet',          'Putenfilet',           'fleisch', 'putenfilet, truthahnfilet, pute, turkey, geflügel'],
    ['haehnchenbrustfilet', 'Hähnchenbrustfilet',  'fleisch', 'hähnchenbrustfilet, hühnerbrust, pouletbrust, chicken breast'],
    ['lammkeule',           'Lammkeule',            'fleisch', 'lammkeule, gigot, leg of lamb, lamm, lammfleisch'],
    ['kaninchen',           'Kaninchen',            'fleisch', 'kaninchen, lapin, rabbit, kaninchenfleisch, hase'],
    ['hirschfleisch',       'Hirschfleisch',        'fleisch', 'hirschfleisch, wild, venison, rehfleisch, wildfleisch'],
    ['buendnerfleisch',     'Bündnerfleisch',       'fleisch', 'bündnerfleisch, luftgetrocknetes fleisch, graubünden, trockenfleisch'],
    ['roesti',              'Rösti',                'gemuese', 'rösti, rosti, kartoffelrösti, kartoffel, bratkartoffeln'],
    ['raclette',            'Raclette',             'kaese',   'raclette, raclettekäse, käse, schweizer käse, schmelzkäse'],
    ['appenzeller',         'Appenzeller',          'kaese',   'appenzeller, appenzellerkäse, schweizer käse, hartkäse'],
    ['emmentaler',          'Emmentaler',           'kaese',   'emmentaler, emmental, schweizer käse, hartkäse, emmentaler aoc'],
    ['leberwurst',          'Leberwurst',           'wurst',   'leberwurst, liver sausage, wurst, aufschnitt, streichwurst'],
    ['rindsgulasch',        'Rindsgulasch',         'fleisch', 'rindsgulasch, gulasch, rindfleisch, eintopf, beef stew'],
    ['ossobuco',            'Ossobuco',             'fleisch', 'ossobuco, kalbshaxe, veal shank, geschmortes fleisch'],
    ['schnitzel',           'Schnitzel',            'fleisch', 'schnitzel, paniertes schnitzel, wiener schnitzel, escalope'],
    ['salzgebaeck',         'Salzgebäck',           'snacks',  'salzgebäck, laugengebäck, brezeln, salzstangen, aperitif'],
];

$stmt = $pdo->prepare("INSERT IGNORE INTO imagen_banco (slug, nombre, categoria, keywords, activa) VALUES (?,?,?,?,1)");
$ok = 0;
foreach ($rows as $r) {
    $stmt->execute($r);
    if ($stmt->rowCount()) $ok++;
}

echo json_encode(['ok' => true, 'insertadas' => $ok, 'total' => count($rows)]);
