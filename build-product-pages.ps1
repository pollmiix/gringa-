$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$index = Get-Content -Raw -Encoding UTF8 index.html
$header = [regex]::Match($index,'<header class="header">[\s\S]*?</header>').Value
$menu = [regex]::Match($index,'<dialog class="menu-dialog"[\s\S]*?</dialog>').Value
$utility = [regex]::Match($index,'<dialog class="utility-dialog"[\s\S]*?</dialog>').Value
$footer = [regex]::Match($index,'<footer class="business-footer">[\s\S]*?</footer>').Value
$body = Get-Content -Raw -Encoding UTF8 product-template.html
$page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Explore product photos, colours, details and sizes."><title>Product | Aloha</title><link rel="stylesheet" href="./loja.css"><link rel="stylesheet" href="./product.css"><link rel="stylesheet" href="./store-cart.css"><script src="./loja-config.js" defer></script><script src="./catalog.js" defer></script><script src="./gallery.js" defer></script><script src="./collections.js" defer></script><script src="./product-data.js" defer></script><script src="./store-cart.js" defer></script><script src="./product.js" defer></script><link rel="stylesheet" href="./policies.css"><link rel="stylesheet" href="./cookie-consent.css"><script src="./store-business.js" defer></script><script src="./cookie-consent.js" defer></script></head><body class="product-page">' + $header + $menu + $utility + $body + $footer + '</body></html>'
$page = $page.Replace('href="#colecao"','href="./index.html#colecao"')
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'product.html'),$page,$utf8)
$catalog = ((Get-Content -Raw -Encoding UTF8 catalog.js) -replace '^window.STORE_PRODUCTS = ','' -replace ';\s*$','') | ConvertFrom-Json
$sources = @(Get-ChildItem -LiteralPath catalog-source -Filter 'page-*.json' | ForEach-Object { (Get-Content -Raw -Encoding UTF8 -LiteralPath $_.FullName | ConvertFrom-Json).products })
function TagValue($p,$prefix) { $tag = @($p.tags | Where-Object { $_.StartsWith($prefix+':') }) | Select-Object -First 1; if ($tag) { $value=$tag.Substring($prefix.Length+1); if ($value -notin @('not set','no','')) { return $value } }; return '' }
$data = [ordered]@{}
foreach ($p in $catalog) {
  $source = $sources | Where-Object handle -eq $p.id | Select-Object -First 1
  $family = TagValue $source 'style'; if (-not $family) { $family=TagValue $source 'rsku' }; if (-not $family) { $family=$p.id }
  $data[$p.id] = [ordered]@{ family=$family; colour=(TagValue $source 'clr'); material=(TagValue $source 'mt'); heel=(TagValue $source 'he_cm'); fit=(TagValue $source 'size_adv'); origin=(TagValue $source 'co'); preorder=([bool](@($source.tags) -contains 'product_labels:pre-order')); sizes=@($p.sizes) }
}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'product-data.js'),'window.PRODUCT_DETAILS = ' + ($data | ConvertTo-Json -Depth 6 -Compress) + ';',$utf8)
Write-Output "Product page ready for $($catalog.Count) products."

