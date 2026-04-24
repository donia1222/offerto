<?php
// DIAGNOSTICO TEMPORAL — BORRAR DESPUES
header('Content-Type: application/json');

// Lee credenciales del .env
$envPath = __DIR__ . '/../../.env';
$cfg = ['host' => 'localhost', 'dbname' => 'offerto_db', 'user' => 'root', 'pass' => ''];
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        [$k, $v] = array_pad(explode('=', trim($line), 2), 2, '');
        if ($k === 'DB_HOST')   $cfg['host']   = $v;
        if ($k === 'DB_NAME')   $cfg['dbname'] = $v;
        if ($k === 'DB_USER')   $cfg['user']   = $v;
        if ($k === 'DB_PASS')   $cfg['pass']   = $v;
    }
}

$results = ['credentials_used' => "{$cfg['user']}@{$cfg['host']}/{$cfg['dbname']}"];

function tryPDO(string $dsn, string $user, string $pass): string {
    try {
        $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]);
        return 'OK - ' . $pdo->query("SELECT COUNT(*) FROM ofertas")->fetchColumn() . ' ofertas';
    } catch (Exception $e) { return $e->getMessage(); }
}

// TCP
foreach (['localhost', '127.0.0.1'] as $h) {
    $results["tcp_$h"] = tryPDO("mysql:host=$h;port=3306;dbname={$cfg['dbname']};charset=utf8mb4", $cfg['user'], $cfg['pass']);
}

// Sockets — rutas comunes cPanel/Plesk/Ubuntu
$sockets = [
    '/tmp/mysql.sock',
    '/var/lib/mysql/mysql.sock',
    '/var/run/mysqld/mysqld.sock',
    '/opt/mysql/data/mysql.sock',
    '/var/mysql/mysql.sock',
];
foreach ($sockets as $sock) {
    $key = 'socket:' . basename(dirname($sock)) . '/' . basename($sock);
    if (!file_exists($sock)) { $results[$key] = 'not found'; continue; }
    $results[$key] = tryPDO("mysql:unix_socket=$sock;dbname={$cfg['dbname']};charset=utf8mb4", $cfg['user'], $cfg['pass']);
}

// phpinfo socket
ob_start(); phpinfo(INFO_CONFIGURATION); $pi = ob_get_clean();
preg_match('/pdo_mysql\.default_socket[^\/]*(\/[^\s<]+)/i', $pi, $m1);
preg_match('/mysql\.default_socket[^\/]*(\/[^\s<]+)/i', $pi, $m2);
$results['phpinfo_pdo_socket']   = $m1[1] ?? '(empty)';
$results['phpinfo_mysql_socket'] = $m2[1] ?? '(empty)';

// mysqli test
if (function_exists('mysqli_connect')) {
    $mx = @mysqli_connect($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['dbname']);
    $results['mysqli_localhost'] = $mx ? 'OK' : mysqli_connect_error();
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
