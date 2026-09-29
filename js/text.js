// Temple Bloom — every player-facing string lives here (English only).
// Style guide: buttons and titles in UPPER CASE (they use the display font); body copy in sentence case;
// numbers use thin separators ("12,480"); "·" joins short facts. Board vocabulary: gems, blocks, lines,
// fruit reel, outlined region, bonus spin, sets (= blocks you may still place this stage), charms, tickets, coins.
(function (root) {
  const T = {
    game: 'Temple Bloom',
    loading: { preparing: 'Preparing the temple…', ready: 'The temple is open', tap: 'Tap to enter' },
    home: { classic: 'CLASSIC', best: 'BEST', play: 'PLAY', slot: 'BLOCK + SLOT', stage: 'STAGE {n}/{t}', done: 'WEEK CLEARED' },
    challenge: {
      title: 'BLOOM CHALLENGE',
      energy: 'Energy {n}/{m}', energyFull: 'Full', energyNext: '+1 in {t}',
      week: 'Stage {n} / {t} this week · Resets Monday', weekDone: 'All {t} stages cleared · Resets Monday',
      normal: 'NORMAL', double: 'DOUBLE', cont: 'CONTINUE', setsPer: '{n} sets per stage', coinsX: 'Coins ×{n}', start: 'START',
      info: 'Clear 15 stages. Buy charms before each stage. Clear lines to light the outlined region for bonus spins.',
      footer: '15 stages · Make every line count',
      noEnergy: 'Out of energy', refill: 'REFILL', refillNote: 'Refill all hearts for {n} coins, or wait {t}.',
      notEnoughCoins: 'Not enough coins', wait: 'WAIT'
    },
    shop: {
      title: 'CHARM SHOP', goal: 'Stage {n}/{t} · Goal {g} coins', yours: 'YOUR CHARMS · {n} / {m}',
      foot: 'Buy with tickets; refresh with coins. Refresh costs rise. Stage charms expire.',
      refresh: 'REFRESH', begin: 'BEGIN STAGE {n}', sold: 'SOLD', full: 'Charm slots are full', poor: 'Not enough tickets', poorCoins: 'Not enough coins',
      eachSpin: 'Each spin', eachClear: 'Each clear', afterSet: 'After each set', eachBonus: 'Each bonus', eachWin: 'Each win', atStart: 'At stage start',
      thisRun: 'This run', thisStage: 'This stage', bought: '{name} added', empty: 'Empty slot',
      charmInfo: '{fx} · {when} · {dur}'
    },
    charms: {
      lucky_leaf: ['Lucky Leaf', 'Luck +10'],
      combo_crown: ['Combo Crown', 'Combination bonus +50%'],
      coin_crest: ['Coin Crest', 'Clear coin bonus +50%'],
      spare_stone: ['Spare Stone', 'Extra block chance +25%'],
      ticket_star: ['Ticket Star', 'Ticket mark chance +30%'],
      harvest_basket: ['Harvest Bundle', 'Winning fruit groups +3 coins'],
      sun_idol: ['Sun Idol', 'Region charge +1'],
      jade_frog: ['Jade Frog', '+1 coin per fruit'],
      jaguar_mask: ['Jaguar Mask', 'Bonus spins pay ×3'],
      serpent_ring: ['Serpent Ring', 'Multi-line bonus +25% per line'],
      sand_glass: ['Sand Glass', 'Sets +3'],
      quetzal_fan: ['Quetzal Fan', 'Reel fruit chance +10%'],
      fruit_cherry: ['Cherry Charm', 'Fruit chance +14% · Cherry'],
      fruit_lemon: ['Lemon Charm', 'Fruit chance +14% · Lemon'],
      fruit_strawberry: ['Berry Charm', 'Fruit chance +14% · Strawberry'],
      fruit_orange: ['Orange Charm', 'Fruit chance +14% · Orange'],
      fruit_plum: ['Plum Charm', 'Fruit chance +14% · Plum'],
      fruit_grape: ['Grape Charm', 'Fruit chance +14% · Grape'],
      fruit_watermelon: ['Melon Charm', 'Fruit chance +14% · Watermelon'],
      fruit_bell: ['Bell Charm', 'Fruit chance +12% · Bell']
    },
    charmWhen: {
      lucky_leaf: 'eachSpin', combo_crown: 'eachSpin', coin_crest: 'eachClear', spare_stone: 'afterSet', ticket_star: 'eachSpin', harvest_basket: 'eachWin',
      sun_idol: 'eachClear', jade_frog: 'eachSpin', jaguar_mask: 'eachBonus', serpent_ring: 'eachClear', sand_glass: 'atStart', quetzal_fan: 'eachSpin'
    },
    fruits: { cherry: 'Cherry', lemon: 'Lemon', strawberry: 'Strawberry', orange: 'Orange', plum: 'Plum', grape: 'Grape', watermelon: 'Watermelon', bell: 'Bell' },
    stage: {
      goal: 'GOAL', sets: 'SETS LEFT', lines: '{n} LINES', line: '1 LINE', bonus: 'BONUS SPIN', fruitX: '{fruit} ×{n}', plusSet: '+1 SET',
      lastSets: 'Last {n} sets!', goalReached: 'Goal reached!', noRoom: 'No room left', reshape: 'No room — the temple reshapes your blocks',
      clearTitle: 'STAGE {n} CLEAR', failTitle: 'STAGE {n} FAILED', earned: 'Coins earned', goalLine: 'Goal', tickets: 'Tickets',
      next: 'NEXT STAGE', retry: 'RETRY', home: 'HOME', toShop: 'CHARM SHOP',
      failNote: 'The temple stays sealed. Stage charms have expired.',
      weekTitle: 'WEEK CLEARED!', weekNote: 'All 15 stages cleared. Your weekly card is ready in the Daily Collection.', collect: 'COLLECT',
      bag: 'YOUR CHARMS', paytable: 'FRUIT PAYTABLE', payNote: '3 or more of the same fruit in a cleared line pay. More fruit, bigger multiplier: 5 ×1.5 · 6 ×2 · 7 ×3 · 8 ×5.',
      noCharms: 'No charms yet — visit the Charm Shop before each stage.'
    },
    classic: { score: 'SCORE', best: 'BEST', home: 'Home', help: 'Help', sound: 'Sound', overTitle: 'NO MORE MOVES', newBest: 'NEW BEST!', again: 'PLAY AGAIN', home2: 'HOME' },
    praise: { good: 'GOOD', great: 'GREAT', amazing: 'AMAZING', unbelievable: 'UNBELIEVABLE' },
    combo: 'COMBO ×{n}',
    pause: { title: 'PAUSED', sound: 'Sound', motion: 'Reduced motion', saved: 'Saved on this device.', resume: 'CONTINUE', restart: 'RESTART', home: 'HOME', confirm: 'Restart this stage? Its energy is already spent.', confirmClassic: 'Start a new game? This score will be lost.', yes: 'RESTART', no: 'CANCEL' },
    daily: {
      title: 'DAILY COLLECTION', day: 'DAY {n}', status: 'Day {n} of 3 · {s}', ready: 'Card ready', checkTomorrow: 'Check in tomorrow', checkToday: 'Check in today',
      chance: '{n}% draw chance', collected: 'Collected', notCollected: 'Not collected', weekly: 'WEEKLY DRAW', weeklyLock: 'Clear all 15 stages to unlock', weeklyReady: 'Weekly card ready', weeklyDone: 'Collected this week',
      info: '3 daily check-ins in a row earn a card. Claim it before starting the next streak. Clear all 15 stages for a weekly card.',
      fine: 'Draws replace the previous collectible · On this device · No cash redemption',
      claim: 'CLAIM DAILY CARD', claimWeekly: 'CLAIM WEEKLY CARD', checkIn: 'CHECK IN', checkedIn: 'CHECKED IN', drew: 'YOU DREW', ok: 'WONDERFUL'
    },
    collect: { meadow_bloom: 'Meadow Bloom', moon_blossom: 'Moon Blossom', aurora_flower: 'Aurora Flower', sun_orchid: 'Sun Orchid' },
    help: {
      title: 'HOW TO PLAY',
      classic: ['Drag blocks from the tray onto the board.', 'Fill a whole row or column to clear it.', 'Clear several lines at once, or keep clearing move after move, for combos.', 'The game ends when no block fits.'],
      stage: ['Drag blocks onto the board. Every block you place uses one set.', 'A full row or column clears for coins, then spins: each cell lands on a fruit.', 'The fruit reel under the board shows each column\'s lucky fruit.', '3 or more matching fruit in a spun line pay coins. Ticket marks give tickets.', 'Each cleared line lights a gem in the outlined region. Light all four for a bonus spin.', 'Reach the coin goal before your sets run out.'],
      ok: 'GOT IT'
    },
    codex: { title: 'TEMPLE CODEX', charms: 'CHARMS', fruits: 'FRUIT' },
    toast: { saved: 'Progress saved' }
  };
  // tiny formatter: T.f('Stage {n}', {n: 3})
  T.f = function (s, v) { return String(s).replace(/\{(\w+)\}/g, (_, k) => v && v[k] != null ? v[k] : ''); };
  T.num = n => Math.round(n).toLocaleString('en-US');
  root.TEXT = T;
  if (typeof module !== 'undefined') module.exports = T;
})(typeof window !== 'undefined' ? window : globalThis);
