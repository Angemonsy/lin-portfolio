// 全站兜底数据：用于 file:// 打开时 fetch 失败的场景
window.FALLBACK_DATA = {
  articles: [
    {
      id: "from-economics-to-ai",
      title: "从象牙塔到AI圈：我为什么做了这个选择",
      description: "讲述我从传统经济学训练切换到 AI 应用实践的真实路径，以及背后的关键决策。",
      date: "2026-03-26",
      category: "成长思考",
      tags: ["成长思考", "经济学×AI"],
      url: "articles/from-economics-to-ai.html"
    },
    {
      id: "rank1-cost",
      title: "双非rank1的真实代价：我的大学三年",
      description: "绩点、竞赛、论文背后不是鸡汤，而是时间预算与方法复利。",
      date: "2026-03-19",
      category: "大学攻略",
      tags: ["大学攻略"],
      url: "articles/rank1-cost.html"
    },
    {
      id: "ai-accelerator",
      title: "AI不会让你变强，但会让强的人更快",
      description: "同一工具为什么带来完全不同的结果？关键在问题定义和流程设计。",
      date: "2026-03-12",
      category: "AI观点",
      tags: ["AI观点"],
      url: "articles/ai-accelerator.html"
    },
    {
      id: "econ-framework-for-ai",
      title: "用经济学框架理解AI产品：从稀缺到注意力博弈",
      description: "把机会成本、边际收益与信息不对称映射到 AI 产品决策中。",
      date: "2026-03-07",
      category: "经济学×AI",
      tags: ["经济学×AI"],
      url: "articles/econ-framework-for-ai.html"
    },
    {
      id: "first-cashflow",
      title: "我如何把AI技能变成第一个稳定现金流",
      description: "从内容服务到咨询交付，拆解第一轮稳定变现路径。",
      date: "2026-02-28",
      category: "副业变现",
      tags: ["副业变现"],
      url: "articles/first-cashflow.html"
    },
    {
      id: "light-yourself",
      title: "把自己点亮，世界才会靠近：一段低谷后的重建",
      description: "如何在焦虑期保持输出并重建自我节奏。",
      date: "2026-02-20",
      category: "成长思考",
      tags: ["成长思考"],
      url: "articles/light-yourself.html"
    }
  ],
  knowledge: [
    {
      id: "university",
      icon: "📚",
      title: "大学攻略",
      description: "绩点、保研、竞赛、论文的实操框架。",
      page: "knowledge/university.html",
      items: [
        {
          title: "从 GPA 3.0 到 3.98 的课程拆解与复盘模板",
          description: "按学期拆解核心课程提分策略，附带我实际使用的复盘表格模板。",
          url: "knowledge-items/university-gpa-review.html"
        },
        {
          title: "双非学生保研材料准备清单（时间线版）",
          description: "从大二下到大三上的关键节点与材料准备，按月份排列。",
          url: "knowledge-items/university-research-track.html"
        },
        {
          title: "竞赛项目如何从\"想法\"变成\"可展示结果\"",
          description: "选题筛选、团队协作、答辩准备的全流程拆解。",
          url: "knowledge-items/university-competition-result.html"
        },
        {
          title: "论文写作 SOP：选题、文献、结构、答辩",
          description: "从空白到终稿的标准化流程，适配课程论文和学术论文。",
          url: "knowledge-items/university-paper-sop.html"
        }
      ]
    },
    {
      id: "ai-tools",
      icon: "🤖",
      title: "AI工具指南",
      description: "产品评测、使用 SOP 与效率工作流。",
      page: "knowledge/ai-tools.html",
      items: [
        {
          title: "ChatGPT / Claude / NotebookLM 场景对照表",
          description: "不同任务场景下该用哪个工具，实测对比和推荐理由。",
          url: "knowledge-items/ai-tools-comparison.html"
        },
        {
          title: "一份论文任务如何串起 4 个 AI 工具协作",
          description: "从选题到润色，4个工具各司其职的真实工作流。",
          url: "knowledge-items/ai-tools-paper-workflow.html"
        },
        {
          title: "Prompt 模板库：学习、写作、汇报、竞赛",
          description: "按场景分类的提示词合集，拿来即用。",
          url: "knowledge-items/ai-tools-prompt-library.html"
        },
        {
          title: "AI 输出质量检查表：准确性、结构、可执行性",
          description: "AI给你的结果好不好用？用这张表三分钟判断。",
          url: "knowledge-items/ai-tools-quality-checklist.html"
        }
      ]
    },
    {
      id: "monetize",
      icon: "💰",
      title: "副业变现",
      description: "自媒体、AI代充、IP运营实战记录。",
      page: "knowledge/monetize.html",
      items: [
        {
          title: "AI 代充服务的用户沟通模板与风险边界",
          description: "标准话术、售后流程与常见问题应对。",
          url: "knowledge-items/monetize-ai-recharge-risk.html"
        },
        {
          title: "从 0 到 1 搭建\"内容服务\"报价与交付流程",
          description: "定价逻辑、交付标准、用户预期管理的完整SOP。",
          url: "knowledge-items/monetize-content-service.html"
        },
        {
          title: "多平台账号矩阵如何分工",
          description: "视频号、小红书、公众号各自的内容定位和协同方式。",
          url: "knowledge-items/monetize-platform-matrix.html"
        },
        {
          title: "适合大学生的轻量级副业路径图",
          description: "低成本、低风险、可验证的副业起步策略。",
          url: "knowledge-items/monetize-student-map.html"
        }
      ]
    },
    {
      id: "digital-economy",
      icon: "📊",
      title: "数字经济笔记",
      description: "跨考学习笔记与论文阅读沉淀。",
      page: "knowledge/digital-economy.html",
      items: [
        {
          title: "经济学框架如何迁移到 AI 产品分析",
          description: "用机会成本、边际收益等概念重新看AI生态。",
          url: "knowledge-items/digital-economy-framework-migration.html"
        },
        {
          title: "数字经济热点论文周读",
          description: "每周一篇论文精读，提取概念、方法和结论。",
          url: "knowledge-items/digital-economy-weekly-paper.html"
        },
        {
          title: "从传统国贸到 AI 应用：知识迁移地图",
          description: "哪些经济学训练可以直接复用到AI领域。",
          url: "knowledge-items/digital-economy-knowledge-map.html"
        },
        {
          title: "研究选题池：校园场景下的 AI 需求观察",
          description: "身边可做的研究课题收集与初步分析框架。",
          url: "knowledge-items/digital-economy-topic-pool.html"
        }
      ]
    },
    {
      id: "alpha",
      icon: "🏋️",
      title: "Alpha支线",
      description: "健身、社交、自我突破的长期实验。",
      page: "knowledge/alpha.html",
      items: [
        {
          title: "100 天健身挑战记录",
          description: "进度、饮食、训练结构的全程记录。",
          url: "knowledge-items/alpha-fitness-100.html"
        },
        {
          title: "100 次搭讪计划复盘",
          description: "社恐向外连接的方法和心理状态变化。",
          url: "knowledge-items/alpha-social-100.html"
        },
        {
          title: "100 条短视频执行台账",
          description: "选题、脚本、数据复盘的完整记录。",
          url: "knowledge-items/alpha-video-100.html"
        },
        {
          title: "情绪管理手册",
          description: "焦虑期如何保持稳定输出的实操方法。",
          url: "knowledge-items/alpha-emotion-manual.html"
        },
        {
          title: "每周自我审计模板",
          description: "目标、偏差、下一步的结构化复盘框架。",
          url: "knowledge-items/alpha-weekly-audit.html"
        }
      ]
    }
  ],
  portfolio: [
    {
      id: "shipinhao-thesis-workflow",
      platform: "视频号",
      title: "AI工具实战：论文提纲 20 分钟重构",
      description: "白板讲解 + 录屏实操，演示课程论文从题目到结构的快速拆解流程。",
      cover: "",
      url: "portfolio-items/shipinhao-thesis-workflow.html"
    },
    {
      id: "xiaohongshu-learning-system",
      platform: "小红书",
      title: "爆款笔记：双非大学生如何搭建AI学习体系",
      description: "把工具清单升级成场景清单，展示普通人可复制的执行框架。",
      cover: "",
      url: "portfolio-items/xiaohongshu-learning-system.html"
    },
    {
      id: "gongzhonghao-ai-structure",
      platform: "公众号",
      title: "深度长文：AI不会替代你，但会放大你的策略",
      description: "用能力、流程、杠杆三层框架解释 AI 应用的长期价值。",
      cover: "",
      url: "portfolio-items/gongzhonghao-ai-structure.html"
    },
    {
      id: "tencent-ima-campus",
      platform: "合作项目",
      title: "腾讯 ima 校园知识库增长合作",
      description: "从知识组织到校园传播，搭建可持续增长的内容闭环。",
      cover: "",
      url: "portfolio-items/tencent-ima-campus.html"
    },
    {
      id: "xushi-mcn-creator",
      platform: "合作项目",
      title: "虚实传媒 AI MCN：账号共创与商业化试验",
      description: "在选题、内容节奏、转化路径上持续迭代，验证校园场景商业模型。",
      cover: "",
      url: "portfolio-items/xushi-mcn-creator.html"
    },
    {
      id: "shipinhao-weekly-experiment",
      platform: "视频号",
      title: "系列栏目：AI+学业效率周更实验",
      description: "连续更新校园场景实操内容，沉淀可迁移的知识资产与案例库。",
      cover: "",
      url: "portfolio-items/shipinhao-weekly-experiment.html"
    }
  ],
  qrMap: {
    wechat: {
      name: "微信：Alphakk999",
      // 开发期优先读取 photo 目录，方便你本地替换后立即生效
      liveImagePath: "photo/微信联系方式二维码.PNG",
      imagePath: "assets/qr-wechat.png",
      hint: "打开微信扫一扫，添加我为好友",
      placeholder: "微信二维码占位"
    },
    shipinhao: {
      name: "视频号：奇绩怪谈AIQ",
      liveImagePath: "photo/视频号二维码.png",
      imagePath: "assets/qr-shipinhao.png",
      hint: "打开微信扫一扫，关注我的视频号",
      placeholder: "视频号二维码占位"
    },
    xiaohongshu: {
      name: "小红书：奇绩怪谈AIQ",
      liveImagePath: "photo/小红书二维码.png",
      imagePath: "assets/qr-xiaohongshu.png",
      hint: "打开小红书扫码或微信扫一扫查看账号",
      placeholder: "小红书二维码占位"
    },
    gongzhonghao: {
      name: "公众号：奇绩怪谈AIQ",
      liveImagePath: "photo/公众号二维码.png",
      imagePath: "assets/qr-gongzhonghao.png",
      hint: "打开微信扫一扫，关注我的公众号",
      placeholder: "公众号二维码占位"
    },
    douyin: {
      name: "抖音：奇绩怪谈AIQ",
      liveImagePath: "photo/抖音二维码.png",
      imagePath: "assets/qr-douyin.png",
      hint: "打开抖音扫一扫，关注我的账号",
      placeholder: "抖音二维码占位"
    }
  }
};

