<?php
require_once __DIR__ . '/env.php';

define('APP_URL',  env('APP_URL',  'https://web.lweb.ch/oferto'));
define('API_URL',  env('API_URL',  'https://web.lweb.ch/oferto/backend/api'));
define('IMG_BASE', APP_URL . '/backend/images/');

define('ITEMS_PER_PAGE', 30);
define('MAX_SEARCH_RESULTS', 50);

define('ALLOWED_ORIGINS', [
    'https://web.lweb.ch',
    'http://localhost:8081',
    'exp://localhost:8081',
]);
