// Temple Bloom — BoardView: draws the 8×8 board (gems, outlined region, fruit overlays, previews),
// the tray and the fruit reel on the effects canvas, and handles dragging blocks from the tray.
// Controllers (stage.js, classic.js) own the rules; this view only shows state and reports drops.
(function () {
  const N = 8, C = window.CFG;
  const COLOR_KEYS = [null, 'gem/red', 'gem/green', 'gem/yellow'];
  const COLOR_HEX = [null, ['#ff6a5c', '#d81f2a'], ['#7dff8f', '#1fbf4a'], ['#fff38a', '#f5b90a']];

  class BoardView {
    constructor(o) {
      this.o = o;
      this.el = o.cellsEl; this.trayEl = o.trayEl; this.reelEls = o.reelEls || null;
      this.board = new Array(N * N).fill(0);
      this.tray = [null, null, null];
      this.trayFx = [0, 1, 2].map(() => ({ s: 1, a: 1, dx: 0, dy: 0 }));
      this.cellFx = new Array(N * N).fill(null);
      this.fruits = new Array(N * N).fill(null);
      this.region = null;            // { cells, lit, glow }
      this.ghost = null; this.drag = null; this.preview = null;
      this.reel = null;              // [{ fruit, dy, a, spin }]
      this.dim = 0;                  // board dimming during spin sequences
      this.hideGems = null;          // Set of idx hidden (under a spinning fruit)
      this.locked = false;
      this.renderer = FX.addScene((c, t, dt) => this.draw(c, t, dt));
      this._down = e => this.onDown(e); this._move = e => this.onMove(e); this._up = e => this.onUp(e);
      this.trayEl.addEventListener('pointerdown', this._down);
      window.addEventListener('pointermove', this._move, { passive: false });
      window.addEventListener('pointerup', this._up); window.addEventListener('pointercancel', this._up);
    }
    destroy() {
      FX.removeScene(this.renderer);
      this.trayEl.removeEventListener('pointerdown', this._down);
      window.removeEventListener('pointermove', this._move); window.removeEventListener('pointerup', this._up); window.removeEventListener('pointercancel', this._up);
    }

    // ---------------------------------------------------------------- geometry
    area() { return UI.rect(this.el); }
    cs() { return this.area().w / N; }
    cellCenter(r, c) { const a = this.area(), s = a.w / N; return [a.x + (c + 0.5) * s, a.y + (r + 0.5) * s]; }
    bayRect(k) { const r = UI.rect(this.trayEl.children[k]); return r; }
    reelCenter(c) { const r = UI.rect(this.reelEls[c]); return [r.cx, r.cy, r.h]; }

    // ---------------------------------------------------------------- state setters
    setBoard(b) { this.board = b.slice(); }
    setTray(t) { this.tray = t.map(p => p ? Object.assign({}, p) : null); }
    async dealIn(t) {
      this.setTray(t);
      const fx = this.trayFx;
      fx.forEach((f, k) => { f.dx = 260 + k * 60; f.a = 0; f.s = 0.8; });
      await Promise.all(fx.map((f, k) => FX.wait(k * 70).then(() => FX.tween(380, e => { f.dx = (260 + k * 60) * (1 - e); f.a = Math.min(1, e * 2); f.s = 0.8 + 0.2 * e; }, 'back'))));
    }

    // ---------------------------------------------------------------- input
    pieceAt(k) { const p = this.tray[k]; return p ? C.PIECE[p.id] : null; }
    onDown(e) {
      if (this.locked || this.drag || (this.o.canDrag && !this.o.canDrag())) return;
      const [x, y] = UI.toLogical(e.clientX, e.clientY);
      const tr = UI.rect(this.trayEl);
      const k = Math.max(0, Math.min(2, Math.floor((x - tr.x) / (tr.w / 3))));
      if (!this.tray[k]) return;
      e.preventDefault();
      Snd.unlock(); Snd.play('pick');
      this.drag = { k, x, y, sx: x, sy: y, s: 0.55, id: e.pointerId };
      FX.tween(120, v => { if (this.drag) this.drag.s = 0.55 + 0.45 * v; });
      this.updateGhost();
    }
    onMove(e) {
      if (!this.drag) return;
      e.preventDefault();
      const [x, y] = UI.toLogical(e.clientX, e.clientY);
      this.drag.x = x; this.drag.y = y;
      this.updateGhost();
    }
    dragOrigin() {
      // the dragged piece floats above the finger so it stays visible
      const d = this.drag, pc = this.pieceAt(d.k), cs = this.cs() * d.s;
      const lift = this.cs() * (this.o.lift || 1.9);
      return [d.x - pc.w * cs / 2, d.y - lift - pc.h * cs / 2, cs];
    }
    updateGhost() {
      const d = this.drag; if (!d) return;
      const pc = this.pieceAt(d.k), a = this.area(), cs = a.w / N;
      const [ox, oy] = this.dragOrigin();
      const c = Math.round((ox - a.x) / cs), r = Math.round((oy - a.y) / cs);
      if (r < -1 || c < -1 || r > N || c > N) { this.ghost = null; return; }
      const ok = RULES.fits(this.board, pc, r, c);
      if (!ok) { this.ghost = null; return; }
      const nb = RULES.place(this.board, pc, r, c, this.tray[d.k].color);
      this.ghost = { pc, r, c, color: this.tray[d.k].color, full: RULES.fullLines(nb) };
    }
    onUp(e) {
      const d = this.drag; if (!d) return;
      const g = this.ghost;
      this.drag = null; this.ghost = null;
      if (g) {
        const piece = this.tray[d.k];
        this.tray[d.k] = null;
        if (this.o.onPlace) this.o.onPlace(d.k, g.r, g.c, piece);
      } else {
        // fly back to the bay
        Snd.play('invalid');
        const f = this.trayFx[d.k], br = this.bayRect(d.k);
        const [ox, oy, cs] = [d.x, d.y - this.cs() * (this.o.lift || 1.9), 0];
        f.dx = ox - br.cx; f.dy = oy - br.cy;
        FX.tween(220, v => { f.dx *= (1 - v); f.dy *= (1 - v); if (v >= 1) { f.dx = 0; f.dy = 0; } });
      }
    }

    // ---------------------------------------------------------------- drawing
    gem(c, color, x, y, s, a) {
      const im = FX.img(COLOR_KEYS[color]); if (!im) return;
      if (a != null && a < 1) { c.save(); c.globalAlpha *= a; c.drawImage(im, x, y, s, s); c.restore(); } else c.drawImage(im, x, y, s, s);
    }
    drawPiece(c, piece, x0, y0, cs, alpha) {
      const pc = C.PIECE[piece.id], pad = cs * 0.04;
      for (const [dr, dc] of pc.cells) this.gem(c, piece.color, x0 + dc * cs + pad, y0 + dr * cs + pad, cs - 2 * pad, alpha);
    }
    drawRegion(c, a, cs, t) {
      const R = this.region; if (!R) return;
      const set = new Set(R.cells.map(([r, cc]) => r * N + cc));
      const lit = R.lit || 0, full = lit >= R.cells.length;
      // fill
      c.save();
      R.cells.forEach(([r, cc], i) => {
        const x = a.x + cc * cs, y = a.y + r * cs;
        c.fillStyle = full ? `rgba(255,214,90,${0.28 + 0.12 * Math.sin(t * 8)})` : (i < lit ? 'rgba(255,200,80,0.22)' : 'rgba(10,30,20,0.35)');
        c.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      });
      // outline (edges bordering non-region cells)
      c.lineWidth = 3; c.lineCap = 'round';
      c.shadowColor = full ? 'rgba(255,220,120,1)' : 'rgba(255,200,80,0.8)'; c.shadowBlur = full ? 18 : 10;
      c.strokeStyle = lit ? '#ffd35a' : 'rgba(210,190,130,0.75)';
      c.beginPath();
      R.cells.forEach(([r, cc]) => {
        const x = a.x + cc * cs, y = a.y + r * cs, i = r * N + cc;
        if (!set.has(i - N) || r === 0) { c.moveTo(x, y); c.lineTo(x + cs, y); }
        if (!set.has(i + N) || r === N - 1) { c.moveTo(x, y + cs); c.lineTo(x + cs, y + cs); }
        if (cc === 0 || !set.has(i - 1)) { c.moveTo(x, y); c.lineTo(x, y + cs); }
        if (cc === N - 1 || !set.has(i + 1)) { c.moveTo(x + cs, y); c.lineTo(x + cs, y + cs); }
      });
      c.stroke();
      c.restore();
    }
    drawPips(c, a, cs, t) {
      const R = this.region; if (!R) return;
      const lit = R.lit || 0;
      R.cells.forEach(([r, cc], i) => {
        const x = a.x + (cc + 0.5) * cs, y = a.y + (r + 0.5) * cs, on = i < lit, occupied = this.board[r * N + cc];
        const s = cs * (on ? 0.42 : 0.34) * (R.pop && R.pop[i] ? 1 + R.pop[i] : 1);
        c.save(); if (occupied) c.globalAlpha = 0.75;
        FX.sprite(c, on ? 'ui/pip_on' : 'ui/pip_off', x, y, s, s);
        c.restore();
      });
    }
    draw(c, t) {
      if (!this.el.isConnected) return;
      const a = this.area(), cs = a.w / N, pad = cs * 0.035;
      // region under the gems
      this.drawRegion(c, a, cs, t);
      // preview glow for lines the ghost would complete
      const g = this.ghost, pl = g && g.full.count ? g.full : null;
      const inPreview = (r, cc) => pl && (pl.rows.includes(r) || pl.cols.includes(cc));
      for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
        const i = r * N + cc, v = this.board[i], f = this.cellFx[i];
        if (!v || (this.hideGems && this.hideGems.has(i))) continue;
        const s = cs - 2 * pad;
        let x = a.x + cc * cs + pad, y = a.y + r * cs + pad, sc = 1, al = 1;
        if (f) { sc = f.s == null ? 1 : f.s; al = f.a == null ? 1 : f.a; y += f.dy || 0; }
        const col = inPreview(r, cc) ? g.color : v;
        if (sc !== 1) { x += s * (1 - sc) / 2; y += s * (1 - sc) / 2; }
        this.gem(c, col, x, y, s * sc, al);
        if (f && f.flash) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = f.flash; c.fillStyle = '#fff6c8'; c.fillRect(x, y, s * sc, s * sc); c.restore(); }
      }
      if (pl) {
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + 0.12 * Math.sin(t * 10);
        c.fillStyle = '#ffe08a';
        pl.rows.forEach(r => c.fillRect(a.x, a.y + r * cs, a.w, cs)); pl.cols.forEach(cc => c.fillRect(a.x + cc * cs, a.y, cs, a.w));
        c.restore();
      }
      // ghost
      if (g) { this.drawPiece(c, { id: g.pc.id, color: g.color }, a.x + g.c * cs, a.y + g.r * cs, cs, 0.4); }
      this.drawPips(c, a, cs, t);
      if (this.dim > 0) { c.fillStyle = `rgba(3,14,8,${this.dim * 0.55})`; c.fillRect(a.x, a.y, a.w, a.h); }
      // fruit overlays
      this.drawFruits(c, a, cs, t);
      // reel
      if (this.reel && this.reelEls) this.drawReel(c, t);
      // tray
      const tr = UI.rect(this.trayEl);
      for (let k = 0; k < 3; k++) {
        const p = this.tray[k]; if (!p || (this.drag && this.drag.k === k)) continue;
        const pc = C.PIECE[p.id], f = this.trayFx[k], br = this.bayRect(k);
        const tcs = Math.min(cs * 0.56, (br.w - 16) / Math.max(pc.w, 3.2), (br.h - 16) / Math.max(pc.h, 3.2)) * f.s;
        const fits = !this.o.showFit || RULES.canPlace(this.board, pc);
        c.save(); c.globalAlpha = f.a * (fits ? 1 : 0.45);
        this.drawPiece(c, p, br.cx - pc.w * tcs / 2 + f.dx, br.cy - pc.h * tcs / 2 + f.dy, tcs);
        c.restore();
      }
      // dragged piece
      if (this.drag) {
        const p = this.tray[this.drag.k];
        if (p) { const [ox, oy, dcs] = this.dragOrigin(); c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 16; c.shadowOffsetY = 10; this.drawPiece(c, p, ox, oy, dcs); c.restore(); }
      }
    }
    drawFruits(c, a, cs, t) {
      for (let i = 0; i < N * N; i++) {
        const f = this.fruits[i]; if (!f) continue;
        const r = Math.floor(i / N), cc = i % N, x = a.x + (cc + 0.5) * cs, y = a.y + (r + 0.5) * cs;
        c.save();
        c.globalAlpha = f.a == null ? 1 : f.a;
        // cell backing
        c.fillStyle = f.hi ? `rgba(20,70,45,${0.9})` : 'rgba(10,40,26,0.85)';
        c.fillRect(x - cs / 2 + 2, y - cs / 2 + 2, cs - 4, cs - 4);
        if (f.hi) {
          c.save(); c.globalAlpha *= f.hi; c.lineWidth = 3; c.strokeStyle = f.hiCol || '#ffffff'; c.shadowColor = f.hiCol || '#ffffff'; c.shadowBlur = 12;
          c.strokeRect(x - cs / 2 + 3, y - cs / 2 + 3, cs - 6, cs - 6); c.restore();
        }
        c.beginPath(); c.rect(x - cs / 2 + 2, y - cs / 2 + 2, cs - 4, cs - 4); c.clip();
        const sz = cs * 0.78 * (f.s == null ? 1 : f.s);
        if (f.spin) {
          // blurred reel strip scrolling through random fruit
          const speed = 9, off = ((t * speed + f.phase) % 1);
          for (let k = -1; k <= 1; k++) {
            const fid = C.FRUITS[(Math.floor(t * speed + f.phase) + k + f.seed) % C.FRUITS.length].id;
            c.globalAlpha = (f.a == null ? 1 : f.a) * 0.75;
            FX.sprite(c, 'fruit/' + fid, x, y + (off - k) * cs * 0.9 - cs * 0.45, sz * 0.9, sz * 0.9);
          }
        } else {
          const dy = f.dy || 0;
          FX.sprite(c, 'fruit/' + f.fruit, x, y + dy, sz, sz);
          if (f.ticket) FX.sprite(c, 'icon/ticket_mark', x - cs * 0.26, y - cs * 0.26, cs * 0.4, cs * 0.4);
        }
        c.restore();
      }
    }
    drawReel(c, t) {
      for (let k = 0; k < N; k++) {
        const it = this.reel[k]; if (!it || !it.fruit) continue;
        const [x, y, h] = this.reelCenter(k);
        c.save(); c.globalAlpha = it.a == null ? 1 : it.a;
        const s = h * 0.78 * (it.s == null ? 1 : it.s);
        FX.sprite(c, 'fruit/' + it.fruit, x, y + (it.dy || 0), s, s);
        c.restore();
      }
    }

    // ---------------------------------------------------------------- canned animations
    async placePop(cells) {
      cells.forEach(([r, cc]) => { this.cellFx[r * N + cc] = { s: 1.18, flash: 0.6 }; });
      await FX.tween(200, e => cells.forEach(([r, cc]) => { const f = this.cellFx[r * N + cc]; if (f) { f.s = 1.18 - 0.18 * e; f.flash = 0.6 * (1 - e); } }));
      cells.forEach(([r, cc]) => { this.cellFx[r * N + cc] = null; });
    }
    // sweep-light then shatter the gems of cleared lines (left→right / top→bottom)
    async shatter(cells, colors) {
      cells.forEach(([r, cc]) => { this.cellFx[r * N + cc] = { s: 1, flash: 0 }; });
      await FX.tween(160, e => cells.forEach(([r, cc]) => { const f = this.cellFx[r * N + cc]; if (f) f.flash = e * 0.9; }), 'lin');
      const cs = this.cs();
      cells.forEach(([r, cc], k) => {
        const [x, y] = this.cellCenter(r, cc), col = COLOR_HEX[colors[k]] || COLOR_HEX[1];
        FX.burst(x, y, { n: 5, colors: col, size: cs * 0.22, speed: 220, life: 0.55 });
      });
      await FX.tween(140, e => cells.forEach(([r, cc]) => { const f = this.cellFx[r * N + cc]; if (f) { f.s = 1 - 0.8 * e; f.a = 1 - e; } }), 'in');
      cells.forEach(([r, cc]) => { this.cellFx[r * N + cc] = null; });
    }
  }
  window.BoardView = BoardView;
})();
