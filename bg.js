(function(){
  if (typeof state === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none';
  document.body.prepend(canvas);
  const appEl = document.getElementById('app');
  if (appEl) { appEl.style.position = 'relative'; appEl.style.zIndex = '1'; }
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;

  function resize(){
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const MONTH_HUES = [215, 205, 195, 185, 170, 160, 200, 220, 240, 260, 250, 230];
  let stars = [], builtFor = -1;

  function buildStars(){
    const h = state.history || [];
    stars = h.slice(0, 220).map(w => {
      const rnd = mulberry32(Math.floor(w.start / 1000));
      const vol = volumeOf(w), sets = setsOf(w);
      return {
        x: rnd(), y: rnd() * 0.92,
        r: 0.8 + Math.min(2.6, vol / 6000),
        a: 0.16 + Math.min(0.42, sets / 80),
        ph: rnd() * Math.PI * 2,
        sp: 0.3 + rnd() * 0.7,
        dy: (rnd() - 0.5) * 0.006,
        hueOff: (rnd() - 0.5) * 24
      };
    });
    builtFor = h.length;
  }

  function mood(){
    const h = state.history || [];
    if (!h.length) return { glow: 0, dead: false };
    const now = Date.now();
    const week = h.filter(w => now - w.start < 7 * 864e5).length;
    return { glow: Math.min(1, week / 4), dead: new Date(h[0].start).getHours() >= 23 };
  }

  let visible = false, raf = 0;

  function frame(t){
    if (!visible) { raf = 0; return; }
    const time = t / 1000;
    ctx.clearRect(0, 0, W, H);
    const baseHue = MONTH_HUES[new Date().getMonth()];
    const m = mood();
    if (m.glow > 0){
      const g = ctx.createRadialGradient(W/2, H*1.15, 10, W/2, H*1.15, H*0.9);
      g.addColorStop(0, 'hsla(' + (baseHue + 40) + ',80%,55%,' + (0.10 * m.glow).toFixed(3) + ')');
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (m.dead){
      const g2 = ctx.createRadialGradient(W/2, -H*0.2, 10, W/2, -H*0.2, H*0.8);
      g2.addColorStop(0, 'hsla(355,70%,45%,0.07)');
      g2.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    }
    for (let i = 0; i < stars.length; i++){
      const s = stars[i];
      const tw = 0.75 + 0.25 * Math.sin(time * s.sp + s.ph);
      const x = (s.x + Math.sin(time * 0.05 + s.ph) * 0.01) * W;
      const y = (((s.y + time * s.dy) % 1) + 1) % 1 * H;
      ctx.beginPath();
      ctx.fillStyle = 'hsla(' + (baseHue + s.hueOff).toFixed(0) + ',70%,72%,' + (s.a * tw).toFixed(3) + ')';
      ctx.arc(x, y, s.r, 0, 6.2832);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  setInterval(function(){
    if (typeof state === 'undefined') return;
    const want = state.screen === 'HOME';
    const len = (state.history || []).length;
    if (want && !visible){
      visible = true;
      if (builtFor !== len) buildStars();
      resize();
      canvas.style.display = 'block';
      if (!raf) raf = requestAnimationFrame(frame);
    } else if (!want && visible){
      visible = false;
      canvas.style.display = 'none';
    } else if (want && builtFor !== len){
      buildStars();
    }
  }, 500);
})();
