// 平常战斗里每帧还在重画的是什么（按调用位置）。用法: node miss.js <端口> [快进秒=60] [量帧=180]
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const port=process.argv[2], FF=+(process.argv[3]||60), N=+(process.argv[4]||180), QS=process.argv[5]||'';
const SEED=`(()=>{let s=12345;window.__seed=n=>{s=n};Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();`;
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(SEED);
  await p.clock.install({time:new Date('2026-11-13T00:00:00Z')}); await p.clock.pauseAt(new Date('2026-11-13T00:00:01Z'));
  await p.goto(`http://localhost:${port}/index.html?perf=1${QS}`);
  for(let i=0;i<400;i++){ await p.clock.runFor(100); if(await p.evaluate(()=>window.TATA&&TATA.ready()).catch(()=>false)) break; await p.waitForTimeout(50); }
  await p.evaluate(()=>{ if(window.REC) REC.onFrame=null; const r=PIXICTX.main.r, o=r.render.bind(r); r.render=function(a){ if(window.__NOR) return; return o(a); }; window.__NOR=1; __seed(777); startBattle(); });
  for(let i=0;i<1500;i++){ if(await p.evaluate(()=>G.started&&!G.over)) break; await p.clock.runFor(100); await p.waitForTimeout(10); }
  await p.evaluate(`(()=>{ const cols=['flower','goldfish','goldfish','pug','pug','lizard','lizard','pumpkin','pumpkin']; for(let c=0;c<9;c++) for(let l=0;l<5;l++){ G.energy=9999; for(const k in G.cooldown) G.cooldown[k]=0; try{ placePet(cols[c],l,c); }catch(e){} } })()`);
  for(let s=0;s<FF;s++) await p.clock.runFor(1000);
  await p.evaluate(()=>{ window.__SITE={}; window.__PXMISS={ push(s){ const st=(new Error().stack||'').split('\n').filter(l=>/\/(render|meta|scene|combo|camp|map|game)\.js/.test(l)).slice(0,2).map(l=>l.replace(/^.*\/(\w+\.js)(\?[^:]*)?:(\d+):\d+.*$/,'$1:$3')).join(' < '); const m=/^(\d+)x(\d+) (\w+)/.exec(s); const k=(m?m[3]:'?')+' @ '+st; const o=__SITE[k]=__SITE[k]||{n:0,px:0,ex:s.slice(0,110)}; o.n++; o.px+=m?m[1]*m[2]:0; } }; window.__AC={raster:0,sprites:0,miss:0,f:0}; });
  for(let i=0;i<N;i++){ await p.clock.runFor(17); await p.evaluate(()=>{ const l=PIXICTX.main.last||{}; __AC.f++; __AC.raster+=l.raster|0; __AC.sprites+=l.sprites|0; __AC.miss+=l.rasterMiss|0; }); }
  const r=await p.evaluate(()=>({st:{t:G.t,pets:G.pets.length,mons:G.enemies.length,rc:0},ac:__AC,site:__SITE}));
  console.log(JSON.stringify(r.st), '每帧: 光栅', (r.ac.raster/N).toFixed(0), '贴图', (r.ac.sprites/N).toFixed(0), '未命中', (r.ac.miss/N).toFixed(2));
  Object.entries(r.site).sort((a,b)=>b[1].n-a[1].n).slice(0,14).forEach(([k,o])=>console.log(String(o.n).padStart(4), String(Math.round(o.px/1000)).padStart(5)+'k', k, '\n        ', o.ex));
  console.log('errs',errs.slice(0,3)); await b.close(); })();
