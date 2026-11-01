$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
New-Item -ItemType Directory -Force -Path product-gallery | Out-Null
$catalog = ((Get-Content -Raw -Encoding UTF8 catalog.js) -replace '^window.STORE_PRODUCTS = ','' -replace ';\s*$','') | ConvertFrom-Json
$sources = @(Get-ChildItem -LiteralPath catalog-source -Filter 'page-*.json' | ForEach-Object { (Get-Content -Raw -Encoding UTF8 -LiteralPath $_.FullName | ConvertFrom-Json).products })
$galleries = [ordered]@{}
$downloads = New-Object 'System.Collections.Generic.List[string]'
$seen = @{}
foreach ($product in $catalog) {
    $source = $sources | Where-Object handle -eq $product.id | Select-Object -First 1
    if (-not $source) { throw "Missing image source for $($product.id)" }
    $photos = @()
    foreach ($photo in $source.images) {
        $uri = [uri]$photo.src
        if ($uri.Scheme -ne 'https' -or $uri.Host -notin @('cdn.shopify.com','alohas.com','www.alohas.com')) { throw 'Unexpected image source' }
        $filename = "product-gallery/$($photo.id).jpg"
        $width = [math]::Min(1800,[int]$photo.width)
        if ($width -le 0) { $width = 1800 }
        $photos += [ordered]@{ src=$filename; width=$photo.width; height=$photo.height; alt=$product.name }
        if (-not $seen.ContainsKey($filename)) {
            $seen[$filename] = $true
            if (-not (Test-Path -LiteralPath $filename) -or (Get-Item -LiteralPath $filename).Length -lt 1000) {
                $url = $uri.AbsoluteUri + $(if ($uri.Query) { '&width=' } else { '?width=' }) + $width
                $downloads.Add('url = "' + $url.Replace('"','%22') + '"')
                $downloads.Add('output = "' + $filename + '"')
            }
        }
    }
    $galleries[$product.id] = $photos
}
$downloadConfig = Join-Path $PSScriptRoot 'catalog-source/gallery-downloads.txt'
[IO.File]::WriteAllText($downloadConfig,($downloads -join "`n"),$utf8)
Write-Output "Downloading $($downloads.Count / 2) high-resolution photos for $($catalog.Count) products."
if ($downloads.Count -gt 0) {
    & curl.exe --parallel --parallel-max 8 -sS -L --fail --retry 3 --max-time 90 --config $downloadConfig
    if ($LASTEXITCODE -ne 0) { Write-Output 'Checking individual files after download warnings.' }
}
$missing = @($seen.Keys | Where-Object { -not (Test-Path -LiteralPath $_) -or (Get-Item -LiteralPath $_).Length -lt 1000 })
if ($missing.Count) { $missing | Set-Content -LiteralPath catalog-source/gallery-missing.txt; throw "$($missing.Count) gallery photos failed to download" }
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'gallery.js'),'window.PRODUCT_GALLERIES = ' + ($galleries | ConvertTo-Json -Depth 8 -Compress) + ';',$utf8)
$report = [ordered]@{ products=$catalog.Count; photos=$seen.Count; maxRequestedWidth=1800; missingPhotos=$missing.Count; totalMB=[math]::Round((Get-ChildItem -LiteralPath product-gallery -File | Measure-Object Length -Sum).Sum / 1MB,1) }
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'catalog-source/gallery-report.json'),($report | ConvertTo-Json),$utf8)
Write-Output ($report | ConvertTo-Json)
