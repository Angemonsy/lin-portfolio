// 全站兜底数据：用于 file:// 打开时 fetch 失败的场景
window.FALLBACK_DATA = {
  articles: [
    {
      id: "ai-6",
      title: "用AI的6个底层认知，我后悔没早点知道",
      description: "用AI的6个底层认知，我后悔没早点知道",
      date: "2026-04-07",
      category: "AI工具",
      tags: ["AI工具"],
      url: "articles/ai-6.html"
    },
    {
      id: "post-20260407-012808",
      title: "我最近越来越不敢只走保研这条路了",
      description: "我最近越来越不敢只走保研这条路了",
      date: "2026-04-07",
      category: "大学结果",
      tags: ["大学结果"],
      url: "articles/post-20260407-012808.html"
    },
    {
      id: "ai-ai",
      title: "AI火了两年，为啥大多数人还是没赚到钱？分享一个适用小白的AI商业破局之道",
      description: "AI火了两年，为啥大多数人还是没赚到钱？",
      date: "2026-04-07",
      category: "一人公司",
      tags: ["一人公司"],
      url: "articles/ai-ai.html"
    },
    {
      id: "rank1-cost",
      title: "双非rank1的真实代价：我的大学三年",
      description: "绩点、竞赛、论文背后不是鸡汤，而是时间预算与方法复利。",
      date: "2026-03-19",
      category: "大学结果",
      tags: ["大学结果"],
      url: "articles/rank1-cost.html"
    },
    {
      id: "ai-accelerator",
      title: "AI不会让你变强，但会让强的人更快",
      description: "同一工具为什么带来完全不同的结果？关键在问题定义和流程设计。",
      date: "2026-03-12",
      category: "AI工具",
      tags: ["AI工具"],
      url: "articles/ai-accelerator.html"
    },
    {
      id: "light-yourself",
      title: "把自己点亮，世界才会靠近：一段低谷后的重建",
      description: "如何在焦虑期保持输出并重建自我节奏。",
      date: "2026-02-20",
      category: "成长实验",
      tags: ["成长实验"],
      url: "articles/light-yourself.html"
    }
  ],
  knowledge: [
    {
      id: "university-results-library",
      icon: "🎓",
      title: "大学经验",
      description: "我在大学里反复验证过的方法——从课程学习到论文竞赛，从保研材料到路径规划，都整理在这里。不一定适合所有人，但至少是一个经过实战的参考。",
      page: "knowledge/university-results-library.html",
      directions: ["课程学习SOP", "论文写作模板", "竞赛资料与经验框架", "保研材料结构", "大学路径规划清单"],
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
          title: "竞赛项目如何从想法变成可展示结果",
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
      id: "ai-tools-library",
      icon: "🤖",
      title: "AI使用技巧",
      description: "我真实使用过的AI工具、部署方法和工作流。每一个都是我自己跑通过的，写清楚了怎么选、怎么用、用在哪。",
      page: "knowledge/ai-tools-library.html",
      directions: ["工具选型指南", "使用SOP", "Agent工具实践", "自动化工作流", "知识库搭建方法"],
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
      id: "solo-company-library",
      icon: "🧩",
      title: "商业通识",
      description: "一个普通人从零开始搭建轻量商业系统的全过程记录——网站怎么建、内容怎么做、私域怎么接、产品怎么卖。",
      page: "knowledge/solo-company-library.html",
      directions: ["网站搭建教程", "内容矩阵方法", "私域承接流程", "产品设计思路", "销售与成交SOP"],
      items: [
        {
          title: "AI 代充服务的用户沟通模板与风险边界",
          description: "标准话术、售后流程与常见问题应对。",
          url: "knowledge-items/monetize-ai-recharge-risk.html"
        },
        {
          title: "从 0 到 1 搭建内容服务报价与交付流程",
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
      id: "growth-lab-library",
      icon: "🏃",
      title: "日常生活感悟",
      description: "把个人成长当项目管理来做。这里是我在健身、表达、社交、自律这些事上的实验数据和阶段复盘。",
      page: "knowledge/growth-lab-library.html",
      directions: ["健身方案与记录", "表达训练方法", "社交复盘", "执行力系统", "长期实验框架"],
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
    },
    {
      id: "methods-and-checklists",
      icon: "🧠",
      title: "方法论与清单",
      description: "我反复使用的一些底层原则和执行框架。不是什么宏大理论，就是那些帮我在具体事情上少纠结、快决策、稳执行的东西。",
      page: "knowledge/methods-and-checklists.html",
      directions: ["结构化思维框架", "以终为始方法论", "第一性原理应用", "行动清单与checklist模板"],
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
    }
  ],
  portfolio: [
    {
      id: "campus-content-radar",
      platform: "产品方向",
      title: "大学生自媒体选题雷达",
      description: "按平台、身份和时间预算生成可拍选题、标题钩子、脚本骨架与7天发布排期，适合校园内容账号快速起号。",
      storyLine: "很多同学想做自媒体，但卡在“今天到底拍什么”。这个工具把定位、素材和执行拆成当天能完成的动作。",
      result: "把选题从灵感依赖变成结构化生成，并能把已选题保存为本地内容池。",
      cover: "",
      previewUrl: "portfolio-items/demos/campus-content-radar-source.html?mode=preview",
      url: "portfolio-items/campus-content-radar.html"
    },
    {
      id: "xiaohongshu-learning-system",
      platform: "小红书",
      title: "小红书卡片生成器（AI排版）",
      description: "输入内容后自动生成小红书尺寸卡片，支持多页排版与一键导图。",
      cover: "",
      previewUrl: "portfolio-items/demos/xiaohongshu-card-generator-source.html",
      url: "portfolio-items/xiaohongshu-learning-system.html"
    },
    {
      id: "gongzhonghao-ai-structure",
      platform: "公众号",
      title: "公众号长文自动排版模板",
      description: "把深度长文快速排成高可读版式，适配知识型内容发布与复用。",
      cover: "",
      previewUrl: "portfolio-items/demos/gongzhonghao-layout-source.html",
      url: "portfolio-items/gongzhonghao-ai-structure.html"
    },
    {
      id: "campus-offer-sprint-planner",
      platform: "产品方向",
      title: "应届生求职冲刺看板（AI版）",
      description: "输入目标岗位与时间预算，自动生成冲刺路线、面试训练题、STAR简历优化建议与投递追踪面板。",
      storyLine: "这个项目来自同学们最常见的痛点：知道要找实习和校招，但每天不知道该做哪一步。",
      result: "把“焦虑”拆成可执行动作，让准备过程可追踪、可复盘、可迭代。",
      cover: "",
      previewUrl: "portfolio-items/demos/campus-offer-sprint-planner-source.html?mode=preview",
      url: "portfolio-items/campus-offer-sprint-planner.html"
    },
    {
      id: "shipinhao-thesis-workflow",
      platform: "视频号",
      title: "AI工具实战：论文提纲 20 分钟重构",
      description: "白板讲解 + 录屏实操，演示课程论文从题目到结构的快速拆解流程。",
      devOnly: true,
      cover: "",
      url: "portfolio-items/shipinhao-thesis-workflow.html"
    },
    {
      id: "shipinhao-weekly-experiment",
      platform: "视频号",
      title: "系列栏目：AI+学业效率周更实验",
      description: "连续更新校园场景实操内容，沉淀可迁移的知识资产与案例库。",
      devOnly: true,
      cover: "",
      url: "portfolio-items/shipinhao-weekly-experiment.html"
    },
    {
      id: "tencent-ima-campus",
      platform: "合作项目",
      title: "腾讯 ima 校园知识库增长合作",
      description: "从知识组织到校园传播，搭建可持续增长的内容闭环。",
      devOnly: true,
      cover: "",
      url: "portfolio-items/tencent-ima-campus.html"
    },
    {
      id: "xushi-mcn-creator",
      platform: "合作项目",
      title: "虚实传媒 AI MCN：账号共创与商业化试验",
      description: "在选题、内容节奏、转化路径上持续迭代，验证校园场景商业模型。",
      devOnly: true,
      cover: "",
      url: "portfolio-items/xushi-mcn-creator.html"
    },
    {
      id: "ai-content-repurpose-studio",
      platform: "产品方向",
      title: "AI内容再利用工作流（1条内容拆成10条）",
      description: "把长文自动拆解为小红书、公众号、视频号多平台素材，做成可订阅服务。",
      devOnly: true,
      cover: "",
      url: "portfolio-items/ai-content-repurpose-studio.html"
    },
    {
      id: "student-ai-growth-engine",
      platform: "产品方向",
      title: "大学生AI成长诊断 + 7天执行陪跑",
      description: "面向大学生的轻咨询产品，聚焦执行落地与结果产出，适合快速商业化验证。",
      devOnly: true,
      cover: "",
      url: "portfolio-items/student-ai-growth-engine.html"
    },
    {
      id: "private-domain-conversion-funnel",
      platform: "产品方向",
      title: "私域咨询自动转化页（作品集 -> 微信 -> 成交）",
      description: "把作品集升级为承接页面，沉淀咨询线索并形成标准化成交漏斗。",
      devOnly: true,
      cover: "",
      url: "portfolio-items/private-domain-conversion-funnel.html"
    },
    {
      id: "autonomous-ai-lab",
      platform: "产品方向",
      title: "自主AI自主测试（自动化实验室）",
      description: "一个独立沙盒项目：由AI每日自动做站点健康检查与GitHub学习探索，只新增不改动原有项目。",
      storyLine: "为了保证主站稳定，我把所有自动化尝试收敛到一个隔离项目里，先跑通再迁移。",
      result: "你只负责内容更新；其余探索由AI自动执行并沉淀为可复用流程。",
      devOnly: true,
      cover: "",
      url: "portfolio-items/autonomous-ai-lab.html"
    }
  ],
  sitePages: {},
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


