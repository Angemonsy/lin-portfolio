# GitHub 侦察报告 - 2026-04-24

## 今日结论

- 今日主评估项目：`khoj-ai/openpaper`
- 结论定位：值得继续跟踪，适合作为“研究资料库 -> 知识沉淀 -> 内容选题”的上游候选，比继续重复评估 `paperclipai/paperclip` 更接近你“知识管理 + 内容生产 + AI提效”的交叉带。
- 今日未达到“本地成功试跑”标准，因此**暂不写入网站项目列表**。
- 本轮新信息很明确：
  - 在工作区内把 Git 元数据写到 `tmp/github-lab/*.git` 会直接触发 `config` 写入权限问题。
  - 把 Git 元数据切到 `C:\Users\Administrator\.codex\automations\23-github\...` 后，阻塞点回到 GitHub HTTPS 访问，错误为 `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`。

## 今日候选池

### 1. `khoj-ai/openpaper`（今日主候选）

- GitHub: <https://github.com/khoj-ai/openpaper>
- 公开信息：
  - `284 stars` / `39 forks`
  - `AGPL-3.0`
  - 主仓结构包含 `client`、`server`、`jobs`
- 项目做什么：
  - 面向研究论文与 PDF 的 AI 工作台，支持上传、标注、笔记、问答、引用定位与研究库搜索
  - 更像“研究型 second brain 的垂直工作台”，而不是通用笔记应用
- 为什么今天优先评估它：
  - 它和你个人 IP 的结合点不在“学术研究”本身，而在“输入材料 -> 理解 -> 摘要 -> 观点生成 -> 选题素材库”的链路
  - 如果做裁剪版，它可以变成“论文 / 长文 / 行业报告 -> 内容灵感与知识卡片”的上游引擎
  - 同时也算一类 paper / paper-clip 近邻候选，能补足你之前只看 agent orchestration 的视角

### 2. `khoj-ai/khoj`

- GitHub: <https://github.com/khoj-ai/khoj>
- 公开信息：
  - `34.2k stars` / `2.2k forks`
  - `AGPL-3.0`
  - 定位是 self-hostable 的 AI second brain，可接网页、文档、本地模型、自动化和深度研究
- 判断：
  - 仍然是你“个人 AI 工作台 / 知识操作系统”方向的高质量候选
  - 但产品面更宽，今天不如 `openpaper` 这么聚焦“研究材料到内容资产”的链路

### 3. `gitroomhq/postiz-app`

- GitHub: <https://github.com/gitroomhq/postiz-app>
- 公开信息：
  - `29.4k stars` / `5.3k forks`
  - `AGPL-3.0`
  - `Latest Apr 12, 2026`
  - 定位是开源、自托管的社媒排程与 AI 辅助分发工具
- 判断：
  - 非常适合作为你未来“内容分发层”
  - 但它解决的是发布和运营，而不是知识沉淀与观点生成，不适合作为今天主评估对象

### 4. `paperclipai/paperclip`

- GitHub: <https://github.com/paperclipai/paperclip>
- 公开信息：
  - `58.4k stars` / `10.1k forks`
  - `MIT`
  - `Latest Apr 16, 2026`
  - 定位是零人类公司的开源编排系统
- 判断：
  - 依旧是“agent 编排层”的强观察对象
  - 但和“大学生成长 / 知识管理 / 内容生产”主线距离仍偏远，更适合保留在第二观察层

## 今日主评估：Open Paper

## 项目做什么

- README 把它定义为“研究资料库工作台”，支持上传论文、标注、笔记、聊天与库内搜索
- 产品核心不是单纯“和 PDF 聊天”，而是：
  - 并排阅读与 AI copilot
  - 高亮与批注
  - 基于引用的回答定位
  - 面向多篇论文的集中检索
- 本质上是“研究材料处理器 + 注释型知识库”

## 核心能力

### 1. 研究材料结构化理解

- 上传 PDF 后直接生成 briefing 和 starter questions
- 回答尽量带引用锚点，降低“AI 胡说但你找不到出处”的风险
- 对你很有价值的点在于：可把长论文、长报告、白皮书先压缩成可消费的知识入口

### 2. 阅读与知识捕获一体化

- 并排视图把“读原文”和“问 AI”放在同一个上下文里
- 高亮、注释、笔记都贴着原始材料发生
- 这比单独开一个聊天框更适合做“研究 -> 洞察 -> 内容草稿”链路

### 3. 能成为内容生产的上游素材层

- 如果你未来做个人 IP 内容引擎，一个很自然的分层是：
  - Open Paper 类工具处理原始论文 / 报告 / 长文
  - Khoj 类工具做跨资料搜索和自动化
  - Postiz 类工具做分发
- 这条链路比直接从 Paperclip 这类“组织编排”系统起步更贴近你现在的网站叙事

## 接入你网站 / 服务的可行性

## 最合理的接入方式

### A. 作为“研究到内容”的后台实验，而不是前台主产品

- 你的网站前台不需要直接变成论文阅读器
- 更合理的是把它作为站外研究台：
  - 上传论文 / 报告
  - 提炼观点和摘录
  - 把输出同步成你站内文章、知识卡片、项目洞察

### B. 可衍生成你的个人 IP 叙事页面

- 很适合包装成以下实验方向：
  - `Research-to-Content Lab`
  - `AI Reading Copilot for Students`
  - `Long-form Knowledge Distiller`
- 特别适合“大学生如何读懂论文 / 报告并转化成自己的表达”这个内容角度

### C. 不适合直接硬嵌到现有静态站

- 现有站点是偏展示型静态前台
- Open Paper 是完整应用形态，包含前端、后端、异步 jobs 和对象存储依赖
- 更适合先作为独立实验服务存在，再让你的网站做方法论展示与结果出口

## 复杂度评估

- 产品复杂度：中高
- 环境复杂度：高
- 二次改造复杂度：中高
- 站点集成复杂度：低到中

原因：

- `client` 是 Next.js 前端
- `server` 需要 Python 3.12+、`uv`、PostgreSQL、Gemini API key
- `jobs` 是 Celery 异步服务，需要 RabbitMQ、Redis、S3 兼容对象存储和 LLM API
- 它不是“clone 后跑一个 dev server”那类轻项目，而是一个完整的多服务应用

## 风险评估

### 1. 许可证偏重

- `openpaper` 和 `khoj` 都是 `AGPL-3.0`
- 这对你做公开托管服务或深度改造商业化接入时，需要更谨慎处理
- 如果只是本地研究、方法借鉴和内容实验，压力较小；如果未来要深度产品化，要单独做许可证边界判断

### 2. 官方已明确“并未针对自托管优化”

- README 直接说明：开源，但并未针对 self-hosting 优化
- 这意味着：
  - 本地跑通可能比 README 表面看起来更折腾
  - 部分体验更偏作者自己的研发工作流，而非稳定交付给第三方部署

### 3. 依赖链条长

- `server` 侧至少需要：
  - Python 3.12+
  - `uv`
  - PostgreSQL
  - Gemini API key
- `jobs` 侧还需要：
  - RabbitMQ
  - Redis
  - S3-compatible storage
  - LLM API key
- 对自动化 nightly scout 来说，这类项目更适合做“结构阅读 + 最小本地验证”，不适合一次性重部署

### 4. 当前环境的真实阻塞仍是 GitHub shell 网络 / 凭证

- 第一次尝试把 `.git` 放在工作区内：
  - 失败：`could not write config file ... Permission denied`
- 第二次把 Git 元数据移到自动化目录：
  - 失败：`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`
- 说明今天最大的 blocker 仍然不是仓库难度，而是自动化环境到 GitHub 的 HTTPS 凭证链异常

## 本地试跑结果

## 已验证

- 本地基础工具存在：
  - `git version 2.53.0.windows.2`
  - `node v24.14.0`
  - `Python 3.13.3`
- shell 里仍带有无效代理变量：
  - `HTTP_PROXY=http://127.0.0.1:9`
  - `HTTPS_PROXY=http://127.0.0.1:9`
  - `ALL_PROXY=http://127.0.0.1:9`
  - `GIT_HTTP_PROXY=http://127.0.0.1:9`
  - `GIT_HTTPS_PROXY=http://127.0.0.1:9`

## 试跑命令与结果

### 尝试 1：工作区内分离 Git 元数据

- 命令目标：
  - worktree: `tmp/github-lab/openpaper-20260424-233527`
  - git dir: `tmp/github-lab/openpaper-20260424-233527.git`
- 结果：
  - `warning: unable to unlink ... config.lock: Invalid argument`
  - `error: could not write config file ... Permission denied`
  - `fatal: could not set 'core.repositoryformatversion' to '0'`

### 尝试 2：Git 元数据改放自动化目录

- 命令目标：
  - worktree: `tmp/github-lab/openpaper-20260424-233537`
  - git dir: `C:\Users\Administrator\.codex\automations\23-github\openpaper-20260424-233537.git`
- 结果：
  - 成功绕开了本地 `.git/config` 写入权限问题
  - 新阻塞变为：
    - `fatal: unable to access 'https://github.com/khoj-ai/openpaper.git/': schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)`

## 结论

- 今天完成了“项目筛选 + 结构阅读 + 本地试跑”
- 但没有达到“仓库成功落地并运行”的门槛
- 因此今天仍不建议把它写进网站公开项目页

## 降级学习方案

如果明天 shell 的 GitHub HTTPS 问题仍未解决，建议直接按下面的降级路径推进，不要第三次重复撞同一层错误：

### 方案 1：网页级深读仓库结构

- 重点读：
  - `README.md`
  - `DEVELOPMENT.md`
  - `server/README.md`
  - `jobs/README.md`
- 目标不是“证明可部署”，而是抽取其架构与工作流

### 方案 2：先抽方法，不急着跑完整系统

- 先把它拆成适合你站点叙事的能力模块：
  - 长文 / 论文 ingest
  - AI 摘要与 citation-grounded 问答
  - 批注与洞察卡片
  - 选题素材池

### 方案 3：优先做轻量实验页面

- 不是做“Open Paper 中文镜像”
- 而是做一个更贴你个人 IP 的实验项：
  - 大学生论文阅读 copilot
  - 报告/白皮书转内容灵感器
  - AI 研究台的个人工作流拆解

## 明日建议

### 优先级 1：修 GitHub HTTPS / schannel

- 这是目前所有 clone / 本地试跑的总阻塞
- 不解决它，明晚无论换哪个仓库都会继续浪费时间在落地前阶段

### 优先级 2：若网络修通，优先复试 Open Paper

- 不是因为它最成熟，而是因为它对你当前主线最有新鲜度：
  - 知识管理
  - 研究材料处理
  - 内容生产前置环节

### 优先级 3：候补顺序

- `khoj-ai/khoj`：通用 second brain / 自动化层
- `gitroomhq/postiz-app`：内容分发层
- `paperclipai/paperclip`：agent 编排层

## 参考来源

- Open Paper: <https://github.com/khoj-ai/openpaper>
- Open Paper development setup: <https://github.com/khoj-ai/openpaper/blob/master/DEVELOPMENT.md>
- Open Paper server README: <https://github.com/khoj-ai/openpaper/blob/master/server/README.md>
- Open Paper jobs README: <https://github.com/khoj-ai/openpaper/blob/master/jobs/README.md>
- Khoj: <https://github.com/khoj-ai/khoj>
- Postiz: <https://github.com/gitroomhq/postiz-app>
- Paperclip: <https://github.com/paperclipai/paperclip>
