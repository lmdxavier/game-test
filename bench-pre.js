// 真机性能自动测试（game-test 专用，不进正式版）—— 必须在游戏脚本之前加载
// 1) 不读不写存档：测试用默认状态，也不会改动同一网址下别的版本的存档
// 2) 接管游戏主循环的 requestAnimationFrame：可以暂停 / 继续，并量每一帧的间隔和 JS 耗时（游戏自己的 frame() 一行不改）
(function(){
  try{ Storage.prototype.getItem = function(){ return null; }; Storage.prototype.setItem = function(){}; Storage.prototype.removeItem = function(){}; }catch(e){}
  const realRAF = window.requestAnimationFrame.bind(window);
  const B = window.BENCH = { realRAF, hold:false, pending:null, onFrame:null, onHeld:null };
  const wrap = cb => now => { const a = performance.now(); cb(now); const b = performance.now(); if(B.onFrame) B.onFrame(now, b - a); };
  window.requestAnimationFrame = function(cb){
    if(!cb || cb.name !== 'frame') return realRAF(cb);          // Pixi 等其他调用照常
    if(B.hold){ B.pending = cb; if(B.onHeld){ const f = B.onHeld; B.onHeld = null; f(); } return 0; }
    return realRAF(wrap(cb));
  };
  B.pause = () => new Promise(res => { if(B.hold && B.pending) return res(); B.hold = true; B.onHeld = res; });
  B.resume = () => { B.hold = false; const cb = B.pending; B.pending = null; if(cb) realRAF(wrap(cb)); };
})();
