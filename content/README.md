# 内容同步工作流（飞书文件夹 -> 网站）

你以后只负责在飞书里写内容。
Codex 自动完成：抓取内容 -> 生成页面 -> 更新数据 -> Git 推送。

---

## 1) 飞书目录建议（根目录可递归）

推荐在飞书根目录里按下面结构放文档（支持多层子目录）：

- `articles/<分类>/你的文档`
- `knowledge/<分类>/你的文档`
- `portfolio/<平台>/你的文档`
- `pages/<页面>/你的文档`

分类/平台/页面会自动映射（见下方规则）。

---

## 2) 自动映射规则

### `articles/<分类>/...`
- 自动生成 `type: article`
- 发布到 `articles/*.html`
- 更新 `data/articles.json`
- `<分类>` 会映射为文章分类（默认 `AI观点`）

### `knowledge/<分类>/...`
- 自动生成 `type: knowledge`
- 发布到 `knowledge-items/*.html`
- 更新 `data/knowledge.json`
- `<分类>` 映射到 `categoryId`，支持：
  - `university`
  - `ai-tools`
  - `monetize`
  - `digital-economy`
  - `alpha`

### `portfolio/<平台>/...`
- 自动生成 `type: portfolio`
- 发布到 `portfolio-items/*.html`
- 更新 `data/portfolio.json`
- `<平台>` 映射：`视频号/小红书/公众号/抖音/合作项目`

### `pages/<页面>/...`
- 自动生成 `type: page`
- 不新建详情页，直接更新 `data/site-pages.json`
- 覆盖对应页面的主文案区（已支持）：
  - `index`
  - `blog`
  - `knowledge`
  - `portfolio`
  - `services`
  - `about`

---

## 3) 如果你想手动精细控制

仍可在本地投稿目录手动放：

- `metadata.json`
- `content.md`
- 图片文件（在 `content.md` 用相对路径引用）

如果 `metadata.json` 已存在，自动流程会尊重你手动配置，不会覆盖类型和字段。

---

## 4) 一键自动发布命令

在仓库根目录执行：

```powershell
pwsh .\scripts\auto-publish.ps1
```

它会自动：

1. 递归扫描飞书根文件夹和所有子文件夹
2. 仅同步新增/更新文档（增量）
3. 生成/更新站点内容
4. `git add/commit/push`
5. 由绑定 GitHub 仓库的域名/站点自动更新线上内容

---

## 5) 单稿件调试（可选）

如果只想发布某一个本地投稿目录：

```powershell
pwsh .\scripts\publish-content.ps1 -InputFolder ".\content\inbox\your-folder"
```

支持类型：`article / knowledge / portfolio / page`

---

## 6) 最推荐协作方式

1. 你只在飞书目录中写内容和组织目录。
2. Codex 负责同步、映射、渲染，并推送到 GitHub。
3. 出现异常时只需告诉我“哪篇文档没同步对”。
