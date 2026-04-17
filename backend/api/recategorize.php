<?php
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/../config/db.php';

$pdo = getDB();

$rules = [
    'fleisch'   => [
        'fleisch','rind','kalb','poulet','huhn','lamm','schwein','hack','filet','steak',
        'wurst','schinken','speck','geflügel','fisch','lachs','saumon','thon','crevette',
        'forelle','viande','porc','agneau','poisson','darne','poulpe','saucisse',
        'charbonnade','bourguignonne','spare-rib','parisienne','jambon','lapin',
        'boeuf','queue crev','beef','salmon','shrimp','crevettes',
    ],
    'gemuese'   => [
        'salat','tomate','gurke','karotte','zwiebel','gemüse','paprika','brokkoli',
        'spinat','zucchini','kartoffel','erdbeere','himbeere','apfel','birne',
        'orange','zitrone','melone','mango','avocado','légume','fruit','salade',
        'fraise','rüebli','champignon',
    ],
    'milch'     => [
        'milch','käse','joghurt','butter','rahm','quark','gruyère','emmental',
        'mozzarella','fromage','lait','yaourt','crème','beurre','eier',
        'meule','tomme','caprice des dieux','feta','vaudoise','venoge',
        'cheese','fromage',
    ],
    'bakery'    => [
        'brot','brötchen','croissant','gipfeli','kuchen','torte','biscuit',
        'pain','brioche','cake','tarte','gebäck','sandwich','toast',
    ],
    'getraenke' => [
        'wasser','bier','wein','saft','cola','pepsi','fanta','sprite','kaffee',
        'tee','limonade','eau','bière','vin','jus','boisson','café','evian',
        'rivella','ripasso','valpolicella','prosecco','champagne','whisky',
        'vodka','gin','spirituosen',
    ],
    'snacks'    => [
        'chips','schokolade','confiserie','bonbon','gummi','nuss','mandel',
        'erdnuss','snack','riegel','cracker','popcorn','kägi','kägi',
        'mayonnaise','senf','ketchup','sauce',
    ],
    'haushalt'  => [
        'waschmittel','reiniger','spülmittel','putzmittel','toilette','papier',
        'folie','beutel','detergent','nettoyant','persil','ariel',
    ],
    'hygiene'   => [
        'shampoo','dusche','seife','deo','zahnpasta','rasierer','creme',
        'lotion','hygiene','soin','savon',
    ],
    'tierfutter'=> [
        'hundenfutter','katzenfutter','tiernahrung','petfood','hund','katze',
    ],
];

$updated = 0;

foreach ($rules as $slug => $keywords) {
    $stmt = $pdo->prepare('SELECT id FROM categorias WHERE slug = ?');
    $stmt->execute([$slug]);
    $catRow = $stmt->fetch();
    if (!$catRow) continue;
    $catId = (int) $catRow['id'];

    $likes  = [];
    $params = [$catId];

    foreach ($keywords as $kw) {
        $likes[]  = 'LOWER(nombre_de) LIKE ?';
        $params[] = '%' . strtolower($kw) . '%';
    }
    foreach ($keywords as $kw) {
        $likes[]  = 'LOWER(nombre_fr) LIKE ?';
        $params[] = '%' . strtolower($kw) . '%';
    }

    $likeSQL = implode(' OR ', $likes);
    $upd = $pdo->prepare("UPDATE ofertas SET categoria_id = ? WHERE activa = 1 AND ($likeSQL)");
    $upd->execute($params);
    $updated += $upd->rowCount();
}

jsonOk(['recategorized' => $updated]);
