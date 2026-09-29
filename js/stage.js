// Temple Bloom — Bloom Challenge stage: board + fruit reel + tray, the clear → spin → payout sequence,
// the outlined region's bonus spin, the stone-hands big-clear cinematic and the stage result.
(function () {
  const C = window.CFG, R = window.RULES, T = window.TEXT, N = C.N;

  // shared praise banner (also used by Classic): GREAT / +318 / COMBO ×1
  function praiseBanner(word, amount, combo, where) {
    const ov = document.getElementById('overlay');
    const b = UI.el('div', 'praise ' + (where || ''), ov);
    UI.gt(T.praise[word] || word, 'pw', b);
    if (amount) UI.el('div', 'pa', b).textContent = '+' + T.num(amount);
    if (combo) UI.el('div', 'tag pc', b).textContent = T.f(T.combo, { n: combo });
    Snd.play('praise', { i: Math.max(0, C.PRAISE.indexOf(word)) });
    setTimeout(() => b.classList.add('out'), 1500 / FX.sp());
    setTimeout(() => b.remove(), 1900 / FX.sp());
    return b;
  }
  function lineBanner(title, amount, tag) {
    const ov = document.getElementById('overlay');
    const b = UI.el('div', 'praise lines', ov);
    UI.gt(title, 'pw', b);
    if (amount != null) UI.el('div', 'pa', b).textContent = '+' + T.num(amount);
    if (tag) UI.el('div', 'tag pc', b).textContent = tag;
    setTimeout(() => b.classList.add('out'), 950 / FX.sp());
    setTimeout(() => b.remove(), 1300 / FX.sp());
    return b;
  }

  // idol eyes in the dark, then the board splits along the cleared lines: lava + two stone hands
  async function bigClear(view, rowsMid) {
    const a = view.area(), cy = rowsMid == null ? a.y + a.h / 2 : rowsMid;
    const reduced = FX.reduced;
    if (!reduced) {
      // darkness + eyes
      let dark = 0, eyes = 0;
      const p = FX.add({ layer: 2, update() { return !p.done; }, draw(c) {
        c.globalAlpha = dark; c.fillStyle = '#000'; c.fillRect(-50, -50, UI.W + 100, UI.H + 100);
        c.globalAlpha = eyes; c.globalCompositeOperation = 'lighter';
        FX.sprite(c, 'fx/idol', UI.W / 2, a.y + a.h * 0.42, 620, 236);
      } });
      Snd.play('rumble');
      await FX.tween(260, e => { dark = 0.96 * e; });
      await FX.tween(420, e => { eyes = e; });
      await FX.wait(260);
      await FX.tween(220, e => { eyes = 1 - e; dark = 0.96 * (1 - e); });
      p.done = true;
    }
    // split band
    let open = 0, hands = 0;
    const band = FX.add({ layer: 1, update() { return !band.done; }, draw(c) {
      const h = 190 * open; if (h < 1) return;
      const x0 = a.x - 40, w = a.w + 80;
      c.save(); c.beginPath(); c.rect(x0, cy - h / 2, w, h); c.clip();
      FX.sprite(c, 'fx/lava', a.x + a.w / 2, cy, w, Math.max(h, 190));
      c.restore();
      const lip = 58;
      FX.sprite(c, 'fx/split_edge', a.x + a.w / 2, cy - h / 2 - lip / 2 + 14, w, lip);
      c.save(); c.translate(a.x + a.w / 2, cy + h / 2 + lip / 2 - 14); c.scale(1, -1); FX.sprite(c, 'fx/split_edge', 0, 0, w, lip); c.restore();
      if (hands > 0) {
        const hs = 220, hw = hs * 0.81, al = Math.min(1, hands * 1.6);
        // top hand reaches up out of the chasm (fingers up), the lower one reaches down
        c.save(); c.globalAlpha = al; FX.sprite(c, 'fx/fist', a.x + a.w * 0.3, cy - h / 2 - hs / 2 + 46 + (1 - hands) * 110, hw, hs); c.restore();
        c.save(); c.globalAlpha = al; c.translate(a.x + a.w * 0.7, cy + h / 2 + hs / 2 - 46 - (1 - hands) * 110); c.rotate(Math.PI); FX.sprite(c, 'fx/fist', 0, 0, hw, hs); c.restore();
      }
    } });
    Snd.play('smash'); FX.shake(10, 500); FX.flash('#ffd27a', 260, 0.5);
    FX.burst(UI.W / 2, cy, { n: 18, sprite: 'fx/debris_0', size: 16, speed: 420, life: 0.9 });
    Snd.play('lava');
    await Promise.all([FX.tween(320, e => { open = e; }, 'back'), FX.tween(420, e => { hands = e; }, 'back')]);
    FX.burst(UI.W / 2, cy, { n: 16, sprite: 'fx/ember', size: 10, speed: 300, gravity: -80, life: 1.2 });
    await FX.wait(reduced ? 300 : 700);
    Snd.play('smash'); FX.shake(6, 300);
    await Promise.all([FX.tween(260, e => { open = 1 - e; }, 'in'), FX.tween(300, e => { hands = 1 - e; }, 'in')]);
    band.done = true;
  }

  class Stage {
    constructor(root, params) {
      this.root = root;
      this.ch = Store.data.ch;
      this.busy = false; this.ended = false;
      this.build();
      if (params.resume && this.ch.run) this.st = this.ch.run;
      else this.st = this.newState(params.mode || 'normal');
      this.ch.run = this.st; Store.save();
      this.rng = R.rng(this.st.seed);
      this.m = R.mods(this.ch.charms, this.st.mode);
      this.view = new BoardView({ cellsEl: this.cellsEl, trayEl: this.trayEl, reelEls: this.reelSlots, onPlace: (k, r, c, p) => this.place(k, r, c, p), canDrag: () => !this.busy && !this.ended && !UI.openDialogs.length, showFit: true });
      this.view.setBoard(this.st.board); this.view.setTray(this.st.tray);
      this.view.region = { cells: this.st.region, lit: this.st.pips, pop: [0, 0, 0, 0] };
      this.view.reel = this.st.reel.map(f => ({ fruit: f }));
      this.hud(true);
      window.TB.stage = this;
      if (!Store.data.seenHelp.stage) { Store.data.seenHelp.stage = true; Store.save(); setTimeout(() => Screens.help('stage'), 500); }
      if (!params.resume) this.intro();
    }
    newState(mode) {
      const seed = R.seed(), rng = R.rng(seed), stage = this.ch.stage;
      const m = R.mods(this.ch.charms, mode);
      const board = R.startBoard(rng, stage);
      return {
        stage, mode, board, region: R.region(rng, board), pips: 0, reel: R.reel(rng, m), tray: R.deal(rng, board, 2),
        sets: C.MODES[mode].sets + m.sets, coins: 0, tickets: 0, lines: 0, bestWin: 0, combo: 0, goalHit: false, seed: rng.int(4294967296)
      };
    }
    goal() { return C.GOALS[this.st.stage - 1]; }

    // ---------------------------------------------------------------- DOM
    build() {
      const r = this.root;
      const top = UI.el('div', 'st-top', r);
      const pill = UI.el('div', 'pill cur', top);
      UI.icon('coin', 'ci', pill); this.coinEl = UI.el('span', 'cv', pill); UI.el('i', 'sep', pill); UI.icon('ticket', 'ci tk', pill); this.tkEl = UI.el('span', 'cv', pill);
      UI.el('div', 'grow', top);
      UI.round('help', '', () => Screens.help('stage'), top, 'sm');
      UI.round('pause', 'green', () => this.pause(), top, 'sm');
      UI.el('div', 'flex-gap g1', r);
      const hud = UI.el('div', 'st-hud', r);
      const g = UI.el('div', 'hud-plq', hud); UI.el('div', 'hl', g).textContent = T.stage.goal;
      const gv = UI.el('div', 'hv', g); UI.icon('coin', 'hc', gv); this.goalEl = UI.el('span', '', gv);
      const med = UI.el('div', 'medal', hud); this.medEl = UI.el('span', '', med);
      const s = UI.el('div', 'hud-plq', hud); UI.el('div', 'hl', s).textContent = T.stage.sets; this.setsEl = UI.el('div', 'hv', s);
      UI.el('div', 'flex-gap g2', r);
      const bw = UI.el('div', 'board-wrap crest', r);
      this.cellsEl = UI.el('div', 'cells', bw);
      const reel = UI.el('div', 'reel', r);
      this.reelSlots = [];
      const rs = UI.el('div', 'reel-slots', reel); for (let k = 0; k < N; k++) this.reelSlots.push(UI.el('div', 'rs', rs));
      UI.el('div', 'flex-gap g3', r);
      const tw = UI.el('div', 'tray-wrap', r);
      this.trayEl = UI.el('div', 'tray', tw); for (let k = 0; k < 3; k++) UI.el('div', 'bay', this.trayEl);
      UI.round('bag', '', () => Screens.bag(this.ch.charms), tw, 'bag');
      UI.el('div', 'flex-gap g4', r);
    }
    hud(instant) {
      const st = this.st;
      this.coinEl.textContent = T.num(this.ch.coins); this.tkEl.textContent = T.num(this.ch.tickets);
      this.goalEl.textContent = T.num(st.coins) + ' / ' + T.num(this.goal());
      this.goalEl.parentNode.classList.toggle('met', st.coins >= this.goal());
      this.medEl.textContent = st.stage + '/' + C.STAGES;
      this.setsEl.textContent = st.sets;
      this.setsEl.classList.toggle('low', st.sets <= 3);
    }
    addCoins(n, from) {
      if (!n) return;
      const st = this.st, before = st.coins;
      st.coins += n; this.ch.coins += n;
      UI.countTo(this.goalEl, before, st.coins, 600, v => T.num(v) + ' / ' + T.num(this.goal()));
      UI.countTo(this.coinEl, this.ch.coins - n, this.ch.coins, 600);
      UI.bump(this.goalEl.parentNode);
      this.goalEl.parentNode.classList.toggle('met', st.coins >= this.goal());
      if (from) { const to = UI.rect(this.goalEl.parentNode.querySelector('.hc')); for (let i = 0; i < Math.min(8, 2 + Math.floor(n / 15)); i++) FX.fly('icon/coin', from, [to.cx, to.cy], { size: 30, dur: 520 + i * 40, onArrive: () => Snd.play('coin') }); }
      if (!st.goalHit && st.coins >= this.goal()) { st.goalHit = true; setTimeout(() => { UI.toast(T.stage.goalReached); Snd.play('new_best'); }, 300); }
    }
    addTickets(n, from) {
      if (!n) return;
      this.st.tickets += n; this.ch.tickets += n;
      const to = UI.rect(this.tkEl.previousSibling);
      for (let i = 0; i < n; i++) FX.fly('icon/ticket', from || [UI.W / 2, UI.H / 2], [to.cx, to.cy], { size: 34, dur: 600 + i * 90, onArrive: () => { Snd.play('ticket'); UI.bump(this.tkEl); } });
      setTimeout(() => UI.countTo(this.tkEl, this.ch.tickets - n, this.ch.tickets, 300), 600 / FX.sp());
    }
    save() { this.st.seed = this.rng.int(4294967296); this.ch.run = this.st; Store.save(); this.rng = R.rng(this.st.seed); }

    async intro() {
      this.busy = true;
      const cells = []; for (let i = 0; i < N * N; i++) if (this.st.board[i]) cells.push(i);
      cells.forEach(i => { this.view.cellFx[i] = { s: 0, a: 0 }; });
      this.view.reel.forEach(it => { it.a = 0; it.dy = -30; });
      await FX.wait(150);
      Snd.play('whoosh');
      await FX.tween(420, e => cells.forEach((i, k) => { const f = this.view.cellFx[i]; const d = Math.min(1, Math.max(0, e * 1.6 - (i % N + Math.floor(i / N)) / 24)); if (f) { f.s = FX.ease.back(d); f.a = d; } }), 'lin');
      cells.forEach(i => { this.view.cellFx[i] = null; });
      await FX.tween(300, e => this.view.reel.forEach((it, k) => { const d = Math.min(1, Math.max(0, e * 1.8 - k / 10)); it.a = d; it.dy = -30 * (1 - FX.ease.back(d)); }), 'lin');
      await this.view.dealIn(this.st.tray);
      this.busy = false;
    }

    // ---------------------------------------------------------------- a move
    async place(k, r, c, piece) {
      if (this.busy || this.ended) return;
      this.busy = true;
      const st = this.st, pc = C.PIECE[piece.id];
      st.tray[k] = null;
      st.board = R.place(st.board, pc, r, c, piece.color);
      this.view.setBoard(st.board);
      Snd.play('place');
      const cells = pc.cells.map(([dr, dc]) => [r + dr, c + dc]);
      this.view.placePop(cells);
      st.sets--;
      if (this.m.spare && this.rng() < this.m.spare) { st.sets++; const sr = UI.rect(this.setsEl); FX.float(T.stage.plusSet, sr.cx, sr.cy + 30, { size: 26, fill: 'green' }); Snd.play('shimmer'); }
      this.hud();
      const full = R.fullLines(st.board);
      if (full.count) { st.combo++; await this.clearLines(full); } else st.combo = 0;
      if (st.tray.every(p => !p) && st.sets > 0) { st.tray = R.deal(this.rng, st.board, 2); this.save(); await this.view.dealIn(st.tray); }
      this.save();
      if (st.sets === 3) { UI.toast(T.f(T.stage.lastSets, { n: 3 })); Snd.play('warn'); }
      if (st.sets <= 0) return this.end(false);
      if (!R.anyMove(st.board, st.tray)) {
        // no block fits: the temple reshapes the tray instead of ending the stage (sets are the limit)
        UI.toast(T.stage.reshape); Snd.play('refresh');
        st.tray = R.deal(this.rng, st.board, 1); this.save();
        await FX.wait(300); await this.view.dealIn(st.tray);
      }
      this.busy = false;
    }

    async clearLines(full) {
      const st = this.st, m = this.m, view = this.view, n = full.count;
      const lines = R.linesList(full);
      const map = new Map();
      lines.forEach(l => R.lineCells(l).forEach(([rr, cc]) => map.set(rr * N + cc, [rr, cc])));
      const cells = [...map.values()], colors = cells.map(([rr, cc]) => st.board[rr * N + cc]);
      const coinsBefore = st.coins;
      Snd.play('clear', { i: Math.min(3, n - 1) }); Snd.play('line_sweep');
      await view.shatter(cells, colors);
      st.board = R.clear(st.board, full); view.setBoard(st.board);
      st.lines += n;
      // +10 per line
      const per = Math.round(C.CLEAR_COINS * (1 + m.clearMult)) * m.mode, a = view.area();
      lines.forEach(l => {
        const p = l.type === 'row' ? [a.x + a.w - 24, a.y + (l.i + 0.5) * a.w / N] : [a.x + (l.i + 0.5) * a.w / N, a.y + a.h - 18];
        FX.float('+' + per, p[0], p[1], { icon: 'icon/coin', size: 22, fill: 'white', rise: 26, dur: 1000 });
      });
      this.addCoins(per * n);
      // fruit spin across the cleared lines
      const won = await this.spin(lines, cells);
      // multi-line banner (3 LINES +204 · ORANGE ×10)
      const gained = st.coins - coinsBefore;
      if (n >= 2 && won.top) { lineBanner(T.f(T.stage.lines, { n }), gained, T.f(T.stage.fruitX, { fruit: T.fruits[won.top.fruit].toUpperCase(), n: won.top.count })); await FX.wait(1250); }
      if (n >= C.BIG_CLEAR_LINES) {
        const rows = full.rows.length ? full.rows : null;
        const mid = rows ? a.y + (Math.min(...rows) + Math.max(...rows) + 1) / 2 * a.w / N : null;
        await bigClear(view, mid);
        praiseBanner(R.praise(n), st.coins - coinsBefore, st.combo, 'onboard');
        await FX.wait(900);
      } else if (n === 2 || st.combo >= 2) {
        praiseBanner(R.praise(n), st.coins - coinsBefore, st.combo, 'onboard');
      }
      // region charge + bonus spin
      await this.charge(n + (m.charge || 0));
      if (R.isEmpty(st.board)) { await Screens.sunEmblem(view); }
      st.bestWin = Math.max(st.bestWin, st.coins - coinsBefore);
      this.hud();
    }

    // spin every cell of the cleared lines; returns { total, top: {fruit, count} }
    async spin(lines, cells) {
      const st = this.st, m = this.m, view = this.view, n = lines.length;
      const res = R.spin(this.rng, cells, st.reel, m, false), at = new Map(res.map(x => [x.r * N + x.c, x]));
      const cols = [...new Set(cells.map(([, cc]) => cc))];
      await this.feedFromReel(cells, cols);
      await this.land(res);
      // evaluate line by line
      let total = 0; const fruitCount = {};
      const tickets = res.filter(x => x.ticket);
      for (const l of lines) {
        const lc = R.lineCells(l), lres = lc.map(([rr, cc]) => at.get(rr * N + cc));
        const ev = R.evalSpin(lres, m, false);
        if (!ev.groups.length && !ev.total) continue;
        ev.groups.forEach(g => { fruitCount[g.fruit] = (fruitCount[g.fruit] || 0) + g.count; });
        total += await this.showWin(l, lc, ev);
      }
      if (tickets.length) {
        tickets.forEach(x => { const [px, py] = view.cellCenter(x.r, x.c); this.addTickets(1, [px, py]); const f = view.fruits[x.r * N + x.c]; if (f) f.ticket = false; });
      }
      const mult = R.multiLineMult(n, m);
      let pay = Math.round(total * mult) * m.mode;
      if (mult > 1 && total) { const a = view.area(); FX.float('×' + mult.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''), a.x + a.w / 2, a.y + a.h * 0.3, { size: 34, fill: 'green' }); }
      const a = view.area();
      this.addCoins(pay, [a.x + a.w / 2, a.y + a.h / 2]);
      await FX.wait(pay ? 350 : 150);
      // fade the fruit out, refill the reel
      await FX.tween(260, e => cells.forEach(([rr, cc]) => { const f = view.fruits[rr * N + cc]; if (f) f.a = 1 - e; }));
      cells.forEach(([rr, cc]) => { view.fruits[rr * N + cc] = null; });
      FX.tween(250, e => { view.dim = 0.5 * (1 - e); });
      const rollCols = lines.some(l => l.type === 'row') ? [0, 1, 2, 3, 4, 5, 6, 7] : cols;
      await this.rerollReel(rollCols);
      let top = null; for (const [fruit, count] of Object.entries(fruitCount)) if (!top || count > top.count) top = { fruit, count };
      return { total: pay, top };
    }
    async feedFromReel(cells, cols) {
      const view = this.view, st = this.st;
      FX.tween(200, e => { view.dim = 0.5 * e; });
      Snd.play('reel_spin');
      const flights = [];
      cols.forEach(cc => {
        const [rx, ry, rh] = view.reelCenter(cc), fruit = st.reel[cc];
        view.reel[cc].a = 0;
        cells.filter(([, c2]) => c2 === cc).forEach(([rr], k) => {
          const [tx, ty] = view.cellCenter(rr, cc);
          flights.push(FX.wait(k * 30).then(() => FX.fly('fruit/' + fruit, [rx, ry], [tx, ty], { size: rh * 0.8, dur: 380, arc: -40 })).then(() => {
            view.fruits[rr * N + cc] = { spin: true, phase: Math.random(), seed: Math.floor(Math.random() * 8) };
          }));
        });
      });
      await Promise.all(flights);
      await FX.wait(420);
    }
    async land(res) {
      const view = this.view;
      const order = res.slice().sort((a, b) => a.c - b.c || a.r - b.r);
      for (let k = 0; k < order.length; k++) {
        const x = order[k];
        view.fruits[x.r * N + x.c] = { fruit: x.fruit, ticket: x.ticket, s: 1.3, dy: -8 };
        const f = view.fruits[x.r * N + x.c];
        FX.tween(220, e => { f.s = 1.3 - 0.3 * e; f.dy = -8 * (1 - e); }, 'back');
        Snd.play('fruit_land', { i: Math.min(3, Math.floor(k / Math.max(1, order.length / 4))) });
        await FX.wait(order.length > 12 ? 28 : 55);
      }
      await FX.wait(220);
    }
    async showWin(line, lc, ev) {
      const view = this.view, cols = ['#ffffff', '#ffe066', '#9dff9a'];
      ev.groups.forEach((g, gi) => g.cells.forEach(k => { const [rr, cc] = lc[k], f = view.fruits[rr * N + cc]; if (f) { f.hi = 0; f.hiCol = cols[gi % 3]; } }));
      await FX.tween(200, e => ev.groups.forEach(g => g.cells.forEach(k => { const [rr, cc] = lc[k], f = view.fruits[rr * N + cc]; if (f) f.hi = e; })));
      // payout label above the line (base first, then boosted by charms)
      const pts = lc.map(([rr, cc]) => view.cellCenter(rr, cc));
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = Math.min(...pts.map(p => p[1])) - view.cs() * 0.85;
      const lab = FX.payout(line.type === 'row' ? cx : cx, line.type === 'row' ? cy : view.area().y + view.cs() * 0.4, ev.base || ev.total, { hold: 1.1 });
      Snd.play(ev.total >= 40 ? 'win_big' : 'win_small');
      if (ev.groups[0]) FX.bigFruit(ev.groups[0].fruit, cx, line.type === 'row' ? pts[0][1] : view.area().y + view.area().h / 2, ev.groups[0].count, { size: view.cs() * 1.9 });
      if (ev.total !== ev.base && ev.base) { await FX.wait(450); lab.set(ev.total); Snd.play('coin'); }
      await FX.wait(650);
      return ev.total;
    }
    async rerollReel(cols) {
      const view = this.view, st = this.st;
      cols.forEach(cc => { st.reel[cc] = R.coldFruit(this.rng, this.m); view.reel[cc] = { fruit: st.reel[cc], a: 0, dy: -40 }; });
      await FX.tween(320, e => cols.forEach((cc, k) => { const it = view.reel[cc], d = Math.min(1, Math.max(0, e * 1.6 - k / 12)); it.a = d; it.dy = -40 * (1 - FX.ease.back(d)); }), 'lin');
    }

    // ---------------------------------------------------------------- region
    async charge(k) {
      const st = this.st, reg = this.view.region;
      for (let i = 0; i < k && st.pips < C.REGION_SIZE; i++) {
        st.pips++; reg.lit = st.pips;
        const j = st.pips - 1;
        Snd.play('pip', { i: j });
        await FX.tween(220, e => { reg.pop[j] = Math.sin(e * Math.PI) * 0.6; });
      }
      if (st.pips >= C.REGION_SIZE) await this.bonusSpin();
    }
    async bonusSpin() {
      const st = this.st, view = this.view, m = this.m, reg = view.region;
      Snd.play('region_full');
      const a = view.area();
      await FX.wait(300);
      lineBanner(T.stage.bonus, null, null);
      Snd.play('bonus_spin');
      await FX.wait(500);
      const cells = st.region.map(([r, c]) => [r, c]);
      const res = R.spin(this.rng, cells, st.reel, m, true);
      const cols = [...new Set(cells.map(([, c]) => c))];
      await this.feedFromReel(cells, cols);
      await this.land(res);
      const ev = R.evalSpin(res, m, true);
      const pts = cells.map(([r, c]) => view.cellCenter(r, c));
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = Math.min(...pts.map(p => p[1])) - view.cs() * 0.9;
      if (ev.groups.length) {
        const cl = ['#ffffff', '#ffe066'];
        ev.groups.forEach((g, gi) => g.cells.forEach(k => { const [r, c] = cells[k], f = view.fruits[r * N + c]; if (f) { f.hiCol = cl[gi % 2]; f.hi = 1; } }));
        const lab = FX.payout(cx, cy, ev.base, { hold: 1.3 });
        Snd.play('win_big');
        FX.bigFruit(ev.groups[0].fruit, cx, pts[0][1], ev.groups[0].count, { size: view.cs() * 2 });
        await FX.wait(500); lab.set(ev.total); Snd.play('coin');
        await FX.wait(700);
      } else if (ev.total) { FX.payout(cx, cy, ev.total, { hold: 0.9 }); await FX.wait(700); }
      const tickets = res.filter(x => x.ticket);
      tickets.forEach(x => { const [px, py] = view.cellCenter(x.r, x.c); this.addTickets(1, [px, py]); });
      this.addCoins(ev.total * m.mode, [cx, cy + 40]);
      st.bestWin = Math.max(st.bestWin, ev.total * m.mode);
      await FX.wait(300);
      await FX.tween(260, e => cells.forEach(([r, c]) => { const f = view.fruits[r * N + c]; if (f) f.a = 1 - e; }));
      cells.forEach(([r, c]) => { view.fruits[r * N + c] = null; });
      FX.tween(250, e => { view.dim = 0.5 * (1 - e); });
      st.pips = 0; reg.lit = 0;
      await this.rerollReel(cols);
    }

    // ---------------------------------------------------------------- end / pause
    async end(stuck) {
      this.ended = true; this.busy = true;
      const st = this.st, ch = this.ch, goal = this.goal(), win = st.coins >= goal;
      if (stuck) { UI.toast(T.stage.noRoom); Snd.play('invalid'); }
      await FX.wait(700);
      ch.run = null; ch.shop = null;
      ch.charms = ch.charms.filter(c => C.CHARM[c.id] && C.CHARM[c.id].dur === 'run');
      let reward = 0;
      if (win) {
        reward = C.STAGE_TICKETS + C.STAGE_TICKETS_BONUS.filter(k => st.coins >= k * goal).length;
        ch.tickets += reward;
        ch.best = Math.max(ch.best || 0, st.stage);
        if (st.stage >= C.STAGES) { ch.done = true; Store.data.daily.weeklyWeek = ch.week; }
        else ch.stage = st.stage + 1;
      }
      Store.save();
      Screens.stageResult({ win, stage: st.stage, coins: st.coins, goal, reward, lines: st.lines, best: st.bestWin, weekDone: win && ch.done });
    }
    pause() {
      if (this.ended) return;
      Screens.pause({
        onRestart: () => {
          const ch = this.ch;
          const e = Store.tick();
          if (ch.energy < 1) { Screens.noEnergy(); return; }
          ch.energy--; if (ch.energy === C.ENERGY_MAX - 1) ch.energyTs = Date.now();
          ch.run = null; Store.save();
          Snd.play('heart');
          UI.go('stage', { mode: this.st.mode });
        },
        onHome: () => { this.save(); UI.go('home'); },
        confirm: T.pause.confirm
      });
    }
    destroy() { this.view.destroy(); if (window.TB.stage === this) window.TB.stage = null; }
  }

  window.TB = window.TB || {};
  window.Stage = Stage;
  window.StageFX = { praiseBanner, lineBanner, bigClear };
})();
