// 实际游玩性能记录（game-test）：正常玩，后台每 20 秒记一行；暂停 / 结算 / 局外时左上出现「性能记录」按钮，点开可复制。
// 记三类：① 帧率和每帧耗时 ② 所有可能越积越多的东西（单位、特效、缓存、贴图、声音）③ 每一次卡顿（单帧超过 50 毫秒）当时的情况
(function(){
  const R = window.REC, T_OPEN = performance.now(), BK = 20000;
  const M = { upd:0, drw:0, end:0 };
  const oU = window.update, oD = window.draw;
  window.update = function(dt){ const a = performance.now(); oU(dt); M.upd += performance.now() - a; };
  window.draw = function(){ const a = performance.now(); oD(); M.drw += performance.now() - a; };
  let hooked = false;
  function hook(){ if(hooked || !ctx.ready || !ctx.r) return; hooked = true;
    const oE = ctx.__end.bind(ctx); ctx.__end = function(){ const a = performance.now(); oE(); M.end += performance.now() - a; };
    const gl = ctx.r.gl; if(gl && !/[?&](pxstat|perf)=1\b/.test(location.search)){ const fs = ctx.fstat;
      for(const k of ['drawElements','drawArrays']){ const f = gl[k].bind(gl); gl[k] = function(){ fs.drawCalls = (fs.drawCalls|0) + 1; return f.apply(null, arguments); }; }
      for(const k of ['texImage2D','texSubImage2D']){ const f = gl[k].bind(gl); gl[k] = function(){ const a = arguments, src = a[a.length - 1]; fs.upPx = (fs.upPx|0) + ((src && src.width * src.height) || (a[3] * a[4]) || 0); return f.apply(null, a); }; } } }
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const pct = (a, q) => { if(!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
  const tryN = f => { try{ const v = f(); return typeof v === 'number' && isFinite(v) ? v : -1; }catch(e){ return -1; } };
  // 可能越积越多的东西
  const grow = () => ({
    pets: tryN(() => G.pets.length), mons: tryN(() => G.enemies.length), projs: tryN(() => G.projs.length), orbs: tryN(() => G.orbs.length), gfx: tryN(() => G.fx.length),
    combo: tryN(() => COMBO._LIVE.length), vfx: tryN(() => VFX.length), dmg: tryN(() => DMG.length), parts: tryN(() => PARTS.length), flash: tryN(() => FLASH.length), monfx: tryN(() => MONFX.length), corpses: tryN(() => corpses.length), flyers: tryN(() => flyers.length),
    snap: tryN(() => ctx.snap.size), mk: tryN(() => ctx.mk.size), spPool: tryN(() => ctx.sp.length), clPool: tryN(() => ctx.cl.length), layers: tryN(() => ctx.layers ? ctx.layers.size : 0),
    glTex: tryN(() => ctx.r.texture.managedTextures.length), fcMB: tryN(() => FC.bytes / 1048576), fcGroups: tryN(() => FC.groups.size), nine: tryN(() => NINE_CNT), cards: tryN(() => CARD_CACHE.size),
    voices: tryN(() => COMBO._A.voices.length), sndVoices: tryN(() => SND.voices), imgs: tryN(() => Object.keys(window.__IMG).length),
  });
  const KEYS = ['sprites','raster','rasterMiss','upPx','drawCalls','chars','missPx','shakeF'];
  const fresh = () => { const o = { iv:[], js:[], upd:[], drw:[], end:[], st:{}, r0:performance.now() }; KEYS.forEach(k => o.st[k] = 0); return o; };
  const rows = [], hitches = []; let cur = fresh(), prev = 0;
  const page = () => { try{ return MT.inBattle ? (G.over ? '结算' : G.paused ? '暂停' : '战斗') : MT.tab; }catch(e){ return '?'; } };
  function close(){
    const n = cur.iv.length; if(n < 30){ cur = fresh(); return; }
    const r = { at: Math.round((performance.now() - T_OPEN) / 1000), page: page(), gt: tryN(() => G.t), speed: tryN(() => G.speed), frames: n,
      fps: 1000 / (mean(cur.iv) || 1), slow: cur.iv.filter(x => x > 25).length / n * 100, worst: Math.max(0, ...cur.iv),
      js: mean(cur.js), js95: pct(cur.js, 0.95), upd: mean(cur.upd), drw: mean(cur.drw), end: mean(cur.end) };
    for(const k of KEYS) r[k] = cur.st[k] / n;
    r.grow = grow();
    for(const k in r) if(typeof r[k] === 'number') r[k] = +r[k].toFixed(2);
    for(const k in r.grow) r.grow[k] = +r.grow[k].toFixed(1);
    rows.push(r); if(rows.length > 400) rows.shift(); cur = fresh();
  }
  // v4：每帧记光栅重画（pixi-ctx 的 __PXMISS）、是否震屏、本帧新播的效果组合
  window.__PXMISS = []; const played = [];
  try{ const oP = COMBO.play; COMBO.play = function(name){ played.push(name); return oP.apply(this, arguments); }; }catch(e){}
  function missInfo(){ const a = window.__PXMISS; let px = 0; const big = [];
    for(const s of a){ const m = /^(\d+)x(\d+) (\w+)/.exec(s); if(!m) continue; const n = m[1] * m[2]; px += n; if(n > 40000) big.push(m[1] + 'x' + m[2] + m[3]); }
    a.length = 0; return { px, big: big.slice(0, 4) }; }
  // 炸弹震屏方案切换（game-test）：0 原样 / 1 幅度加倍 / 2 加长并前半段保持 / 3 两个都加
  window.__BOOM = +((/[?&]boom=(\d)/.exec(location.search) || [])[1] || 3);   // 默认 ③
  let btnOn = null;
  R.onFrame = (now, js) => {
    hook();
    const iv = prev ? now - prev : 0; prev = now;
    if(iv > 0 && iv < 5000){
      cur.iv.push(iv); cur.js.push(js); cur.upd.push(M.upd); cur.drw.push(M.drw); cur.end.push(M.end);
      const l = ctx.last || {}; for(const k of KEYS) cur.st[k] += (l[k] || 0);
      const mi = missInfo(), shk = tryN(() => shake.t > 0 ? 1 : 0); cur.st.missPx += mi.px; if(shk === 1) cur.st.shakeF++;
      const pl = played.splice(0);
      if(iv > 50 && READY) hitches.push({ at: +((performance.now() - T_OPEN) / 1000).toFixed(1), page: page(), gt: +tryN(() => G.t).toFixed(1), iv: +iv.toFixed(0), js: +js.toFixed(1), upd: +M.upd.toFixed(1), drw: +M.drw.toFixed(1), end: +M.end.toFixed(1), miss: l.rasterMiss || 0, missK: Math.round(mi.px / 1000), big: mi.big, shake: shk, play: pl.slice(0, 4), upK: Math.round((l.upPx || 0) / 1000), mons: tryN(() => G.enemies.length), combo: tryN(() => COMBO._LIVE.length) });
      if(hitches.length > 400) hitches.shift();
    }
    M.upd = M.drw = M.end = 0; if(window.__PXMISS.length > 2000) window.__PXMISS.length = 0; if(played.length > 200) played.length = 0;
    if(performance.now() - cur.r0 >= BK) close();
    let want = true; try{ want = !MT.inBattle || G.paused || !!G.over; }catch(e){}
    if(want !== btnOn){ btnOn = want; btn.style.display = want ? 'block' : 'none'; }
  };
  // ---------- 界面 ----------
  const css = document.createElement('style');
  css.textContent = `#rb{position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 6px);z-index:90;font:12px -apple-system,"PingFang SC",sans-serif;padding:6px 10px;border-radius:6px;border:1px solid #666;background:rgba(0,0,0,.75);color:#fff;display:none}
#rr{position:fixed;inset:0;z-index:100;background:#15171c;color:#e8e8e8;font:12px/1.45 -apple-system,"PingFang SC",sans-serif;overflow:auto;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 10px) 8px calc(env(safe-area-inset-bottom) + 14px);box-sizing:border-box;touch-action:pan-y}
#rr h1{font-size:15px;margin:0 0 6px}#rr table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;margin-bottom:10px}#rr th,#rr td{padding:3px 2px;text-align:right;border-bottom:1px solid #2a2e37;font-size:10.5px;white-space:nowrap}
#rr th{color:#9aa3b2;font-weight:600;font-size:9.5px}#rr td:first-child,#rr th:first-child{text-align:left}#rr .n{color:#9aa3b2;font-size:10.5px;margin:6px 0}
#rr button{font:14px -apple-system,sans-serif;padding:10px 16px;margin:0 8px 10px 0;border-radius:6px;border:1px solid #444b58;background:#232730;color:#fff}`;
  document.head.appendChild(css);
  const btn = document.createElement('button'); btn.id = 'rb'; btn.textContent = '性能记录'; document.body.appendChild(btn);
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0'), f0 = x => (+x).toFixed(0), f1 = x => (+x).toFixed(1);
  function info(){ let ren = ''; try{ const gl = ctx.r.gl, e = gl.getExtension('WEBGL_debug_renderer_info'); ren = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; }catch(e){}
    const ua = navigator.userAgent; return { os: (ua.match(/(iPhone OS|Android|Mac OS X|Windows NT) [\d_.]+/) || [''])[0], br: (ua.match(/(CriOS|Chrome|Version|Firefox)\/[\d.]+/) || [''])[0], screen: screen.width + 'x' + screen.height, dpr: devicePixelRatio, canvas: cv.width + 'x' + cv.height, renderer: ren, standalone: navigator.standalone === true, ver: '61试+rec6', q: location.search, opts: (typeof OPTS !== 'undefined' ? OPTS.fps + '/' + OPTS.res : ''), boom: window.__BOOM, shakeInt: !/[?&]shake=0\b/.test(location.search), when: new Date().toISOString() }; }
  const stop = e => e.stopPropagation();
  btn.addEventListener('pointerdown', stop, true); btn.addEventListener('pointerup', stop, true);
  btn.addEventListener('click', e => { e.stopPropagation(); close();
    const el = document.createElement('div'); el.id = 'rr'; for(const ev of ['pointerdown','pointerup','pointermove','touchstart','touchmove','touchend','wheel','click']) el.addEventListener(ev, stop);
    const txt = JSON.stringify({ info: info(), rows, hitches });
    const last = rows.slice(-40), top = hitches.slice().sort((a, b) => b.iv - a.iv).slice(0, 12);
    el.innerHTML = `<h1>61 试改版性能记录（共 ${rows.length} 行，卡顿 ${hitches.length} 次）</h1><button id="rc">复制全部记录</button><button id="rx">关闭</button><p class="n">炸弹震屏（点了立刻生效，回去放炸弹看）：</p><div id="bm">${['原样 0.1格 0.4秒','① 幅度 0.2格','② 0.6秒 前半段保持','③ 两个都加'].map((t, i) => `<button data-b="${i}" style="${window.__BOOM === i ? 'background:#3b6fd6' : ''}">${t}</button>`).join('')}</div><p class="n">发热诊断（点了会重新加载，各玩一两分钟对比手机温度）：</p><div id="dg">${[['现在的设置',''],['关抗锯齿','aa=0'],['关云影暖光','fx=0'],['两个都关','aa=0&fx=0']].map(([t, q]) => `<button data-q="${q}" style="${(location.search.replace(/^\?/, '') === q) ? 'background:#3b6fd6' : ''}">${t}</button>`).join('')}</div>
<table><tr><th>时间</th><th>页面</th><th>宠/怪</th><th>特效</th><th>帧/秒</th><th>慢帧</th><th>JS均</th><th>JS慢</th><th>最长</th><th>贴图</th><th>重画k</th><th>显存图</th></tr>${last.map(r => `<tr><td>${mmss(r.at)}</td><td>${r.page}${r.speed === 2 ? '×2' : ''}</td><td>${r.grow.pets}/${r.grow.mons}</td><td>${r.grow.combo}</td><td>${f0(r.fps)}</td><td>${f0(r.slow)}%</td><td>${f1(r.js)}</td><td>${f1(r.js95)}</td><td>${f0(r.worst)}</td><td>${f0(r.sprites)}</td><td>${f0(r.missPx / 1000)}</td><td>${r.grow.glTex}</td></tr>`).join('')}</table>
<p class="n">最严重的卡顿（单帧毫秒）：${top.map(h => `${mmss(h.at)} ${h.iv}（JS ${h.js}${h.shake === 1 ? '，震屏' : ''}，重画 ${h.missK}k）`).join('、') || '无'}</p><p class="n">完整内容（所有累积项、每次卡顿）在「复制全部记录」里。</p>`;
    document.body.appendChild(el);
    el.querySelector('#rx').onclick = () => el.remove();
    el.querySelectorAll('#dg button').forEach(b => b.onclick = () => { location.href = location.pathname + (b.dataset.q ? '?' + b.dataset.q : ''); });
    el.querySelectorAll('#bm button').forEach(b => b.onclick = () => { window.__BOOM = +b.dataset.b; el.querySelectorAll('#bm button').forEach(x => x.style.background = x === b ? '#3b6fd6' : ''); });
    el.querySelector('#rc').onclick = ev => { const done = () => { ev.target.textContent = '已复制'; };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => prompt('长按全选复制', txt)); else prompt('长按全选复制', txt); };
  });
  R.dump = () => { close(); return { info: info(), rows, hitches }; };
})();
