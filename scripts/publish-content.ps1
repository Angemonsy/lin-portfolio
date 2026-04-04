param(
  [Parameter(Mandatory = $true)]
  [string]$InputFolder,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Done {
  param([string]$Message)
  Write-Host "[DONE] $Message" -ForegroundColor Green
}

function Resolve-InputPath {
  param([string]$RawPath)

  if ([System.IO.Path]::IsPathRooted($RawPath)) {
    return $RawPath
  }

  return Join-Path $projectRoot $RawPath
}

function Read-JsonFile {
  param([string]$Path)
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 50
}

function Save-JsonFile {
  param(
    [string]$Path,
    $Data
  )
  $json = $Data | ConvertTo-Json -Depth 50
  Set-Content -LiteralPath $Path -Value $json -Encoding utf8
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

function Normalize-Tags {
  param($RawTags)
  if ($null -eq $RawTags) { return @() }

  $items = @()
  if ($RawTags -is [string]) {
    $items = $RawTags -split "[,，]"
  } else {
    $items = @($RawTags)
  }

  return @(
    $items |
      ForEach-Object { "$_".Trim() } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -Unique
  )
}

function HtmlEncode {
  param([string]$Text)
  return [System.Net.WebUtility]::HtmlEncode($Text)
}

function Convert-InlineMarkdown {
  param([string]$Text)

  $output = HtmlEncode($Text)

  # 行内代码
  $output = [regex]::Replace(
    $output,
    '`([^`]+)`',
    {
      param($m)
      '<code class="rounded bg-slate-100 px-1 py-0.5 text-[0.92em]">' + $m.Groups[1].Value + "</code>"
    }
  )

  # 链接
  $output = [regex]::Replace(
    $output,
    '\[(.+?)\]\((.+?)\)',
    {
      param($m)
      $label = $m.Groups[1].Value
      $url = $m.Groups[2].Value
      '<a class="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700" href="' + $url + '" target="_blank" rel="noopener">' + $label + "</a>"
    }
  )

  # 加粗与斜体
  $output = [regex]::Replace($output, '\*\*(.+?)\*\*', '<strong>$1</strong>')
  $output = [regex]::Replace($output, '\*(.+?)\*', '<em>$1</em>')

  return $output
}

function Flush-ParagraphBuffer {
  param(
    [System.Collections.Generic.List[string]]$ParagraphBuffer,
    [System.Collections.Generic.List[string]]$OutputLines
  )

  if ($ParagraphBuffer.Count -eq 0) { return }
  foreach ($line in $ParagraphBuffer) {
    $text = $line.Trim()
    if (-not [string]::IsNullOrWhiteSpace($text)) {
      # 飞书导出的 markdown 往往“每行即一段”，这里按行输出段落，避免整块文字挤在一起。
      $OutputLines.Add("<p>" + (Convert-InlineMarkdown $text) + "</p>")
    }
  }
  $ParagraphBuffer.Clear()
}

function Close-ListIfNeeded {
  param(
    [ref]$InList,
    [System.Collections.Generic.List[string]]$OutputLines
  )

  if ($InList.Value) {
    $OutputLines.Add("</ul>")
    $InList.Value = $false
  }
}

function Rewrite-MarkdownImagePaths {
  param(
    [string]$Markdown,
    [string]$SourceFolder,
    [string]$Slug,
    [switch]$IsDryRun
  )

  $targetImageDir = Join-Path $projectRoot ("assets/content/" + $Slug)
  $pattern = "!\[(?<alt>[^\]]*)\]\((?<path>[^)]+)\)"

  return [regex]::Replace(
    $Markdown,
    $pattern,
    {
      param($m)
      $alt = $m.Groups["alt"].Value
      $rawPath = $m.Groups["path"].Value.Trim().Trim("'").Trim('"')

      if ($rawPath -match "^(https?:)?\/\/" -or $rawPath -match "^data:" -or $rawPath.StartsWith("/")) {
        return $m.Value
      }

      $normalizedRelative = $rawPath -replace "/", [System.IO.Path]::DirectorySeparatorChar
      $sourcePath = Join-Path $SourceFolder $normalizedRelative
      if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "content.md 中引用的图片不存在：$rawPath"
      }

      $filename = [System.IO.Path]::GetFileName($sourcePath)
      if (-not $IsDryRun) {
        New-Item -ItemType Directory -Force -Path $targetImageDir | Out-Null
        Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $targetImageDir $filename) -Force
      }

      $newPath = "../assets/content/$Slug/$filename"
      return "![$alt]($newPath)"
    }
  )
}

function Convert-MarkdownToHtml {
  param([string]$Markdown)

  $lines = $Markdown -split "`r?`n"
  $output = New-Object System.Collections.Generic.List[string]
  $paragraphBuffer = New-Object System.Collections.Generic.List[string]
  $inList = $false

  foreach ($rawLine in $lines) {
    $line = $rawLine.TrimEnd()
    $trimmed = $line.Trim()

    if ([string]::IsNullOrWhiteSpace($trimmed)) {
      Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
      Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output
      continue
    }

    if ($trimmed -match "^---+$") {
      Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
      Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output
      $output.Add('<hr class="my-8 border-slate-200">')
      continue
    }

    if ($trimmed -match "^!\[(.*?)\]\((.*?)\)$") {
      Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
      Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output
      $altRaw = "$($Matches[1])".Trim()
      $altText = HtmlEncode($altRaw)
      $imgPath = HtmlEncode($Matches[2])
      $output.Add('<figure class="my-6">')
      $output.Add('  <img src="' + $imgPath + '" alt="' + $altText + '" class="w-full rounded-xl border border-slate-200">')
      # “配图”是自动导入时的占位文案，不显示图下注释；其余 alt 仍保留说明。
      if (-not [string]::IsNullOrWhiteSpace($altRaw) -and $altRaw -ne "配图") {
        $output.Add('  <figcaption class="mt-2 text-xs text-slate-500">' + $altText + "</figcaption>")
      }
      $output.Add("</figure>")
      continue
    }

    if ($trimmed -match "^##\s+(.+)$") {
      Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
      Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output
      $output.Add("<h2>" + (Convert-InlineMarkdown $Matches[1]) + "</h2>")
      continue
    }

    if ($trimmed -match "^###\s+(.+)$") {
      Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
      Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output
      $output.Add('<h3 class="mt-6 text-xl font-bold text-slate-900">' + (Convert-InlineMarkdown $Matches[1]) + "</h3>")
      continue
    }

    if ($trimmed -match "^#\s+(.+)$") {
      Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
      Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output
      $output.Add("<h2>" + (Convert-InlineMarkdown $Matches[1]) + "</h2>")
      continue
    }

    if ($trimmed -match "^>\s*(.+)$") {
      Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
      Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output
      $output.Add('<blockquote class="my-4 rounded-xl border-l-4 border-blue-300 bg-blue-50 px-4 py-3 text-slate-700">' + (Convert-InlineMarkdown $Matches[1]) + "</blockquote>")
      continue
    }

    if ($trimmed -match "^[-*]\s+(.+)$") {
      Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
      if (-not $inList) {
        $output.Add('<ul class="my-4 list-disc space-y-2 pl-6 text-slate-700">')
        $inList = $true
      }
      $output.Add("<li>" + (Convert-InlineMarkdown $Matches[1]) + "</li>")
      continue
    }

    Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
    Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output
    $output.Add("<p>" + (Convert-InlineMarkdown $trimmed) + "</p>")
  }

  Flush-ParagraphBuffer -ParagraphBuffer $paragraphBuffer -OutputLines $output
  Close-ListIfNeeded -InList ([ref]$inList) -OutputLines $output

  return ($output -join "`n")
}

function Build-TagBadgesHtml {
  param([string[]]$Tags)

  if ($null -eq $Tags -or $Tags.Count -eq 0) {
    return ""
  }

  return ($Tags | ForEach-Object {
      '<span class="inline-flex rounded-full bg-blue-50 px-3 py-1 text-blue-700">' + (HtmlEncode $_) + "</span>"
    }) -join "`n            "
}

function Build-DetailPageHtml {
  param(
    [string]$PageTitle,
    [string]$CategoryLine,
    [string]$PublishDate,
    [string[]]$Tags,
    [string]$ContentHtml,
    [string]$BackHref,
    [string]$BackText,
    [string]$CurrentKey
  )

  $safeTitle = HtmlEncode $PageTitle
  $safeCategory = HtmlEncode $CategoryLine
  $safeDate = HtmlEncode $PublishDate
  $tagBadges = Build-TagBadgesHtml $Tags

  return @"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>奇绩怪谈AIQ | $safeTitle</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brandFrom: "#3b82f6",
            brandTo: "#6366f1",
            softBg: "#f8fafc"
          }
        }
      }
    };
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/site.css">
</head>
<body class="antialiased">
  <header class="fixed inset-x-0 top-0 z-50">
    <nav data-nav class="nav-glass">
      <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="../index.html" class="inline-flex items-center gap-2 text-base font-bold tracking-tight md:text-lg"><img src="../assets/avatar-kunki.jpg" alt="奇绩怪谈AIQ Logo" class="h-8 w-8 rounded-full border border-slate-200 object-cover"><span class="brand-gradient">奇绩怪谈AIQ</span></a>
        <button data-menu-btn class="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 md:hidden" type="button" aria-expanded="false" aria-label="打开导航菜单">菜单</button>
        <div class="hidden items-center gap-1 text-sm md:flex">
          <a data-nav-link data-nav-key="index" class="nav-link rounded-lg px-3 py-2" href="../index.html">首页</a>
          <a data-nav-link data-nav-key="blog" class="nav-link rounded-lg px-3 py-2" href="../blog.html">文章</a>
          <a data-nav-link data-nav-key="knowledge" class="nav-link rounded-lg px-3 py-2" href="../knowledge.html">知识库</a>
          <a data-nav-link data-nav-key="portfolio" class="nav-link rounded-lg px-3 py-2" href="../portfolio.html">作品集</a>
          <a data-nav-link data-nav-key="services" class="nav-link rounded-lg px-3 py-2" href="../services.html">服务</a>
          <a data-nav-link data-nav-key="about" class="nav-link rounded-lg px-3 py-2" href="../about.html">关于我</a>
        </div>
      </div>
      <div data-menu-panel class="mx-auto hidden w-full max-w-6xl px-4 pb-4 sm:px-6 lg:px-8 md:hidden">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
          <a data-nav-link data-nav-key="index" class="nav-link block rounded-lg px-3 py-2" href="../index.html">首页</a>
          <a data-nav-link data-nav-key="blog" class="nav-link block rounded-lg px-3 py-2" href="../blog.html">文章</a>
          <a data-nav-link data-nav-key="knowledge" class="nav-link block rounded-lg px-3 py-2" href="../knowledge.html">知识库</a>
          <a data-nav-link data-nav-key="portfolio" class="nav-link block rounded-lg px-3 py-2" href="../portfolio.html">作品集</a>
          <a data-nav-link data-nav-key="services" class="nav-link block rounded-lg px-3 py-2" href="../services.html">服务</a>
          <a data-nav-link data-nav-key="about" class="nav-link block rounded-lg px-3 py-2" href="../about.html">关于我</a>
        </div>
      </div>
    </nav>
  </header>

  <main class="pt-24 pb-16">
    <section class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <article class="reveal rounded-3xl border border-slate-200 bg-white p-6 md:p-10">
        <header class="mx-auto max-w-[720px]">
          <p class="text-sm font-semibold text-blue-600">$safeCategory</p>
          <h1 class="mt-3 text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">$safeTitle</h1>
          <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>发布时间：$safeDate</span>
            $tagBadges
          </div>
        </header>

        <div class="article-content mt-8">
$ContentHtml
        </div>
      </article>

      <div class="mt-8">
        <a href="$BackHref" class="reveal inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">$BackText</a>
      </div>
    </section>
  </main>

  <footer class="border-t border-slate-200 bg-white/90">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <p>© 2026 奇绩怪谈AIQ</p>
      <p class="text-slate-500">把自己点亮，世界才会靠近。</p>
      <div class="flex items-center gap-2">
        <button class="platform-btn" data-qr-platform="shipinhao" type="button">视频号</button>
        <button class="platform-btn" data-qr-platform="xiaohongshu" type="button">小红书</button>
        <button class="platform-btn" data-qr-platform="gongzhonghao" type="button">公众号</button>
        <button class="platform-btn" data-qr-platform="douyin" type="button">抖音</button>
      </div>
    </div>
  </footer>

  <script src="../assets/data-fallback.js"></script>
  <script src="../assets/site-common.js"></script>
  <script>
    (function () {
      SiteCommon.initNav({ currentKey: "$CurrentKey" });
      SiteCommon.initQrModal({ assetPrefix: "../" });
      SiteCommon.initReveal(document);
    })();
  </script>
</body>
</html>
"@
}

function Ensure-StringField {
  param(
    $Object,
    [string]$FieldName
  )
  if (-not $Object.PSObject.Properties[$FieldName]) {
    throw "metadata.json 缺少字段：$FieldName"
  }
  $value = "$($Object.$FieldName)".Trim()
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "metadata.json 字段为空：$FieldName"
  }
  return $value
}

$inputPath = Resolve-InputPath $InputFolder
if (-not (Test-Path -LiteralPath $inputPath -PathType Container)) {
  throw "输入目录不存在：$inputPath"
}

$metadataPath = Join-Path $inputPath "metadata.json"
$contentPath = Join-Path $inputPath "content.md"
if (-not (Test-Path -LiteralPath $metadataPath -PathType Leaf)) {
  throw "缺少 metadata.json：$metadataPath"
}
if (-not (Test-Path -LiteralPath $contentPath -PathType Leaf)) {
  throw "缺少 content.md：$contentPath"
}

$meta = Read-JsonFile $metadataPath
$type = Ensure-StringField -Object $meta -FieldName "type"
$type = $type.ToLowerInvariant()
if ($type -notin @("article", "knowledge")) {
  throw "metadata.type 仅支持 article / knowledge，当前为：$type"
}

$title = Ensure-StringField -Object $meta -FieldName "title"
$description = Ensure-StringField -Object $meta -FieldName "description"
$slugInput = if ($meta.PSObject.Properties["slug"]) { "$($meta.slug)" } else { $title }
$slug = Normalize-Slug $slugInput
$publishDate = if ($meta.PSObject.Properties["date"] -and -not [string]::IsNullOrWhiteSpace("$($meta.date)")) { "$($meta.date)".Trim() } else { (Get-Date -Format "yyyy-MM-dd") }
$tags = Normalize-Tags $meta.tags

$markdown = Get-Content -LiteralPath $contentPath -Raw
$markdownWithImages = Rewrite-MarkdownImagePaths -Markdown $markdown -SourceFolder $inputPath -Slug $slug -IsDryRun:$DryRun
$contentHtml = Convert-MarkdownToHtml $markdownWithImages

if ($type -eq "article") {
  $category = Ensure-StringField -Object $meta -FieldName "category"
  $detailUrl = "articles/$slug.html"
  $detailPath = Join-Path $projectRoot $detailUrl

  $pageHtml = Build-DetailPageHtml `
    -PageTitle $title `
    -CategoryLine $category `
    -PublishDate $publishDate `
    -Tags $tags `
    -ContentHtml $contentHtml `
    -BackHref "../blog.html" `
    -BackText "返回文章列表" `
    -CurrentKey "blog"

  $articlesPath = Join-Path $projectRoot "data/articles.json"
  $articles = @((Read-JsonFile $articlesPath))
  $record = [PSCustomObject]@{
    id = $slug
    title = $title
    description = $description
    date = $publishDate
    category = $category
    tags = $tags
    url = $detailUrl
  }

  $existingIndex = -1
  for ($i = 0; $i -lt $articles.Count; $i++) {
    if ($articles[$i].id -eq $slug) {
      $existingIndex = $i
      break
    }
  }

  if ($existingIndex -ge 0) {
    $articles[$existingIndex] = $record
    Write-Info "已更新 data/articles.json 中现有文章：$slug"
  } else {
    $articles = @($record) + @($articles)
    Write-Info "已新增文章记录到 data/articles.json：$slug"
  }

  if (-not $DryRun) {
    Set-Content -LiteralPath $detailPath -Value $pageHtml -Encoding utf8
    Save-JsonFile -Path $articlesPath -Data $articles
    Write-Done "文章已发布：$detailUrl"
  } else {
    Write-Info "DryRun：将写入文章页 $detailUrl"
  }
}

if ($type -eq "knowledge") {
  $categoryId = Ensure-StringField -Object $meta -FieldName "categoryId"
  $detailUrl = "knowledge-items/$slug.html"
  $detailPath = Join-Path $projectRoot $detailUrl

  $knowledgePath = Join-Path $projectRoot "data/knowledge.json"
  $knowledgeData = @((Read-JsonFile $knowledgePath))
  $categoryIndex = -1
  for ($i = 0; $i -lt $knowledgeData.Count; $i++) {
    if ($knowledgeData[$i].id -eq $categoryId) {
      $categoryIndex = $i
      break
    }
  }
  if ($categoryIndex -lt 0) {
    throw "找不到 categoryId：$categoryId（请检查 data/knowledge.json）"
  }

  $categoryTitle = "$($knowledgeData[$categoryIndex].title)"
  $record = [PSCustomObject]@{
    title = $title
    description = $description
    url = $detailUrl
  }

  $items = @()
  if ($knowledgeData[$categoryIndex].items) {
    $items = @($knowledgeData[$categoryIndex].items)
  }

  $existingItemIndex = -1
  for ($i = 0; $i -lt $items.Count; $i++) {
    if ($items[$i].url -eq $detailUrl) {
      $existingItemIndex = $i
      break
    }
  }

  if ($existingItemIndex -ge 0) {
    $items[$existingItemIndex] = $record
    Write-Info "已更新知识条目：$detailUrl"
  } else {
    $items = @($record) + @($items)
    Write-Info "已新增知识条目：$detailUrl"
  }

  $knowledgeData[$categoryIndex].items = $items

  $pageHtml = Build-DetailPageHtml `
    -PageTitle $title `
    -CategoryLine ("知识库 · " + $categoryTitle) `
    -PublishDate $publishDate `
    -Tags $tags `
    -ContentHtml $contentHtml `
    -BackHref ("../knowledge/" + $categoryId + ".html") `
    -BackText ("返回" + $categoryTitle) `
    -CurrentKey "knowledge"

  if (-not $DryRun) {
    Set-Content -LiteralPath $detailPath -Value $pageHtml -Encoding utf8
    Save-JsonFile -Path $knowledgePath -Data $knowledgeData
    Write-Done "知识条目已发布：$detailUrl"
  } else {
    Write-Info "DryRun：将写入知识条目页 $detailUrl"
  }
}

if ($DryRun) {
  Write-Done "DryRun 完成：未写入任何文件。"
} else {
  Write-Done "发布完成。你可以启动本地预览查看效果。"
}
