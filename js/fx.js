// Temple Bloom — the effects canvas: scene renderers (the board draws through this), particles, floating
// numbers, flying coins/tickets, big celebratory fruit, rings, flashes and promise-based tweens.
// All coordinates are logical (the 720-wide layout space used by the DOM).
(function () {
  const FX = { scene: [], parts: [], t: 0, speed: 1, reduced: false };
  let cv, ctx, dpr = 1, last = 0;

  FX.init = function () {
    cv = document.getElementById('fx'); ctx = cv.getContext('2d');
    FX.resize();
    requestAnimationFrame(loop);
  };
  FX.resize = function () {
    if (!cv) return;
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    cv.width = Math.round(window.innerWidth * dpr); cv.height = Math.round(window.innerHeight * dpr);
    cv.style.width = window.innerWidth + 'px'; cv.style.height = window.innerHeight + 'px';
  };
  FX.ctx = () => ctx;
  FX.img = key => window.Assets ? Assets.img(key) : null;
  FX.sp = () => (window.TB_SPEED || 1);

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000) * FX.sp(); last = now; FX.t += dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * UI.s, 0, 0, dpr * UI.s, dpr * (UI.ox + FX.shakeX()), dpr * (UI.oy + FX.shakeY()));
    for (const r of FX.scene) { ctx.save(); try { r(ctx, FX.t, dt); } catch (e) { console.error(e); } ctx.restore(); }
    for (let i = FX.parts.length - 1; i >= 0; i--) {
      const p = FX.parts[i];
      let alive = true;
      try { alive = p.update(dt) !== false; } catch (e) { alive = false; console.error(e); }
      if (!alive) { FX.parts.splice(i, 1); continue; }
    }
    // draw in insertion order (later effects on top); layer 'top' draws last
    for (const layer of [0, 1, 2]) for (const p of FX.parts) if ((p.layer || 0) === layer) { ctx.save(); try { p.draw(ctx); } catch (e) {} ctx.restore(); }
  }
  FX.add = p => { FX.parts.push(p); return p; };
  FX.addScene = fn => { FX.scene.push(fn); return fn; };
  FX.removeScene = fn => { FX.scene = FX.scene.filter(f => f !== fn); };
  FX.clearScene = () => { FX.scene = []; FX.parts = []; shake.t = 0; };

  // ------------------------------------------------------------------ time
  FX.wait = ms => new Promise(res => setTimeout(res, ms / FX.sp()));
  const E = {
    lin: t => t, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t, inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    back: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1
  };
  FX.ease = E;
  // FX.tween(ms, fn(k), ease) → Promise ; runs on the canvas clock so it follows TB_SPEED
  FX.tween = function (ms, fn, ease) {
    ease = typeof ease === 'function' ? ease : E[ease || 'out'];
    return new Promise(res => {
      let t = 0; const dur = ms / 1000;
      FX.add({ layer: -1, update(dt) { t += dt; const k = Math.min(1, t / dur); fn(ease(k), k); if (k >= 1) { res(); return false; } }, draw() {} });
    });
  };

  // ------------------------------------------------------------------ shake / flash
  const shake = { t: 0, a: 0, d: 1 };
  FX.shake = function (a, ms) { if (FX.reduced) return; shake.a = a; shake.t = ms / 1000; shake.d = ms / 1000; const app = document.getElementById('app'); app.classList.remove('shaking'); void app.offsetWidth; app.classList.add('shaking'); setTimeout(() => app.classList.remove('shaking'), ms); };
  FX.shakeX = () => shake.t > 0 ? (shake.t -= 1 / 60, Math.sin(FX.t * 70) * shake.a * (shake.t / shake.d)) : 0;
  FX.shakeY = () => shake.t > 0 ? Math.cos(FX.t * 63) * shake.a * 0.6 * (shake.t / shake.d) : 0;
  FX.flash = function (color, ms, alpha) {
    let t = 0; const d = (ms || 300) / 1000;
    FX.add({ layer: 2, update(dt) { t += dt; return t < d; }, draw(c) { c.globalAlpha = (alpha || 0.6) * (1 - t / d); c.fillStyle = color || '#fff6d0'; c.fillRect(-50, -50, UI.W + 100, UI.H + 100); } });
  };

  // ------------------------------------------------------------------ text
  // text with gold gradient + outline, drawn on canvas
  FX.drawText = function (c, str, x, y, size, o) {
    o = o || {};
    c.font = `400 ${size}px "Lilita One"`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = size * 0.22; c.strokeStyle = o.stroke || '#3b2203'; c.strokeText(str, x, y + size * 0.05);
    c.strokeText(str, x, y);
    const g = c.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.45);
    const st = o.fill === 'white' ? [['0', '#ffffff'], ['1', '#f2ead0']] : o.fill === 'green' ? [['0', '#d8ffc0'], ['0.5', '#5ef070'], ['1', '#12a040']] : [['0', '#fffbd0'], ['0.35', '#ffe066'], ['0.7', '#f5b21c'], ['1', '#d07a06']];
    st.forEach(s => g.addColorStop(+s[0], s[1]));
    c.fillStyle = g; c.fillText(str, x, y);
  };
  // floating number: rises and fades
  FX.float = function (str, x, y, o) {
    o = o || {};
    let t = 0; const d = (o.dur || 900) / 1000, size = o.size || 30;
    return FX.add({
      layer: o.layer == null ? 1 : o.layer,
      update(dt) { t += dt; return t < d; },
      draw(c) {
        const k = t / d, pop = k < 0.15 ? E.back(k / 0.15) : 1;
        c.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        c.translate(x, y - (o.rise == null ? 50 : o.rise) * E.out(k)); c.scale(pop, pop);
        if (o.icon) {
          c.font = `400 ${size}px "Lilita One"`; const w = c.measureText(str).width, iw = size, tot = iw + 4 + w, im = FX.img(o.icon);
          if (im) c.drawImage(im, -tot / 2, -iw / 2 - 2, iw, iw);
          FX.drawText(c, str, -tot / 2 + iw + 4, 0, size, Object.assign({}, o, { align: 'left' }));
        } else FX.drawText(c, str, 0, 0, size, o);
      }
    });
  };
  // coin payout label "🪙+42": pops in, holds, can be updated (base → boosted), then fades
  FX.payout = function (x, y, amount, o) {
    o = o || {};
    const p = { amount, shown: amount, t: 0, hold: (o.hold || 1100) / 1000, size: o.size || 44, bumpT: 0, gone: false,
      set(v) { this.amount = v; this.bumpT = 0.25; },
      update(dt) { this.t += dt; if (this.bumpT > 0) this.bumpT -= dt; this.shown += (this.amount - this.shown) * Math.min(1, dt * 12); return this.t < this.hold + 0.35; },
      draw(c) {
        const k = this.t, pop = k < 0.2 ? E.back(k / 0.2) : 1, b = this.bumpT > 0 ? 1 + Math.sin(this.bumpT / 0.25 * Math.PI) * 0.18 : 1;
        c.globalAlpha = k > this.hold ? Math.max(0, 1 - (k - this.hold) / 0.35) : 1;
        c.translate(x, y - (k > this.hold ? (k - this.hold) * 60 : 0)); c.scale(pop * b, pop * b);
        const str = '+' + Math.round(this.shown), s = this.size;
        c.font = `400 ${s}px "Lilita One"`; const w = c.measureText(str).width, iw = s * 0.95, tot = iw + 4 + w;
        const im = FX.img('icon/coin'); if (im) c.drawImage(im, -tot / 2, -iw / 2 - 2, iw, iw);
        FX.drawText(c, str, -tot / 2 + iw + 4, 0, s, { align: 'left', fill: 'white' });
      }
    };
    p.layer = 2;
    return FX.add(p);
  };

  // ------------------------------------------------------------------ sprites & particles
  FX.sprite = function (c, key, x, y, w, h, rot, alpha) {
    const im = FX.img(key); if (!im) return;
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (alpha != null) c.globalAlpha *= alpha;
    c.drawImage(im, -w / 2, -h / 2, w, h); c.restore();
  };
  // fly a sprite along an arc from a to b; resolves on arrival
  FX.fly = function (key, a, b, o) {
    o = o || {};
    return new Promise(res => {
      let t = 0; const d = (o.dur || 650) / 1000 * (0.85 + Math.random() * 0.3), size = o.size || 36, arc = o.arc == null ? -120 : o.arc;
      const mx = (a[0] + b[0]) / 2 + (Math.random() - 0.5) * 80, my = Math.min(a[1], b[1]) + arc;
      FX.add({ layer: 2, update(dt) { t += dt; if (t >= d) { res(); if (o.onArrive) o.onArrive(); return false; } },
        draw(c) {
          const k = E.inOut(Math.min(1, t / d)), u = 1 - k;
          const x = u * u * a[0] + 2 * u * k * mx + k * k * b[0], y = u * u * a[1] + 2 * u * k * my + k * k * b[1];
          const s = size * (o.shrink ? 1 - 0.4 * k : 1) * (t < 0.1 ? t / 0.1 : 1);
          FX.sprite(c, key, x, y, s, s, o.spin ? k * 6 : 0);
        } });
    });
  };
  // shards / sparkles burst. o: { n, colors:[hex], sprite:'fx/sparkle', speed, size, gravity, life }
  FX.burst = function (x, y, o) {
    o = o || {};
    const n = Math.round((o.n || 12) * (FX.reduced ? 0.4 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 260) * (0.4 + Math.random() * 0.8);
      const p = { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 80), r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, t: 0,
        life: (o.life || 0.7) * (0.7 + Math.random() * 0.6), size: (o.size || 12) * (0.6 + Math.random() * 0.8), col: o.colors ? o.colors[i % o.colors.length] : '#ffd84a', layer: o.layer == null ? 1 : o.layer,
        update(dt) { this.t += dt; this.vy += (o.gravity == null ? 700 : o.gravity) * dt; this.vx *= 0.99; this.x += this.vx * dt; this.y += this.vy * dt; this.r += this.vr * dt; return this.t < this.life; },
        draw(c) {
          const k = this.t / this.life; c.globalAlpha = 1 - k * k;
          if (o.sprite) { FX.sprite(c, o.sprite, this.x, this.y, this.size * 2, this.size * 2, this.r); return; }
          c.translate(this.x, this.y); c.rotate(this.r);
          const s = this.size; c.fillStyle = this.col; c.beginPath(); c.moveTo(0, -s / 2); c.lineTo(s / 2, 0); c.lineTo(0, s / 2); c.lineTo(-s / 2, 0); c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(0, -s / 2); c.lineTo(s / 4, -s / 8); c.lineTo(-s / 6, 0); c.closePath(); c.fill();
        } };
      FX.add(p);
    }
  };
  FX.ring = function (x, y, r, o) {
    o = o || {};
    let t = 0; const d = (o.dur || 500) / 1000;
    FX.add({ layer: 1, update(dt) { t += dt; return t < d; }, draw(c) { const k = E.out(t / d); c.globalAlpha = (1 - t / d) * (o.alpha || 0.9); c.globalCompositeOperation = 'lighter'; FX.sprite(c, 'fx/ring', x, y, r * 2 * (0.3 + k), r * 2 * (0.3 + k)); } });
  };
  FX.glowAt = function (x, y, r, o) {
    o = o || {};
    let t = 0; const d = (o.dur || 600) / 1000;
    FX.add({ layer: o.layer == null ? 0 : o.layer, update(dt) { t += dt; return t < d; }, draw(c) { const k = t / d; c.globalAlpha = Math.sin(k * Math.PI) * (o.alpha || 0.8); c.globalCompositeOperation = 'lighter'; FX.sprite(c, 'fx/glow', x, y, r * 2, r * 2); } });
  };
  // big celebratory fruit fan (like the huge watermelon slices / oranges in the reference)
  FX.bigFruit = function (fruit, x, y, n, o) {
    o = o || {};
    const count = Math.min(5, Math.max(2, n || 3)), size = o.size || 120;
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2);
      let t = 0; const d = 1.1 + i * 0.05;
      FX.add({ layer: 2, update(dt) { t += dt; return t < d; },
        draw(c) {
          const k = t / d, pop = k < 0.25 ? E.back(k / 0.25) : 1;
          c.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
          const px = x + off * size * 0.42 * (0.6 + 0.4 * pop), py = y - 10 * Math.sin(k * Math.PI) - Math.abs(off) * 6;
          FX.sprite(c, 'fruit/' + fruit, px, py, size * pop, size * pop, off * 0.16);
        } });
    }
  };

  window.FX = FX;
})();
