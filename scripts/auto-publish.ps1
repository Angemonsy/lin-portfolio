param(
  [string]$InboxPath = ".\content\inbox",
  [switch]$SkipDeploy
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location -LiteralPath $projectRoot

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Done {
  param([string]$Message)
  Write-Host "[DONE] $Message" -ForegroundColor Green
}

function Resolve-PathSafe {
  param([string]$RawPath)
  if ([System.IO.Path]::IsPathRooted($RawPath)) { return $RawPath }
  return Join-Path $projectRoot $RawPath
}

function Normalize-Slug {
  param([string]$Raw)
  $slug = ($Raw ?? "").Trim().ToLowerInvariant()
  $slug = $slug -replace "[^a-z0-9\-]+", "-"
  $slug = $slug -replace "-+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    $slug = "post-" + (Get-Date -Format "yyyyMMdd-HHmmss")
  }
  return $slug
}

function Normalize-FeishuMarkdown {
  param(
    [string]$Markdown,
    [string]$FolderPath
  )

  $imagesDir = Join-Path $FolderPath "images"
  New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null

  $tokenToRel = @{}
  $tokens = [regex]::Matches($Markdown, '<image token="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique

  foreach ($token in $tokens) {
    Push-Location -LiteralPath $imagesDir
    try {
      # docs +media-download 仅允许相对输出路径，切到图片目录后使用 ./token 形式写入。
      lark-cli docs +media-download --as user --token $token --output "./$token" --overwrite | Out-Null
    } finally {
      Pop-Location
    }
    $downloaded = Get-ChildItem -LiteralPath $imagesDir -File | Where-Object { $_.BaseName -eq $token -or $_.Name -like "$token.*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($downloaded) {
      $tokenToRel[$token] = "images/$($downloaded.Name)"
    } else {
      $tokenToRel[$token] = ""
    }
  }

  $content = $Markdown
  $content = [regex]::Replace(
    $content,
    '<image token="([^"]+)"[^>]*/>',
    {
      param($m)
      $token = $m.Groups[1].Value
      if ($tokenToRel.ContainsKey($token) -and -not [string]::IsNullOrWhiteSpace($tokenToRel[$token])) {
        return "![配图]($($tokenToRel[$token]))"
      }
      return ""
    }
  )

  $content = [regex]::Replace($content, '</?text[^>]*>', '')
  $content = [regex]::Replace($content, '\s*\{align="center"\}', '')
  $content = $content -replace '\*\(\*\)', ''
  return $content.Trim()
}

function Import-FeishuIfNeeded {
  param([string]$FolderPath)

  $metaPath = Join-Path $FolderPath "metadata.json"
  $contentPath = Join-Path $FolderPath "content.md"
  $urlPath = Join-Path $FolderPath "feishu-url.txt"

  $hasMeta = Test-Path -LiteralPath $metaPath -PathType Leaf
  $hasContent = Test-Path -LiteralPath $contentPath -PathType Leaf
  $hasUrl = Test-Path -LiteralPath $urlPath -PathType Leaf

  if (($hasMeta -and $hasContent) -or (-not $hasUrl)) { return }

  $url = Get-Content -LiteralPath $urlPath | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1
  if ([string]::IsNullOrWhiteSpace($url)) {
    throw "feishu-url.txt 为空：$FolderPath"
  }

  Write-Info "检测到飞书链接，开始抓取：$url"
  $respJson = lark-cli docs +fetch --as user --doc $url --format json
  $resp = $respJson | ConvertFrom-Json -Depth 100
  if (-not $resp.ok) {
    throw "飞书抓取失败：$($resp.error.message)"
  }

  $title = "$($resp.data.title)".Trim()
  if ([string]::IsNullOrWhiteSpace($title)) { $title = "未命名文章" }

  $normalizedMd = Normalize-FeishuMarkdown -Markdown ([string]$resp.data.markdown) -FolderPath $FolderPath
  if (-not $normalizedMd.StartsWith('# ')) {
    $normalizedMd = "# $title`r`n`r`n" + $normalizedMd
  }

  if (-not $hasMeta) {
    $slug = Normalize-Slug $title
    $meta = [ordered]@{
      type = "article"
      slug = $slug
      title = $title
      description = "自动从飞书导入，请按需补充摘要。"
      date = (Get-Date -Format "yyyy-MM-dd")
      category = "AI观点"
      tags = @("AI观点")
    } | ConvertTo-Json -Depth 10
    Set-Content -LiteralPath $metaPath -Value $meta -Encoding utf8
    Write-Info "已自动生成 metadata.json（可后续手改分类/标签）。"
  }

  Set-Content -LiteralPath $contentPath -Value $normalizedMd -Encoding utf8
  Write-Info "已从飞书生成 content.md 并下载图片。"
}

function Get-FolderSignature {
  param([string]$FolderPath)

  $files = Get-ChildItem -LiteralPath $FolderPath -Recurse -File |
    Where-Object { $_.Name -ne ".published.stamp" } |
    Sort-Object FullName

  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($FolderPath.Length).TrimStart('\','/')
    $hash = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
    $parts.Add("$rel=$hash")
  }

  $joined = ($parts -join "|")
  if ([string]::IsNullOrWhiteSpace($joined)) { return "" }

  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($joined)
    $digest = $sha.ComputeHash($bytes)
    return ([BitConverter]::ToString($digest)).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Invoke-GitWithRetry {
  param(
    [string[]]$GitArgs,
    [int]$MaxAttempts = 3
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $output = & git @GitArgs 2>&1
    $code = $LASTEXITCODE
    if ($code -eq 0) { return }

    $text = "$output"
    if ($attempt -lt $MaxAttempts -and ($text -match "index\.lock" -or $text -match "Permission denied")) {
      Write-Warn "git $($GitArgs -join ' ') 失败（尝试 $attempt/$MaxAttempts），3 秒后重试。"
      Start-Sleep -Seconds 3
      continue
    }

    throw "git $($GitArgs -join ' ') 失败：$text"
  }
}

$env:http_proxy = ''
$env:https_proxy = ''
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:ALL_PROXY = ''

$inbox = Resolve-PathSafe $InboxPath
if (-not (Test-Path -LiteralPath $inbox -PathType Container)) {
  throw "Inbox 目录不存在：$inbox"
}

$folders = Get-ChildItem -LiteralPath $inbox -Directory | Sort-Object Name
if (-not $folders) {
  Write-Done "content/inbox 为空，无需发布。"
  exit 0
}

$pending = @()
foreach ($folder in $folders) {
  $folderPath = $folder.FullName
  Import-FeishuIfNeeded -FolderPath $folderPath

  $metaPath = Join-Path $folderPath "metadata.json"
  $contentPath = Join-Path $folderPath "content.md"
  if (-not (Test-Path -LiteralPath $metaPath -PathType Leaf) -or -not (Test-Path -LiteralPath $contentPath -PathType Leaf)) {
    Write-Warn "跳过 $($folder.Name)：缺少 metadata.json 或 content.md。"
    continue
  }

  $signature = Get-FolderSignature -FolderPath $folderPath
  $stampPath = Join-Path $folderPath ".published.stamp"
  $publishedSig = if (Test-Path -LiteralPath $stampPath -PathType Leaf) { (Get-Content -LiteralPath $stampPath -Raw).Trim() } else { "" }

  if ($signature -ne $publishedSig) {
    $pending += [PSCustomObject]@{
      Name = $folder.Name
      Path = $folderPath
      Signature = $signature
      StampPath = $stampPath
    }
  }
}

if (-not $pending) {
  Write-Done "没有新增或变更投稿，无需执行发布/Git/部署。"
  exit 0
}

Write-Info ("待发布目录: " + (($pending | ForEach-Object { $_.Name }) -join ", "))

foreach ($item in $pending) {
  & pwsh "$scriptDir\publish-content.ps1" -InputFolder $item.Path
  if ($LASTEXITCODE -ne 0) {
    throw "发布失败：$($item.Name)"
  }
}

$status = (& git status --porcelain)
if ([string]::IsNullOrWhiteSpace("$status")) {
  foreach ($item in $pending) {
    Set-Content -LiteralPath $item.StampPath -Value $item.Signature -Encoding utf8
  }
  Write-Done "发布已执行但仓库无变更，已更新发布标记。"
  exit 0
}

Invoke-GitWithRetry -GitArgs @("add", "-A")
$statusAfterAdd = (& git status --porcelain)
if ([string]::IsNullOrWhiteSpace("$statusAfterAdd")) {
  Write-Done "git add 后无变更，结束。"
  exit 0
}

$msg = "content: publish " + ((Get-Date).ToString("yyyy-MM-dd HH:mm")) + " (" + (($pending | ForEach-Object { $_.Name }) -join ", ") + ")"
Invoke-GitWithRetry -GitArgs @("commit", "-m", $msg)
Invoke-GitWithRetry -GitArgs @("push", "origin", "main")

$deployUrl = ""
if (-not $SkipDeploy) {
  $deployOutput = & vercel --prod --yes 2>&1
  if ($LASTEXITCODE -eq 0) {
    $deployText = "$deployOutput"
    $m = [regex]::Match($deployText, 'Aliased:\s+(https://\S+)')
    if ($m.Success) { $deployUrl = $m.Groups[1].Value }
    Write-Done "Vercel 生产部署成功。$deployUrl"
  } else {
    Write-Warn "Vercel 部署失败，但 Git 已推送。错误：$deployOutput"
  }
}

foreach ($item in $pending) {
  Set-Content -LiteralPath $item.StampPath -Value $item.Signature -Encoding utf8
}

Write-Done "自动发布完成。"
