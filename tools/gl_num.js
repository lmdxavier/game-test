const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(`(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};try{localStorage.setItem('tata_opts','{"fps":60,"res":2}')}catch(e){}})();`);
  await p.clock.install({time:new Date('2026-11-13T00:00:00Z')}); await p.clock.pauseAt(new Date('2026-11-13T00:00:01Z'));
  await p.goto('http://localhost:8890/index.html'+(process.argv[2]||''));
  for(let i=0;i<400;i++){ await p.clock.runFor(100); if(await p.evaluate(()=>window.TATA&&TATA.ready()).catch(()=>false)) break; await p.waitForTimeout(50); }
  await p.evaluate(()=>{ if(window.REC) REC.onFrame=null; const r=PIXICTX.main.r, o=r.render.bind(r); r.render=function(a){ if(window.__NOR) return; return o(a); }; window.__NOR=1; startBattle(); });
  for(let i=0;i<1500;i++){ if(await p.evaluate(()=>G.started&&!G.over)) break; await p.clock.runFor(100); await p.waitForTimeout(10); }
  await p.evaluate(`(()=>{ const cols=['flower','goldfish','goldfish','pug','pug','lizard','lizard','pumpkin','flower']; for(let c=0;c<9;c++) for(let l=0;l<5;l++){ G.energy=9999; for(const k in G.cooldown) G.cooldown[k]=0; try{ placePet(cols[c],l,c); }catch(e){} } G.energy=137; })()`);
  for(let s=0;s<70;s++) await p.clock.runFor(1000);
  await p.evaluate(()=>{ window.__AC={miss:0,f:0}; window.__K={}; window.__PXMISS={ push(s){ const k=s.slice(0,s.indexOf('|',4)); __K[k]=(__K[k]||0)+1; } }; });
  // 每秒改一次能量（模拟收能量 / 花钱），量 10 秒
  for(let i=0;i<600;i++){ if(i%45===0) await p.evaluate(()=>{ G.energy+= (Math.random()<0.5?25:-50); if(G.energy<0) G.energy=200; sparks(200,400,8,{x:0,y:-1},4,4.5,'#ffd23a',0.4); }); await p.clock.runFor(17); await p.evaluate(()=>{ const l=PIXICTX.main.last||{}; __AC.f++; __AC.miss+=l.rasterMiss|0; }); }
  const r=await p.evaluate(()=>({ac:__AC,k:Object.entries(__K).sort((a,b)=>b[1]-a[1]).slice(0,8),e:G.energy,dmg:DMG.length}));
  console.log('每帧未命中', (r.ac.miss/r.ac.f).toFixed(2), JSON.stringify(r.k), 'energy', r.e);
  await p.evaluate(()=>{ window.__NOR=0; G.energy+=75; sparks(200,400,10,{x:0,y:-1},4,4.5,'#ffd23a',0.4); }); for(let i=0;i<6;i++) await p.clock.runFor(17); await p.screenshot({path:'num'+(process.argv[2]?'_old':'_new')+'.png', clip:{x:0,y:0,width:390,height:520}});
  console.log(errs.slice(0,4)); await b.close(); })();
