// Temple Bloom — screens (loading, home, Bloom Challenge, Charm Shop, Daily Collection, stage, classic)
// and shared dialogs (pause, help, charms bag + paytable, codex, stage result, energy, card draw).
(function () {
  const C = window.CFG, R = window.RULES, T = window.TEXT;
  const Screens = {};
  const f = T.f;

  // ------------------------------------------------------------------ shared bits
  function topBar(root, title, right) {
    const bar = UI.el('div', 'topbar', root);
    UI.round('home', '', () => UI.go('home'), bar, 'home-btn');
    const tb = UI.el('div', 'title-banner', bar); UI.gt(title, 'tt', tb);
    if (right) bar.appendChild(right); else UI.el('div', 'tb-spacer', bar);
    return bar;
  }
  // scale the altar block to the height the screen has left (tall phones get a bigger altar, no empty band)
  function fitAltar(root) {
    const mid = root.querySelector('.mid'), alt = root.querySelector('.altar');
    if (!mid || !alt) return;
    alt.style.transform = ''; alt.style.marginTop = ''; alt.style.marginBottom = '';
    const avail = mid.clientHeight, baseH = 805, baseW = 610;
    const k = Math.max(0.86, Math.min(UI.W / baseW * 0.985, avail / baseH));
    const extra = Math.max(0, avail - baseH * k);
    alt.style.transformOrigin = 'top center';
    alt.style.transform = `scale(${k.toFixed(4)})`;
    alt.style.marginTop = (-6 + extra * 0.35) + 'px';
    alt.style.marginBottom = (baseH * (k - 1)) + 'px';
  }
  function fitLater(scr) { requestAnimationFrame(() => fitAltar(scr.root)); scr.onResize = () => fitAltar(scr.root); }
  function ribbon(parent, text, cls) { const r = UI.el('div', 'ribbon ' + (cls || ''), parent); r.textContent = text; return r; }
  function fmtTime(ms) { const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
  function charmName(id) { return (T.charms[id] || [id])[0]; }
  function charmFx(id) { return (T.charms[id] || ['', ''])[1]; }
  function charmWhen(id) { const w = T.charmWhen[id] || (id.startsWith('fruit_') ? 'eachSpin' : 'eachSpin'); return T.shop[w]; }
  function charmDur(id) { return C.CHARM[id].dur === 'run' ? T.shop.thisRun : T.shop.thisStage; }
  Screens.setSound = function (on) { Store.data.settings.sound = on; Store.save(); Snd.setSfx(on); Snd.setMusic(on); if (on) Snd.play('toggle'); };
  Screens.setMotion = function (on) { Store.data.settings.motion = on; Store.save(); FX.reduced = on; document.body.classList.toggle('reduced', on); };

  // ambient hummingbird + motes on menu screens
  function ambient(root) {
    let t = Math.random() * 10, alive = true;
    const bird = FX.addScene((c, tt, dt) => {
      if (!alive || !root.isConnected) return;
      t += dt;
      const x = UI.W * (0.5 + 0.42 * Math.sin(t * 0.23)), y = UI.H * (0.42 + 0.18 * Math.sin(t * 0.37 + 1));
      const dir = Math.cos(t * 0.23) >= 0 ? 1 : -1;
      c.save(); c.translate(x, y); c.scale(dir * 0.55, 0.55); c.globalCompositeOperation = 'lighter';
      FX.sprite(c, 'fx/bird_' + (Math.floor(tt * 18) % 2), 0, 0, 160, 128, 0, 0.9); c.restore();
      for (let i = 0; i < 14; i++) { const px = (i * 97 + tt * 12 * (1 + i % 3)) % UI.W, py = UI.H * 0.2 + ((i * 173 + Math.sin(tt * 0.5 + i) * 40) % (UI.H * 0.6)); c.save(); c.globalAlpha = 0.35 + 0.35 * Math.sin(tt * 2 + i); c.globalCompositeOperation = 'lighter'; FX.sprite(c, 'fx/sparkle', px, py, 14, 14); c.restore(); }
    });
    return () => { alive = false; FX.removeScene(bird); };
  }
  let torchTimer = 0;
  Screens.torches = function () {
    const tw = document.getElementById('torches');
    if (tw.children.length) return;
    [[108, 792], [972, 792]].forEach(([x, y]) => { const e = UI.el('img', 'flame', tw); e.style.left = (x / 1080 * 100) + '%'; e.style.top = (y / 1920 * 100) + '%'; e.src = Assets.url('fx/flame_0'); e.alt = ''; });
    let k = 0; clearInterval(torchTimer);
    torchTimer = setInterval(() => { k = (k + 1) % 4; for (const e of tw.children) e.src = Assets.url('fx/flame_' + ((k + (e === tw.firstChild ? 0 : 2)) % 4)); }, 95);
  };

  // ------------------------------------------------------------------ loading
  UI.register('loading', {
    enter(root) {
      UI.setBg('temple');
      root.classList.add('loading');
      this.sign = UI.el('div', 'ld-sign', root);
      UI.el('div', 'flex-gap', root);
      this.gems = UI.el('div', 'ld-gems', root);
      UI.el('div', 'flex-gap', root);
      const bar = UI.el('div', 'ld-bar', root); this.fill = UI.el('div', 'ld-fill', bar); this.pct = UI.el('div', 'ld-pct', bar); this.pct.textContent = '0%';
      this.msg = UI.el('div', 'ribbon ld-msg', root); this.msg.textContent = T.loading.preparing;
      UI.el('div', 'flex-gap small', root);
    },
    progress(p) { this.fill.style.width = (p * 100).toFixed(1) + '%'; this.pct.textContent = Math.round(p * 100) + '%'; },
    ready() { this.msg.textContent = T.loading.ready; this.progress(1); },
    art() { // images arrive after the manifest; set them once loaded
      this.sign.style.backgroundImage = `url(${Assets.url('ui/logo_sign')})`; this.gems.style.backgroundImage = `url(${Assets.url('ui/gems')})`;
    }
  });

  // ------------------------------------------------------------------ home
  UI.register('home', {
    enter(root) {
      Store.tick();
      UI.setBg('temple'); Screens.torches(); Snd.music('home');
      const ch = Store.data.ch, dl = Store.data.daily;
      const gift = UI.round('gift', '', () => UI.go('daily'), root, 'gift-btn');
      if (dailyAttention()) UI.el('i', 'dot', gift);
      UI.el('div', 'flex-gap h0', root);
      UI.img('ui/logo', 'home-logo', root);
      UI.el('div', 'flex-gap h1', root);
      const sign = UI.el('div', 'home-sign', root);
      const inner = UI.el('div', 'hs-inner', sign);
      UI.gt(T.home.classic, 'hs-title', inner);
      const best = UI.el('div', 'ribbon hs-best', inner); best.textContent = T.home.best + '  ' + T.num(Store.data.classic.best);
      UI.btn(T.home.play, 'green', () => UI.go('classic', {}), sign, 'hs-play');
      UI.el('div', 'flex-gap h2', root);
      const slot = UI.el('div', 'home-slot', root);
      const badge = UI.el('div', 'slot-badge', slot);
      const reels = UI.el('div', 'sb-reels', badge);
      this.reels = [0, 1, 2].map(k => { const w = UI.el('div', 'sb-win', reels); const strip = UI.el('div', 'sb-strip', w); C.FRUITS.concat(C.FRUITS).forEach(fr => UI.img('fruit/' + fr.id, '', strip)); strip.style.animationDelay = (-k * 0.37) + 's'; strip.style.animationDuration = (2.6 + k * 0.4) + 's'; return strip; });
      const lab = UI.el('div', 'panel sb-label', slot); UI.el('div', 'sb-l1', lab).textContent = T.home.slot;
      UI.el('div', 'ribbon sb-l2', lab).textContent = ch.done ? T.home.done : f(T.home.stage, { n: ch.stage, t: C.STAGES });
      UI.tap(slot, () => UI.go('challenge'));
      UI.el('div', 'flex-gap h3', root);
      this.stopAmb = ambient(root);
    },
    leave() { if (this.stopAmb) this.stopAmb(); }
  });
  function dailyAttention() { const d = Store.data.daily, today = R.dayId(); return d.cardReady || d.last !== today || (d.weeklyWeek === Store.data.ch.week && !d.weeklyClaimed); }

  // ------------------------------------------------------------------ challenge
  UI.register('challenge', {
    enter(root) {
      Store.tick();
      UI.setBg('temple'); Screens.torches(); Snd.music('home');
      const ch = Store.data.ch;
      const book = UI.round('book', '', () => Screens.codex(), null, 'book-btn');
      topBar(root, T.challenge.title, book);
      const en = UI.el('div', 'panel energy', root);
      const hearts = UI.el('div', 'hearts', en);
      this.hearts = [0, 1, 2].map(() => UI.icon('heart', '', hearts));
      this.enTxt = UI.el('div', 'en-txt', en);
      ribbon(root, ch.done ? f(T.challenge.weekDone, { t: C.STAGES }) : f(T.challenge.week, { n: ch.stage, t: C.STAGES }), 'wk');
      const mid = UI.el('div', 'mid', root);
      const alt = UI.el('div', 'altar', mid);
      const run = ch.run;
      ['normal', 'double'].forEach((mode, i) => {
        const col = UI.el('div', 'ncol c' + i, alt);
        const n = UI.el('div', 'niche', col); UI.img(mode === 'normal' ? 'charm/coin_crest' : 'charm/combo_crown', 'nicon', n);
        const card = UI.el('div', 'panel ncard', col);
        UI.el('div', 'nc-t', card).textContent = T.challenge[mode];
        UI.el('div', 'nc-l', card).textContent = f(T.challenge.setsPer, { n: C.MODES[mode].sets });
        UI.el('div', 'nc-l', card).textContent = f(T.challenge.coinsX, { n: C.MODES[mode].mult });
        const isRun = run && run.mode === mode;
        const b = UI.btn(isRun ? T.challenge.cont : T.challenge.start, isRun ? 'green' : 'dark', () => this.start(mode), card, 'nc-btn');
        b.dataset.mode = mode;
        if (ch.done || (run && !isRun)) b.classList.add('off');
      });
      const info = UI.el('div', 'panel_gold info', alt); info.textContent = T.challenge.info;
      UI.el('div', 'stairs-txt', alt).textContent = T.challenge.footer;
      this.tickEnergy(); this.timer = setInterval(() => this.tickEnergy(), 1000);
      this.stopAmb = ambient(root);
      fitLater(this);
    },
    tickEnergy() {
      const e = Store.tick(), ch = Store.data.ch;
      this.hearts.forEach((h, i) => { h.src = Assets.url('icon/' + (i < ch.energy ? 'heart' : 'heart_empty')); });
      this.enTxt.textContent = f(T.challenge.energy, { n: ch.energy, m: C.ENERGY_MAX }) + ' · ' + (ch.energy >= C.ENERGY_MAX ? T.challenge.energyFull : f(T.challenge.energyNext, { t: fmtTime(e.next) }));
    },
    start(mode) {
      const ch = Store.data.ch;
      if (ch.run && ch.run.mode === mode) { UI.go('stage', { resume: true }); return; }
      if (ch.done) return;
      Store.tick();
      if (ch.energy < 1) { Screens.noEnergy(); return; }
      ch.pendingMode = mode; Store.save();
      UI.go('shop', { mode });
    },
    leave() { clearInterval(this.timer); if (this.stopAmb) this.stopAmb(); }
  });

  // ------------------------------------------------------------------ shop
  UI.register('shop', {
    enter(root, p) {
      Store.tick();
      UI.setBg('temple'); Screens.torches(); Snd.music('home');
      const ch = Store.data.ch;
      this.mode = p.mode || ch.pendingMode || 'normal';
      if (!ch.shop || ch.shop.stage !== ch.stage) ch.shop = { stage: ch.stage, offers: R.shopOffers(R.rng(R.seed()), ch.charms), sold: [false, false, false], refreshes: 0 };
      Store.save();
      topBar(root, T.shop.title);
      const cur = UI.el('div', 'panel curbar', root);
      UI.icon('coin', 'ci', cur); this.coinEl = UI.el('span', 'cv', cur); UI.el('i', 'sep', cur); UI.icon('ticket', 'ci tk', cur); this.tkEl = UI.el('span', 'cv', cur);
      ribbon(root, f(T.shop.goal, { n: ch.stage, t: C.STAGES, g: C.GOALS[ch.stage - 1] }), 'wk');
      const mid = UI.el('div', 'mid', root);
      this.alt = UI.el('div', 'altar shop', mid);
      ribbon(this.alt, '', 'yours'); this.yoursEl = this.alt.lastChild;
      const inv = UI.el('div', 'panel_gold inv', this.alt);
      this.slots = []; for (let i = 0; i < C.CHARM_SLOTS; i++) { const s = UI.el('div', 'slot', inv); this.slots.push(s); UI.tap(s, () => { const c = Store.data.ch.charms[i]; if (c) Screens.charmInfo(c.id); }, { sound: 'tap' }); }
      UI.el('div', 'foot', this.alt).textContent = T.shop.foot;
      const bot = UI.el('div', 'botbar', root);
      this.refBtn = UI.btn(null, 'dark', () => this.refresh(), bot, 'ref');
      UI.el('span', 'bl', this.refBtn).textContent = T.shop.refresh; const rc = UI.el('span', 'rc', this.refBtn); UI.icon('coin', '', rc); this.refCost = UI.el('b', '', rc);
      UI.btn(f(T.shop.begin, { n: ch.stage }), 'green', () => this.begin(), bot, 'begin');
      this.render();
      fitLater(this);
    },
    render() {
      const ch = Store.data.ch, sh = ch.shop;
      this.coinEl.textContent = T.num(ch.coins); this.tkEl.textContent = T.num(ch.tickets);
      this.alt.querySelectorAll('.ncol').forEach(e => e.remove());
      sh.offers.forEach((id, i) => {
        const col = UI.el('div', 'ncol s' + i, this.alt); this.alt.insertBefore(col, this.alt.firstChild);
        const n = UI.el('div', 'niche', col); if (!sh.sold[i]) UI.img('charm/' + id, 'nicon', n);
        const card = UI.el('div', 'panel ncard' + (sh.sold[i] ? ' sold' : ''), col);
        UI.el('div', 'nc-t', card).textContent = charmName(id);
        UI.el('div', 'nc-l', card).textContent = charmFx(id);
        UI.el('div', 'nc-l dim', card).textContent = charmWhen(id) + ' · ' + charmDur(id);
        const price = UI.el('button', 'price' + (sh.sold[i] ? ' off' : ch.tickets < C.CHARM[id].price ? ' poor' : ''), card);
        if (sh.sold[i]) price.textContent = T.shop.sold;
        else { UI.icon('ticket', '', price); UI.el('b', '', price).textContent = C.CHARM[id].price; UI.tap(price, () => this.buy(i), { sound: false }); }
        price.dataset.i = i;
        UI.tap(n, () => Screens.charmInfo(id));
      });
      this.yoursEl.textContent = f(T.shop.yours, { n: ch.charms.length, m: C.CHARM_SLOTS });
      this.slots.forEach((s, i) => { s.innerHTML = ''; const c = ch.charms[i]; if (c) { UI.img('charm/' + c.id, 'sc', s); if (C.CHARM[c.id].dur === 'stage') UI.el('i', 'stg', s); } else UI.icon('leaf_slot', 'sl', s); });
      const cost = R.refreshCost(sh.refreshes, ch.stage);
      this.refCost.textContent = cost;
      this.refBtn.classList.toggle('poor', ch.coins < cost);
    },
    buy(i) {
      const ch = Store.data.ch, sh = ch.shop, id = sh.offers[i], d = C.CHARM[id];
      if (sh.sold[i]) return;
      if (ch.charms.length >= C.CHARM_SLOTS) { UI.toast(T.shop.full); Snd.play('error'); return; }
      if (ch.tickets < d.price) { UI.toast(T.shop.poor); Snd.play('error'); return; }
      ch.tickets -= d.price; ch.charms.push({ id }); sh.sold[i] = true; Store.save();
      Snd.play('buy');
      const src = this.alt.querySelector('.ncol.s' + i + ' .niche'), r = UI.rect(src), to = UI.rect(this.slots[ch.charms.length - 1]);
      FX.fly('charm/' + id, [r.cx, r.cy], [to.cx, to.cy], { size: 90, dur: 600, arc: -80 }).then(() => { FX.burst(to.cx, to.cy, { n: 10, sprite: 'fx/sparkle', size: 10, speed: 160, gravity: 0 }); });
      FX.burst(r.cx, r.cy, { n: 12, sprite: 'fx/star', size: 12, speed: 200, gravity: 200 });
      UI.toast(f(T.shop.bought, { name: charmName(id) }));
      this.render();
    },
    refresh() {
      const ch = Store.data.ch, sh = ch.shop, cost = R.refreshCost(sh.refreshes, ch.stage);
      if (ch.coins < cost) { UI.toast(T.shop.poorCoins); Snd.play('error'); return; }
      ch.coins -= cost; sh.refreshes++; sh.offers = R.shopOffers(R.rng(R.seed()), ch.charms); sh.sold = [false, false, false]; Store.save();
      Snd.play('refresh');
      this.render();
      this.alt.querySelectorAll('.niche').forEach(n => { n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); });
    },
    begin() {
      const ch = Store.data.ch;
      Store.tick();
      if (ch.energy < 1) { Screens.noEnergy(); return; }
      ch.energy--; if (ch.energy === C.ENERGY_MAX - 1) ch.energyTs = Date.now();
      ch.run = null; Store.save();
      Snd.play('heart');
      UI.go('stage', { mode: this.mode });
    }
  });

  // ------------------------------------------------------------------ daily
  UI.register('daily', {
    enter(root) {
      Store.tick();
      UI.setBg('temple'); Screens.torches(); Snd.music('home');
      topBar(root, T.daily.title);
      this.tabs = UI.el('div', 'days', root);
      this.status = ribbon(root, '', 'wk');
      const mid = UI.el('div', 'mid', root);
      this.alt = UI.el('div', 'altar daily', mid);
      const info = UI.el('div', 'panel_gold info dinfo', this.alt);
      UI.el('div', '', info).textContent = T.daily.info; UI.el('div', 'fine', info).textContent = T.daily.fine;
      const bot = UI.el('div', 'botbar', root);
      this.claimBtn = UI.btn(T.daily.claim, 'dark', () => this.claim(), bot, 'claim');
      this.checkBtn = UI.btn(T.daily.checkIn, 'green', () => this.checkIn(), bot, 'check');
      this.render();
      fitLater(this);
    },
    render() {
      const d = Store.data.daily, today = R.dayId(), ch = Store.data.ch;
      const checked = d.last === today;
      this.tabs.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const t = UI.el('div', 'panel day', this.tabs);
        UI.el('span', '', t).textContent = f(T.daily.day, { n: i + 1 });
        if (i < d.streak) UI.icon(i === 2 && d.cardReady ? 'check' : 'check', 'dk', t);
        if (i === 2 && d.cardReady) { t.lastChild.remove(); UI.img('collect/meadow_bloom', 'dk', t); }
      }
      const n = Math.min(3, d.cardReady ? 3 : d.streak + (checked ? 0 : 1));
      this.status.textContent = f(T.daily.status, { n: Math.max(1, n), s: d.cardReady ? T.daily.ready : checked ? T.daily.checkTomorrow : T.daily.checkToday });
      this.alt.querySelectorAll('.ncol').forEach(e => e.remove());
      const items = C.COLLECTIBLES.map(c => ({ id: c.id, chance: c.chance })).concat([{ id: 'weekly' }]);
      const weeklyOpen = d.weeklyWeek === ch.week;
      items.forEach((it, i) => {
        const col = UI.el('div', 'ncol d' + i, this.alt); this.alt.insertBefore(col, this.alt.firstChild);
        const nn = UI.el('div', 'niche', col);
        const card = UI.el('div', 'panel ncard', col);
        if (it.id === 'weekly') {
          UI.img(weeklyOpen ? 'collect/sun_orchid' : 'collect/lock', 'nicon', nn);
          card.classList.toggle('locked', !weeklyOpen);
          UI.el('div', 'nc-t', card).textContent = weeklyOpen ? T.collect.sun_orchid : T.daily.weekly;
          UI.el('div', 'nc-l', card).textContent = weeklyOpen ? (d.weeklyClaimed ? T.daily.weeklyDone : T.daily.weeklyReady) : T.daily.weeklyLock;
        } else {
          UI.img('collect/' + it.id, 'nicon', nn);
          UI.el('div', 'nc-t', card).textContent = T.collect[it.id];
          UI.el('div', 'nc-l', card).textContent = f(T.daily.chance, { n: Math.round(it.chance * 100) });
          UI.el('div', 'nc-l dim', card).textContent = d.held === it.id ? T.daily.collected : T.daily.notCollected;
          if (d.held === it.id) card.classList.add('held');
        }
      });
      const weeklyReady = weeklyOpen && !d.weeklyClaimed;
      this.claimBtn.querySelector('.bl').textContent = weeklyReady && !d.cardReady ? T.daily.claimWeekly : T.daily.claim;
      this.claimBtn.classList.toggle('off', !(d.cardReady || weeklyReady));
      this.checkBtn.classList.toggle('off', checked || d.cardReady);
      UI.setGt(this.checkBtn.querySelector('.gt'), checked ? T.daily.checkedIn : T.daily.checkIn);
    },
    checkIn() {
      const d = Store.data.daily, today = R.dayId();
      if (d.last === today || d.cardReady) return;
      if (d.last && R.dayDiff(d.last, today) > 1) d.streak = 0;
      d.streak = Math.min(3, d.streak + 1); d.last = today;
      if (d.streak >= C.STREAK_DAYS) d.cardReady = true;
      Store.save(); Snd.play('check_in');
      const r = UI.rect(this.tabs.children[d.streak - 1]); FX.burst(r.cx, r.cy, { n: 14, sprite: 'fx/sparkle', size: 12, speed: 200, gravity: 0 });
      this.render();
    },
    claim() {
      const d = Store.data.daily, ch = Store.data.ch;
      let id;
      if (d.cardReady) { id = R.drawCollectible(R.rng(R.seed())); d.cardReady = false; d.streak = 0; d.draws++; }
      else if (d.weeklyWeek === ch.week && !d.weeklyClaimed) { id = C.WEEKLY_CARD; d.weeklyClaimed = true; }
      else return;
      d.held = id; d.got[id] = (d.got[id] || 0) + 1; Store.save();
      Screens.cardDraw(id, () => this.render());
    }
  });

  // ------------------------------------------------------------------ stage & classic
  UI.register('stage', {
    enter(root, p) { Store.tick(); UI.setBg('dim'); Snd.music('game'); this.ctl = new Stage(root, p); },
    leave() { if (this.ctl) this.ctl.destroy(); this.ctl = null; },
    onResize() {}
  });
  UI.register('classic', {
    enter(root, p) { UI.setBg('temple'); Screens.torches(); Snd.music('game'); this.ctl = new Classic(root, p); },
    leave() { if (this.ctl) this.ctl.destroy(); this.ctl = null; }
  });

  // ------------------------------------------------------------------ dialogs
  Screens.pause = function (o) {
    const s = Store.data.settings;
    const body = UI.el('div', 'pz');
    const row = (label, on, fn) => { const r = UI.el('div', 'pz-row', body); UI.el('span', '', r).textContent = label; const t = UI.el('button', 'toggle' + (on ? ' on' : ''), r); UI.tap(t, () => { const v = !t.classList.contains('on'); t.classList.toggle('on', v); fn(v); }, { sound: 'toggle' }); return t; };
    row(T.pause.sound, s.sound, v => Screens.setSound(v));
    row(T.pause.motion, s.motion, v => Screens.setMotion(v));
    UI.el('div', 'pz-note', body).textContent = T.pause.saved;
    const d = UI.dialog({ title: T.pause.title, body, cls: 'pause', buttons: [
      { label: T.pause.resume, kind: 'green', id: 'resume', cls: 'wide' },
      { label: T.pause.restart, kind: 'dark', id: 'restart', close: false, fn: () => { Screens.confirm(o.confirm, () => { d.close('restart'); o.onRestart(); }); } },
      { label: T.pause.home, kind: 'dark', id: 'home', fn: () => o.onHome() }] });
    return d;
  };
  Screens.confirm = function (msg, yes) {
    UI.dialog({ title: T.pause.title, body: `<p class="dlg-p">${msg}</p>`, cls: 'confirm', buttons: [{ label: T.pause.no, kind: 'dark' }, { label: T.pause.yes, kind: 'green', fn: yes }] });
  };
  Screens.help = function (kind) {
    const body = UI.el('div', 'help');
    const ol = UI.el('ol', '', body);
    (T.help[kind] || T.help.classic).forEach(s => { UI.el('li', '', ol).textContent = s; });
    if (kind === 'stage') body.appendChild(paytable());
    UI.dialog({ title: T.help.title, body, cls: 'tall', buttons: [{ label: T.help.ok, kind: 'green' }] });
  };
  function paytable() {
    const w = UI.el('div', 'pay');
    UI.el('div', 'sub', w).textContent = T.stage.paytable;
    const g = UI.el('div', 'pay-grid', w);
    C.FRUITS.slice().sort((a, b) => b.v - a.v).forEach(fr => { const e = UI.el('div', 'pay-it', g); UI.img('fruit/' + fr.id, '', e); const b = UI.el('b', '', e); UI.icon('coin', '', b); UI.el('span', '', b).textContent = fr.v; });
    UI.el('p', 'dlg-p small', w).textContent = T.stage.payNote;
    return w;
  }
  function charmList(ids, withPrice) {
    const w = UI.el('div', 'clist');
    ids.forEach(id => {
      const e = UI.el('div', 'crow', w); UI.img('charm/' + id, '', e);
      const tx = UI.el('div', 'ct', e); UI.el('b', '', tx).textContent = charmName(id); UI.el('span', '', tx).textContent = charmFx(id); UI.el('i', '', tx).textContent = charmWhen(id) + ' · ' + charmDur(id);
      if (withPrice) { const p = UI.el('div', 'price', e); UI.icon('ticket', '', p); UI.el('b', '', p).textContent = C.CHARM[id].price; }
    });
    return w;
  }
  Screens.bag = function (charms) {
    const body = UI.el('div', 'bag');
    UI.el('div', 'sub', body).textContent = f(T.shop.yours, { n: charms.length, m: C.CHARM_SLOTS });
    if (charms.length) body.appendChild(charmList(charms.map(c => c.id))); else UI.el('p', 'dlg-p', body).textContent = T.stage.noCharms;
    body.appendChild(paytable());
    UI.dialog({ title: T.stage.bag, body, cls: 'tall', buttons: [{ label: T.help.ok, kind: 'green' }] });
  };
  Screens.codex = function () {
    const body = UI.el('div', 'bag');
    UI.el('div', 'sub', body).textContent = T.codex.charms;
    body.appendChild(charmList(C.CHARMS.map(c => c.id), true));
    body.appendChild(paytable());
    UI.dialog({ title: T.codex.title, body, cls: 'tall', buttons: [{ label: T.help.ok, kind: 'green' }] });
  };
  Screens.charmInfo = function (id) {
    const body = UI.el('div', 'cinfo');
    UI.img('charm/' + id, 'cbig', body);
    UI.el('div', 'cfx', body).textContent = charmFx(id);
    UI.el('div', 'cwhen', body).textContent = charmWhen(id) + ' · ' + charmDur(id);
    UI.dialog({ title: charmName(id).toUpperCase(), body, buttons: [{ label: T.help.ok, kind: 'green' }] });
  };
  Screens.noEnergy = function () {
    const ch = Store.data.ch, e = Store.energyInfo();
    const body = UI.el('div', 'noen');
    const h = UI.el('div', 'hearts', body); for (let i = 0; i < C.ENERGY_MAX; i++) UI.icon(i < ch.energy ? 'heart' : 'heart_empty', '', h);
    const cost = R.refillCost(ch.stage);
    UI.el('p', 'dlg-p', body).textContent = f(T.challenge.refillNote, { n: cost, t: fmtTime(e.next) });
    Snd.play('error');
    UI.dialog({ title: T.challenge.noEnergy.toUpperCase(), body, buttons: [
      { label: T.challenge.wait, kind: 'dark' },
      { label: T.challenge.refill, kind: 'green', id: 'refill', fn: () => {
        if (ch.coins < cost) { UI.toast(T.challenge.notEnoughCoins); Snd.play('error'); return; }
        ch.coins -= cost; ch.energy = C.ENERGY_MAX; ch.energyTs = Date.now(); Store.save(); Snd.play('heart');
        if (UI.current === 'challenge' || UI.current === 'shop') UI.go(UI.current);
      } }] });
  };
  Screens.stageResult = function (o) {
    const body = UI.el('div', 'res');
    if (o.win) { const big = UI.el('div', 'res-hero', body); UI.img('charm/combo_crown', '', big); }
    const row = (l, v, cls) => { const e = UI.el('div', 'res-row ' + (cls || ''), body); UI.el('span', '', e).textContent = l; const b = UI.el('b', '', e); b.innerHTML = v; };
    row(T.stage.earned, `<img class="ico" src="${Assets.url('icon/coin')}">` + T.num(o.coins));
    row(T.stage.goalLine, T.num(o.goal), o.win ? 'ok' : 'bad');
    if (o.win) row(T.stage.tickets, `<img class="ico" src="${Assets.url('icon/ticket')}">+` + o.reward);
    else UI.el('p', 'dlg-p small', body).textContent = T.stage.failNote;
    Snd.play(o.win ? 'stage_clear' : 'stage_fail');
    if (o.win) { FX.burst(UI.W / 2, UI.H * 0.4, { n: 30, sprite: 'fx/star', size: 14, speed: 420, gravity: 300, layer: 2 }); }
    const d = UI.dialog({ title: f(o.win ? T.stage.clearTitle : T.stage.failTitle, { n: o.stage }), body, noClose: true, cls: o.win ? 'win' : 'lose', buttons: o.win ? [
      { label: T.stage.home, kind: 'dark', id: 'home', fn: () => UI.go('home') },
      { label: o.weekDone ? T.stage.collect : T.stage.next, kind: 'green', id: 'next', fn: () => { if (o.weekDone) Screens.weekDone(); else UI.go('shop', { mode: Store.data.ch.pendingMode || 'normal' }); } }] : [
      { label: T.stage.home, kind: 'dark', id: 'home', fn: () => UI.go('home') },
      { label: T.stage.retry, kind: 'green', id: 'retry', fn: () => UI.go('challenge') }] });
    return d;
  };
  Screens.weekDone = function () {
    const body = UI.el('div', 'res');
    UI.img('collect/sun_orchid', 'res-card', body);
    UI.el('p', 'dlg-p', body).textContent = T.stage.weekNote;
    Snd.play('all_clear');
    UI.dialog({ title: T.stage.weekTitle, body, noClose: true, buttons: [{ label: T.stage.collect, kind: 'green', fn: () => UI.go('daily') }] });
  };
  Screens.cardDraw = function (id, done) {
    const body = UI.el('div', 'draw');
    const hero = UI.el('div', 'draw-hero', body); UI.img('fx/burst', 'burst', hero); UI.img('collect/' + id, 'card', hero);
    UI.gt(T.collect[id] || id, 'draw-name', body);
    Snd.play('card_draw');
    UI.dialog({ title: T.daily.drew, body, noClose: true, cls: 'drawdlg', buttons: [{ label: T.daily.ok, kind: 'green', fn: done }] });
  };
  // all-clear: glowing sun emblem sweeps in over the board, then shrinks to a diamond
  Screens.sunEmblem = async function (view) {
    const a = view.area();
    let sweep = 0, alpha = 1, sc = 1;
    Snd.play('all_clear'); FX.flash('#fff2b0', 400, 0.45);
    const p = FX.add({ layer: 2, update() { return !p.done; }, draw(c) {
      const cx = a.x + a.w / 2, cy = a.y + a.h / 2, r = a.w * 0.5 * sc;
      c.globalAlpha = alpha; c.globalCompositeOperation = 'lighter';
      c.save(); c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r * 1.2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sweep); c.closePath(); c.clip();
      FX.sprite(c, 'fx/sun_emblem', cx, cy, r * 2, r * 2); c.restore();
    } });
    await FX.tween(700, e => { sweep = e; }, 'inOut');
    await FX.wait(700);
    await FX.tween(420, e => { sc = 1 - 0.85 * e; alpha = 1 - e * 0.6; }, 'in');
    FX.burst(a.x + a.w / 2, a.y + a.h / 2, { n: 20, sprite: 'fx/sparkle', size: 12, speed: 300, gravity: 0 });
    await FX.tween(200, e => { alpha = 0.4 * (1 - e); });
    p.done = true;
  };

  window.Screens = Screens;
})();
