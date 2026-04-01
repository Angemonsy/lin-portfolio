# 内容更新工作流（小白版）

你以后只做一件事：**把文字和图片放到同一个投稿文件夹里**。  
然后运行一条命令，网站会自动生成详情页并更新列表数据。

---

## 1. 你要放内容到哪里

请在这个目录下新建一个投稿文件夹：

`lin-portfolio/content/inbox/你的投稿文件夹名/`

这个投稿文件夹里固定放 2 个文件：

1. `metadata.json`（标题、分类等信息）
2. `content.md`（正文）

如果正文里有图片，就把图片也放在同一个投稿文件夹里。  
在 `content.md` 里直接这样引用：

```md
![流程图](flow.png)
```

不需要你把图片和文字分开交给我，也不需要手动改 HTML。

---

## 2. metadata.json 怎么写

### 文章（发布到 blog + articles）

```json
{
  "type": "article",
  "slug": "ai-study-sop-2026",
  "title": "我如何用 AI 重构课程学习 SOP",
  "description": "从任务拆解到复盘闭环，一套可复制的学习流程。",
  "date": "2026-04-01",
  "category": "大学攻略",
  "tags": ["大学攻略", "AI观点"]
}
```

### 知识库条目（发布到 knowledge-items + 对应分类）

```json
{
  "type": "knowledge",
  "slug": "ai-tools-paper-workflow-v2",
  "title": "论文任务的 AI 协作工作流（升级版）",
  "description": "把选题、阅读、写作、润色串成一条线。",
  "date": "2026-04-01",
  "categoryId": "ai-tools",
  "tags": ["AI工具指南"]
}
```

`categoryId` 可选值：

- `university`
- `ai-tools`
- `monetize`
- `digital-economy`
- `alpha`

---

## 3. content.md 怎么写（支持图片）

支持常用 Markdown：

- 段落
- 二级标题 `## 标题`
- 列表 `- 条目`
- 引用 `> 引用`
- 图片 `![说明](图片文件名.png)`
- 链接 `[文字](https://...)`

---

## 4. 一键发布命令

在 `lin-portfolio` 根目录打开终端，运行：

```powershell
pwsh .\scripts\publish-content.ps1 -InputFolder ".\content\inbox\你的投稿文件夹名"
```

成功后会自动完成：

1. 生成详情页（文章在 `articles/`，知识库在 `knowledge-items/`）
2. 自动拷贝图片到 `assets/content/slug/`
3. 自动更新数据文件（`data/articles.json` 或 `data/knowledge.json`）

---

## 5. 本地预览

运行：

```powershell
pwsh .\scripts\start-local.ps1
```

浏览器打开：

`http://127.0.0.1:5511/index.html`

---

## 6. 最推荐的协作方式（你最省心）

1. 你新建投稿文件夹，放 `metadata.json + content.md + 图片`
2. 你告诉我：“发布 `content/inbox/xxx`”
3. 我来执行发布、检查排版、修细节、回传可预览链接

这样你始终只负责内容，不碰代码。
