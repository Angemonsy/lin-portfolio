// Shared interpretation of account records. No network or vault access.
globalThis.AlphaLedger = (() => {
  const fronts = [
    {id:'business', label:'商业', projectId:'gap-career', color:'#f59e0b'},
    {id:'academic', label:'毕业与学业', projectId:'gap-thesis', color:'#3b82f6'},
    {id:'life', label:'关系与生活', projectId:'gap-life', color:'#ef4444'}
  ];
  const front = task => fronts.find(p => p.projectId === task.projectId)?.id ||
    ({biz:'business', business:'business', academic:'academic', image:'life', social:'life', life:'life'})[task.line] || 'other';
  const evidence = (records, day, task) => records[day]?.[task.id] || {outcome:task.outcome || '', minutes:task.minutes ?? null};
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const tasksForDay = (plan, custom, day) => [...(globalThis.AlphaGap?.forDate(plan,day)||plan), ...(custom[day] || [])];
  const week = ({plan, custom, history, records, end}) => {
    const rows = [];
    const start = new Date(`${end}T12:00:00`);
    for (let offset=0;offset<7;offset++) {
      const d = new Date(start); d.setDate(d.getDate()-offset);
      const day = dateKey(d);
      for (const task of tasksForDay(plan, custom, day)) {
        const note = evidence(records, day, task);
        const done = !!history[day]?.[task.id];
        if (done || note.outcome || note.minutes > 0) rows.push({day, task, note, done, front:front(task)});
      }
    }
    return {rows, fronts:fronts.map(item => {
      const selected = rows.filter(r => r.front === item.id);
      return {...item, completed:selected.filter(r => r.done).length,
        notes:selected.filter(r => r.note.outcome).length,
        minutes:selected.reduce((sum,r) => sum+(Number(r.note.minutes)||0),0)};
    })};
  };
  return {fronts, front, evidence, dateKey, tasksForDay, week};
})();

// Gap plan migration is deliberately separate from check-in history and evidence.
globalThis.AlphaGap = (() => {
  const version = 'gap-2026-09-29';
  const projects = [
    {id:'gap-career',name:'求职简历与增量实习',type:'biz',status:'active',progress:0,note:'先完成求职版简历；探索跨境出海 / AI 自媒体实习。',link:''},
    {id:'gap-brand',name:'个人品牌网站',type:'saas',status:'active',progress:0,note:'完善 lin-portfolio 展示与作品证据，作为求职和个人品牌入口。',link:''},
    {id:'gap-content',name:'知识库梳理与小红书内容',type:'ip',status:'active',progress:0,note:'吃透自己的方法；整理轻量框架，推进笔记与口播，练习剪辑。',link:''},
    {id:'gap-thesis',name:'本科毕业论文',type:'other',status:'active',progress:0,note:'10–11 月导师沟通与选题；12 月开题；3–4 月初稿；5–6 月答辩。日期按学校通知调整。',link:''},
    {id:'gap-learning',name:'商业金融回炉与英语雅思',type:'other',status:'active',progress:0,note:'商业课程原子笔记、英语听读口语；雅思考试日期待确定。',link:''},
    {id:'gap-life',name:'运动、形象与真实社交',type:'other',status:'active',progress:0,note:'游泳与力量训练；摄影穿搭、朋友见面与生活自理，记录真实行动。',link:''}
  ];
  const countdowns = [
    {id:'gap-opening',title:'开题报告 · 个人计划',date:'2026-12-31',color:'#3b82f6',icon:'fa-file-alt'},
    {id:'gap-draft',title:'论文初稿 · 个人计划',date:'2027-04-30',color:'#f59e0b',icon:'fa-pen-alt'},
    {id:'gap-finish',title:'毕业 / Gap 阶段收官',date:'2027-06-30',color:'#10b981',icon:'fa-graduation-cap'}
  ];
  const timeline = [
    {id:'gap-admission',title:'已确认复旦数字经济拟录取',date:'2026-09-24',done:true,note:'按本人提供的进展记录；接下来确保本科顺利毕业。',icon:'fa-check'},
    {id:'gap-topic',title:'导师沟通、选题与文献摸底',date:'2026-11-30',done:false,note:'10–11 月个人计划；确认学校开题要求。',icon:'fa-book'},
    {id:'gap-opening',title:'提交毕业论文开题报告',date:'2026-12-31',done:false,note:'个人计划节点，正式截止以学校通知为准。',icon:'fa-file-alt'},
    {id:'gap-draft',title:'完成初稿与实证，送导师修改',date:'2027-04-30',done:false,note:'3–4 月个人计划。',icon:'fa-pen-alt'},
    {id:'gap-defense',title:'查重、评阅、答辩与毕业',date:'2027-06-30',done:false,note:'5–6 月阶段计划；具体答辩日待学校通知。',icon:'fa-graduation-cap'}
  ];
  const taskUpdates = {
    daily_review:['每日复盘','记录产出、卡点和明天第一步','10 分钟'],
    gym:['运动体能','游泳 / 力量训练','60 分钟'],
    approach:['真实社交','联系朋友 / 参加一次交流','灵活'],
    sales:['求职探索','简历打磨 / 实习岗位推进','30 分钟起'],
    short_video:['剪辑口播','拆解一个剪辑技巧 / 推进口播','30 分钟'],
    deep_input:['商业学习','商业金融课程 · 一张笔记','30 分钟'],
    study_push:['毕业论文','选题 / 文献 / 论文推进','30 分钟起'],
    biz_push:['内容与品牌','知识库 / 小红书 / 网站推进','30 分钟起'],
    dating_skill:['生活自理','做饭 / 整理 / 安排线下生活','灵活'],
    looksmax:['形象摄影','构图穿搭练习 / 整理展示照片','30 分钟'],
    expression:['英语雅思','听读 / 口语 · 一段练习','60 分钟']
  };
  const tasks = legacy => legacy.map(t => {
    const v=taskUpdates[t.id];
    return v ? {...t,legacyTask:{...t},category:v[0],title:v[1],time:v[2],...(t.id==='deep_input'?{line:'biz'}:{}),...(t.id==='expression'?{line:'academic'}:{})} : t;
  });
  const forDate = (plan,day) => day && day<'2026-09-29' ? plan.map(t=>t.legacyTask||t) : plan;
  const migrate = data => {
    if(data.gapPlanVersion===version)return data;
    const oldProjects=Array.isArray(data.projects)?data.projects:[];
    const oldCountdowns=Array.isArray(data.countdowns)?data.countdowns:[];
    const oldTimeline=Array.isArray(data.timelineNodes)?data.timelineNodes:[];
    const removedProjects=oldProjects.filter(p=>/奇[绩迹]怪谈|[攀潘]哥\s*AI/i.test(p.name||''));
    const removedCountdowns=oldCountdowns.filter(c=>/^(距离开学|六级考试)$/.test(c.title||'') && c.date<'2026-09-29');
    const oldTitles=['确定目标院校方向','准备个人陈述/简历','联系目标导师','提交预推免申请','参加院校夏令营/面试','获得预录取意向','正式推免系统填报','收到录取通知书 🎓'];
    const removedTimeline=oldTimeline.filter(n=>oldTitles.includes(n.title));
    const append=(old,removed,defaults)=>{const retained=old.filter(x=>!removed.includes(x));return [...retained,...defaults.filter(x=>!retained.some(y=>y.id===x.id))];};
    const replaceTarget=!data.targetTitle || (/^(距离开学|六级考试)$/.test(data.targetTitle)&&data.targetDate<'2026-09-29');
    return {...data,gapPlanVersion:version,
      gapPlanArchive:data.gapPlanArchive||{projects:removedProjects,countdowns:removedCountdowns,timelineNodes:removedTimeline,targetTitle:data.targetTitle,targetDate:data.targetDate},
      projects:append(oldProjects,removedProjects,projects),countdowns:append(oldCountdowns,removedCountdowns,countdowns),timelineNodes:append(oldTimeline,removedTimeline,timeline),
      ...(replaceTarget?{targetTitle:countdowns[0].title,targetDate:countdowns[0].date}:{})};
  };
  return {version,projects,countdowns,timeline,tasks,forDate,migrate};
})();
