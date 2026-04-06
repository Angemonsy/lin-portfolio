param(
  [string]$InboxPath = ".\content\inbox",
  [string]$FeishuFolderUrl = "https://gqkkndrhn25.feishu.cn/drive/folder/IUWIfp3eKlEQk9dfzsNcphzknJi",
  [switch]$SkipFeishuFolderSync,
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

function Clear-ProxyEnv {
  foreach ($name in @(
      "http_proxy", "https_proxy", "all_proxy", "no_proxy",
      "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
      "GIT_HTTP_PROXY", "GIT_HTTPS_PROXY"
    )) {
    Set-Item -Path ("Env:" + $name) -Value ""
  }
  Set-Item -Path "Env:LARK_CLI_NO_PROXY" -Value "1"
}

function Invoke-LarkJson {
  param(
    [string[]]$CliArgs,
    [string]$Context
  )

  $raw = & lark-cli @CliArgs 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($raw | Out-String).Trim()

  if ([string]::IsNullOrWhiteSpace($text)) {
    if ($exitCode -ne 0) {
      throw "lark-cli $Context 失败但无输出。请先执行：lark-cli auth login --scope `"drive:file:readonly`""
    }
    return $null
  }

  try {
    $obj = $text | ConvertFrom-Json -Depth 100
  } catch {
    if ($exitCode -ne 0) {
      throw "lark-cli $Context 失败：$text"
    }
    throw "lark-cli $Context 返回非 JSON：$text"
  }

  if ($exitCode -ne 0) {
    throw "lark-cli $Context 失败：$text"
  }

  if ($obj.PSObject.Properties["ok"] -and (-not $obj.ok)) {
    $err = if ($obj.error -and $obj.error.message) { "$($obj.error.message)" } else { $text }
    throw "lark-cli $Context 失败：$err"
  }

  if ($obj.PSObject.Properties["code"] -and ($obj.code -ne 0)) {
    $msg = if ($obj.PSObject.Properties["msg"]) { "$($obj.msg)" } else { $text }
    throw "lark-cli $Context 失败：$msg (code=$($obj.code))"
  }

  return $obj
}

function Test-LarkScope {
  param([string]$Scope)

  $raw = & lark-cli auth check --scope $Scope 2>&1
  $text = ($raw | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) { return $false }

  try {
    $resp = $text | ConvertFrom-Json -Depth 20
  } catch {
    return $false
  }

  return ($resp.ok -eq $true)
}

function Get-FeishuFolderToken {
  param([string]$FolderUrlOrToken)

  $raw = ($FolderUrlOrToken ?? "").Trim()
  if ([string]::IsNullOrWhiteSpace($raw)) { return "" }

  if ($raw -match "/drive/folder/([A-Za-z0-9]+)") {
    return $Matches[1]
  }

  if ($raw -match "^[A-Za-z0-9]+$") {
    return $raw
  }

  return ""
}

function New-UniqueInboxFolderName {
  param(
    [string]$InboxRoot,
    [string]$DocToken
  )

  $prefix = if ([string]::IsNullOrWhiteSpace($DocToken)) { "doc" } else { $DocToken.Substring(0, [Math]::Min(8, $DocToken.Length)).ToLowerInvariant() }
  $base = (Get-Date -Format "yyyy-MM-dd") + "-feishu-" + $prefix
  $name = $base
  $idx = 2
  while (Test-Path -LiteralPath (Join-Path $InboxRoot $name)) {
    $name = "$base-$idx"
    $idx++
  }
  return $name
}

function Load-FeishuSyncState {
  param(
    [string]$StatePath,
    [string]$FolderToken,
    [string]$FolderUrl
  )

  $state = [ordered]@{
    source_folder_token = $FolderToken
    source_folder_url = $FolderUrl
    docs = @{}
  }

  if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) { return $state }

  try {
    $raw = Get-Content -LiteralPath $StatePath -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return $state }
    $obj = $raw | ConvertFrom-Json -Depth 100
    if ($obj.PSObject.Properties["source_folder_token"]) { $state.source_folder_token = "$($obj.source_folder_token)" }
    if ($obj.PSObject.Properties["source_folder_url"]) { $state.source_folder_url = "$($obj.source_folder_url)" }
    if ($obj.PSObject.Properties["docs"] -and $obj.docs) {
      $docs = @{}
      foreach ($p in $obj.docs.PSObject.Properties) {
        $docs[$p.Name] = $p.Value
      }
      $state.docs = $docs
    }
  } catch {
    Write-Warn "读取飞书同步状态失败，将重建状态文件：$StatePath"
  }

  return $state
}

function Save-FeishuSyncState {
  param(
    [string]$StatePath,
    [hashtable]$State
  )

  $json = $State | ConvertTo-Json -Depth 100
  Set-Content -LiteralPath $StatePath -Value $json -Encoding utf8
}

function Extract-DocTokenFromUrl {
  param([string]$DocUrl)

  if ([string]::IsNullOrWhiteSpace($DocUrl)) { return "" }
  if ($DocUrl -match "/docx?/([A-Za-z0-9]+)") { return $Matches[1] }
  if ($DocUrl -match "/wiki/([A-Za-z0-9]+)") { return $Matches[1] }
  if ($DocUrl -match "/sheets/([A-Za-z0-9]+)") { return $Matches[1] }
  return ""
}

function Sync-FeishuFolderToInbox {
  param(
    [string]$FolderUrl,
    [string]$InboxRoot
  )

  $folderToken = Get-FeishuFolderToken $FolderUrl
  if ([string]::IsNullOrWhiteSpace($folderToken)) {
    Write-Warn "飞书文件夹地址无效，跳过同步：$FolderUrl"
    return
  }

  if (-not (Test-LarkScope -Scope "drive:file:readonly")) {
    Write-Warn "当前未授权 drive:file:readonly，已跳过飞书文件夹同步。请执行：lark-cli auth login --scope `"drive:file:readonly`""
    return
  }

  if (-not (Test-LarkScope -Scope "drive:drive:readonly")) {
    Write-Warn "当前未授权 drive:drive:readonly（或应用仍在审批），已跳过飞书文件夹同步。"
    return
  }

  if (-not (Test-LarkScope -Scope "space:document:retrieve")) {
    Write-Warn "当前未授权 space:document:retrieve（或应用仍在审批），已跳过飞书文件夹同步。"
    return
  }

  $statePath = Join-Path $InboxRoot ".feishu-folder-sync.json"
  $state = Load-FeishuSyncState -StatePath $statePath -FolderToken $folderToken -FolderUrl $FolderUrl
  if (($state.source_folder_token ?? "") -ne $folderToken) {
    Write-Warn "检测到飞书源文件夹发生变化，已重置同步状态。"
    $state = [ordered]@{
      source_folder_token = $folderToken
      source_folder_url = $FolderUrl
      docs = @{}
    }
  }

  Write-Info "开始同步飞书文件夹：$folderToken"
  $pageToken = ""
  $upserts = 0
  $discovered = 0

  while ($true) {
    $params = [ordered]@{
      folder_token = $folderToken
      page_size = 200
      order_by = "EditedTime"
      direction = "DESC"
    }
    if (-not [string]::IsNullOrWhiteSpace($pageToken)) {
      $params.page_token = $pageToken
    }

    $paramsJson = $params | ConvertTo-Json -Compress -Depth 10
    try {
    $resp = Invoke-LarkJson -CliArgs @(
      "api", "GET", "/open-apis/drive/v1/files",
      "--as", "user",
      "--params", $paramsJson,
      "--format", "json"
    ) -Context "列取飞书文件夹文件"
    } catch {
      $msg = "$($_.Exception.Message)"
      if ($msg -match "Permission denied" -or $msg -match "action_privilege_required") {
        Write-Warn "飞书文件夹同步权限不足（应用可能仍在审批），本次已自动跳过，不影响既有发布流程。"
        return
      }
      throw
    }

    $items = @()
    if ($resp.data -and $resp.data.files) { $items = @($resp.data.files) }

    foreach ($it in $items) {
      $itemType = ("$($it.type)").ToLowerInvariant()
      if ($itemType -notin @("doc", "docx", "sheet", "wiki", "shortcut")) { continue }

      $docUrl = "$($it.url)"
      if ([string]::IsNullOrWhiteSpace($docUrl)) {
        $tokenFromItem = "$($it.token)"
        $itemTypeForUrl = $itemType
        if ($itemType -eq "shortcut" -and $it.shortcut_info) {
          if ($it.shortcut_info.target_type) { $itemTypeForUrl = ("$($it.shortcut_info.target_type)").ToLowerInvariant() }
          if ($it.shortcut_info.target_token) { $tokenFromItem = "$($it.shortcut_info.target_token)" }
        }
        if (-not [string]::IsNullOrWhiteSpace($tokenFromItem)) {
          if ($itemTypeForUrl -eq "doc" -or $itemTypeForUrl -eq "docx") {
            $docUrl = "https://gqkkndrhn25.feishu.cn/docx/$tokenFromItem"
          } elseif ($itemTypeForUrl -eq "wiki") {
            $docUrl = "https://gqkkndrhn25.feishu.cn/wiki/$tokenFromItem"
          } elseif ($itemTypeForUrl -eq "sheet") {
            $docUrl = "https://gqkkndrhn25.feishu.cn/sheets/$tokenFromItem"
          }
        }
      }

      $docToken = Extract-DocTokenFromUrl $docUrl
      if ([string]::IsNullOrWhiteSpace($docToken)) { continue }
      $discovered++

      $modified = "$($it.modified_time)"
      if ([string]::IsNullOrWhiteSpace($modified)) { $modified = "$($it.edit_time)" }
      if ([string]::IsNullOrWhiteSpace($modified)) { $modified = "$($it.create_time)" }

      $existing = if ($state.docs.ContainsKey($docToken)) { $state.docs[$docToken] } else { $null }
      $existingModified = if ($existing -and $existing.PSObject.Properties["modified_time"]) { "$($existing.modified_time)" } else { "" }
      $existingFolder = if ($existing -and $existing.PSObject.Properties["inbox_folder"]) { "$($existing.inbox_folder)" } else { "" }

      $needsSync = ($null -eq $existing) -or ($existingModified -ne $modified)
      if (-not $needsSync) { continue }

      $inboxFolderName = $existingFolder
      if ([string]::IsNullOrWhiteSpace($inboxFolderName)) {
        $inboxFolderName = New-UniqueInboxFolderName -InboxRoot $InboxRoot -DocToken $docToken
      }

      $targetFolder = Join-Path $InboxRoot $inboxFolderName
      New-Item -ItemType Directory -Force -Path $targetFolder | Out-Null
      Set-Content -LiteralPath (Join-Path $targetFolder "feishu-url.txt") -Value $docUrl -Encoding utf8

      $contentPath = Join-Path $targetFolder "content.md"
      if (Test-Path -LiteralPath $contentPath -PathType Leaf) {
        Remove-Item -LiteralPath $contentPath -Force
      }
      $imagesPath = Join-Path $targetFolder "images"
      if (Test-Path -LiteralPath $imagesPath -PathType Container) {
        Remove-Item -LiteralPath $imagesPath -Recurse -Force
      }

      $state.docs[$docToken] = [ordered]@{
        inbox_folder = $inboxFolderName
        title = "$($it.name)"
        type = $itemType
        modified_time = $modified
        url = $docUrl
        last_synced_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
      }
      $upserts++
    }

    $hasMore = $false
    if ($resp.data -and $resp.data.has_more) {
      $hasMore = [bool]$resp.data.has_more
    }

    if (-not $hasMore) { break }
    $pageToken = ""
    if ($resp.data -and $resp.data.next_page_token) {
      $pageToken = "$($resp.data.next_page_token)"
    }
    if ([string]::IsNullOrWhiteSpace($pageToken)) { break }
  }

  Save-FeishuSyncState -StatePath $statePath -State $state
  Write-Info "飞书文件夹同步完成：发现 $discovered 条文档，写入/更新 $upserts 条。"
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

Clear-ProxyEnv

$inbox = Resolve-PathSafe $InboxPath
if (-not (Test-Path -LiteralPath $inbox -PathType Container)) {
  throw "Inbox 目录不存在：$inbox"
}

if ((-not $SkipFeishuFolderSync) -and (-not [string]::IsNullOrWhiteSpace(($FeishuFolderUrl ?? "").Trim()))) {
  Sync-FeishuFolderToInbox -FolderUrl $FeishuFolderUrl -InboxRoot $inbox
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
