param(
  [string]$Path = "data/source-radar.json"
)

$resolvedPath = Resolve-Path -LiteralPath $Path -ErrorAction Stop
$raw = Get-Content -LiteralPath $resolvedPath -Raw -Encoding UTF8
$items = $raw | ConvertFrom-Json

$requiredFields = @("id", "platform", "area", "sourceName", "url", "why", "bestFor", "cadence")
$ids = @{}
$errors = New-Object System.Collections.Generic.List[string]

for ($i = 0; $i -lt $items.Count; $i += 1) {
  $item = $items[$i]
  foreach ($field in $requiredFields) {
    if (-not $item.PSObject.Properties.Name.Contains($field) -or [string]::IsNullOrWhiteSpace([string]$item.$field)) {
      $errors.Add("第 $($i + 1) 条缺少字段：$field")
    }
  }

  if ($item.id) {
    if ($ids.ContainsKey($item.id)) {
      $errors.Add("重复 id：$($item.id)")
    } else {
      $ids[$item.id] = $true
    }
  }

  if ($item.url -and $item.url -notmatch "^https://") {
    $errors.Add("URL must use https: $($item.sourceName)")
  }
}

if ($errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "source-radar validation passed: $($items.Count) sources"
