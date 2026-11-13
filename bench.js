// 真机性能自动测试（game-test 专用）。打开网页后自动：进 1-5 → 逻辑快进到大后期 → 同一段战斗依次用几种画面配置各跑一遍 → 出结果表。
// 每种配置都从同一个随机种子、同一套摆放重新快进，所以战斗内容相同，只差「画什么」。
(function(){
  const B = window.BENCH, Q = new URLSearchParams(location.search);
  const LONG = Q.get('long') !== '0', TLMAX = +(Q.get('tlmax') || 400), T0 = +(Q.get('t') || 215), WARM = +(Q.get('warm') || 2.5), MEAS = +(Q.get('sec') || 8), SYNC = +(Q.get('sync') || 3);
  // 摆放：和实际玩一样把 5×9 的格子全部摆满（第一版只摆了 19 只、占半屏，用户 2026-11-13：「我实际玩的时候屏幕都放满了」）。按列：后排产能，中间输出，前排挡怪
  const LAYOUT = ['flower','goldfish','goldfish','pug','pug','lizard','lizard','pumpkin','pumpkin'];
  function fillOne(){ for(let col = 0; col < COLS; col++) for(let lane = 0; lane < LANES; lane++) if(canPlaceAt(lane, col)){ const k = LAYOUT[col % LAYOUT.length]; G.energy = 9999; G.cooldown[k] = 0; try{ if(placePet(k, lane, col)) return true; }catch(e){} } return false; }
  function fillAll(){ let n = 0; while(n < 60 && fillOne()) n++; }
  const clearDrawSide = () => { for(const a of [COMBO._LIVE, DMG, FLASH, PARTS, MONFX, VFX, corpses, flyers]) a.length = 0; };
  const noop = () => {}, f1 = x => x.toFixed(1), f0 = x => x.toFixed(0);
  const CONFIGS = [
    { id:'full',     cn:'完整画面',     p:[] },
    { id:'nobg',     cn:'无背景和道具', p:['bg'] },
    { id:'noenv',    cn:'无落叶等环境', p:['env'] },
    { id:'notext',   cn:'无文字',       p:['text'] },
    { id:'noshadow', cn:'无脚下阴影',   p:['shadow'] },
    { id:'noui',     cn:'无界面卡槽',   p:['ui'] },
    { id:'nofx',     cn:'无特效和数字', p:['fx'] },
    { id:'nochar',   cn:'无角色',       p:['char'] },
    { id:'charonly', cn:'只留角色',     p:['bg','env','text','shadow','ui','fx'] },
    { id:'blank',    cn:'空画面',       p:['blank'] },
    { id:'x2',       cn:'完整 2倍速',   p:[], speed:2 },
    { id:'full2',    cn:'完整(复测)',   p:[] },
  ];

  // ---------- 界面 ----------
  const css = document.createElement('style');
  css.textContent = `#bn{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 6px);z-index:90;background:rgba(0,0,0,.78);color:#fff;font:12px/1.4 -apple-system,"PingFang SC",sans-serif;padding:5px 10px;border-radius:6px;pointer-events:none;white-space:nowrap}
#br{position:fixed;inset:0;z-index:100;background:#15171c;color:#e8e8e8;font:12px/1.45 -apple-system,"PingFang SC",sans-serif;overflow:auto;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 10px) 8px calc(env(safe-area-inset-bottom) + 14px);box-sizing:border-box;user-select:text;-webkit-user-select:text;touch-action:pan-y}
#br h1{font-size:15px;margin:0 0 4px}#br .d{color:#9aa3b2;font-size:10.5px;margin:0 0 8px;word-break:break-all}
#br table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}#br th,#br td{padding:4px 2px;text-align:right;border-bottom:1px solid #2a2e37;font-size:10.5px;white-space:nowrap}
#br th{color:#9aa3b2;font-weight:600;font-size:9.5px;white-space:normal;vertical-align:bottom}#br td:first-child,#br th:first-child{text-align:left}
#br .w{color:#ffb454}#br .n{color:#9aa3b2;font-size:10.5px;margin:8px 0}#br button{font:13px -apple-system,sans-serif;padding:8px 14px;margin:6px 8px 0 0;border-radius:6px;border:1px solid #444b58;background:#232730;color:#fff}`;
  document.head.appendChild(css);
  const bn = document.createElement('div'); bn.id = 'bn'; bn.textContent = '性能测试：加载中…'; document.body.appendChild(bn);
  const say = s => { bn.textContent = s; };
  // ---------- 工具 ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (f, ms) => { const t = performance.now(); while(!f()){ if(ms && performance.now() - t > ms) throw new Error('等待超时'); await sleep(100); } };
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const pct = (a, q) => { if(!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
  function rng(seed){ let a = seed >>> 0; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // ---------- 计时钩子（包住游戏的 update / draw / 提交，不改它们的内容）----------
  const M = { upd:0, drw:0, end:0, sync:0, blank:false, phase:'idle', logicRand:null };
  const nativeRand = Math.random;
  const oUpdate = window.update, oDraw = window.draw;
  window.update = function(dt){ const a = performance.now(); Math.random = M.logicRand || nativeRand; try{ oUpdate(dt); } finally { Math.random = nativeRand; } M.upd += performance.now() - a; };
  window.draw = function(){ const a = performance.now();
    if(M.blank){ ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = '#14171f'; ctx.fillRect(0,0,cv.width,cv.height); ctx.restore(); } else oDraw();
    M.drw += performance.now() - a; };
  let gl = null; const px = new Uint8Array(4);
  function hookCtx(){
    const oEnd = ctx.__end.bind(ctx);
    ctx.__end = function(){ const a = performance.now(); oEnd(); const b = performance.now(); M.end += b - a;
      if(M.phase === 'sync' && gl){ gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); M.sync += performance.now() - b; } };   // 读 1 个像素 = 等显卡把这一帧真正画完
    gl = ctx.r && ctx.r.gl;
    if(gl && !/[?&](pxstat|perf)=1\b/.test(location.search)){ const fs = ctx.fstat;    // 和 pixi-ctx.js 里 ?perf=1 的统计相同
      for(const k of ['drawElements','drawArrays']){ const f = gl[k].bind(gl); gl[k] = function(){ fs.drawCalls = (fs.drawCalls|0) + 1; return f.apply(null, arguments); }; }
      for(const k of ['texImage2D','texSubImage2D']){ const f = gl[k].bind(gl); gl[k] = function(){ const a = arguments, src = a[a.length - 1]; fs.upPx = (fs.upPx|0) + ((src && src.width * src.height) || (a[3] * a[4]) || 0); return f.apply(null, a); }; } }
  }
  // ---------- 画面开关 ----------
  const PATCHED = [];
  const patch = (o, n, f) => { PATCHED.push([o, n, o[n], Object.prototype.hasOwnProperty.call(o, n)]); o[n] = f; };
  const unpatch = () => { while(PATCHED.length){ const [o, n, f, own] = PATCHED.pop(); if(own) o[n] = f; else delete o[n]; } M.blank = false; };
  const SW = {
    bg(){ patch(SCENE, 'drawGround', noop); patch(SCENE, 'props', () => []); },
    env(){ patch(SCENE, 'drawFx', noop); },
    text(){ patch(ctx, 'fillText', noop); patch(ctx, 'strokeText', noop); },
    shadow(){ patch(window, 'groundShadow', noop); },
    ui(){ patch(window, 'drawUI2', noop); patch(window, 'drawSellZone', noop); },
    fx(){ for(const n of ['drawVFX','drawDamage','drawMonFx','drawOrbs','drawTexts','drawFlyers','drawAuras']) patch(window, n, noop); patch(COMBO, 'draw', noop); },
    char(){ for(const n of ['drawPet','drawEnemy','drawCorpses']) patch(window, n, noop); },
    blank(){ M.blank = true; },
  };
  // ---------- 把战斗摆到同一个时刻 ----------
  function setup(cfg){
    unpatch();
    M.logicRand = rng(20261113);
    startBattle(); HITSTOP = 0;
    for(let t = 0; t < T0; t++){
      if(t >= 2){ fillOne(); if(t > 50) fillOne(); }        // 每秒摆 1 只，约 47 秒摆满；之后被吃掉的随时补上
      for(let i = 0; i < 60; i++) window.update(STEP);
    }
    fillAll();
    // 快进时没有画面，只在画的时候才消掉的东西（特效、伤害数字、尸体…）会堆几千个，必须清掉，否则量到的是假的
    clearDrawSide();
    G.speed = cfg.speed || 1;
    for(const k of cfg.p) SW[k]();
  }
  // ---------- 采样 ----------
  let S = null, TL = null, prevNow = 0, phaseEnd = 0, phaseDone = null;
  B.onFrame = (now, js) => {
    const iv = prevNow ? now - prevNow : 0; prevNow = now;
    if(S && iv > 0){
      if(M.phase === 'measure'){ S.iv.push(iv); S.js.push(js); S.upd.push(M.upd); S.drw.push(M.drw); S.end.push(M.end);
        const l = ctx.last || {}; for(const k of S.keys) S.st[k] += (l[k] || 0); S.n++; if(iv > 1000) S.broken = true; }
      else if(M.phase === 'sync'){ S.sync.push(M.sync); S.syncJs.push(js); }
    }
    if(M.phase === 'play' && TL && iv > 0){ TL.iv.push(iv); TL.js.push(js); const l = ctx.last || {}; for(const k of TL.keys) TL.st[k] += (l[k] || 0); if(M.tick) M.tick(); }
    M.upd = M.drw = M.end = M.sync = 0;
    if(phaseDone && performance.now() >= phaseEnd){ const f = phaseDone; phaseDone = null; f(); }
  };
  const runPhase = (name, sec) => new Promise(res => { M.phase = name; phaseEnd = performance.now() + sec * 1000; phaseDone = res; });
  async function runConfig(cfg, i){
    await B.pause();
    setup(cfg);
    const left = (CONFIGS.length - i) * (WARM + MEAS + SYNC);
    say(`性能测试 ${LONG ? '2/2　' : ''}${i + 1}/${CONFIGS.length}　${cfg.cn}　请勿操作，约剩 ${Math.floor(left / 60)}:${String(Math.round(left % 60)).padStart(2, '0')}`);
    S = { iv:[], js:[], upd:[], drw:[], end:[], sync:[], syncJs:[], n:0, keys:['sprites','raster','rasterMiss','upPx','drawCalls','chars'], st:{}, broken:false }; S.keys.forEach(k => S.st[k] = 0);
    prevNow = 0; M.phase = 'warm'; M.upd = M.drw = M.end = M.sync = 0;
    const g0 = { pets:G.pets.length, mons:G.enemies.length, t:G.t };
    B.resume();
    await runPhase('warm', WARM); await runPhase('measure', MEAS);
    const g1 = { pets:G.pets.length, mons:G.enemies.length, t:G.t, over:!!G.over };
    await runPhase('sync', SYNC); M.phase = 'idle';
    const n = S.n || 1, r = { id:cfg.id, cn:cfg.cn, frames:S.n, broken:S.broken,
      fps: 1000 / (mean(S.iv) || 1), slow: S.iv.filter(x => x > 25).length / n * 100, worst: Math.max(0, ...S.iv),
      js: mean(S.js), js95: pct(S.js, 0.95), upd: mean(S.upd), drw: mean(S.drw), end: mean(S.end),
      gpu: pct(S.sync, 0.5), gpu95: pct(S.sync, 0.95),
      g0, g1 };
    for(const k of S.keys) r[k] = S.st[k] / n;
    return r;
  }
  // ---------- 第 1 段：实时打完一局（不快进，画面全开），每 20 秒记一行，看是不是越打越慢 ----------
  async function runTimeline(){
    await B.pause(); unpatch(); M.logicRand = rng(20261113); startBattle(); HITSTOP = 0; clearDrawSide();
    const out = [], BK = 20000, keys = ['sprites','raster','rasterMiss','upPx','drawCalls','chars'];
    const fresh = () => { const o = { iv:[], js:[], keys, st:{}, t0:G.t, r0:performance.now() }; keys.forEach(k => o.st[k] = 0); return o; };
    let lastFill = 1, done = null; const start = performance.now();
    const close = () => { const n = TL.iv.length || 1, r = { t0:TL.t0, t1:G.t, pets:G.pets.length, mons:G.enemies.length, frames:TL.iv.length,
        fps:1000 / (mean(TL.iv) || 1), slow:TL.iv.filter(x => x > 25).length / n * 100, worst:Math.max(0, ...TL.iv), js:mean(TL.js), js95:pct(TL.js, 0.95) };
      for(const k of keys) r[k] = TL.st[k] / n; out.push(r); };
    M.tick = () => {
      if(G.t >= lastFill + 1 && !G.over){ lastFill = Math.floor(G.t); fillOne(); if(G.t > 50) fillOne(); }
      const now = performance.now();
      if(now - TL.r0 >= BK){ close(); TL = fresh(); say(`性能测试 1/2　实时打一整局　已 ${f0((now - start) / 1000)} 秒（约 290 秒），请勿操作`); }
      if((G.over || G.t >= 300 || now - start > TLMAX * 1000) && done){ if(TL.iv.length > 120) close(); const f = done; done = null; f(); }
    };
    say('性能测试 1/2　实时打一整局（约 290 秒），请勿操作');
    TL = fresh(); prevNow = 0; M.phase = 'play'; B.resume();
    await new Promise(res => { done = res; });
    M.phase = 'idle'; M.tick = null; TL = null;
    return out;
  }
  // ---------- 结果 ----------
  function info(){
    let ren = ''; try{ const e = gl.getExtension('WEBGL_debug_renderer_info'); ren = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }catch(e){}
    const ua = navigator.userAgent, os = (ua.match(/(iPhone OS|Android|Mac OS X|Windows NT) [\d_.]+/) || [''])[0], br = (ua.match(/(CriOS|Chrome|Version|Firefox)\/[\d.]+/) || [''])[0];
    return { os, br, screen: screen.width + 'x' + screen.height, dpr: window.devicePixelRatio, canvas: cv.width + 'x' + cv.height, renderer: ren, standalone: navigator.standalone === true, when: new Date().toISOString() };
  }
    function show(rows, inf, tl){
    bn.remove();
    const base = rows[0], el = document.createElement('div'); el.id = 'br';
    const blank = rows.find(r => r.id === 'blank'), warn = [];
    if(blank && blank.fps < 50) warn.push(`空画面也只有 ${f0(blank.fps)} 帧/秒：手机可能开着低电量模式（会锁 30 帧），请关掉后重测。`);
    if(rows.some(r => r.broken)) warn.push('测试中途页面被切到后台或被打断，结果不可靠，请重测。');
    const last = rows[rows.length - 1]; if(last.id === 'full2' && Math.abs(last.js - base.js) > Math.max(1.5, base.js * 0.25)) warn.push(`首尾两次「完整画面」相差较大（${f1(base.js)} → ${f1(last.js)} 毫秒）：测试期间手机已因发热降速。`);
    const tr = r => `<tr><td>${r.cn}</td><td>${f0(r.fps)}</td><td>${f0(r.slow)}%</td><td>${f1(r.js)}</td><td>${f1(r.js95)}</td><td>${f1(r.drw)}</td><td>${f1(r.end)}</td><td>${f1(r.gpu)}</td><td>${f0(r.sprites)}</td><td>${f0(r.raster)}</td><td>${f0(r.upPx / 1000)}</td></tr>`;
    el.innerHTML = `<h1>塔塔 58 版 · 真机性能测试结果</h1>
<p class="d">${inf.os}　${inf.br}　屏幕 ${inf.screen} ×${inf.dpr}　画布 ${inf.canvas}　${inf.standalone ? '主屏幕打开' : '浏览器打开'}<br>${inf.renderer}<br>关卡 1-5 第 ${f0(base.g0.t)}～${f0(base.g1.t)} 秒，摆满 ${base.g0.pets} 宠，${base.g0.mons}→${base.g1.mons} 怪；每项量 ${MEAS} 秒</p>
${warn.map(w => `<p class="w">⚠ ${w}</p>`).join('')}
${tl && tl.length ? `<table><tr><th>实时打一局<br>第几秒</th><th>宠/怪</th><th>帧/秒</th><th>慢帧</th><th>JS<br>平均</th><th>JS<br>最慢</th><th>最长<br>一帧</th><th>贴图</th><th>光栅</th><th>上传<br>千像素</th></tr>${tl.map(r => `<tr><td>${f0(r.t0)}～${f0(r.t1)}</td><td>${r.pets}/${r.mons}</td><td>${f0(r.fps)}</td><td>${f0(r.slow)}%</td><td>${f1(r.js)}</td><td>${f1(r.js95)}</td><td>${f0(r.worst)}</td><td>${f0(r.sprites)}</td><td>${f0(r.raster)}</td><td>${f0(r.upPx / 1000)}</td></tr>`).join('')}</table><p class="n">上表：不快进、画面全开，从头实时打完一局，每 20 秒一行。下表：同一段战斗（摆满）每次关掉画面的一部分。</p>` : ''}
<table><tr><th>画面配置</th><th>帧/秒</th><th>慢帧</th><th>JS<br>平均</th><th>JS<br>最慢</th><th>其中<br>组织</th><th>其中<br>提交</th><th>等<br>显卡</th><th>贴图</th><th>光栅</th><th>上传<br>千像素</th></tr>${rows.map(tr).join('')}</table>
<p class="n">单位：毫秒 / 每帧。60 帧时每帧只有 16.7 毫秒。慢帧 = 间隔超过 25 毫秒的帧。JS 最慢 = 最慢的 5% 帧。「等显卡」是另外 ${SYNC} 秒里每帧强制等显卡完成的耗时，只能当估计。声音未播放，不含在内。</p>
<button id="bcopy">复制文字结果</button><button id="bagain">再测一次</button>`;
    document.body.appendChild(el);
    const rnd = r => { const o = {}; for(const k in r) o[k] = typeof r[k] === 'number' ? +r[k].toFixed(2) : r[k]; return o; };
    const txt = JSON.stringify({ info: inf, T0, MEAS, timeline: (tl || []).map(rnd), rows: rows.map(r => { const o = {}; for(const k in r) o[k] = typeof r[k] === 'number' ? +r[k].toFixed(2) : r[k]; return o; }) });
    window.BENCH_RESULT = JSON.parse(txt);
    el.querySelector('#bcopy').onclick = e => { const done = () => { e.target.textContent = '已复制'; };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => prompt('长按全选复制', txt)); else prompt('长按全选复制', txt); };
    el.querySelector('#bagain').onclick = () => location.reload();
  }
  // ---------- 主流程 ----------
  (async () => {
    try{
      let lock = null; const wl = () => { try{ navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { lock = l; }, noop); }catch(e){} };
      wl(); window.addEventListener('pointerdown', () => { if(!lock) wl(); }, { capture:true, passive:true });
      await waitFor(() => window.TATA && TATA.ready() && ctx.ready);
      SND.muted = true; SND.musicOff = true;
      say('性能测试：加载战斗素材…');
      startBattle(); await waitFor(() => G.started && MT.inBattle && BATTLE_READY);
      hookCtx();
      const tl = LONG ? await runTimeline() : [];
      const rows = [];
      for(let i = 0; i < CONFIGS.length; i++) rows.push(await runConfig(CONFIGS[i], i));
      await B.pause(); unpatch();
      show(rows, info(), tl);
    }catch(e){ say('性能测试出错：' + (e && e.message || e)); console.error(e); }
  })();
})();
