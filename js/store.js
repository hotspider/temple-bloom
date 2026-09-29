// Temple Bloom — saved progress (localStorage, this device only).
//   Store.data   the live save object      Store.save()   persist now
//   Store.tick() applies the weekly reset and energy regeneration (call when a screen opens)
(function () {
  const KEY = 'temple-bloom-save-v1';
  const R = window.RULES, C = window.CFG;

  function fresh() {
    return {
      v: 1,
      settings: { sound: true, motion: false },
      classic: { best: 0, game: null, played: 0 },
      ch: freshWeek(),
      daily: { last: null, streak: 0, cardReady: false, held: null, got: {}, weeklyWeek: null, weeklyClaimed: false, draws: 0 },
      seenHelp: {}
    };
  }
  function freshWeek(prev) {
    return {
      week: R.weekId(), stage: 1, done: false, coins: C.START_COINS, tickets: C.START_TICKETS, charms: [],
      energy: prev ? prev.energy : C.ENERGY_MAX, energyTs: prev ? prev.energyTs : Date.now(), shop: null, run: null, best: prev ? prev.best || 0 : 0
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const d = JSON.parse(raw), f = fresh();
      // shallow-merge sections so new fields get defaults
      for (const k of Object.keys(f)) if (d[k] == null) d[k] = f[k]; else if (typeof f[k] === 'object' && !Array.isArray(f[k])) d[k] = Object.assign({}, f[k], d[k]);
      return d;
    } catch (e) { return fresh(); }
  }

  const Store = {
    data: load(),
    save() { try { localStorage.setItem(KEY, JSON.stringify(Store.data)); } catch (e) {} },
    reset() { Store.data = fresh(); Store.save(); },
    tick(now) {
      const d = Store.data, ch = d.ch;
      now = now || Date.now();
      if (ch.week !== R.weekId(new Date(now))) {
        d.ch = freshWeek(ch);
        if (d.daily.weeklyWeek && d.daily.weeklyWeek !== d.ch.week) { d.daily.weeklyWeek = null; d.daily.weeklyClaimed = false; }
      }
      const e = R.energy(d.ch.energy, d.ch.energyTs, now);
      d.ch.energy = e.energy; d.ch.energyTs = e.ts;
      // a missed day breaks an unfinished streak (a ready card waits to be claimed)
      const dl = d.daily;
      if (dl.last && !dl.cardReady && dl.streak > 0 && R.dayDiff(dl.last, R.dayId(new Date(now))) > 1) dl.streak = 0;
      return e;
    },
    energyInfo(now) { const ch = Store.data.ch; return R.energy(ch.energy, ch.energyTs, now || Date.now()); }
  };
  window.Store = Store;
})();
