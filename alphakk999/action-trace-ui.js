const traceInput = dark => `w-full rounded-xl border p-3 text-sm outline-none focus:border-red-500 ${dark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`;

window.ActionEvidence = ({task, value = {}, onSave, isDarkMode}) => {
  const [outcome,setOutcome] = React.useState(value.outcome || '');
  const [minutes,setMinutes] = React.useState(value.minutes ?? '');
  React.useEffect(() => {setOutcome(value.outcome || ''); setMinutes(value.minutes ?? '');}, [value.outcome, value.minutes]);
  const dirty = outcome !== (value.outcome || '') || String(minutes) !== String(value.minutes ?? '');
  return <details className={`px-3 pb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
    <summary className="cursor-pointer text-[11px] font-bold py-2 break-words" aria-label={`留痕：${task.title}`}>
      {value.outcome ? `留痕 · ${value.outcome.slice(0, 72)}` : '＋ 留痕：今天实际推进了什么'}{value.minutes > 0 ? ` · ${value.minutes} 分钟` : ''}
    </summary>
    <form className="space-y-2 mt-1" onSubmit={e => {e.preventDefault(); onSave({outcome:outcome.trim(), minutes:minutes === '' ? null : Number(minutes)});}}>
      <label className="block text-xs font-bold">成果或卡点<textarea aria-label={`成果或卡点：${task.title}`} rows="2" maxLength="1200" className={`${traceInput(isDarkMode)} mt-2`} value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="改完了哪一段、联系了谁、留下了什么；没做完也可以记录。" /></label>
      <div className="flex flex-wrap items-end gap-2"><label className="text-xs font-bold flex-1 min-w-0">实际用时（可不填）<input aria-label={`实际分钟：${task.title}`} type="number" min="0" max="1440" step="1" className={`${traceInput(isDarkMode)} mt-2`} value={minutes} onChange={e => setMinutes(e.target.value)} /></label><button disabled={!dirty} className="px-4 py-3 rounded-xl bg-red-600 text-white text-xs font-black disabled:opacity-40" type="submit">保存留痕</button></div>
    </form>
  </details>;
};

window.ActionQuickCapture = ({isDarkMode, onSubmit, onClose}) => {
  const [title,setTitle]=React.useState('');
  const [projectId,setProjectId]=React.useState('gap-career');
  const [done,setDone]=React.useState(true);
  return <form className={`rounded-2xl border p-4 space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} onSubmit={e => {e.preventDefault();if(title.trim())onSubmit({title:title.trim(),projectId},done);}}>
    <p className="text-xs font-black text-red-500 uppercase tracking-widest">记录一项行动</p>
    <label className="block text-xs font-bold">所属主线<select aria-label="所属主线" className={`${traceInput(isDarkMode)} mt-2`} value={projectId} onChange={e => setProjectId(e.target.value)}>{AlphaLedger.fronts.map(f => <option key={f.id} value={f.projectId}>{f.label}</option>)}</select></label>
    <label className="block text-xs font-bold">做了什么 / 准备做什么<input autoFocus required maxLength="180" aria-label="行动内容" className={`${traceInput(isDarkMode)} mt-2`} value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：改好简历中的项目经历" /></label>
    <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={done} onChange={e=>setDone(e.target.checked)} />这件事已完成</label>
    <div className="flex gap-2"><button type="submit" className="bg-red-600 text-white font-black text-xs px-4 py-3 rounded-xl">保存行动</button><button type="button" onClick={onClose} className="text-xs font-bold px-4 py-3">取消</button></div>
  </form>;
};

window.ActionWeekReview = ({plan, custom, history, records, date, isDarkMode, onOpenCalendar}) => {
  const week = AlphaLedger.week({plan,custom,history,records,end:date});
  return <details className={`rounded-2xl p-4 ${isDarkMode ? 'card-dark text-slate-300' : 'card-light text-slate-700'}`}>
    <summary className="cursor-pointer text-xs font-black tracking-widest">三线战报 · 近 7 天 <span className="text-red-500">{week.rows.filter(r=>r.done && r.front!=='other').length} 次完成</span></summary>
    <p className="text-[11px] opacity-60 mt-3">用时仅累计手动记录；勾选和留痕分别统计，不把记录自动算作完成。</p>
    <div className="grid grid-cols-3 gap-2 my-4">{week.fronts.map(f=><div key={f.id} className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}><strong className="block text-[11px]" style={{color:f.color}}>{f.label}</strong><p className="font-black text-xl my-2">{f.completed}<span className="text-[10px] opacity-60 ml-1">完成</span></p><p className="text-[10px] opacity-60">{f.notes} 条留痕<br/>{f.minutes} 分钟</p></div>)}</div>
    {!week.rows.length && <p className="text-xs opacity-60">完成打卡或写下留痕后，这里会出现你的真实推进记录。</p>}
    <div className="space-y-3">{week.rows.slice(0,30).map(r=><article key={`${r.day}-${r.task.id}`} className={`border-t pt-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}><p className="text-[10px] opacity-60">{r.day} · {r.done ? '已完成' : '推进中'} · {AlphaLedger.fronts.find(f=>f.id===r.front)?.label || '其他 / 复盘'}</p><p className="text-xs font-bold mt-1">{r.task.title}</p>{r.note.outcome && <p className="text-xs mt-1 whitespace-pre-wrap break-words opacity-80">{r.note.outcome}</p>}</article>)}</div>
    <button type="button" onClick={onOpenCalendar} className="text-xs font-bold text-blue-500 pt-4">打开日历查看全部记录 →</button>
  </details>;
};
