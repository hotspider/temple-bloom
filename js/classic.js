// Temple Bloom — Classic mode: endless 8×8 block puzzle with score, best, combos and praise.
(function () {
  const C = window.CFG, R = window.RULES, T = window.TEXT, N = C.N;

  class Classic {
    constructor(root, params) {
      this.root = root; this.busy = false; this.over = false;
      this.data = Store.data.classic;
      this.build();
      const g = !params.fresh && this.data.game;
      this.rng = R.rng(R.seed());
      if (g) this.st = g;
      else { const b = R.empty(); this.st = { board: b, tray: R.deal(this.rng, b, 1), score: 0, combo: 0, lines: 0 }; this.data.game = this.st; this.data.played++; Store.save(); }
      this.view = new BoardView({ cellsEl: this.cellsEl, trayEl: this.trayEl, onPlace: (k, r, c, p) => this.place(k, r, c, p), canDrag: () => !this.busy && !this.over && !UI.openDialogs.length, showFit: true });
      this.view.setBoard(this.st.board);
      this.hud();
      window.TB.classic = this;
      if (!Store.data.seenHelp.classic) { Store.data.seenHelp.classic = true; Store.save(); setTimeout(() => Screens.help('classic'), 450); }
      this.view.dealIn(this.st.tray);
      if (!R.anyMove(this.st.board, this.st.tray)) setTimeout(() => this.gameOver(), 600);
    }
    build() {
      const r = this.root;
      const top = UI.el('div', 'cl-top', r);
      this.logo = UI.img('ui/logo', 'cl-logo', top);
      UI.round('pause', 'green', () => this.pause(), top, 'sm cl-pause');
      UI.el('div', 'flex-gap g1', r);
      const hud = UI.el('div', 'cl-hud', r);
      const s = UI.el('div', 'hud-plq', hud); UI.el('div', 'hl', s).textContent = T.classic.score; this.scoreEl = UI.el('div', 'hv', s);
      const b = UI.el('div', 'hud-plq', hud); UI.el('div', 'hl', b).textContent = T.classic.best; this.bestEl = UI.el('div', 'hv', b);
      UI.el('div', 'flex-gap g2', r);
      const bw = UI.el('div', 'board-wrap plain', r);
      this.cellsEl = UI.el('div', 'cells', bw);
      UI.el('div', 'flex-gap g3', r);
      const tw = UI.el('div', 'tray-wrap classic', r);
      this.trayEl = UI.el('div', 'tray', tw); for (let k = 0; k < 3; k++) UI.el('div', 'bay', this.trayEl);
      UI.el('div', 'flex-gap g4', r);
      const nav = UI.el('div', 'cl-nav', r);
      const nb = (icon, label, fn) => { const e = UI.el('button', 'navbtn', nav); UI.icon(icon, '', e); UI.el('span', '', e).textContent = label; UI.tap(e, fn); return e; };
      nb('home', T.classic.home, () => { this.save(); UI.go('home'); });
      nb('help', T.classic.help, () => Screens.help('classic'));
      this.sndBtn = nb(Store.data.settings.sound ? 'sound' : 'sound_off', T.classic.sound, () => { Screens.setSound(!Store.data.settings.sound); this.sndBtn.querySelector('img').src = Assets.url('icon/' + (Store.data.settings.sound ? 'sound' : 'sound_off')); });
      UI.el('div', 'flex-gap g5', r);
    }
    hud() {
      this.scoreEl.textContent = T.num(this.st.score);
      this.bestEl.textContent = T.num(Math.max(this.data.best, this.st.score));
    }
    save() { this.st.board = this.view.board.slice(); this.data.game = this.over ? null : this.st; this.data.best = Math.max(this.data.best, this.st.score); Store.save(); }
    addScore(n) {
      const before = this.st.score; this.st.score += n;
      UI.countTo(this.scoreEl, before, this.st.score, 500);
      if (this.st.score > this.data.best) UI.countTo(this.bestEl, Math.max(before, this.data.best), this.st.score, 500);
      UI.bump(this.scoreEl.parentNode);
    }
    async place(k, r, c, piece) {
      if (this.busy || this.over) return;
      this.busy = true;
      const st = this.st, pc = C.PIECE[piece.id];
      st.tray[k] = null;
      st.board = R.place(st.board, pc, r, c, piece.color); this.view.setBoard(st.board);
      Snd.play('place');
      this.view.placePop(pc.cells.map(([dr, dc]) => [r + dr, c + dc]));
      this.addScore(pc.cells.length * C.CLASSIC.perCell);
      const full = R.fullLines(st.board);
      if (full.count) {
        st.combo++; st.lines += full.count;
        const lines = R.linesList(full), map = new Map();
        lines.forEach(l => R.lineCells(l).forEach(([rr, cc]) => map.set(rr * N + cc, [rr, cc])));
        const cells = [...map.values()], colors = cells.map(([rr, cc]) => st.board[rr * N + cc]);
        Snd.play('clear', { i: Math.min(3, full.count - 1) }); Snd.play('line_sweep');
        await this.view.shatter(cells, colors);
        st.board = R.clear(st.board, full); this.view.setBoard(st.board);
        let pts = R.classicClear(full.count, st.combo);
        const allClear = R.isEmpty(st.board);
        if (allClear) pts += C.CLASSIC.allClear;
        const a = this.view.area();
        FX.float('+' + T.num(pts), a.x + a.w / 2, a.y + a.h / 2, { size: 44, fill: 'white', dur: 1000 });
        this.addScore(pts);
        const word = allClear ? 'unbelievable' : R.praise(full.count);
        this.praise(word, pts, st.combo);
        if (full.count >= C.BIG_CLEAR_LINES && !allClear) {
          const mid = full.rows.length ? a.y + (Math.min(...full.rows) + Math.max(...full.rows) + 1) / 2 * a.w / N : null;
          await StageFX.bigClear(this.view, mid);
        }
        if (allClear) await Screens.sunEmblem(this.view);
      } else st.combo = 0;
      if (st.tray.every(p => !p)) { st.tray = R.deal(this.rng, st.board, 1); this.save(); await this.view.dealIn(st.tray); }
      this.save();
      if (!R.anyMove(st.board, st.tray)) { this.busy = false; return this.gameOver(); }
      this.busy = false;
    }
    praise(word, pts, combo) {
      // the banner takes the logo's place at the top of the screen, like the reference
      this.logo.classList.add('hid');
      StageFX.praiseBanner(word, pts, combo, 'top');
      clearTimeout(this._lt); this._lt = setTimeout(() => this.logo.classList.remove('hid'), 1800 / FX.sp());
    }
    async gameOver() {
      if (this.over) return;
      this.over = true;
      await FX.wait(500);
      const st = this.st, isBest = st.score > this.data.best && st.score > 0;
      this.data.best = Math.max(this.data.best, st.score); this.data.game = null; Store.save();
      Snd.play(isBest ? 'new_best' : 'game_over');
      const body = UI.el('div', 'res');
      if (isBest) UI.gt(T.classic.newBest, 'res-best', body);
      const row = (l, v) => { const e = UI.el('div', 'res-row', body); UI.el('span', '', e).textContent = l; UI.el('b', '', e).textContent = v; };
      row(T.classic.score, T.num(st.score)); row(T.classic.best, T.num(this.data.best));
      UI.dialog({ title: T.classic.overTitle, body, noClose: true, buttons: [
        { label: T.classic.home2, kind: 'dark', fn: () => UI.go('home') },
        { label: T.classic.again, kind: 'green', id: 'again', fn: () => UI.go('classic', { fresh: true }) }] });
    }
    pause() {
      Screens.pause({
        onRestart: () => { this.data.game = null; Store.save(); UI.go('classic', { fresh: true }); },
        onHome: () => { this.save(); UI.go('home'); },
        confirm: T.pause.confirmClassic
      });
    }
    destroy() { this.view.destroy(); if (window.TB.classic === this) window.TB.classic = null; }
  }
  window.TB = window.TB || {};
  window.Classic = Classic;
})();
