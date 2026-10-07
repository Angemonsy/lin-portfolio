/* Measure one complete copy; image count changes the loop time, never its speed. */
(() => {
    const SPEED = 45; // CSS pixels per second, about 7 seconds per desktop photo.
    function attach(track, count) {
        if (!track) return () => {};
        const measure = () => {
            const first = track.children[0];
            const repeat = track.children[count];
            const distance = first && repeat ? repeat.offsetTop - first.offsetTop : 0;
            if (distance <= 0) return;
            track.style.setProperty('--sidebar-loop-distance', `${distance}px`);
            track.style.animationDuration = `${distance / SPEED}s`;
        };
        const observer = new ResizeObserver(measure);
        observer.observe(track);
        if (track.children[0]) observer.observe(track.children[0]);
        measure();
        return () => observer.disconnect();
    }
    window.AlphaSidebarScroll = {attach, speed: SPEED};
})();

/* Local folder -> this browser's IndexedDB. No account or cloud API calls. */
(() => {
    const CHANNEL = 'alpha-local-images/v1';
    const ORIGIN = 'http://127.0.0.1:5175';
    const META = 'local_image_sync_v1';
    const BACKUP = 'local_image_sync_original_v1';
    const REPLACE_BACKUP = 'local_image_sync_before_replace_v1';
    const HASH = /^[a-f0-9]{64}$/;
    const DATA = /^data:image\/(?:jpeg|png|gif|webp|bmp|avif);base64,[A-Za-z0-9+/=]+$/;
    const MAX_TOTAL = 120 * 1024 * 1024;
    const req = request => new Promise((resolve,reject) => {request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    function database() {
        return new Promise((resolve,reject) => {
            const request = indexedDB.open('AlphaDashboardDB_V8',1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains('images_store')) request.result.createObjectStore('images_store');
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    function validateManifest(manifest) {
        if (!manifest || !HASH.test(manifest.revision) || !manifest.sides) throw new Error('图片清单无效');
        let total = 0, count = 0;
        for (const side of ['left','right']) {
            const list = manifest.sides[side];
            if (!Array.isArray(list)) throw new Error('图片清单无效');
            const keys = new Set();
            for (const item of list) {
                if (!HASH.test(item.key) || !HASH.test(item.id) || keys.has(item.key) || !Number.isSafeInteger(item.size) || item.size <= 0 || item.size > 20*1024*1024 || !/^image\/(jpeg|png|gif|webp|bmp|avif)$/.test(item.mime)) throw new Error('图片清单无效');
                keys.add(item.key); total += item.size; count++;
            }
        }
        if (total > MAX_TOTAL || count > 1000) throw new Error('图片太多，请缩小目录');
        return manifest;
    }
    // Keep unmanaged uploads and removed files; replace managed files with the same name.
    function mergeSide(current, previous, incoming) {
        const old = Array.isArray(previous) ? previous : [];
        const byKey = new Map(old.map(item => [item.key,item]));
        for (const item of incoming) byKey.set(item.key,item);
        const managed = [...byKey.values()];
        const replaced = new Set(old.map(item=>item.data));
        const images = [...new Set([...(Array.isArray(current)?current:[]).filter(url=>!replaced.has(url)), ...managed.map(item=>item.data)])];
        return {images, managed};
    }
    async function saveBatch(db, manifest, downloaded, signal, replace=false) {
        signal?.throwIfAborted();
        const tx = db.transaction('images_store','readwrite');
        const done = new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('图片保存取消'));});
        const cancel = () => {try {tx.abort();} catch {}};
        signal?.addEventListener('abort',cancel,{once:true});
        const store = tx.objectStore('images_store');
        try {
            const [left,right,meta,backup] = await Promise.all(['left_images','right_images',META,BACKUP].map(key=>req(store.get(key))));
            signal?.throwIfAborted();
            const nextMeta = {...meta};
            const result = {};
            for (const side of ['left','right']) {
                const existing = meta?.[side] || [];
                const incoming = manifest.sides[side].map(item => {
                    const data = downloaded.get(side+'/'+item.id) || existing.find(old=>old.id===item.id)?.data;
                    if (!data || !DATA.test(data)) throw new Error('图片接收不完整');
                    return {...item,data};
                });
                const merged = replace ? {images:[...new Set(incoming.map(i=>i.data))],managed:incoming} : mergeSide(side==='left'?left:right,existing,incoming);
                nextMeta[side] = merged.managed;
                result[side] = merged.images;
            }
            if (!backup) store.put({left:left||[],right:right||[],savedAt:new Date().toISOString()},BACKUP);
            if (replace) store.put({left:left||[],right:right||[],meta,savedAt:new Date().toISOString()},REPLACE_BACKUP);
            store.put(result.left,'left_images'); store.put(result.right,'right_images'); store.put(nextMeta,META);
            await done;
            return result;
        } catch(error) {
            try {tx.abort();} catch {}
            await done.catch(()=>{});
            throw error;
        } finally {signal?.removeEventListener('abort',cancel);}
    }
    async function restoreOriginal(key=BACKUP) {
        const db = await database();
        try {
            const tx = db.transaction('images_store','readwrite');
            const done = new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
            const store = tx.objectStore('images_store');
            const backup = await req(store.get(key));
            if (!backup) {await done; return null;}
            store.put(backup.left,'left_images'); store.put(backup.right,'right_images');
            if (backup.meta) store.put(backup.meta,META); else store.delete(META);
            await done;
            return backup;
        } finally {db.close();}
    }
    function createConnection({onImages,onStatus}) {
        let popup, nonce, db, stopped = true, batch, queue = Promise.resolve(), generation = 0, received = 0, watchdog, work, replaceRequested=false;
        const send = message => popup && !popup.closed && popup.postMessage({channel:CHANNEL,nonce,...message},ORIGIN);
        const report = text => onStatus(text);
        async function handle(event, run) {
            const m = event.data;
            if (stopped || run !== generation || event.source !== popup || event.origin !== ORIGIN || m?.channel !== CHANNEL || m.nonce !== nonce) return;
            if (!db) db = await database();
            if (stopped || run !== generation) return;
            if (m.type === 'hello') {send({type:'start'}); report('已连接，正在检查目录…');}
            if (m.type === 'manifest') {
                const manifest = validateManifest(m.manifest);
                const meta = await req(db.transaction('images_store','readonly').objectStore('images_store').get(META)) || {};
                if (stopped || run !== generation) return;
                const items = [], expected = new Map();
                for (const side of ['left','right']) {
                    const known = new Set((meta[side]||[]).map(i=>i.id));
                    for (const item of manifest.sides[side]) {
                        const key = side+'/'+item.id;
                        if (!known.has(item.id) && !expected.has(key)) {items.push({side,id:item.id}); expected.set(key,item);}
                    }
                }
                batch = {manifest,expected,downloaded:new Map()}; received = 0;
                send({type:'need',revision:manifest.revision,items});
                report('正在同步本机图片…');
            }
            if (m.type === 'image' && batch?.manifest.revision === m.revision) {
                const key = m.side+'/'+m.id, item = batch.expected.get(key);
                if (!item || batch.downloaded.has(key) || typeof m.data !== 'string' || !DATA.test(m.data) || !m.data.startsWith('data:'+item.mime+';base64,') || m.data.length > item.size*4/3+100) throw new Error('图片数据无效');
                received += m.data.length;
                if (received > MAX_TOTAL*4/3+100000) throw new Error('图片总量过大');
                batch.downloaded.set(key,m.data);
            }
            if (m.type === 'complete' && batch?.manifest.revision === m.revision) {
                if (batch.downloaded.size !== batch.expected.size) throw new Error('图片接收不完整');
                const result = await saveBatch(db,batch.manifest,batch.downloaded,work.signal,replaceRequested);
                replaceRequested = false;
                if (stopped || run !== generation) return;
                onImages(result);
                const warnings = Array.isArray(batch.manifest.warnings) && batch.manifest.warnings.length;
                report(`已同步 · 左 ${result.left.length} 张 / 右 ${result.right.length} 张${warnings?' · 部分格式或大图已跳过':''}`);
                send({type:'saved',revision:m.revision}); batch = null;
            }
            if (m.type === 'error') {batch=null; report('同步未完成，保留旧图；助手会自动重试');}
        }
        const listener = event => {
            const run = generation;
            queue = queue.then(()=>handle(event,run)).catch(error=>{
                console.error('本机图片同步:', error.name, error.message);
                if (!stopped && run===generation) {batch=null;send({type:'failed'});report('同步失败，旧图保留；请检查浏览器存储空间');}
            });
        };
        window.addEventListener('message',listener);
        function stop() {
            send({type:'stop'}); stopped=true; generation++; batch=null;
            work?.abort();
            clearInterval(watchdog);
            if (popup && !popup.closed) popup.close();
            report('已暂停，已有图片保留');
        }
        window.addEventListener('beforeunload',stop);
        return {
            start(replace=false) {
                stop(); stopped=false; work=new AbortController();
                replaceRequested = replace;
                nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
                popup = window.open(`${ORIGIN}/?site=${encodeURIComponent(location.origin)}#${nonce}`,`alpha-images-${nonce}`,'popup,width=520,height=550');
                if (!popup) {stopped=true;report('请允许此网站打开本机图片助手窗口');return;}
                report('正在连接；若窗口打不开，请先启动本机图片助手');
                watchdog = setInterval(()=>{if(popup.closed){stop();report('助手窗口已关闭，已有图片保留');}},2000);
            },
            stop,
            async restore() {stop(); const original=await restoreOriginal();if(original) {onImages(original);report('已恢复第一次同步前的图片');} else report('还没有同步前备份');},
            async undoReplace() {stop(); const original=await restoreOriginal(REPLACE_BACKUP);if(original) {onImages(original);report('已撤销上一次目录替换');} else report('还没有目录替换备份');},
            dispose() {stop();window.removeEventListener('message',listener);window.removeEventListener('beforeunload',stop);queue.finally(()=>db?.close());}
        };
    }
    window.AlphaLocalImages = {createConnection,mergeSide,validateManifest,saveBatch,restoreOriginal,database};
    window.LocalImageSyncEntry = ({isDarkMode=false,onImages}) => {
        const h = React.createElement;
        const [status,setStatus] = React.useState('图片只保存在当前浏览器');
        const [help,setHelp] = React.useState(false);
        const connection = React.useRef(null);
        const callback = React.useRef(onImages); callback.current=onImages;
        const portable = window.AlphaLocalWorkspace?.isPortable() || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        React.useEffect(()=>{
            if(portable) return;
            connection.current = createConnection({onImages:images=>callback.current(images),onStatus:setStatus});
            const pause = ()=>connection.current?.stop();
            window.addEventListener('alpha:manual-images',pause);
            return ()=>{window.removeEventListener('alpha:manual-images',pause);connection.current?.dispose();};
        },[portable]);
        if (portable) return null;
        const muted = isDarkMode?'text-slate-400':'text-slate-500';
        const button = `text-xs rounded-xl border px-3 py-2 ${isDarkMode?'border-slate-700 bg-slate-900':'border-slate-200 bg-white'}`;
        return h('section',{className:'mb-5','aria-label':'本机图片目录同步'},
            h('div',{className:'flex flex-wrap items-center gap-2'},
                h('button',{type:'button',className:button,onClick:()=>connection.current?.start()},'连接本机图片目录'),
                h('button',{type:'button',className:button,onClick:()=>connection.current?.start(true)},'用目录替换两侧图片'),
                h('button',{type:'button',className:`text-xs ${muted}`,onClick:()=>connection.current?.stop()},'暂停'),
                h('button',{type:'button',className:`text-xs ${muted}`,onClick:()=>setHelp(!help),'aria-expanded':help},'说明'),
                h('span',{role:'status',className:`text-xs ${muted}`},status)),
            help && h('div',{className:`text-xs leading-6 mt-2 ${muted}`},
                h('p',null,'启动本机图片助手后连接，保留助手窗口。每 10 秒读取 left_images / right_images；手机与其他浏览器的图片不会改变。刷新网页后需重新连接。手动上传会暂停目录同步。'),
                h('p',null,'移走文件不会删除浏览器里的旧图。同名文件更新会替换；首次同步前自动备份原有图片。'),
                h('p',null,'“用目录替换两侧图片”在新图完整接收后替换当前两侧，并备份替换前的图片。'),
                h('button',{type:'button',className:'underline mr-3',onClick:()=>connection.current?.undoReplace().catch(()=>setStatus('撤销失败，已有图片保留'))},'撤销上一次替换'),
                h('button',{type:'button',className:'underline',onClick:()=>connection.current?.restore().catch(()=>setStatus('恢复失败，已有图片保留'))},'恢复第一次同步前的图片')));
    };
})();
