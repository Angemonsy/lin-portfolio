param(
  [string]$InboxPath = ".\content\inbox",
  [string]$FeishuFolderUrl = "https://gqkkndrhn25.feishu.cn/drive/folder/IUWIfp3eKlEQk9dfzsNcphzknJi",
  [switch]$SkipFeishuFolderSync
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
    [string]$ParentPath,
    [string]$DocToken
  )

  New-Item -ItemType Directory -Force -Path $ParentPath | Out-Null

  $prefix = if ([string]::IsNullOrWhiteSpace($DocToken)) { "doc" } else { $DocToken.Substring(0, [Math]::Min(8, $DocToken.Length)).ToLowerInvariant() }
  $base = (Get-Date -Format "yyyy-MM-dd") + "-feishu-" + $prefix
  $name = $base
  $idx = 2
  while (Test-Path -LiteralPath (Join-Path $ParentPath $name)) {
    $name = "$base-$idx"
    $idx++
  }
  return $name
}

function Normalize-RouteKey {
  param([string]$Value)

  $key = ("$Value").Trim().ToLowerInvariant()
  $key = $key -replace "[\s\-_]+", ""
  return $key
}

function Normalize-FolderSegment {
  param([string]$Raw)

  $name = ("$Raw").Trim()
  if ([string]::IsNullOrWhiteSpace($name)) { $name = "untitled" }
  $name = $name -replace '[\\/:*?"<>|]+', "-"
  $name = $name -replace "\s+", "-"
  $name = $name.Trim(" .-")
  if ([string]::IsNullOrWhiteSpace($name)) { $name = "untitled" }
  return $name
}

function Get-RelativePathUnix {
  param(
    [string]$FullPath,
    [string]$RootPath
  )

  $rootResolved = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\', '/')
  $fullResolved = [System.IO.Path]::GetFullPath($FullPath)
  if (-not $fullResolved.StartsWith($rootResolved, [System.StringComparison]::OrdinalIgnoreCase)) {
    return ""
  }

  $rel = $fullResolved.Substring($rootResolved.Length).TrimStart('\', '/')
  return ($rel -replace '\\', '/')
}

function Resolve-KnowledgeCategoryIdFromSegment {
  param([string]$Segment)

  $key = Normalize-RouteKey $Segment
  switch ($key) {
    { $_ -in @("大学经验", "universityexperience", "universityresultslibrary", "大学结果库", "universityresults", "university") } { return "university-results-library" }
    { $_ -in @("ai使用技巧", "aiusage", "aitips", "aitoolslibrary", "ai工具库", "aitools") } { return "ai-tools-library" }
    { $_ -in @("商业通识", "businessliteracy", "solocompanylibrary", "一人公司库", "solocompany", "onepersoncompany") } { return "solo-company-library" }
    { $_ -in @("日常生活感悟", "dailylifereflection", "growthlablibrary", "成长实验库", "growthlab") } { return "growth-lab-library" }
    { $_ -in @("methodsandchecklists", "方法论与清单", "方法论清单") } { return "methods-and-checklists" }
    default { return "ai-tools-library" }
  }
}

function Resolve-PlatformFromSegment {
  param([string]$Segment)

  $key = Normalize-RouteKey $Segment
  switch ($key) {
    { $_ -in @("shipinhao", "视频号") } { return "视频号" }
    { $_ -in @("xiaohongshu", "小红书") } { return "小红书" }
    { $_ -in @("gongzhonghao", "公众号", "wechatoa") } { return "公众号" }
    { $_ -in @("douyin", "抖音") } { return "抖音" }
    { $_ -in @("cooperation", "project", "projects", "合作项目", "合作") } { return "合作项目" }
    default { return "合作项目" }
  }
}

function Resolve-PageIdFromSegment {
  param([string]$Segment)

  $key = Normalize-RouteKey $Segment
  switch ($key) {
    { $_ -in @("index", "home", "首页") } { return "index" }
    { $_ -in @("blog", "article", "articles", "文章") } { return "blog" }
    { $_ -in @("knowledge", "知识库") } { return "knowledge" }
    { $_ -in @("portfolio", "作品集", "作品") } { return "portfolio" }
    { $_ -in @("services", "service", "服务") } { return "services" }
    { $_ -in @("about", "关于我", "aboutme") } { return "about" }
    default { return "about" }
  }
}

function Resolve-ArticleCategoryFromSegment {
  param([string]$Segment)

  if ([string]::IsNullOrWhiteSpace("$Segment")) {
    return "AI工具"
  }

  $key = Normalize-RouteKey $Segment
  switch ($key) {
    { $_ -in @("universityresults", "大学结果", "university", "campus") } { return "大学结果" }
    { $_ -in @("aitools", "ai工具", "ai", "aitool") } { return "AI工具" }
    { $_ -in @("solocompany", "一人公司", "onepersoncompany", "business") } { return "一人公司" }
    { $_ -in @("growthlab", "成长实验", "growth", "thinking", "thought") } { return "成长实验" }
    default { return "$Segment" }
  }
}

function Get-FolderRouting {
  param(
    [string]$FolderPath,
    [string]$InboxRoot
  )

  $rel = Get-RelativePathUnix -FullPath $FolderPath -RootPath $InboxRoot
  $segments = @()
  if (-not [string]::IsNullOrWhiteSpace($rel)) {
    $segments = @($rel -split '/' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  }
  if ($segments.Count -ge 2) {
    # 最后一级是具体稿件目录，前面的层级用于路由判断。
    $segments = $segments[0..($segments.Count - 2)]
  } else {
    $segments = @()
  }

  $rootSegment = if ($segments.Count -ge 1) { "$($segments[0])" } else { "" }
  $subSegment = if ($segments.Count -ge 2) { "$($segments[1])" } else { "" }
  $rootKey = Normalize-RouteKey $rootSegment

  if ($rootKey -in @("knowledge", "知识库", "kb")) {
    $categoryId = Resolve-KnowledgeCategoryIdFromSegment -Segment $subSegment
    return [ordered]@{
      type = "knowledge"
      categoryId = $categoryId
      tags = @($categoryId)
    }
  }

  if ($rootKey -in @("portfolio", "作品集", "作品", "cases", "case")) {
    $platform = Resolve-PlatformFromSegment -Segment $subSegment
    return [ordered]@{
      type = "portfolio"
      platform = $platform
      tags = @($platform)
    }
  }

  if ($rootKey -in @("page", "pages", "页面", "site")) {
    $pageId = Resolve-PageIdFromSegment -Segment $subSegment
    return [ordered]@{
      type = "page"
      pageId = $pageId
      tags = @("页面文案")
    }
  }

  $category = Resolve-ArticleCategoryFromSegment -Segment $subSegment
  return [ordered]@{
    type = "article"
    category = $category
    tags = @($category)
  }
}

function Build-AutoMetadata {
  param(
    [string]$FolderPath,
    [string]$InboxRoot,
    [string]$Title
  )

  $route = Get-FolderRouting -FolderPath $FolderPath -InboxRoot $InboxRoot
  $today = (Get-Date -Format "yyyy-MM-dd")
  $safeTitle = if ([string]::IsNullOrWhiteSpace($Title)) { "未命名内容" } else { $Title }
  $slugSeed = if ($route.type -eq "page" -and $route.pageId) { "$($route.pageId)-page" } else { $safeTitle }
  $slug = Normalize-Slug $slugSeed

  $base = [ordered]@{
    type = $route.type
    slug = $slug
    title = $safeTitle
    description = "自动从飞书导入，请按需补充摘要。"
    date = $today
    tags = @($route.tags)
    autoRouting = $true
  }

  if ($route.type -eq "article") {
    $base.category = "$($route.category)"
  } elseif ($route.type -eq "knowledge") {
    $base.categoryId = "$($route.categoryId)"
  } elseif ($route.type -eq "portfolio") {
    $base.platform = "$($route.platform)"
    $base.cover = ""
  } elseif ($route.type -eq "page") {
    $base.pageId = "$($route.pageId)"
  }

  return $base
}

function Resolve-DocumentUrlFromDriveItem {
  param($Item)

  $itemType = ("$($Item.type)").ToLowerInvariant()
  $docUrl = "$($Item.url)"
  if (-not [string]::IsNullOrWhiteSpace($docUrl)) { return $docUrl }

  $tokenFromItem = "$($Item.token)"
  $itemTypeForUrl = $itemType
  if ($itemType -eq "shortcut" -and $Item.shortcut_info) {
    if ($Item.shortcut_info.target_type) { $itemTypeForUrl = ("$($Item.shortcut_info.target_type)").ToLowerInvariant() }
    if ($Item.shortcut_info.target_token) { $tokenFromItem = "$($Item.shortcut_info.target_token)" }
  }
  if ([string]::IsNullOrWhiteSpace($tokenFromItem)) { return "" }

  if ($itemTypeForUrl -eq "doc" -or $itemTypeForUrl -eq "docx") {
    return "https://gqkkndrhn25.feishu.cn/docx/$tokenFromItem"
  }
  if ($itemTypeForUrl -eq "wiki") {
    return "https://gqkkndrhn25.feishu.cn/wiki/$tokenFromItem"
  }
  if ($itemTypeForUrl -eq "sheet") {
    return "https://gqkkndrhn25.feishu.cn/sheets/$tokenFromItem"
  }

  return ""
}

function Get-FeishuFolderDocumentsRecursive {
  param([string]$RootFolderToken)

  $result = @()
  $queue = New-Object System.Collections.ArrayList
  [void]$queue.Add([PSCustomObject]@{
    token = $RootFolderToken
    path = ""
  })

  while ($queue.Count -gt 0) {
    $node = $queue[0]
    $queue.RemoveAt(0)
    $pageToken = ""

    while ($true) {
      $params = [ordered]@{
        folder_token = "$($node.token)"
        page_size = 200
        order_by = "EditedTime"
        direction = "DESC"
      }
      if (-not [string]::IsNullOrWhiteSpace($pageToken)) {
        $params.page_token = $pageToken
      }

      $paramsJson = $params | ConvertTo-Json -Compress -Depth 10
      $resp = Invoke-LarkJson -CliArgs @(
        "api", "GET", "/open-apis/drive/v1/files",
        "--as", "user",
        "--params", $paramsJson,
        "--format", "json"
      ) -Context "递归列取飞书文件夹文件"

      $items = @()
      if ($resp.data -and $resp.data.files) { $items = @($resp.data.files) }

      foreach ($it in $items) {
        $itemType = ("$($it.type)").ToLowerInvariant()
        if ($itemType -eq "folder") {
          $childToken = "$($it.token)"
          if (-not [string]::IsNullOrWhiteSpace($childToken)) {
            $seg = Normalize-FolderSegment "$($it.name)"
            $childPath = if ([string]::IsNullOrWhiteSpace("$($node.path)")) { $seg } else { "$($node.path)/$seg" }
            [void]$queue.Add([PSCustomObject]@{
              token = $childToken
              path = $childPath
            })
          }
          continue
        }

        if ($itemType -notin @("doc", "docx", "sheet", "wiki", "shortcut")) { continue }
        $result += [PSCustomObject]@{
          item = $it
          parent_path = "$($node.path)"
        }
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
  }

  return $result
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
  $upserts = 0
  $discovered = @()
  try {
    $discovered = Get-FeishuFolderDocumentsRecursive -RootFolderToken $folderToken
  } catch {
    $msg = "$($_.Exception.Message)"
    if ($msg -match "Permission denied" -or $msg -match "action_privilege_required") {
      Write-Warn "飞书文件夹同步权限不足（应用可能仍在审批），本次已自动跳过，不影响既有发布流程。"
      return
    }
    throw
  }

  foreach ($entry in $discovered) {
    $it = $entry.item
    $itemType = ("$($it.type)").ToLowerInvariant()
    $docUrl = Resolve-DocumentUrlFromDriveItem -Item $it
    $docToken = Extract-DocTokenFromUrl $docUrl
    if ([string]::IsNullOrWhiteSpace($docToken)) { continue }

    $modified = "$($it.modified_time)"
    if ([string]::IsNullOrWhiteSpace($modified)) { $modified = "$($it.edit_time)" }
    if ([string]::IsNullOrWhiteSpace($modified)) { $modified = "$($it.create_time)" }

    $existing = if ($state.docs.ContainsKey($docToken)) { $state.docs[$docToken] } else { $null }
    $existingModified = if ($existing -and $existing.PSObject.Properties["modified_time"]) { "$($existing.modified_time)" } else { "" }
    $existingFolder = if ($existing -and $existing.PSObject.Properties["inbox_folder"]) { "$($existing.inbox_folder)" } else { "" }
    $existingSourceParent = if ($existing -and $existing.PSObject.Properties["source_parent"]) { "$($existing.source_parent)" } else { "" }
    $existingFolder = $existingFolder -replace "\\", "/"

    $relativeParent = "$($entry.parent_path)"
    if ([string]::IsNullOrWhiteSpace($relativeParent)) {
      $relativeParent = "articles"
    }
    $relativeParent = ($relativeParent -replace "\\", "/").Trim("/")
    $relativeParentParts = @($relativeParent -split "/" | ForEach-Object { Normalize-FolderSegment $_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $safeRelativeParent = ($relativeParentParts -join "/")
    if ([string]::IsNullOrWhiteSpace($safeRelativeParent)) {
      $safeRelativeParent = "articles"
    }

    $sourceParentChanged = ($null -ne $existing) -and (($existingSourceParent -replace "\\", "/").Trim("/") -ne $safeRelativeParent)
    if ($sourceParentChanged) {
      # 当文档在飞书里被移动到新的路由目录时，强制重新路由到新父目录。
      $existingFolder = ""
    }

    $needsSync = ($null -eq $existing) -or ($existingModified -ne $modified) -or $sourceParentChanged
    if (-not $needsSync) { continue }

    $inboxRelativeFolder = $existingFolder
    if ([string]::IsNullOrWhiteSpace($inboxRelativeFolder)) {
      $parentAbs = Join-Path $InboxRoot ($safeRelativeParent -replace "/", [System.IO.Path]::DirectorySeparatorChar)
      $folderName = New-UniqueInboxFolderName -ParentPath $parentAbs -DocToken $docToken
      $inboxRelativeFolder = "$safeRelativeParent/$folderName"
    }

    $targetFolder = Join-Path $InboxRoot ($inboxRelativeFolder -replace "/", [System.IO.Path]::DirectorySeparatorChar)
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
      inbox_folder = $inboxRelativeFolder
      source_parent = $safeRelativeParent
      title = "$($it.name)"
      type = $itemType
      modified_time = $modified
      url = $docUrl
      last_synced_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    }
    $upserts++
  }

  Save-FeishuSyncState -StatePath $statePath -State $state
  Write-Info "飞书文件夹同步完成：发现 $($discovered.Count) 条文档，写入/更新 $upserts 条。"
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
  param(
    [string]$FolderPath,
    [string]$InboxRoot
  )

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

  $autoMeta = Build-AutoMetadata -FolderPath $FolderPath -InboxRoot $InboxRoot -Title $title
  if (-not $hasMeta) {
    $meta = $autoMeta | ConvertTo-Json -Depth 10
    Set-Content -LiteralPath $metaPath -Value $meta -Encoding utf8
    Write-Info "已自动生成 metadata.json（路由类型：$($autoMeta.type)）。"
  } else {
    try {
      $existingMeta = Get-Content -LiteralPath $metaPath -Raw | ConvertFrom-Json -Depth 50
    } catch {
      $existingMeta = $null
    }

    $canAutoRoute = $false
    if ($existingMeta -and $existingMeta.PSObject.Properties["autoRouting"]) {
      $canAutoRoute = [bool]$existingMeta.autoRouting
    }

    if ($canAutoRoute) {
      if (-not $existingMeta.PSObject.Properties["slug"] -or [string]::IsNullOrWhiteSpace("$($existingMeta.slug)")) {
        $existingMeta | Add-Member -NotePropertyName "slug" -NotePropertyValue "$($autoMeta.slug)" -Force
      }
      if (-not $existingMeta.PSObject.Properties["description"] -or [string]::IsNullOrWhiteSpace("$($existingMeta.description)")) {
        $existingMeta | Add-Member -NotePropertyName "description" -NotePropertyValue "自动从飞书导入，请按需补充摘要。" -Force
      }
      if (-not $existingMeta.PSObject.Properties["date"] -or [string]::IsNullOrWhiteSpace("$($existingMeta.date)")) {
        $existingMeta | Add-Member -NotePropertyName "date" -NotePropertyValue (Get-Date -Format "yyyy-MM-dd") -Force
      }

      $existingMeta.type = "$($autoMeta.type)"
      $existingMeta.title = $title
      $existingMeta.tags = @($autoMeta.tags)
      $existingMeta.autoRouting = $true
      $existingCover = if ($existingMeta.PSObject.Properties["cover"]) { "$($existingMeta.cover)" } else { "" }

      foreach ($field in @("category", "categoryId", "platform", "pageId", "cover")) {
        if ($existingMeta.PSObject.Properties[$field]) {
          $existingMeta.PSObject.Properties.Remove($field)
        }
      }

      if ($autoMeta.type -eq "article") {
        $existingMeta | Add-Member -NotePropertyName "category" -NotePropertyValue "$($autoMeta.category)" -Force
      } elseif ($autoMeta.type -eq "knowledge") {
        $existingMeta | Add-Member -NotePropertyName "categoryId" -NotePropertyValue "$($autoMeta.categoryId)" -Force
      } elseif ($autoMeta.type -eq "portfolio") {
        $existingMeta | Add-Member -NotePropertyName "platform" -NotePropertyValue "$($autoMeta.platform)" -Force
        $existingMeta | Add-Member -NotePropertyName "cover" -NotePropertyValue $existingCover -Force
      } elseif ($autoMeta.type -eq "page") {
        $existingMeta | Add-Member -NotePropertyName "pageId" -NotePropertyValue "$($autoMeta.pageId)" -Force
      }

      $updatedMeta = $existingMeta | ConvertTo-Json -Depth 50
      Set-Content -LiteralPath $metaPath -Value $updatedMeta -Encoding utf8
      Write-Info "检测到 autoRouting，已按目录更新 metadata 路由（$($autoMeta.type)）。"
    }
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

function Get-InboxSubmissionFolders {
  param([string]$InboxRoot)

  $dirs = Get-ChildItem -LiteralPath $InboxRoot -Directory -Recurse | Sort-Object FullName
  $result = @()
  foreach ($dir in $dirs) {
    $folderPath = $dir.FullName
    $hasMarkers = (Test-Path -LiteralPath (Join-Path $folderPath "feishu-url.txt") -PathType Leaf) -or
      (Test-Path -LiteralPath (Join-Path $folderPath "metadata.json") -PathType Leaf) -or
      (Test-Path -LiteralPath (Join-Path $folderPath "content.md") -PathType Leaf)
    if ($hasMarkers) {
      $result += $dir
    }
  }

  return @($result)
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

$folders = Get-InboxSubmissionFolders -InboxRoot $inbox
if (-not $folders) {
  Write-Done "content/inbox 为空，无需发布。"
  exit 0
}

$pending = @()
foreach ($folder in $folders) {
  $folderPath = $folder.FullName
  Import-FeishuIfNeeded -FolderPath $folderPath -InboxRoot $inbox
  $relativeName = Get-RelativePathUnix -FullPath $folderPath -RootPath $inbox
  if ([string]::IsNullOrWhiteSpace($relativeName)) { $relativeName = $folder.Name }

  $metaPath = Join-Path $folderPath "metadata.json"
  $contentPath = Join-Path $folderPath "content.md"
  if (-not (Test-Path -LiteralPath $metaPath -PathType Leaf) -or -not (Test-Path -LiteralPath $contentPath -PathType Leaf)) {
    Write-Warn "跳过 $relativeName：缺少 metadata.json 或 content.md。"
    continue
  }

  $signature = Get-FolderSignature -FolderPath $folderPath
  $stampPath = Join-Path $folderPath ".published.stamp"
  $publishedSig = if (Test-Path -LiteralPath $stampPath -PathType Leaf) { (Get-Content -LiteralPath $stampPath -Raw).Trim() } else { "" }

  if ($signature -ne $publishedSig) {
    $pending += [PSCustomObject]@{
      Name = ($relativeName -replace "\\", "/")
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
Invoke-GitWithRetry -GitArgs @("fetch", "origin", "main")
Invoke-GitWithRetry -GitArgs @("rebase", "origin/main")
Invoke-GitWithRetry -GitArgs @("push", "origin", "HEAD:main")

foreach ($item in $pending) {
  Set-Content -LiteralPath $item.StampPath -Value $item.Signature -Encoding utf8
}

Write-Done "自动发布完成，已推送到 GitHub。"
