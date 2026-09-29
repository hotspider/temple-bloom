// Temple Bloom — boot: layout, settings, asset loading with the temple loading screen, then home.
(function () {
  window.TB = window.TB || {};
  const s = Store.data.settings;
  document.getElementById('dialogs').appendChild(document.getElementById('toast'));
  UI.fit();
  window.addEventListener('resize', () => UI.fit());
  window.addEventListener('orientationchange', () => setTimeout(() => UI.fit(), 200));
  document.addEventListener('pointerdown', () => Snd.unlock(), { capture: true });
  document.addEventListener('contextmenu', e => e.preventDefault());
  FX.init();
  FX.reduced = !!s.motion; document.body.classList.toggle('reduced', !!s.motion);
  Snd.setSfx(s.sound); Snd.setMusic(s.sound);
  UI.go('loading');
  const ld = UI.screens.loading;
  const t0 = performance.now();
  Assets.load(p => ld.progress(p * 0.98), {
    first: ['bg/temple', 'ui/logo_sign', 'ui/gems', 'ui/bar_frame', 'ui/bar_fill', 'ui/ribbon'],
    onFirst: () => { UI.setBg('temple'); ld.art(); document.body.classList.add('booted'); }
  }).then(() => {
    ld.ready();
    Screens.torches();
    const wait = Math.max(500, 1400 - (performance.now() - t0));
    setTimeout(() => { UI.go(TB.start || 'home'); }, window.TB_FAST ? 50 : wait);
  }).catch(err => { console.error(err); ld.msg.textContent = 'Could not load the temple. Check your connection and reload.'; });
  TB.go = (name, p) => UI.go(name, p);
  TB.store = Store;
})();
