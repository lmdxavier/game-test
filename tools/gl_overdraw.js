// 战斗画面每个像素被画几遍（按贴图来源 / 混合模式分组）。用法: node od.js <端口> [快进秒] [参数]
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const port=process.argv[2], FF=+(process.argv[3]||60), QS=process.argv[4]||'';
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(`(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();`);
  await p.clock.install({time:new Date('2026-11-13T00:00:00Z')}); await p.clock.pauseAt(new Date('2026-11-13T00:00:01Z'));
  await p.goto(`http://localhost:${port}/index.html?perf=1${QS}`);
  for(let i=0;i<400;i++){ await p.clock.runFor(100); if(await p.evaluate(()=>window.TATA&&TATA.ready()).catch(()=>false)) break; await p.waitForTimeout(50); }
  await p.evaluate(()=>{ if(window.REC) REC.onFrame=null; const c=PIXICTX.main, r=c.r, o=r.render.bind(r); window.__OD=null;
    r.render=function(a){ if(window.__ODON && a && a.container===c.stage){ const W=c.canvas.width,H=c.canvas.height, g={}; let tot=0;
        const leaves=[]; (function walk(n){ if(!n.visible) return; if(n.children&&n.children.length){ for(const q of n.children) walk(q); } else leaves.push(n); })(a.container);
        for(const ch of leaves){ if(!ch.visible||ch.alpha<=0) continue; let bd; try{ bd=ch.getBounds(); }catch(e){ continue; } const x0=Math.max(0,bd.minX??bd.x), y0=Math.max(0,bd.minY??bd.y), x1=Math.min(W,bd.maxX??(bd.x+bd.width)), y1=Math.min(H,bd.maxY??(bd.y+bd.height)); const ar=Math.max(0,x1-x0)*Math.max(0,y1-y0); if(!ar) continue;
          const s=ch.texture&&ch.texture.source, res=s&&s.resource, nm=res&&res.src?res.src.replace(/^.*\/assets\//,'').replace(/\?.*$/,'').split('/').slice(0,2).join('/'):(res&&res.tagName)||ch.constructor.name; const big=ar>W*H*0.5?'【整屏】':ar>W*H*0.1?'[大块]':''; const k=big+nm+' '+(s?s.width+'x'+s.height:'')+' '+(ch.blendMode||''); const o=g[k]=g[k]||{n:0,ar:0}; o.n++; o.ar+=ar; tot+=ar; }
        window.__OD={tot:tot/(W*H), g:Object.entries(g).map(([k,o])=>[k,o.n,+(o.ar/(W*H)).toFixed(2)]).sort((x,y)=>y[2]-x[2]).slice(0,22)}; }
      if(window.__NOR) return; return o(a); }; window.__NOR=1; startBattle(); });
  for(let i=0;i<1500;i++){ if(await p.evaluate(()=>G.started&&!G.over)) break; await p.clock.runFor(100); await p.waitForTimeout(10); }
  await p.evaluate(`(()=>{ const cols=['flower','goldfish','goldfish','pug','pug','lizard','lizard','pumpkin','pumpkin']; for(let c=0;c<9;c++) for(let l=0;l<5;l++){ G.energy=9999; for(const k in G.cooldown) G.cooldown[k]=0; try{ placePet(cols[c],l,c); }catch(e){} } })()`);
  for(let s=0;s<FF;s++) await p.clock.runFor(1000);
  await p.evaluate(()=>{ window.__ODON=1; }); await p.clock.runFor(17); await p.clock.runFor(17);
  const r=await p.evaluate(()=>__OD); console.log('整屏被画的遍数（所有贴图面积 / 屏幕面积）:', r.tot.toFixed(2)); for(const [k,n,a] of r.g) console.log(String(a).padStart(6), String(n).padStart(4), k);
  console.log(errs.slice(0,3)); await b.close(); })();
