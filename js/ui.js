// Temple Bloom — DOM helpers: logical 720-wide layout scaling, elements, skinned buttons, gradient display
// text, dialogs, toasts, number count-ups and the screen switcher.
(function () {
  const T = window.TEXT;
  const UI = { W: 720, H: 1280, s: 1, ox: 0, oy: 0, screen: null, screens: {} };
  const MIN_H = 1250;

  // ------------------------------------------------------------------ layout
  UI.fit = function () {
    const vw = window.innerWidth, vh = window.innerHeight;
    let s = vw / UI.W, H = vh / s;
    if (H < MIN_H) { s = vh / MIN_H; H = MIN_H; }
    UI.s = s; UI.H = Math.round(H); UI.ox = Math.round((vw - UI.W * s) / 2); UI.oy = 0;
    for (const id of ['app', 'overlay', 'dialogs']) {
      const e = document.getElementById(id);
      e.style.width = UI.W + 'px'; e.style.height = UI.H + 'px';
      e.style.transform = `translate(${UI.ox}px, ${UI.oy}px) scale(${s})`;
    }
    document.documentElement.style.setProperty('--H', UI.H + 'px');
    document.body.classList.toggle('tall', UI.H >= 1400);
    document.body.classList.toggle('short', UI.H < 1260);
    UI.layoutBg();
    if (window.FX) FX.resize();
    if (UI.screen && UI.screen.onResize) UI.screen.onResize();
  };
  // background image covers the viewport; torch flames are pinned to the painted torch bowls
  UI.layoutBg = function () {
    const vw = window.innerWidth, vh = window.innerHeight, iw = 1080, ih = 1920;
    const k = Math.max(vw / iw, vh / ih), w = iw * k, h = ih * k, x = (vw - w) / 2, y = (vh - h) / 2;
    const img = document.getElementById('bgimg');
    Object.assign(img.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    const tw = document.getElementById('torches');
    Object.assign(tw.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    tw.style.setProperty('--k', k);
  };
  UI.setBg = function (kind) {
    const img = document.getElementById('bgimg');
    img.className = kind || 'temple';
    document.getElementById('torches').style.display = kind === 'dim' ? 'none' : '';
  };
  // client → logical coordinates
  UI.toLogical = (cx, cy) => [(cx - UI.ox) / UI.s, (cy - UI.oy) / UI.s];
  UI.rect = function (el) {
    const r = el.getBoundingClientRect();
    const [x, y] = UI.toLogical(r.left, r.top);
    return { x, y, w: r.width / UI.s, h: r.height / UI.s, cx: x + r.width / UI.s / 2, cy: y + r.height / UI.s / 2 };
  };

  // ------------------------------------------------------------------ elements
  UI.el = function (tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  UI.img = function (key, cls, parent) { const e = UI.el('img', cls, parent); e.src = Assets.url(key); e.draggable = false; e.alt = ''; return e; };
  UI.icon = (name, cls, parent) => UI.img('icon/' + name, 'ico ' + (cls || ''), parent);
  // gold (or other) display text with a heavy outline: <span class="gt"><span>TEXT</span></span>
  UI.gt = function (text, cls, parent) {
    const e = UI.el('span', 'gt ' + (cls || ''), parent);
    e.dataset.t = text; UI.el('span', '', e).textContent = text;
    return e;
  };
  UI.setGt = function (e, text) { e.dataset.t = text; e.firstChild.textContent = text; };

  let lastTap = 0;
  UI.tap = function (el, fn, opts) {
    opts = opts || {};
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      if (el.classList.contains('off') && !opts.allowOff) return;
      const now = performance.now(); if (now - lastTap < 180) return; lastTap = now;
      Snd.unlock();
      if (opts.sound !== false) Snd.play(opts.sound || 'tap');
      fn(ev);
    });
    return el;
  };
  // skinned button: kind green | dark | gray. label may be a string or a node.
  UI.btn = function (label, kind, fn, parent, cls) {
    const b = UI.el('button', 'btn ' + (kind || 'green') + ' ' + (cls || ''), parent);
    if (typeof label === 'string') { if (kind === 'green') UI.gt(label, 'bl', b); else UI.el('span', 'bl', b).textContent = label; }
    else if (label) b.appendChild(label);
    if (fn) UI.tap(b, fn);
    return b;
  };
  UI.round = function (icon, kind, fn, parent, cls) {
    const b = UI.el('button', 'round ' + (kind || '') + ' ' + (cls || ''), parent);
    UI.icon(icon, '', b);
    if (fn) UI.tap(b, fn);
    return b;
  };
  UI.text = (s, v) => T.f(s, v);

  // ------------------------------------------------------------------ toast
  let toastTimer = 0;
  UI.toast = function (msg, ms) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms || 1800);
  };

  // ------------------------------------------------------------------ dialogs
  // UI.dialog({ title, body: Node|string, buttons: [{label, kind, fn, close}], cls, onClose, noClose })
  UI.openDialogs = [];
  UI.dialog = function (o) {
    const host = document.getElementById('dialogs');
    const wrap = UI.el('div', 'dlg-wrap ' + (o.cls || ''), host);
    const box = UI.el('div', 'dlg', wrap);
    if (o.title) { const tb = UI.el('div', 'dlg-title', box); UI.gt(o.title, '', tb); }
    const body = UI.el('div', 'dlg-body', box);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const close = (why) => {
      if (wrap.classList.contains('closing')) return;
      wrap.classList.add('closing');
      Snd.play('close');
      UI.openDialogs = UI.openDialogs.filter(d => d !== api);
      setTimeout(() => wrap.remove(), 180);
      if (o.onClose) o.onClose(why);
    };
    if (o.buttons && o.buttons.length) {
      const row = UI.el('div', 'dlg-btns n' + o.buttons.length, box);
      o.buttons.forEach(bd => {
        const b = UI.btn(bd.label, bd.kind || 'green', () => { if (bd.close !== false) close(bd.id || 'btn'); if (bd.fn) bd.fn(); }, row, bd.cls);
        if (bd.id) b.dataset.id = bd.id;
      });
    }
    if (!o.noClose) wrap.addEventListener('click', ev => { if (ev.target === wrap) close('outside'); });
    Snd.play('popup');
    const api = { wrap, box, body, close };
    UI.openDialogs.push(api);
    return api;
  };
  UI.closeAll = function () { UI.openDialogs.slice().forEach(d => d.close('all')); };

  // ------------------------------------------------------------------ numbers
  UI.countTo = function (el, from, to, ms, fmt) {
    fmt = fmt || T.num;
    const t0 = performance.now(); ms = ms || 500;
    if (el._count) cancelAnimationFrame(el._count);
    const step = now => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) el._count = requestAnimationFrame(step); else el._count = 0;
    };
    el._count = requestAnimationFrame(step);
  };
  UI.bump = function (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

  // ------------------------------------------------------------------ screens
  UI.register = (name, s) => { UI.screens[name] = s; };
  UI.go = function (name, params) {
    const app = document.getElementById('app');
    const prev = UI.screen;
    if (prev && prev.leave) prev.leave();
    UI.closeAll();
    document.getElementById('overlay').innerHTML = '';
    if (window.FX) FX.clearScene();
    const s = UI.screens[name];
    const root = UI.el('div', 'screen scr-' + name);
    app.innerHTML = ''; app.appendChild(root);
    UI.screen = s; s.root = root; UI.current = name;
    s.enter(root, params || {});
    root.classList.add('enter'); requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('enter')));
    document.body.dataset.screen = name;
  };

  window.UI = UI;
})();
