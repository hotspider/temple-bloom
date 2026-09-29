// Temple Bloom — pure game rules (no DOM). Shared by the game and by tools/sim.js.
// Board: Array(64), 0 = empty, 1..3 = gem colour. Index = r * 8 + c.
(function (root) {
  const CFG = root.CFG || (typeof require !== 'undefined' ? require('./config.js') : null);
  const N = CFG.N;
  const R = {};

  // ------------------------------------------------------------------ random
  R.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const f = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.int = n => Math.floor(f() * n);
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.weighted = (arr, key) => { const k = key || 'w'; let s = 0; for (const a of arr) s += a[k]; let t = f() * s; for (const a of arr) { t -= a[k]; if (t < 0) return a; } return arr[arr.length - 1]; };
    return f;
  };
  R.seed = () => (Math.random() * 4294967296) >>> 0;

  // ------------------------------------------------------------------ board
  R.empty = () => new Array(N * N).fill(0);
  R.idx = (r, c) => r * N + c;
  R.fits = function (b, piece, r, c) {
    for (const [dr, dc] of piece.cells) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= N || cc >= N || b[rr * N + cc]) return false; }
    return true;
  };
  R.spots = function (b, piece) { const out = []; for (let r = 0; r <= N - piece.h; r++) for (let c = 0; c <= N - piece.w; c++) if (R.fits(b, piece, r, c)) out.push([r, c]); return out; };
  R.canPlace = function (b, piece) { for (let r = 0; r <= N - piece.h; r++) for (let c = 0; c <= N - piece.w; c++) if (R.fits(b, piece, r, c)) return true; return false; };
  R.place = function (b, piece, r, c, color) { const nb = b.slice(); for (const [dr, dc] of piece.cells) nb[(r + dr) * N + c + dc] = color; return nb; };
  R.fullLines = function (b) {
    const rows = [], cols = [];
    for (let r = 0; r < N; r++) { let f = true; for (let c = 0; c < N; c++) if (!b[r * N + c]) { f = false; break; } if (f) rows.push(r); }
    for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N; r++) if (!b[r * N + c]) { f = false; break; } if (f) cols.push(c); }
    return { rows, cols, count: rows.length + cols.length };
  };
  R.lineCells = function (line) { const out = []; for (let k = 0; k < N; k++) out.push(line.type === 'row' ? [line.i, k] : [k, line.i]); return out; };
  R.linesList = function (full) { return full.rows.map(i => ({ type: 'row', i })).concat(full.cols.map(i => ({ type: 'col', i }))); };
  R.clear = function (b, full) { const nb = b.slice(); full.rows.forEach(r => { for (let c = 0; c < N; c++) nb[r * N + c] = 0; }); full.cols.forEach(c => { for (let r = 0; r < N; r++) nb[r * N + c] = 0; }); return nb; };
  R.filled = b => b.reduce((s, v) => s + (v ? 1 : 0), 0);
  R.isEmpty = b => b.every(v => !v);

  // ------------------------------------------------------------------ pieces & dealing
  R.randomPiece = function (rng) { return rng.weighted(CFG.PIECES); };
  // Deal three pieces; at least `need` of them must fit the board somewhere (tries a few times).
  R.deal = function (rng, b, need) {
    need = need == null ? 1 : need;
    let best = null, bestFit = -1;
    for (let t = 0; t < 40; t++) {
      const set = [0, 1, 2].map(() => ({ id: R.randomPiece(rng).id, color: 1 + rng.int(3) }));
      const fit = set.filter(p => R.canPlace(b, CFG.PIECE[p.id])).length;
      if (fit > bestFit) { best = set; bestFit = fit; }
      if (fit >= need) return set;
    }
    // fall back to singles so the player is never dealt a dead hand on a playable board
    if (bestFit === 0) best[0] = { id: 'dot', color: 1 + rng.int(3) };
    return best;
  };
  R.anyMove = function (b, tray) { return tray.some(p => p && R.canPlace(b, CFG.PIECE[p.id])); };

  // ------------------------------------------------------------------ stage set-up
  // Pre-filled starting board: rows/columns that are nearly full so the first moves can clear lines.
  R.startBoard = function (rng, stage) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const b = R.empty();
      const target = Math.round(N * N * (CFG.PREFILL.min + (CFG.PREFILL.max - CFG.PREFILL.min) * Math.min(1, (stage - 1) / 12) * (0.6 + rng() * 0.4)));
      // a few "almost" rows with 1-2 gaps
      const rows = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => rng() - 0.5).slice(0, 2 + rng.int(2));
      rows.forEach(r => { const gaps = new Set([rng.int(N)]); if (rng() < 0.5) gaps.add(rng.int(N)); for (let c = 0; c < N; c++) if (!gaps.has(c)) b[r * N + c] = 1 + rng.int(3); });
      // scatter
      let guard = 0;
      while (R.filled(b) < target && guard++ < 500) { const i = rng.int(N * N); if (!b[i]) b[i] = 1 + rng.int(3); }
      const full = R.fullLines(b);
      if (full.count) continue;
      // keep at least 4 empty cells in every row so the board is not suffocating
      let ok = true; for (let r = 0; r < N && ok; r++) { let e = 0; for (let c = 0; c < N; c++) if (!b[r * N + c]) e++; if (e < 1) ok = false; }
      if (ok) return b;
    }
    return R.empty();
  };
  const REGION_SHAPES = [
    [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 1]], [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 1], [0, 2], [1, 0], [1, 1]]
  ];
  // Region: 4 cells that are empty on the starting board (prefers a horizontal bar like the reference).
  R.region = function (rng, b) {
    const shapes = rng() < 0.55 ? [REGION_SHAPES[0]] : REGION_SHAPES;
    for (let t = 0; t < 400; t++) {
      const sh = rng.pick(shapes), h = 1 + Math.max(...sh.map(s => s[0])), w = 1 + Math.max(...sh.map(s => s[1]));
      const r = 1 + rng.int(N - h - 1), c = rng.int(N - w + 1);
      const cells = sh.map(([dr, dc]) => [r + dr, c + dc]);
      if (cells.every(([rr, cc]) => !b[rr * N + cc])) return cells;
    }
    // crowded board: take the horizontal bar with the fewest gems under it (blocks may sit on a region)
    let best = null, bestN = 99;
    for (let r = 1; r < N - 1; r++) for (let c = 0; c <= N - 4; c++) { const cells = REGION_SHAPES[0].map(([dr, dc]) => [r + dr, c + dc]); const n = cells.filter(([rr, cc]) => b[rr * N + cc]).length; if (n < bestN) { bestN = n; best = cells; } }
    return best;
  };

  // ------------------------------------------------------------------ charms → modifiers
  R.mods = function (charms, mode) {
    const m = { luck: 0, winMult: 0, clearMult: 0, spare: 0, ticketMult: 0, groupBonus: 0, charge: 0, perFruit: 0, bonusMult: 0, multiLine: 0, sets: 0, hot: 0, fruitChance: {}, mode: CFG.MODES[mode || 'normal'].mult };
    (charms || []).forEach(ch => {
      const d = CFG.CHARM[ch.id]; if (!d) return;
      for (const [k, v] of Object.entries(d.fx)) {
        if (k === 'fruit') continue;
        if (k === 'fruitChance') m.fruitChance[d.fx.fruit] = (m.fruitChance[d.fx.fruit] || 0) + v;
        else m[k] += v;
      }
    });
    return m;
  };
  R.hotChance = (m, bonus) => Math.min(0.9, (bonus ? CFG.BONUS_HOT : CFG.HOT_CHANCE) + m.luck * CFG.LUCK_TO_HOT + m.hot);

  // ------------------------------------------------------------------ fruit reel & spins
  R.coldFruit = function (rng, m) {
    for (const [id, ch] of Object.entries(m.fruitChance || {})) if (rng() < ch) return id;
    return rng.weighted(CFG.FRUITS).id;
  };
  R.reel = function (rng, m) { return Array.from({ length: N }, () => R.coldFruit(rng, m)); };
  // cells: [[r,c],...]; reel: 8 fruit ids (one per column). Returns [{r,c,fruit,ticket}]
  // A bonus spin favours one fruit: the most common reel fruit above the region's columns.
  R.bonusFruit = function (rng, cells, reel) {
    const cnt = {}; cells.forEach(([, c]) => { cnt[reel[c]] = (cnt[reel[c]] || 0) + 1; });
    const max = Math.max(...Object.values(cnt)), top = Object.keys(cnt).filter(k => cnt[k] === max);
    return top.length === 1 ? top[0] : rng.pick(top);
  };
  R.spin = function (rng, cells, reel, m, bonus) {
    const hot = R.hotChance(m, bonus), tk = CFG.TICKET_CHANCE * (1 + m.ticketMult);
    const bf = bonus ? R.bonusFruit(rng, cells, reel) : null;
    return cells.map(([r, c]) => ({ r, c, fruit: rng() < hot ? (bf || reel[c]) : R.coldFruit(rng, m), ticket: rng() < tk }));
  };
  // Evaluate one spun line / region. Returns groups (3+ of a kind) and coin totals (before the mode multiplier).
  R.evalSpin = function (res, m, bonus) {
    const by = {};
    res.forEach((x, k) => { (by[x.fruit] = by[x.fruit] || []).push(k); });
    const groups = [];
    for (const [fruit, ks] of Object.entries(by)) {
      if (ks.length < CFG.MIN_GROUP) continue;
      const n = ks.length, pay = Math.round(CFG.FRUIT[fruit].v * n * (CFG.COUNT_MULT[Math.min(8, n)] || 1)) + (m.groupBonus || 0);
      groups.push({ fruit, count: n, cells: ks, pay });
    }
    groups.sort((a, b) => b.pay - a.pay);
    const base = groups.reduce((s, g) => s + g.pay, 0);
    let mult = 1 + (groups.length > 1 ? CFG.MULTI_GROUP_BONUS * (groups.length - 1) : 0) + (base ? m.winMult : 0);
    if (bonus) mult *= CFG.BONUS_MULT + (m.bonusMult || 0);
    const perFruit = (m.perFruit || 0) * res.length;
    const tickets = res.filter(x => x.ticket).length;
    return { groups, base, total: Math.round(base * mult) + perFruit, tickets };
  };
  R.clearCoins = (lines, m) => Math.round(CFG.CLEAR_COINS * (1 + m.clearMult)) * lines;
  R.multiLineMult = (lines, m) => lines > 1 ? 1 + m.multiLine * (lines - 1) : 1;

  // ------------------------------------------------------------------ classic scoring
  R.classicClear = function (lines, combo) {
    const C = CFG.CLASSIC;
    return Math.round((C.lineBase * lines + C.lineSq * lines * lines) * (1 + C.comboStep * Math.max(0, combo - 1)));
  };
  R.praise = lines => CFG.PRAISE[Math.min(CFG.PRAISE.length, Math.max(1, lines)) - 1];

  // ------------------------------------------------------------------ shop
  R.shopOffers = function (rng, owned, n) {
    const ownedRun = new Set((owned || []).map(c => c.id));
    const pool = CFG.CHARMS.filter(c => !ownedRun.has(c.id));
    const out = [];
    const fruitTaken = () => out.some(o => o.startsWith('fruit_'));
    let guard = 0;
    while (out.length < (n || CFG.SHOP_OFFERS) && guard++ < 200) {
      const c = rng.pick(pool);
      if (out.includes(c.id)) continue;
      if (c.id.startsWith('fruit_') && fruitTaken()) continue;   // at most one fruit charm per shelf
      out.push(c.id);
    }
    return out;
  };
  R.refreshCost = (k, stage) => Math.round(CFG.REFRESH_COSTS[Math.min(k, CFG.REFRESH_COSTS.length - 1)] * (1 + CFG.REFRESH_STAGE_STEP * Math.max(0, (stage || 1) - 1)) / 5) * 5;

  R.refillCost = stage => CFG.ENERGY_REFILL_COINS + CFG.ENERGY_REFILL_STEP * Math.max(0, (stage || 1) - 1);

  // ------------------------------------------------------------------ time helpers
  R.dayId = function (d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  R.dayDiff = function (a, b) { const pa = a.split('-').map(Number), pb = b.split('-').map(Number); return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000); };
  R.weekId = function (d) { d = new Date(d || Date.now()); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return R.dayId(d); };  // Monday of this week
  R.energy = function (e, ts, now) {
    // returns {energy, ts, next(ms until +1)} after regeneration
    now = now || Date.now();
    const per = CFG.ENERGY_REGEN_MIN * 60000;
    if (e >= CFG.ENERGY_MAX) return { energy: CFG.ENERGY_MAX, ts: now, next: 0 };
    const gained = Math.floor((now - ts) / per);
    if (gained > 0) { e = Math.min(CFG.ENERGY_MAX, e + gained); ts = e >= CFG.ENERGY_MAX ? now : ts + gained * per; }
    return { energy: e, ts, next: e >= CFG.ENERGY_MAX ? 0 : per - (now - ts) };
  };
  R.drawCollectible = function (rng) { let t = rng(); for (const c of CFG.COLLECTIBLES) { t -= c.chance; if (t < 0) return c.id; } return CFG.COLLECTIBLES[0].id; };

  root.RULES = R;
  if (typeof module !== 'undefined') module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
