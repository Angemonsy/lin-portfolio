const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'local-workspace.js'), 'utf8');
function setup(fetch, overrides = {}) {
    const context = {window:{}, navigator:{}, AbortController, fetch, setTimeout, clearTimeout, ...overrides};
    vm.runInNewContext(source, context);
    return context.window.AlphaLocalWorkspace;
}
test('opaque success probes only the fixed loopback origin, without credentials or cached results', async () => {
    let call;
    const api = setup(async (...args) => { call=args; return {type:'opaque', ok:false}; });
    assert.equal(await api.probe(), true);
    assert.equal(call[0], 'http://127.0.0.1:5174/');
    for (const [key,value] of Object.entries({method:'HEAD',mode:'no-cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'})) assert.equal(call[1][key], value);
    // no-cors requires the default "follow" redirect mode in real browsers.
    assert.ok(call[1].redirect === undefined || call[1].redirect === 'follow');
    assert.equal(new URL(api.URL).searchParams.get('view'), 'workbench');
});
test('network rejection, blocked browser requests and nonopaque HTTP errors degrade without throwing', async () => {
    assert.equal(await setup(async () => {throw new TypeError('blocked');}).probe(), false);
    assert.equal(await setup(async () => ({type:'basic',ok:false})).probe(), false);
});
test('timeout settles even if the browser fetch ignores abort; cancel also aborts the request', async () => {
    let signal, fireTimeout;
    const api=setup((_url, options) => {signal=options.signal;return new Promise(()=>{});},
        {setTimeout:callback=>{fireTimeout=callback;return 1;},clearTimeout:()=>{}});
    const pending=api.probe();fireTimeout();
    assert.equal(await pending, false);assert.equal(signal.aborted, true);
    const parent=new AbortController();parent.abort();
    assert.equal(await api.probe(parent.signal), false);
});
test('mobile and iPad desktop UA skip automatic probing; a small desktop viewport is not classified as a phone', () => {
    const api=setup(()=>{});
    for(const nav of [{userAgentData:{mobile:true}},{userAgent:'Mozilla Android'},{userAgent:'iPhone'}, {platform:'MacIntel',maxTouchPoints:5}]) assert.equal(api.isPortable(nav),true);
    assert.equal(api.isPortable({platform:'MacIntel',userAgent:'Macintosh',maxTouchPoints:0}),false);
});
test('service worker never intercepts local heartbeat or API requests, but retains same-origin asset caching', () => {
    const handlers={};let intercepts=0;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'service-worker.js'),'utf8'), {
        self:{location:{origin:'https://example.test'},addEventListener:(type,handler)=>{handlers[type]=handler;}},URL,
        fetch:async()=>({ok:false}),caches:{match:async()=>undefined}
    });
    const dispatch=(url,extra={})=>handlers.fetch({request:{method:'GET',url,...extra},respondWith:()=>{intercepts++;}});
    dispatch('http://127.0.0.1:5174/'); dispatch('https://example.test/api/a8-snapshot');
    assert.equal(intercepts,0);
    dispatch('https://example.test/alphakk999/local-workspace.js',{destination:'script'});
    assert.equal(intercepts,1);
});
