# GitHub 侦察报告 - 2026-04-26

## 今日结论

- 今日主评估项目：`VectifyAI/OpenKB`
- 结论定位：这是目前最贴近你“大学生成长 / 知识管理 / 长文输入消化 / 自媒体选题沉淀”链路的轻中型候选之一，比 `paperclipai/paperclip` 更接近内容资产生产前链路，也比 `khoj-ai/openpaper` 更容易拆成你网站里的方法实验。
- 今晚完成了候选筛选、网页级结构深读，以及两次真实本地落地尝试；**未完成成功 clone 或命令级试跑**。
- 新信息比前两晚更明确：
  - 在工作区内直接 `git clone`，仍会卡在 `.git/config` 写入权限。
  - 改用 `--separate-git-dir` 后，已越过本地写权限问题，但 GitHub HTTPS 仍卡在 `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`。
  - `pip install --dry-run openkb` 失败不是因为项目没发包，而是本机 `pip` 环境带了 `:env:.no-index='1'`，导致不查任何包索引。

## 今日候选池

### 1. `VectifyAI/OpenKB`（今日主候选）

- GitHub: <https://github.com/VectifyAI/OpenKB>
- PyPI: <https://pypi.org/project/openkb/>
- 公开信息：
  - GitHub 可见约 `355 stars` / `34 forks`
  - `Apache-2.0`
  - PyPI 最近版本 `0.1.3`，发布时间 `2026-04-13`
- 项目做什么：
  - 把 PDF、Markdown、Word、PPT、Excel、HTML、CSV、TXT 等资料编译成一个可持续增长的 wiki 式知识库
  - 不走传统“每问一次重新检索一次”的 RAG，而是把知识长期沉淀成 `summaries + concepts + wikilinks`
- 为什么今天优先评估它：
  - 它非常适合你想做的“论文 / 长文 / 报告 -> 可复用观点 -> 内容选题 -> 个人IP资产”链路
  - 产出天然是 Markdown，对静态站和知识库展示很友好
  - 许可证和部署复杂度都比前两天看的重项目更温和

### 2. `refly-ai/refly`

- GitHub: <https://github.com/refly-ai/refly>
- 判断：
  - 面向非技术创作者的 agentic workspace，方向很贴“内容生产”
  - 但产品体量明显更大，前端/工作流平台属性更强，不适合作为今晚的轻量结构学习对象

### 3. `khoj-ai/khoj`

- GitHub: <https://github.com/khoj-ai/khoj>
- 判断：
  - 仍然是成熟 second brain 的重型样板
  - 但它更像完整产品，而不是适合你先做“方法论改造”的中间层

### 4. `paperclipai/paperclip`

- GitHub: <https://github.com/paperclipai/paperclip>
- 判断：
  - 继续保留在长期观察名单
  - 适合未来做 agent 组织编排层，不适合作为当下最直接的网站 / 服务接入样本

## 今日主评估：OpenKB

## 项目做什么

- OpenKB 是一个 CLI 优先的“知识编译器”。
- 它不是简单的笔记搜索，也不是传统向量库问答。
- 更准确地说，它做的是：
  - 把原始资料放进 `raw/`
  - 把资料转换到 `wiki/sources/`
  - 生成 `wiki/summaries/`
  - 再把跨文档知识汇总成 `wiki/concepts/`
  - 最终形成可持续积累的 Markdown wiki

## 核心能力

### 1. 长文档转结构化知识库

- 通过 `markitdown` 处理常规文档。
- 对长 PDF 走 `PageIndex` 路径，而不是粗暴塞满上下文。
- 比“上传一个 PDF 然后临时聊几句”更适合长期积累知识。

### 2. 输出是可读、可迁移的 Markdown

- `wiki/` 下的结果不是黑盒数据库，而是：
  - `index.md`
  - `log.md`
  - `summaries/`
  - `concepts/`
  - `explorations/`
  - `reports/`
- 对你的网站最有价值的是：这些结果非常容易转成文章草稿、知识卡片、专题页、实验日志。

### 3. 工作流比通用 RAG 更适合个人IP

- 编译后的 `concept` 页面更像“你自己的观点资产库”，而不是单次检索结果。
- 如果你持续喂论文、报告、网页和课程材料，它会越来越像“个人知识操作系统”的底层编译层。

### 4. 接近 Obsidian / second brain 生态

- 产物支持 `[[wikilinks]]`
- README 明确提到可直接在 Obsidian 里打开 `wiki/`
- 这意味着它很适合和你已有的知识管理叙事拼接

## 结构阅读摘要

今晚虽然没成功拿到完整源码工作树，但通过 GitHub 原始文件已确认关键结构：

### CLI 入口

- `openkb/cli.py`
- 主要命令：
  - `init`
  - `add`
  - `query`
  - `chat`
  - `watch`
  - `lint`
  - `list`
  - `status`
  - `use`

### 转换层

- `openkb/converter.py`
- 支持扩展名：
  - `.pdf`
  - `.md`
  - `.markdown`
  - `.docx`
  - `.pptx`
  - `.xlsx`
  - `.html`
  - `.htm`
  - `.txt`
  - `.csv`
- 逻辑上会先 hash 去重，再复制到 `raw/`，再决定走短文档还是长 PDF 路径

### 长文档索引层

- `openkb/indexer.py`
- 默认通过 `PageIndex` 在本地做树状索引
- 如果设置 `PAGEINDEX_API_KEY`，还可以启用云端增强能力

### 知识编译层

- `openkb/agent/compiler.py`
- 主要产物逻辑：
  - 先生成 summary
  - 再规划 concept create/update/related
  - 然后重写或新增 concept 页面
  - 最后更新 cross-link 和 index

## 接入你网站 / 服务的可行性

## 最合理的接入方式

### A. 作为“输入资料 -> 知识资产”的后台编译层

- 不建议把 OpenKB 直接当你前台站点来展示。
- 更适合让它做后台：
  - ingest 论文 / 长文 / 报告 / 网页
  - 生成知识页与概念页
  - 再把结果抽到你的网站栏目里

### B. 很适合做你的个人IP实验栏目

- 可以包装成：
  - `Research-to-Content Engine`
  - `Student Knowledge Compiler`
  - `AI Reading to Idea Pipeline`
- 这些都比“又一个 RAG 工具”更适合你自己的叙事

### C. 与现有静态站低耦合集成

- 你不需要把整个 CLI 搬到前台。
- 更实际的接法是只发布它的输出物：
  - 主题知识卡片
  - 阅读摘要
  - 长文拆解
  - 概念关系图
  - 内容选题草稿

## 复杂度评估

- 产品复杂度：中
- 环境复杂度：中
- 二次改造复杂度：中
- 站点集成复杂度：低到中

原因：

- 它是 Python CLI，不是多服务 SaaS，整体比 `openpaper` 轻很多。
- `pyproject.toml` 显示最低 Python 要求是 `>=3.10`，而本机已有 `Python 3.13.3`。
- 主要依赖包含：
  - `pageindex==0.3.0.dev1`
  - `markitdown[all]`
  - `litellm`
  - `openai-agents`
  - `watchdog`
- 真正的部署压力更多来自：
  - LLM key
  - PageIndex 运行链路
  - Windows 下外部网络 / 包索引 / GitHub HTTPS

## 风险评估

### 1. 项目很新，版本还在早期

- PyPI 版本从 `2026-04-04` 到 `2026-04-13` 快速迭代到 `0.1.3`
- 这说明它活跃，但也说明接口、行为和文档都有继续变动的概率

### 2. CLI 强，前台展示弱

- 现在更像一个知识编译后端，而不是成熟的 web 产品
- 对你是利好也是限制：
  - 利好：易于抽方法和输出物
  - 限制：不适合直接当作可售卖 demo 页面

### 3. LLM 质量决定产物上限

- `summary` 和 `concept` 的质量高度依赖模型、提示词和资料质量
- 如果输入垃圾或模型不稳，知识页很容易变成“看起来结构化，实则空泛”

### 4. 当前真实 blocker 仍是环境链路

- GitHub HTTPS 还没通
- `pip` 被 `no-index=1` 禁掉了索引访问
- 这说明今晚不能把“跑不通”简单归因到 OpenKB 本身

## 本地试跑结果

## 已验证

- 本机运行时：
  - `git version 2.53.0.windows.2`
  - `node v24.14.0`
  - `Python 3.13.3`
  - `pip 25.0.1`
- `pip config list -v` 显示：
  - 全局索引是 `https://pypi.tuna.tsinghua.edu.cn/simple`
  - 但环境变量里还带着 `:env:.no-index='1'`

## 尝试 1：工作区内直接 clone

- 目标目录：
  - `tmp/github-lab/openkb-20260426`
- 结果：
  - 生成了残缺 `.git`
  - 报错：
    - `could not write config file ... Permission denied`
    - `fatal: could not set 'core.repositoryformatversion' to '0'`

## 尝试 2：分离 Git 元数据

- 目标：
  - worktree: `tmp/github-lab/openkb-20260426b`
  - git dir: `C:\Users\Administrator\.codex\automations\23-github\openkb-20260426b.git`
- 结果：
  - 已绕过本地 `.git/config` 写权限问题
  - 新阻塞：
    - `fatal: unable to access 'https://github.com/VectifyAI/OpenKB.git/': schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`

## 尝试 3：包级安装链路

- 命令：
  - `pip install --dry-run openkb`
- 结果：
  - shell 返回 `No matching distribution found for openkb`
  - 但网页侧已确认 PyPI 上存在 `openkb 0.1.3`
  - 因此本地失败原因不是包不存在，而是 `pip` 当前被 `no-index=1` 禁用了索引访问

## 结论

- 今晚完成了“筛选 + 结构阅读 + 本地链路验证”
- 但没有达到“源码成功落地并执行命令”的门槛
- 因此今晚仍不建议把它直接写入网站公开项目页，而是保留在方法实验观察名单

## 降级学习方案

如果明晚 GitHub / pip 链路仍未修通，建议不要继续重复撞同一层错误，直接按下面路径推进：

### 方案 1：继续网页级深读

- 重点读：
  - `README.md`
  - `pyproject.toml`
  - `openkb/cli.py`
  - `openkb/converter.py`
  - `openkb/indexer.py`
  - `openkb/agent/compiler.py`

### 方案 2：先做你自己的轻量映射实验

- 不急着跑完整 OpenKB
- 先在你站里实现一个“知识编译工作流”栏目：
  - 输入：论文 / 报告 / 网页
  - 中间产物：summary / concepts
  - 输出：文章卡片 / 主题地图 / 选题池

### 方案 3：优先修两类环境阻塞

- Git：
  - 继续用 `--separate-git-dir` 规避工作区 `.git/config` 权限问题
  - 单独处理 Windows `schannel` 凭证异常
- pip：
  - 清掉 `PIP_NO_INDEX` 或等价的 `no-index=1` 环境变量
  - 再复试 `pip install --dry-run openkb`

## 明日建议

### 优先级 1：先修 `pip no-index` 与 GitHub `schannel`

- 这两个问题修通后，OpenKB 是最值得复试的项目

### 优先级 2：若只能网页级研究，继续深读 OpenKB

- 它比继续追 `paperclip` 更贴近你“知识管理 + 内容生产”的核心主线

### 优先级 3：候补观察顺序

- `refly-ai/refly`：更偏创作者工作流平台
- `khoj-ai/khoj`：成熟通用 second brain
- `paperclipai/paperclip`：agent 编排层长期观察

## 参考来源

- OpenKB GitHub: <https://github.com/VectifyAI/OpenKB>
- OpenKB PyPI: <https://pypi.org/project/openkb/>
- OpenKB `pyproject.toml`: <https://raw.githubusercontent.com/VectifyAI/OpenKB/main/pyproject.toml>
- OpenKB `cli.py`: <https://raw.githubusercontent.com/VectifyAI/OpenKB/main/openkb/cli.py>
- OpenKB `converter.py`: <https://raw.githubusercontent.com/VectifyAI/OpenKB/main/openkb/converter.py>
- OpenKB `indexer.py`: <https://raw.githubusercontent.com/VectifyAI/OpenKB/main/openkb/indexer.py>
- OpenKB `compiler.py`: <https://raw.githubusercontent.com/VectifyAI/OpenKB/main/openkb/agent/compiler.py>
- Refly: <https://github.com/refly-ai/refly>
- Khoj: <https://github.com/khoj-ai/khoj>
- Paperclip: <https://github.com/paperclipai/paperclip>
