const cloudWorkspaceHealth = {
  active: { label: '推进中', color: '#10b981', icon: 'fa-circle-check' },
  attention: { label: '需关注', color: '#f59e0b', icon: 'fa-triangle-exclamation' },
  blocked: { label: '有阻塞', color: '#ef4444', icon: 'fa-ban' },
  stale: { label: '已停滞', color: '#f97316', icon: 'fa-hourglass-half' },
  untracked: { label: '未建进度', color: '#8b5cf6', icon: 'fa-list-check' }
};

window.CloudKnowledgeWorkspace = ({ isOpen, onClose, isDarkMode, checkin }) => {
  const [tab, setTab] = React.useState('command');
  const [record, setRecord] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const fileInput = React.useRef(null);

  const loadSnapshot = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRecord(await window.alphaApiFetch('/api/a8-knowledge'));
    } catch (nextError) {
      setError(nextError.message || '云端经营快照读取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen && !record && !loading) loadSnapshot();
  }, [isOpen, record, loading, loadSnapshot]);

  const importSnapshot = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const payload = JSON.parse(await file.text());
      await window.alphaApiFetch('/api/a8-knowledge', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      await loadSnapshot();
      setTab('sync');
    } catch (nextError) {
      setError(nextError.message || '安全快照导入失败');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const cloudPackage = record?.snapshot || null;
  const knowledge = cloudPackage?.data?.knowledge || null;
  const operations = cloudPackage?.data?.operations || {};
  const totals = knowledge?.summary?.totals || {};
  const weekly = knowledge?.summary?.weeklySnapshot || {};
  const workstreams = knowledge?.workstreams || [];
  const projects = knowledge?.projects || [];
  const areas = knowledge?.areas || [];
  const automations = operations?.automations || [];
  const sources = operations?.sources || [];
  const activeAutomations = automations.filter(item => item.status === 'ACTIVE').length;

  const card = isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200';
  const panel = isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200';
  const text = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const tabs = [
    { id: 'command', label: '总指挥台', icon: 'fa-compass' },
    { id: 'projects', label: '长期项目', icon: 'fa-diagram-project' },
    { id: 'automations', label: '定时任务', icon: 'fa-clock' },
    { id: 'library', label: '知识库', icon: 'fa-folder-tree' },
    { id: 'sync', label: '同步状态', icon: 'fa-cloud-arrow-up' }
  ];
  const streamColor = { business: '#f59e0b', academic: '#3b82f6', image: '#10b981' };
  const formatDate = (value) => {
    if (!value) return '尚未同步';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '时间未知';
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const formatBytes = (value) => {
    const bytes = Number(value || 0);
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className={`fixed inset-0 lg:left-56 lg:right-56 z-[45] ${isDarkMode ? 'bg-[#020617]' : 'bg-slate-100'} overflow-hidden`}>
      <div className={`h-full border-x flex flex-col ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <header className={`shrink-0 px-4 md:px-6 py-4 border-b ${card}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black tracking-[0.28em] uppercase text-blue-500">Alpha × Knowledge OS</span>
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${cloudPackage ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {cloudPackage ? `CLOUD · ${knowledge?.sourceVersion || '0.9.0'}` : '等待首次同步'}
                </span>
              </div>
              <h2 className={`text-xl md:text-2xl font-black tracking-tight ${text}`}>一人公司经营工作台</h2>
              <p className={`text-[10px] mt-1 ${muted}`}>打卡负责行动，云端快照负责经营观察，完整知识库继续留在电脑</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadSnapshot} disabled={loading}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${panel} ${muted} disabled:opacity-40`} title="刷新云端快照">
                <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''}`} />
              </button>
              <button onClick={onClose}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${panel} ${text}`} title="返回打卡主页">
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
          <div className={`mt-4 p-1 rounded-2xl border grid grid-cols-5 gap-1 ${panel}`}>
            {tabs.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`rounded-xl py-2 px-1 text-[8px] md:text-[10px] font-black transition-all flex items-center justify-center gap-1 ${
                  tab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : muted
                }`}>
                <i className={`fas ${item.icon}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 pt-5 pb-32">
          {loading && !record && (
            <div className="h-72 flex flex-col items-center justify-center text-blue-500">
              <i className="fas fa-circle-notch fa-spin text-3xl mb-4" />
              <p className="text-xs font-black tracking-widest">正在读取私人经营快照</p>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-red-500">{error}</p>
              <button onClick={loadSnapshot} className="text-[10px] font-black text-red-500 shrink-0">重新连接</button>
            </div>
          )}

          {!loading && record && !cloudPackage && (
            <section className={`max-w-2xl mx-auto mt-10 rounded-3xl border p-6 md:p-8 text-center ${card}`}>
              <span className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-2xl">
                <i className="fas fa-cloud-arrow-up" />
              </span>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.28em] mt-5">Hybrid cloud ready</p>
              <h3 className={`text-2xl font-black mt-2 ${text}`}>线上工作台已接通，等待首次安全快照</h3>
              <p className={`text-xs leading-6 mt-3 ${muted}`}>这里不会读取完整 Markdown。请从本地 Alpha 导出脱敏云包，再在登录状态下导入。</p>
              <button onClick={() => fileInput.current?.click()} disabled={uploading}
                className="mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white text-xs font-black disabled:opacity-50">
                <i className={`fas ${uploading ? 'fa-circle-notch fa-spin' : 'fa-file-arrow-up'} mr-2`} />
                {uploading ? '正在校验并上传' : '导入安全快照 JSON'}
              </button>
              <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={importSnapshot} />
            </section>
          )}

          {cloudPackage && tab === 'command' && (
            <div className="space-y-5 fade-in-up">
              <section className="grid lg:grid-cols-[1.3fr_.7fr] gap-4">
                <article className={`rounded-3xl border p-5 ${card}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.28em]">Weekly Operating Snapshot</p>
                      <h3 className={`text-xl font-black mt-1 ${text}`}>本周经营快照</h3>
                    </div>
                    <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-full ${(weekly.weeklyDelta || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      较上周 {(weekly.weeklyDelta || 0) >= 0 ? '+' : ''}{weekly.weeklyDelta || 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mt-5">
                    {[
                      ['今日执行', `${checkin.completed}/${checkin.total}`, `${Math.round(checkin.progress)}% · 连续 ${checkin.streak} 天`, '#8b5cf6'],
                      ['本周知识推进', weekly.weeklyUpdates || 0, `上周 ${weekly.previousWeeklyUpdates || 0} 次`, '#3b82f6'],
                      ['项目健康', `${weekly.healthyProjects || 0}/${weekly.activeProjects || 0}`, `${weekly.attentionProjects || 0} 个需关注`, '#10b981'],
                      ['项目待办', weekly.openTasks || 0, `${activeAutomations} 项自动化在线`, '#f59e0b']
                    ].map(([label, value, sub, color]) => (
                      <div key={label} className={`rounded-2xl border p-3 ${panel}`}>
                        <span className={`block text-[8px] font-black uppercase ${muted}`}>{label}</span>
                        <strong className="block text-2xl font-black mt-2" style={{ color }}>{value}</strong>
                        <span className={`block text-[8px] mt-1 ${muted}`}>{sub}</span>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="rounded-3xl border p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-400">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/75">Cloud Knowledge Pulse</p>
                  <h3 className="text-lg font-black mt-3">知识库脉搏</h3>
                  <strong className="block text-4xl font-black mt-4">{totals.notes || 0}</strong>
                  <p className="text-[10px] text-white/80 mt-1">篇 Markdown 在本地权威库</p>
                  <div className="grid grid-cols-2 gap-2 mt-5 text-[9px]">
                    <span className="rounded-xl bg-white/15 p-2">今日更新 {totals.updatedToday || 0}</span>
                    <span className="rounded-xl bg-white/15 p-2">近七天 {totals.updatedSevenDays || 0}</span>
                  </div>
                </article>
              </section>

              <section>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.25em]">Three Operating Lines</p>
                <h3 className={`text-lg font-black mb-3 ${text}`}>商业、学业、形象三条经营主线</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  {workstreams.map(stream => {
                    const color = streamColor[stream.id] || '#3b82f6';
                    return (
                      <article key={stream.id} className={`rounded-2xl border p-4 ${card}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black" style={{ color }}>{stream.code || stream.name}</span>
                          <span className={`text-[8px] ${muted}`}>本周 {stream.updatedSevenDays || 0} 次</span>
                        </div>
                        <h4 className={`text-base font-black mt-2 ${text}`}>{stream.name}</h4>
                        <div className={`h-2 rounded-full mt-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <div className="h-full rounded-full" style={{ width: `${stream.progress || 0}%`, background: color }} />
                        </div>
                        <p className={`text-[9px] mt-2 ${muted}`}>{stream.progress === null ? '尚未建立任务进度' : `${stream.progress}% · ${stream.tasksOpen || 0} 待办`}</p>
                        <p className={`text-[9px] leading-5 mt-3 ${text}`}><span className="font-black" style={{ color }}>下一步：</span>{stream.nextAction || '尚未维护'}</p>
                      </article>
                    );
                  })}
                </div>
              </section>

              {!!knowledge.alerts?.length && (
                <section className={`rounded-2xl border p-4 ${card}`}>
                  <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.25em]">Management Alerts</p>
                  <h3 className={`text-lg font-black mb-3 ${text}`}>阻塞与预警</h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    {knowledge.alerts.map((alert, index) => (
                      <div key={`${alert.title}-${index}`} className={`rounded-xl border p-3 ${panel}`}>
                        <p className="text-[10px] font-black text-red-500">{alert.title}</p>
                        <p className={`text-[9px] leading-5 mt-1 ${muted}`}>{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {cloudPackage && tab === 'projects' && (
            <div className="space-y-5 fade-in-up">
              <section>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.25em]">Project Portfolio</p>
                <h3 className={`text-lg font-black mb-3 ${text}`}>当前项目组合</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {projects.map(project => {
                    const health = cloudWorkspaceHealth[project.health] || cloudWorkspaceHealth.attention;
                    return (
                      <article key={project.id || project.name} className={`rounded-2xl border p-4 ${card}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[8px] font-black px-2 py-1 rounded-full" style={{ color: health.color, background: `${health.color}18` }}>{health.label}</span>
                          <span className={`text-[8px] ${muted}`}>{project.ageDays === null ? '无更新时间' : `${project.ageDays} 天前更新`}</span>
                        </div>
                        <h4 className={`font-black text-sm mt-3 ${text}`}>{project.name}</h4>
                        <p className={`text-[9px] leading-5 mt-2 ${muted}`}>{project.goal || '尚未维护项目目标'}</p>
                        <div className={`h-1.5 rounded-full mt-3 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <div className="h-full rounded-full" style={{ width: `${project.progress || 0}%`, background: health.color }} />
                        </div>
                        <p className={`text-[9px] leading-5 mt-3 ${text}`}><span className="font-black text-blue-500">下一步：</span>{project.nextAction || '尚未定义'}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
              <section>
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.25em]">Long-term Areas</p>
                <h3 className={`text-lg font-black mb-3 ${text}`}>六个长期经营领域</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {areas.map(area => (
                    <article key={`${area.code}-${area.name}`} className={`rounded-2xl border p-4 ${card}`}>
                      <span className="text-[9px] font-black text-blue-500">{area.code}</span>
                      <h4 className={`font-black text-xs mt-1 ${text}`}>{area.name}</h4>
                      <p className={`text-[8px] mt-2 ${muted}`}>{area.noteCount} 篇笔记 · {formatDate(area.latestAt)}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {cloudPackage && tab === 'automations' && (
            <div className="space-y-4 fade-in-up">
              <section className="grid grid-cols-3 gap-3">
                {sources.map(source => (
                  <article key={source.id} className={`rounded-2xl border p-4 ${card}`}>
                    <span className={`w-2 h-2 rounded-full inline-block ${source.connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <h4 className={`text-[10px] font-black mt-3 ${text}`}>{source.name}</h4>
                    <strong className={`block text-2xl font-black mt-1 ${text}`}>{source.count}</strong>
                  </article>
                ))}
              </section>
              <section className={`rounded-2xl border p-4 ${card}`}>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.25em]">Automation Observatory</p>
                <h3 className={`text-lg font-black mb-4 ${text}`}>统一定时任务观察台</h3>
                <div className="space-y-2">
                  {automations.map(item => (
                    <article key={`${item.source}-${item.id}`} className={`rounded-xl border p-3 grid md:grid-cols-[1fr_120px_140px] gap-2 ${panel}`}>
                      <div>
                        <span className={`text-[8px] font-black ${item.status === 'ACTIVE' ? 'text-emerald-500' : muted}`}>{item.source} · {item.status}</span>
                        <h4 className={`text-[11px] font-black mt-1 ${text}`}>{item.name}</h4>
                      </div>
                      <p className={`text-[9px] ${muted}`}>{item.schedule || '暂无计划'}</p>
                      <p className={`text-[9px] ${muted}`}>{formatDate(item.nextRunAt)}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {cloudPackage && tab === 'library' && (
            <div className="space-y-4 fade-in-up">
              <section className={`rounded-3xl border p-6 ${card}`}>
                <div className="flex items-start gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0"><i className="fas fa-laptop-file" /></span>
                  <div>
                    <p className="text-[9px] font-black text-violet-500 uppercase tracking-[0.25em]">Local authority</p>
                    <h3 className={`text-xl font-black mt-1 ${text}`}>完整目录和 Markdown 仍在本地工作台</h3>
                    <p className={`text-[10px] leading-6 mt-2 ${muted}`}>云端只显示经营摘要，不保存正文、路径、附件、双链和搜索索引。需要逐层浏览目录、预览带格式笔记或查看反链时，请打开电脑上的 `127.0.0.1:5174`。</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-5">
                  {[['本地文件', totals.files || 0], ['Markdown', totals.notes || 0], ['本地文件夹', totals.folders || 0]].map(([label, value]) => (
                    <div key={label} className={`rounded-xl border p-3 ${panel}`}>
                      <p className={`text-[8px] ${muted}`}>{label}</p>
                      <strong className={`block text-xl font-black mt-1 ${text}`}>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section className={`rounded-2xl border p-4 ${card}`}>
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.25em]">Recent activity</p>
                <div className="grid md:grid-cols-2 gap-2 mt-3">
                  {(knowledge.recentActivity || []).map((item, index) => (
                    <div key={`${item.title}-${index}`} className={`rounded-xl border p-3 ${panel}`}>
                      <h4 className={`text-[10px] font-black ${text}`}>{item.title}</h4>
                      <p className={`text-[8px] mt-1 ${muted}`}>{item.sectionId} · {formatDate(item.modifiedAt)}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {cloudPackage && tab === 'sync' && (
            <div className="space-y-4 fade-in-up">
              <section className={`rounded-3xl border p-5 ${card}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.25em]">Private dashboard snapshot</p>
                    <h3 className={`text-xl font-black mt-1 ${text}`}>云端安全快照已连接</h3>
                    <p className={`text-[10px] mt-2 ${muted}`}>生成于 {formatDate(cloudPackage.meta.generatedAt)} · 接收于 {formatDate(record.receivedAt)}</p>
                  </div>
                  <button onClick={() => fileInput.current?.click()} disabled={uploading}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black disabled:opacity-50">
                    <i className={`fas ${uploading ? 'fa-circle-notch fa-spin' : 'fa-file-arrow-up'} mr-2`} />更新快照
                  </button>
                  <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={importSnapshot} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
                  {[
                    ['源文件', cloudPackage.meta.sourceFiles],
                    ['Markdown', cloudPackage.meta.sourceNotes],
                    ['数据包体积', formatBytes(cloudPackage.meta.byteSize)],
                    ['摘要', String(cloudPackage.meta.digestSha256 || '').slice(0, 12)]
                  ].map(([label, value]) => (
                    <div key={label} className={`rounded-xl border p-3 ${panel}`}>
                      <p className={`text-[8px] ${muted}`}>{label}</p>
                      <p className={`text-sm font-black mt-1 ${text}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="grid md:grid-cols-2 gap-3">
                <article className={`rounded-2xl border p-4 ${card}`}>
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.22em]">Cloud includes</p>
                  <h4 className={`text-base font-black mt-1 ${text}`}>云端保存</h4>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {[['项目健康度', `${projects.length} 个`], ['经营主线', `${workstreams.length} 条`], ['定时任务状态', `${automations.length} 项`], ['最近活动标题', `${knowledge.recentActivity?.length || 0} 条`]].map(([label, value]) => (
                      <div key={label} className={`rounded-xl border p-3 ${panel}`}><p className={`text-[9px] font-black ${text}`}>{label}</p><p className={`text-[8px] mt-1 ${muted}`}>{value}</p></div>
                    ))}
                  </div>
                </article>
                <article className={`rounded-2xl border p-4 ${card}`}>
                  <p className="text-[9px] font-black text-violet-500 uppercase tracking-[0.22em]">Local only</p>
                  <h4 className={`text-base font-black mt-1 ${text}`}>永远留在电脑</h4>
                  <div className="space-y-2 mt-4">
                    {(knowledge.privacy?.excluded || []).map(item => (
                      <div key={item} className={`rounded-xl border px-3 py-2.5 flex items-center gap-2 ${panel}`}><i className="fas fa-lock text-violet-500 text-[9px]" /><span className={`text-[9px] font-bold ${text}`}>{item}</span></div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
