/* Temple Bloom — audio player for the exported sound files (assets/audio).
 *   Snd.unlock()  Snd.play(name, opts)  Snd.music('home'|'game'|null)  Snd.duck(sec)
 *   Snd.setSfx(on)  Snd.setMusic(on)  Snd.sfxOn  Snd.musicOn
 * Sounds are decoded by Assets (assets.js); variants such as clear_0..clear_3 are picked from opts
 * using manifest.variants. Loudness is baked into the files, so every voice plays at unity gain.
 */
var Snd = (function () {
  'use strict';
  var W = window;
  var AC = W.AudioContext || W.webkitAudioContext;
  var XFADE = 0.8, DUCK = 0.45, LEAD = 0.005, MAX_VOICES = 32;
  // per-sound limits: max starts per window (s), min gap between starts, pitch jitter, max overlap, priority
  var DEF = { max: 2, win: 0.05, gap: 0.03, pr: 0, poly: 6, pri: 0 };
  var CFG = {
    tap: { pr: 0.03, pri: 1 }, toggle: { pr: 0.02, pri: 1 }, popup: { max: 1, win: 0.1, pr: 0.03, poly: 2, pri: 1 }, close: { max: 1, win: 0.1, pr: 0.03, poly: 2, pri: 1 },
    whoosh: { max: 1, win: 0.2, poly: 1 }, pick: { max: 1, win: 0.05, pr: 0.04, poly: 2, pri: 1 }, place: { max: 1, win: 0.05, pr: 0.04, poly: 2, pri: 1 }, invalid: { max: 1, win: 0.2, poly: 1 },
    clear: { max: 1, win: 0.1, poly: 2, pri: 1 }, line_sweep: { max: 2, win: 0.08, poly: 3 }, reel_spin: { max: 1, win: 0.2, poly: 2, pri: 1 },
    fruit_land: { max: 3, win: 0.05, gap: 0.03, pr: 0.02, poly: 6 }, win_small: { max: 1, win: 0.2, poly: 2, pri: 1 }, win_big: { max: 1, win: 0.4, poly: 1, pri: 1 },
    coin: { max: 3, win: 0.06, gap: 0.045, pr: 0.03, poly: 5 }, coins: { max: 1, win: 0.3, poly: 1, pri: 1 }, ticket: { max: 2, win: 0.1, gap: 0.08, pr: 0.03, poly: 3, pri: 1 },
    pip: { max: 1, win: 0.08, poly: 2, pri: 1 }, region_full: { max: 1, win: 0.4, poly: 1, pri: 1 }, bonus_spin: { max: 1, win: 0.4, poly: 1, pri: 1 },
    praise: { max: 1, win: 0.4, poly: 1, pri: 1 }, all_clear: { max: 1, win: 0.5, poly: 1, pri: 1 }, rumble: { max: 1, win: 0.5, poly: 1, pri: 1 }, smash: { max: 2, win: 0.1, poly: 2, pri: 1 },
    lava: { max: 1, win: 0.5, poly: 1, pri: 1 }, stage_clear: { max: 1, win: 0.5, poly: 1, pri: 1 }, stage_fail: { max: 1, win: 0.5, poly: 1, pri: 1 }, game_over: { max: 1, win: 0.5, poly: 1, pri: 1 },
    new_best: { max: 1, win: 0.5, poly: 1, pri: 1 }, buy: { max: 1, win: 0.2, poly: 2, pri: 1 }, refresh: { max: 1, win: 0.2, poly: 1, pri: 1 }, check_in: { max: 1, win: 0.5, poly: 1, pri: 1 },
    card_draw: { max: 1, win: 0.5, poly: 1, pri: 1 }, heart: { max: 1, win: 0.3, poly: 1, pri: 1 }, error: { max: 1, win: 0.2, poly: 1, pri: 1 }, tick: { max: 2, win: 0.04, gap: 0.03, poly: 3 },
    warn: { max: 1, win: 0.5, poly: 1, pri: 1 }, shimmer: { max: 1, win: 0.3, poly: 2 }
  };
  function cfg(name) { var c = CFG[name] || {}, r = {}; for (var k in DEF) r[k] = c[k] == null ? DEF[k] : c[k]; return r; }

  var ctx = null, sfxBus, musBus, duckG, silentDone = false, suspendedByUs = false;
  var want = null, cur = null; // cur: { name, src, gain }
  var rl = {}, live = [];

  function hidden() { return typeof document !== 'undefined' && document.hidden; }
  function running() { return ctx && ctx.state === 'running'; }
  function gestureOK() {
    try { var ua = navigator.userActivation; return !ua || ua.isActive || ua.hasBeenActive; } catch (e) { return true; }
  }
  function soft(p, then) { try { if (p && p.then) p.then(then || function () {}, function () {}); } catch (e) {} }
  function ramp(prm, v, dur) {
    var now = ctx.currentTime;
    if (prm.cancelScheduledValues) prm.cancelScheduledValues(now);
    prm.setValueAtTime(prm.value, now);
    prm.linearRampToValueAtTime(v, now + dur);
  }
  function build() {
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    var lim = ctx.createDynamicsCompressor(); // safety limiter for many overlapping sounds
    lim.threshold.value = -4; lim.knee.value = 2; lim.ratio.value = 16; lim.attack.value = 0.002; lim.release.value = 0.15;
    lim.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = api.sfxOn ? 1 : 0; sfxBus.connect(lim);
    duckG = ctx.createGain(); duckG.connect(lim);
    musBus = ctx.createGain(); musBus.gain.value = api.musicOn ? 1 : 0; musBus.connect(duckG);
    try { ctx.onstatechange = function () { if (running()) syncMusic(0.3); }; } catch (e) {}
  }
  function silent() {
    try { var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
  }
  function prune(arr, t) { for (var i = arr.length - 1; i >= 0; i--) if (arr[i] <= t) arr.splice(i, 1); }

  // opts -> clip id (e.g. pop + {combo:3} -> pop_3)
  function clipId(name, opts) {
    var man = W.Assets && Assets.manifest, v = man && man.variants && man.variants[name];
    if (!v) return name;
    var n = Math.round(+opts[v.param] || 0);
    n = v.wrap ? ((n % v.count) + v.count) % v.count : Math.max(0, Math.min(v.count - 1, n));
    return name + '_' + n;
  }

  function stopMusic(p, fade) {
    if (!p || p.stopping) return;
    p.stopping = true;
    ramp(p.gain.gain, 0, fade);
    try { p.src.stop(ctx.currentTime + fade + 0.05); } catch (e) {}
  }
  function syncMusic(fade) {
    if (!ctx || !running()) return;
    if (cur && (cur.name !== want || !api.musicOn)) { stopMusic(cur, fade); cur = null; }
    if (cur || !want || !api.musicOn) return;
    var m = W.Assets && Assets.music[want];
    if (!m) return;
    var src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = m.buffer; src.loop = true; src.loopStart = m.loopStart; src.loopEnd = m.loopEnd;
    g.gain.value = 0; src.connect(g); g.connect(musBus);
    src.start(ctx.currentTime + 0.05, m.loopStart);
    ramp(g.gain, 1, Math.max(0.05, fade));
    cur = { name: want, src: src, gain: g };
  }

  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (hidden()) { if (running()) { suspendedByUs = true; soft(ctx.suspend()); } }
    else if (suspendedByUs && gestureOK()) { suspendedByUs = false; soft(ctx.resume()); }
  });

  var api = {
    sfxOn: true,
    musicOn: true,
    unlock: function () {
      try {
        if (!AC) return;
        if (!ctx) { if (!gestureOK()) return; build(); }
        if (!running() && !hidden() && gestureOK()) { suspendedByUs = false; soft(ctx.resume(), function () { syncMusic(0.3); }); }
        if (!silentDone) { silent(); silentDone = true; }
        syncMusic(0.3);
      } catch (e) {}
    },
    play: function (name, opts) {
      try {
        if (!api.sfxOn || !running() || !W.Assets) return;
        opts = opts || {};
        var clip = Assets.sfx[clipId(name, opts)];
        if (!clip) return;
        var c = cfg(name), now = ctx.currentTime;
        var r = rl[name] || (rl[name] = { req: [], live: [], last: -1 });
        prune(r.req, now - c.win); prune(r.live, now); prune(live, now);
        if (r.req.length >= c.max || r.live.length >= c.poly || (live.length >= MAX_VOICES && !c.pri)) return;
        var t = now + LEAD;
        if (c.gap && r.last >= 0 && t < r.last + c.gap) t = r.last + c.gap;
        if (t - now > 0.1) return;
        var src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = clip.buffer;
        var rate = 1 + (Math.random() * 2 - 1) * c.pr;
        src.playbackRate.value = rate;
        g.gain.value = (opts.vol == null ? 1 : +opts.vol || 0) / Math.sqrt(1 + 0.5 * r.live.length);
        src.connect(g); g.connect(sfxBus);
        src.start(t, clip.offset);
        var end = t + (clip.buffer.duration - clip.offset) / rate;
        r.req.push(now); r.live.push(end); live.push(end); r.last = t;
        src.onended = function () { try { g.disconnect(); } catch (e) {} };
      } catch (e) {}
    },
    music: function (track) {
      want = track === 'home' || track === 'game' ? track : null;
      try { syncMusic(XFADE); } catch (e) {}
    },
    setSfx: function (on) {
      api.sfxOn = !!on;
      try { if (ctx) ramp(sfxBus.gain, api.sfxOn ? 1 : 0, 0.05); } catch (e) {}
    },
    setMusic: function (on) {
      api.musicOn = !!on;
      try { if (ctx) { ramp(musBus.gain, api.musicOn ? 1 : 0, 0.5); syncMusic(0.5); } } catch (e) {}
    },
    refresh: function () { try { syncMusic(0.8); } catch (e) {} },
    duck: function (sec) {
      try {
        if (!ctx) return;
        sec = +sec > 0 ? +sec : 1;
        var g = duckG.gain, now = ctx.currentTime;
        ramp(g, DUCK, 0.15);
        g.setValueAtTime(DUCK, now + 0.15 + sec);
        g.linearRampToValueAtTime(1, now + 0.15 + sec + 0.7);
      } catch (e) {}
    },
    _ctx: function () { return ctx; },
    _state: function () { return { ctx: ctx && ctx.state, music: cur && cur.name, voices: live.length }; }
  };
  return api;
})();
window.Snd = Snd;
