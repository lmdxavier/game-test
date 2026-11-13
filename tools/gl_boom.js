// 60 版：放炸弹 / 爆炸 / 震屏那几帧到底重画、上传了什么。用法: node boom.js <端口>
const {chromium}=require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const port=process.argv[2];
const SEED=`(()=>{let s=12345;window.__seed=n=>{s=n};Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();`;
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(SEED);
  await p.clock.install({time:new Date('2026-11-13T00:00:00Z')}); await p.clock.pauseAt(new Date('2026-11-13T00:00:01Z'));
  await p.goto(`http://localhost:${port}/index.html?perf=1${process.argv[3]||''}`);
  let ok=false; for(let i=0;i<400;i++){ await p.clock.runFor(100); ok=await p.evaluate(()=>window.TATA&&TATA.ready()).catch(()=>false); if(ok) break; await p.waitForTimeout(50); }
  if(!ok){ console.log('NOT READY',errs); process.exit(1); }
  await p.evaluate(`__seed(777);startBattle();`);
  for(let i=0;i<1500;i++){ if(await p.evaluate(()=>G.started&&!G.over)) break; await p.clock.runFor(100); await p.waitForTimeout(20); }
  console.log('started', await p.evaluate(()=>G.started));
  // 摆满 5×9（同 bench 第二版的按列摆法），留 1 格给炸弹
  await p.evaluate(`(()=>{ const cols=['flower','goldfish','goldfish','pug','pug','lizard','lizard','pumpkin','pumpkin']; for(let c=0;c<9;c++) for(let l=0;l<5;l++){ G.energy=9999; for(const k in G.cooldown) G.cooldown[k]=0; try{ placePet(cols[c],l,c); }catch(e){} } })()`);
  await p.evaluate(()=>{ const r=PIXICTX.main.r, o=r.render.bind(r); r.render=function(a){ if(window.__NOR) return; return o(a); }; window.__NOR=1; });
  // 打 40 秒，让怪、特效、数字都出来
  for(let s=0;s<60;s++){ await p.clock.runFor(1000); if(s%10==0) console.log("ff",s); }
  await p.evaluate(()=>{ window.__NOR=0; }); for(let i=0;i<6;i++) await p.clock.runFor(17);
  console.log('state', await p.evaluate(()=>JSON.stringify({t:G.t,pets:G.pets.length,mons:G.enemies.length,combo:COMBO._LIVE.length,dmg:DMG.length})));
  await p.evaluate(()=>{ if(window.REC) REC.onFrame=null; window.__PXMISS=[]; const c=PIXICTX.main, gl=c.r.gl; window.__UP=[];
    for(const k of ['texImage2D','texSubImage2D']){ const f=gl[k].bind(gl); gl[k]=function(){ const a=arguments, src=a[a.length-1]; const w=(src&&src.width)||a[3]|0, h=(src&&src.height)||a[4]|0; __UP.push(w+'x'+h+(src&&src.tagName?' '+src.tagName:'')); return f.apply(null,a); }; } });
  async function seg(label, n, pre){
    if(pre) await p.evaluate(pre);
    const out=[];
    for(let i=0;i<n;i++){
      await p.evaluate(()=>{ __PXMISS.length=0; __UP.length=0; });
      await p.clock.runFor(17);
      out.push(await p.evaluate(()=>{ const l=PIXICTX.main.last||{}; const big=__PXMISS.filter(s=>{ const m=s.match(/^(\d+)x(\d+)/); return m&&m[1]*m[2]>20000; }); let px=0; for(const s of __PXMISS){ const m=s.match(/^(\d+)x(\d+)/); if(m) px+=m[1]*m[2]; }
        return { miss:l.rasterMiss|0, missPx:px, raster:l.raster|0, sprites:l.sprites|0, up:__UP.length, upList:__UP.slice(0,6), sample:__PXMISS.slice(0,4), big:big.slice(0,3), nmiss:__PXMISS.length }; }));
    }
    const sum=k=>out.reduce((a,o)=>a+o[k],0);
    console.log(`\n== ${label}: ${n} 帧  光栅未命中 合计 ${sum('miss')}（每帧 ${(sum('miss')/n).toFixed(1)}），重画像素 每帧 ${(sum('missPx')/n/1000).toFixed(0)}k，上传次数 每帧 ${(sum('up')/n).toFixed(1)}，光栅 ${(sum('raster')/n).toFixed(0)}，贴图 ${(sum('sprites')/n).toFixed(0)}`);
    console.log('  逐帧未命中:', out.map(o=>o.miss).join(' '));
    const kinds={}; for(const o of out) for(const s of o.sample.concat(o.big)){ const k=s.replace(/-?\d+(\.\d+)?/g,'#').slice(0,70); kinds[k]=(kinds[k]||0)+1; }
    console.log('  未命中种类(抽样):'); Object.entries(kinds).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>console.log('   ',v,k));
    const mid=out[Math.min(3,n-1)]; console.log('  第4帧样本:', JSON.stringify(mid.sample), 'UP', JSON.stringify(mid.upList));
    return out;
  }
  await seg('A 平常战斗（基线）', 30);
  await seg('B 只震屏（T4 的震屏 0.1/0.4，不放特效）', 30, `shakeDir(0.1,0.4)`);
  await seg('D 第一次炸弹爆炸（特效+顿帧+震屏）', 40, `(()=>{ const pt=G.pets[Math.min(22,G.pets.length-1)]; emit('boom',{pet:pt}); })()`);
  await seg('E 第二次炸弹爆炸', 40, `(()=>{ const pt=G.pets[Math.min(22,G.pets.length-1)]; emit('boom',{pet:pt}); })()`);
  console.log('errs', errs.slice(0,5));
  await b.close();
})();
