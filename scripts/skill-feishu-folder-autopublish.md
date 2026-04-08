# Feishu Folder Auto-Publish Skill (Recursive + Multi-Section)

## Goal
- Recursively sync new/updated docs from Feishu root folder (including nested subfolders)
- Auto-map folder paths to site content types (`article / knowledge / portfolio / page`)
- Generate/update site content
- Commit/push only when repo changed
- Deploy to Vercel

## Folder Routing (Feishu)
- `articles/<category>/...` -> article
- `knowledge/<category>/...` -> knowledge item
- `portfolio/<platform>/...` -> portfolio item
- `pages/<page-id>/...` -> page copy override (`index/blog/knowledge/portfolio/services/about`)

## Required Scopes
- `drive:file:readonly`
- `drive:drive:readonly`
- `space:document:retrieve`

## One-Time Auth
```powershell
$env:ALL_PROXY=''; $env:HTTP_PROXY=''; $env:HTTPS_PROXY=''; $env:NO_PROXY=''; $env:http_proxy=''; $env:https_proxy=''; $env:all_proxy=''; $env:GIT_HTTP_PROXY=''; $env:GIT_HTTPS_PROXY=''; $env:LARK_CLI_NO_PROXY='1'
lark-cli auth login --scope "drive:file:readonly drive:drive:readonly space:document:retrieve"
lark-cli auth check --scope "drive:file:readonly drive:drive:readonly space:document:retrieve"
```

## Stable Runtime Command
```powershell
pwsh ./scripts/auto-publish.ps1
```

## Guardrails
- Always clear proxy env before Lark/Git/Vercel calls.
- `auto-publish.ps1` already sets `LARK_CLI_NO_PROXY=1`.
- Folder item type `shortcut` is supported and resolved to target doc URL.
- If Feishu folder scopes are missing, folder sync is skipped safely and publishing pipeline continues.

## Known Reliability Notes
- Prefer `lark-cli >= 1.0.4`.
- If Git push fails with auth 401, refresh GitHub credential and retry push.
- If git lock appears, clear git processes and retry.
