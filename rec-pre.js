// 实际游玩性能记录（game-test）：只量游戏主循环每一帧的间隔和 JS 耗时，不改游戏
(function(){
  const realRAF = window.requestAnimationFrame.bind(window);
  const R = window.REC = { onFrame:null };
  window.requestAnimationFrame = function(cb){
    if(!cb || cb.name !== 'frame') return realRAF(cb);
    return realRAF(now => { const a = performance.now(); cb(now); const b = performance.now(); if(R.onFrame) R.onFrame(now, b - a); });
  };
})();
