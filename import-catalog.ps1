$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
New-Item -ItemType Directory -Force -Path catalog-source, product-images | Out-Null
$all = New-Object 'System.Collections.Generic.List[object]'
$seen = @{}
$page = 1
while ($true) {
    $path = "catalog-source/page-$page.json"
    & curl.exe -sS -L --fail --retry 3 --max-time 90 "https://alohas.com/products.json?limit=250&page=$page" -o $path
    if ($LASTEXITCODE -ne 0) { throw "Catalog page $page failed" }
    $batch = (Get-Content -Raw -Encoding UTF8 -LiteralPath $path | ConvertFrom-Json).products
    if ($null -eq $batch) { throw "Invalid catalog response on page $page" }
    if ($batch.Count -eq 0) { break }
    $added = 0
    foreach ($product in $batch) {
        $key = [string]$product.id
        if (-not $seen.ContainsKey($key)) { $seen[$key] = $true; $all.Add($product); $added++ }
    }
    Write-Output "Catalog page ${page}: $added products; total $($all.Count)"
    if ($added -eq 0) { throw 'Pagination repeated a page before reaching the end' }
    $page++
    if ($page -gt 100) { throw 'Catalog exceeds 100 pages; inspect pagination' }
}
$items = New-Object 'System.Collections.Generic.List[object]'
$downloads = New-Object 'System.Collections.Generic.List[string]'
foreach ($p in $all) {
    $id = [string]$p.id
    $image = ''
    if ($p.images.Count -gt 0) {
        $uri = [uri]$p.images[0].src
        if ($uri.Scheme -ne 'https' -or $uri.Host -notin @('cdn.shopify.com','alohas.com','www.alohas.com')) { throw "Unexpected image host: $($uri.Host)" }
        $image = "product-images/$id.jpg"
        $url = $uri.AbsoluteUri + $(if ($uri.Query) { '&width=720' } else { '?width=720' })
        if (-not (Test-Path -LiteralPath $image) -or (Get-Item -LiteralPath $image).Length -lt 1000) {
            $downloads.Add('url = "' + $url.Replace('"','%22') + '"')
            $downloads.Add('output = "' + $image + '"')
        }
    }
    $category = [string]$p.product_type
    if (-not $category) { $category = 'Other' }
    $sizes = @($p.options | Where-Object { $_.name -match 'size' } | ForEach-Object { $_.values } | Where-Object { $_ -ne 'Default Title' })
    $prices = @($p.variants | ForEach-Object { [decimal]::Parse([string]$_.price,[Globalization.CultureInfo]::InvariantCulture) })
    $minPrice = ($prices | Measure-Object -Minimum).Minimum
    $items.Add([pscustomobject][ordered]@{id=$p.handle; sourceId=$id; name=$p.title; category=$category; sizes=$sizes; image=$image; price=$minPrice})
}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'catalog.js'), 'window.STORE_PRODUCTS = ' + (ConvertTo-Json -InputObject @($items.ToArray()) -Depth 8 -Compress) + ';', $utf8)
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'catalog-source/image-downloads.txt'), ($downloads -join "`n"), $utf8)
Write-Output "Downloading $($downloads.Count / 2) product images..."
if ($downloads.Count -gt 0) {
    & curl.exe --parallel --parallel-max 10 -sS -L --fail --retry 3 --max-time 90 --config catalog-source/image-downloads.txt
    if ($LASTEXITCODE -ne 0) { Write-Output 'Some downloads need inspection; validating individual images.' }
}
$missing = @($items | Where-Object { $_.image -and (-not (Test-Path -LiteralPath $_.image) -or (Get-Item -LiteralPath $_.image).Length -lt 1000) })
$report = [ordered]@{ products=$items.Count; pages=$page; reachedEmptyPage=$true; images=@($items | Where-Object { $_.image }).Count; missingImages=@($missing | ForEach-Object { $_.id }); importedAt=(Get-Date).ToUniversalTime().ToString('o'); categories=@($items | Group-Object category | Select-Object Name,Count) }
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'catalog-source/import-report.json'), ($report | ConvertTo-Json -Depth 6), $utf8)
Write-Output ($report | ConvertTo-Json -Depth 6)
if ($missing.Count) { throw "$($missing.Count) images failed to download" }
