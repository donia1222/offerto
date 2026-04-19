<?php
// Test the exact same fetch the scraper uses for one known-good URL
$url = 'https://shop.topcc.ch/de/fleisch-charcuterie-im-topcc-online-shop/fleisch/rindfleisch/c/rindfleisch';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    CURLOPT_HTTPHEADER     => [
        'Accept: text/html,application/xhtml+xml',
        'Accept-Language: de-CH,de;q=0.9',
        'Accept-Encoding: identity',
    ],
    CURLOPT_COOKIEFILE => '',
]);
$html = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
curl_close($ch);

header('Content-Type: text/plain; charset=utf-8');
echo "HTTP $code | Final URL: $finalUrl\n";
echo "Size: " . strlen($html) . " bytes\n\n";

// Check for productListItem directly
$count = substr_count($html, 'productListItem');
echo "Occurrences of 'productListItem': $count\n\n";

if ($count === 0) {
    // Show first 3000 chars to see what we got
    echo "=== First 3000 chars ===\n";
    echo substr($html, 0, 3000);
    echo "\n\n=== Last 1000 chars ===\n";
    echo substr($html, -1000);
} else {
    // Parse and show what we extract
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
    libxml_clear_errors();
    $xp = new DOMXPath($dom);

    $items = $xp->query("//*[contains(@class,'productListItem')]");
    echo "productListItem nodes: " . $items->length . "\n\n";

    // Test extraction on first item
    if ($items->length > 0) {
        $item = $items->item(0);

        // Name
        $nameNodes = $xp->query(".//div[contains(@class,'item-name')]//a/span[not(@class) or @class='']", $item);
        $name = null;
        foreach ($nameNodes as $n) { $t = trim($n->textContent); if ($t) { $name = $t; break; } }
        echo "Name raw: $name\n";
        $name = preg_replace("/\s*'\s*'\s*.+$/u", '', $name ?? '');
        echo "Name clean: $name\n\n";

        // URL
        $urlNode = $xp->query(".//div[contains(@class,'item-name')]//a[@href]", $item)->item(0);
        echo "URL: " . ($urlNode ? $urlNode->getAttribute('href') : 'NOT FOUND') . "\n\n";

        // Image
        $imgNode = $xp->query(".//div[contains(@class,'item-image')]//img[@src]", $item)->item(0);
        echo "Image src: " . ($imgNode ? $imgNode->getAttribute('src') : 'NOT FOUND') . "\n\n";

        // Sale price
        $saleNode = $xp->query(".//*[contains(@class,'salesprice')]", $item)->item(0);
        $origNode = $xp->query(".//*[contains(@class,'line-through')]", $item)->item(0);
        $normNode = $xp->query(".//*[contains(@class,'normalPrice')]", $item)->item(0);
        echo "salesprice: " . ($saleNode ? trim($saleNode->textContent) : 'NOT FOUND') . "\n";
        echo "line-through: " . ($origNode ? trim($origNode->textContent) : 'NOT FOUND') . "\n";
        echo "normalPrice: " . ($normNode ? trim($normNode->textContent) : 'NOT FOUND') . "\n\n";

        // sourceUnit
        $srcNode = $xp->query(".//*[contains(@class,'sourceUnit')]//span", $item)->item(0);
        echo "sourceUnit span: " . ($srcNode ? trim($srcNode->textContent) : 'NOT FOUND') . "\n\n";

        // variant name
        $varNode = $xp->query(".//*[contains(@class,'item-variant-name')]", $item)->item(0);
        echo "variant name: " . ($varNode ? trim($varNode->textContent) : 'NOT FOUND') . "\n";
    }
}
