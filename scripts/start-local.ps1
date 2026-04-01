param(
  [int]$Port = 5511
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$python = Get-Command py, python -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $python) {
  throw "未找到 Python。请先安装 Python 后再运行本地预览。"
}

Write-Host "[INFO] 启动本地预览：http://127.0.0.1:$Port/index.html" -ForegroundColor Cyan
if ($python.Name -eq "py") {
  & py -m http.server $Port --bind 127.0.0.1
} else {
  & $python.Source -m http.server $Port --bind 127.0.0.1
}
