# Temple Bloom

A jungle-temple **block puzzle with a fruit-slot twist** for mobile browsers (H5). A remake of the "Block Bloom"
design: Classic endless block puzzle, plus the 15-stage weekly **Bloom Challenge** where every cleared line spins
into fruit that pays coins, charms are bought between stages, and an outlined region charges up a bonus spin.

- **Classic** — drag blocks onto the 8×8 board, clear rows/columns, combos, GOOD → UNBELIEVABLE praise,
  stone-hands cinematic on 3+ lines, glowing sun emblem on an all-clear, best score.
- **Bloom Challenge (Block + Slot)** — 15 stages per week (resets Monday), 3 energy hearts, Normal (21 sets ×1 coins)
  or Double (14 sets ×2 coins). Each cleared line: +10 coins, then its cells spin — the fruit reel under the board
  holds each column's lucky fruit; 3+ matching fruit in a line pay; ticket marks give tickets. Each line lights a gem
  of the outlined region; four gems = bonus spin. Reach the coin goal before the sets run out.
- **Charm Shop** — 3 offers per stage bought with tickets, refresh with coins (rising cost), 6 charm slots,
  20 charms ("this run" or "this stage").
- **Daily Collection** — 3 check-ins in a row earn a card draw (Meadow Bloom 70 %, Moon Blossom 25 %, Aurora Flower 5 %);
  clearing all 15 stages unlocks the weekly Sun Orchid.

## Run

```
npm install
npm run dev          # http://localhost:5173/src/  (sources)   /dist/ (build)
npm run build        # → dist/ (static site, deploy anywhere)
```

## Layout

- `src/` web root: `index.html`, `css/style.css`, `js/` (`text.js` all player-facing copy, `config.js` numbers:
  goals, charms, paytable; `rules.js` pure rules; `store.js` save; `board.js` board view + drag;
  `stage.js` Bloom Challenge; `classic.js`; `screens.js`; `fx.js` effects canvas; `audio.js`), `assets/`
  (PNG/JPG art, MP3 audio, fonts, `manifest.json`; see `assets/ASSETS.md` to replace any file).
- `art-src/` procedural art + audio generators (`kit.js` materials, `scene.js`, `ui.js`, `logo.js`, `items.js`,
  `charms.js`, `fx.js`, `synth.js`) → `node tools/export-assets.mjs [--force]` writes `src/assets`.
- `tools/`: `sim.js` (rules checks + balance bot), `e2e.mjs` (Playwright flows, `dist chromium|webkit`),
  `monkey.mjs` (stress + invariants), `shots.mjs` / `play-check.mjs` (screenshots), `preview.mjs` (art sheets),
  `optimize-png.py`, `build.js`, `serve.js`.

Fonts: Lilita One, Nunito (SIL Open Font License).
