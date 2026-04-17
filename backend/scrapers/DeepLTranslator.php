<?php
/**
 * DeepL Free API translator with DB cache.
 * Caches translations in `traducciones_cache` table to save quota.
 */
class DeepLTranslator {

    private const API_URL  = 'https://api-free.deepl.com/v2/translate';
    private const MAX_BATCH = 50; // DeepL max texts per request

    private string $apiKey;
    private PDO    $pdo;
    private array  $cache = []; // in-memory cache for this run

    public function __construct(PDO $pdo) {
        $this->pdo    = $pdo;
        $this->apiKey = env('DEEPL_API_KEY', '');
        $this->ensureCacheTable();
    }

    /**
     * Translate an array of texts from $sourceLang to $targetLang.
     * Returns array with same keys, translated values.
     */
    public function translateBatch(array $texts, string $sourceLang = 'FR', string $targetLang = 'DE'): array {
        if (empty($texts) || !$this->apiKey) return $texts;

        $results  = [];
        $toFetch  = []; // index => text that needs API call

        // 1. Check cache first
        foreach ($texts as $idx => $text) {
            $key = $this->cacheKey($text, $sourceLang, $targetLang);
            if (isset($this->cache[$key])) {
                $results[$idx] = $this->cache[$key];
            } else {
                $cached = $this->getFromDb($text, $sourceLang, $targetLang);
                if ($cached !== null) {
                    $results[$idx]       = $cached;
                    $this->cache[$key]   = $cached;
                } else {
                    $toFetch[$idx] = $text;
                }
            }
        }

        // 2. Batch API calls for uncached texts
        $chunks = array_chunk($toFetch, self::MAX_BATCH, true);
        foreach ($chunks as $chunk) {
            $translated = $this->callApi(array_values($chunk), $sourceLang, $targetLang);
            $chunkKeys  = array_keys($chunk);

            foreach ($chunkKeys as $i => $origIdx) {
                $translatedText       = $translated[$i] ?? $chunk[$origIdx]; // fallback to original
                $results[$origIdx]    = $translatedText;
                $key = $this->cacheKey($chunk[$origIdx], $sourceLang, $targetLang);
                $this->cache[$key]    = $translatedText;
                $this->saveToDb($chunk[$origIdx], $translatedText, $sourceLang, $targetLang);
            }
        }

        // Re-order to match original array order
        $ordered = [];
        foreach (array_keys($texts) as $idx) {
            $ordered[$idx] = $results[$idx] ?? $texts[$idx];
        }
        return $ordered;
    }

    /** Translate a single text */
    public function translate(string $text, string $sourceLang = 'FR', string $targetLang = 'DE'): string {
        $result = $this->translateBatch([$text], $sourceLang, $targetLang);
        return $result[0] ?? $text;
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private function callApi(array $texts, string $sourceLang, string $targetLang): array {
        $params = ['source_lang' => $sourceLang, 'target_lang' => $targetLang];
        foreach ($texts as $t) {
            $params['text[]'] = $t; // will be encoded as text[]=...
        }

        // Build POST body manually to support multiple text[] values
        $body = 'source_lang=' . urlencode($sourceLang) . '&target_lang=' . urlencode($targetLang);
        foreach ($texts as $t) {
            $body .= '&text=' . urlencode($t);
        }

        $ch = curl_init(self::API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => [
                'Authorization: DeepL-Auth-Key ' . $this->apiKey,
                'Content-Type: application/x-www-form-urlencoded',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            error_log("DeepL API error $httpCode: $response");
            return $texts; // fallback: return originals
        }

        $data = json_decode($response, true);
        return array_column($data['translations'] ?? [], 'text');
    }

    private function cacheKey(string $text, string $src, string $tgt): string {
        return md5($text . $src . $tgt);
    }

    private function getFromDb(string $text, string $src, string $tgt): ?string {
        $stmt = $this->pdo->prepare(
            'SELECT traduccion FROM traducciones_cache WHERE hash = ? AND lang_src = ? AND lang_tgt = ?'
        );
        $stmt->execute([$this->cacheKey($text, $src, $tgt), $src, $tgt]);
        $row = $stmt->fetch();
        return $row ? $row['traduccion'] : null;
    }

    private function saveToDb(string $original, string $traduccion, string $src, string $tgt): void {
        $stmt = $this->pdo->prepare(
            'INSERT IGNORE INTO traducciones_cache (hash, lang_src, lang_tgt, original, traduccion)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$this->cacheKey($original, $src, $tgt), $src, $tgt, $original, $traduccion]);
    }

    private function ensureCacheTable(): void {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS traducciones_cache (
                hash       CHAR(32)     NOT NULL,
                lang_src   CHAR(2)      NOT NULL,
                lang_tgt   CHAR(2)      NOT NULL,
                original   VARCHAR(500) NOT NULL,
                traduccion VARCHAR(500) NOT NULL,
                created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (hash, lang_src, lang_tgt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    }
}
