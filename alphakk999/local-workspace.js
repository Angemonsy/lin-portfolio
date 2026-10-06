/* Reachability only: never read the response, send account tokens, or access files. */
(() => {
    const ORIGIN = 'http://127.0.0.1:5174';
    const URL = `${ORIGIN}/?v=19.1&view=workbench`;
    const TIMEOUT = 1500;
    const isPortable = (nav = navigator) => Boolean(nav.userAgentData?.mobile ||
        /Android|iPhone|iPad|iPod/i.test(nav.userAgent || '') ||
        (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1));

    async function probe(signal) {
        const controller = new AbortController();
        const cancel = () => controller.abort();
        let timer;
        signal?.addEventListener('abort', cancel, {once:true});
        try {
            if (signal?.aborted) return false;
            const timeout = new Promise(resolve => {
                timer = setTimeout(() => { controller.abort(); resolve(false); }, TIMEOUT);
            });
            const request = fetch(`${ORIGIN}/`, {
                method:'HEAD', mode:'no-cors', credentials:'omit', cache:'no-store',
                referrerPolicy:'no-referrer', signal:controller.signal
            }).then(response => !controller.signal.aborted && (response.type === 'opaque' || response.ok));
            return await Promise.race([request, timeout]);
        } catch {
            // A blocked local-network request and an offline service are indistinguishable here.
            return false;
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancel);
        }
    }

    window.AlphaLocalWorkspace = {ORIGIN, URL, TIMEOUT, isPortable, probe};
    window.LocalWorkspaceEntry = ({isDarkMode = false}) => {
        const h = React.createElement;
        const [portable] = React.useState(() => isPortable());
        const [status, setStatus] = React.useState(portable ? 'portable' : 'checking');
        const [help, setHelp] = React.useState(false);
        const active = React.useRef(null);
        const lastCheck = React.useRef(0);
        const mounted = React.useRef(false);
        const check = React.useCallback(async () => {
            if (portable) return;
            active.current?.abort();
            const controller = new AbortController();
            active.current = controller;
            lastCheck.current = Date.now();
            setStatus('checking');
            const online = await probe(controller.signal);
            if (mounted.current && !controller.signal.aborted) setStatus(online ? 'online' : 'unavailable');
        }, [portable]);
        React.useEffect(() => {
            mounted.current = true;
            if (!portable) check();
            const recheck = () => {
                if (document.visibilityState === 'visible' && Date.now() - lastCheck.current > 30000) check();
            };
            if (!portable) {
                window.addEventListener('focus', recheck);
                document.addEventListener('visibilitychange', recheck);
            }
            return () => {
                mounted.current = false;
                active.current?.abort();
                window.removeEventListener('focus', recheck);
                document.removeEventListener('visibilitychange', recheck);
            };
        }, [check, portable]);

        const online = status === 'online';
        const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
        const entryClass = `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border ${online
            ? (isDarkMode ? 'text-emerald-300 border-emerald-700 bg-emerald-950/60' : 'text-emerald-700 border-emerald-200 bg-emerald-50')
            : (isDarkMode ? 'text-slate-400 border-slate-700 bg-slate-900' : 'text-slate-500 border-slate-200 bg-slate-50')}`;
        return h('section', {className:'mb-5', 'aria-label':'本地工作台连接'},
            h('div', {className:'flex flex-wrap items-center gap-2'},
                online
                    ? h('a', {className:entryClass, href:URL, target:'_blank', rel:'noopener noreferrer'},
                        h('span', {className:'w-2 h-2 rounded-full bg-emerald-500', 'aria-hidden':true}), '进入本地知识库工作台 ↗')
                    : h('button', {type:'button', className:entryClass, onClick:() => setHelp(v => !v),
                        'aria-expanded':help, 'aria-controls':'local-workspace-help'},
                        h('span', {className:'w-2 h-2 rounded-full bg-slate-400', 'aria-hidden':true}),
                        status === 'checking' ? '正在检测本地工作台…' : '云端便携模式'),
                !portable && h('button', {type:'button', disabled:status === 'checking', onClick:check,
                    className:`px-2 py-2 text-xs ${muted} disabled:opacity-40`}, '重新检测'),
                h('span', {role:'status', className:`text-xs ${muted}`}, online ? '🖥️ 本机环境（本地服务在线）' : ''),
                online && h('button', {type:'button', className:`px-2 py-2 text-xs ${muted}`,
                    onClick:() => setHelp(v => !v), 'aria-expanded':help, 'aria-controls':'local-workspace-help'}, '如何接续数据')
            ),
            help && h('div', {id:'local-workspace-help', className:`mt-2 text-xs leading-6 ${muted}`},
                h('p', null, online
                    ? '云端打卡显示“已保存”后，进入本地工作台，点击“从云端接续 → 读取并合并最新记录”。首次需登录云端账户；本地修改暂不回传。'
                    : '本地服务未启动或当前处于外网设备，完整知识库请在 Mac 本机使用。浏览器限制也可能导致无法确认本地状态，云端打卡不受影响。'),
                !online && !portable && h('a', {href:URL, target:'_blank', rel:'noopener noreferrer', className:'underline'}, '我在 Mac 本机，尝试直接打开 ↗')
            )
        );
    };
})();
