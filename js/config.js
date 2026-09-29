// Temple Bloom — game data: pieces, fruits and paytable, charms, stage goals, economy constants.
// Player-facing names/descriptions come from text.js (TEXT); this file only holds numbers and ids.
(function (root) {
  const CFG = {};

  CFG.N = 8;                                  // board is 8×8
  CFG.COLORS = ['red', 'green', 'yellow'];    // gem colours (1-based on the board: 1 red, 2 green, 3 yellow)

  // ------------------------------------------------------------------ pieces  [row, col] cells + weight
  const P = [];
  const add = (id, cells, w) => P.push({ id, cells, w });
  add('dot', [[0, 0]], 2);
  add('i2h', [[0, 0], [0, 1]], 3); add('i2v', [[0, 0], [1, 0]], 3);
  add('i3h', [[0, 0], [0, 1], [0, 2]], 3); add('i3v', [[0, 0], [1, 0], [2, 0]], 3);
  add('i4h', [[0, 0], [0, 1], [0, 2], [0, 3]], 2); add('i4v', [[0, 0], [1, 0], [2, 0], [3, 0]], 2);
  add('i5h', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], 1); add('i5v', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], 1);
  add('o2', [[0, 0], [0, 1], [1, 0], [1, 1]], 5);
  add('o3', [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], 1.2);
  add('r23', [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], 1.2); add('r32', [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], 1.2);
  add('c3a', [[0, 0], [1, 0], [1, 1]], 2); add('c3b', [[0, 0], [0, 1], [1, 0]], 2); add('c3c', [[0, 0], [0, 1], [1, 1]], 2); add('c3d', [[0, 1], [1, 0], [1, 1]], 2);
  add('l4a', [[0, 0], [1, 0], [2, 0], [2, 1]], 1); add('l4b', [[0, 0], [0, 1], [0, 2], [1, 0]], 1); add('l4c', [[0, 0], [0, 1], [1, 1], [2, 1]], 1); add('l4d', [[0, 2], [1, 0], [1, 1], [1, 2]], 1);
  add('j4a', [[0, 1], [1, 1], [2, 0], [2, 1]], 1); add('j4b', [[0, 0], [1, 0], [1, 1], [1, 2]], 1); add('j4c', [[0, 0], [0, 1], [1, 0], [2, 0]], 1); add('j4d', [[0, 0], [0, 1], [0, 2], [1, 2]], 1);
  add('t4a', [[0, 0], [0, 1], [0, 2], [1, 1]], 1); add('t4b', [[0, 1], [1, 0], [1, 1], [2, 1]], 1); add('t4c', [[0, 1], [1, 0], [1, 1], [1, 2]], 1); add('t4d', [[0, 0], [1, 0], [1, 1], [2, 0]], 1);
  add('s4h', [[0, 1], [0, 2], [1, 0], [1, 1]], 1); add('s4v', [[0, 0], [1, 0], [1, 1], [2, 1]], 1);
  add('z4h', [[0, 0], [0, 1], [1, 1], [1, 2]], 1); add('z4v', [[0, 1], [1, 0], [1, 1], [2, 0]], 1);
  add('l5a', [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], 0.6); add('l5b', [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], 0.6);
  add('l5c', [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], 0.6); add('l5d', [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], 0.6);
  P.forEach(p => { p.h = 1 + Math.max(...p.cells.map(c => c[0])); p.w = 1 + Math.max(...p.cells.map(c => c[1])); });
  CFG.PIECES = P;
  CFG.PIECE = Object.fromEntries(P.map(p => [p.id, p]));

  // ------------------------------------------------------------------ fruits
  // weight = chance when a reel lands on a "cold" pick, value = coins per fruit in a winning group
  CFG.FRUITS = [
    { id: 'cherry', w: 17, v: 2 },
    { id: 'lemon', w: 16, v: 2 },
    { id: 'strawberry', w: 15, v: 3 },
    { id: 'orange', w: 14, v: 3 },
    { id: 'plum', w: 12, v: 3 },
    { id: 'grape', w: 11, v: 4 },
    { id: 'watermelon', w: 10, v: 4 },
    { id: 'bell', w: 5, v: 6 }
  ];
  CFG.FRUIT = Object.fromEntries(CFG.FRUITS.map(f => [f.id, f]));
  CFG.MIN_GROUP = 3;                               // 3+ of the same fruit in one spin pays
  CFG.COUNT_MULT = { 3: 1, 4: 1, 5: 1.5, 6: 2, 7: 3, 8: 5 };
  CFG.MULTI_GROUP_BONUS = 0.15;                    // +15% per extra winning group in one spin
  CFG.HOT_CHANCE = 0.3;                            // a cell lands on its column's reel fruit this often
  CFG.LUCK_TO_HOT = 0.005;                         // +0.5% hot chance per point of luck
  CFG.TICKET_CHANCE = 0.045;                        // ticket mark chance per landed fruit
  CFG.CLEAR_COINS = 10;                            // coins per cleared line (before charms / mode)
  CFG.REGION_SIZE = 4;
  CFG.BONUS_HOT = 0.7;                             // hot chance inside a bonus spin
  CFG.BONUS_MULT = 2;

  // ------------------------------------------------------------------ Bloom Challenge
  CFG.STAGES = 15;
  CFG.GOALS = [120, 180, 240, 290, 330, 360, 390, 410, 430, 450, 470, 490, 510, 530, 560];
  CFG.MODES = { normal: { sets: 21, mult: 1 }, double: { sets: 14, mult: 2 } };
  CFG.PREFILL = { min: 0.3, max: 0.42 };           // share of cells filled when a stage begins
  CFG.STAGE_TICKETS = 2;                            // tickets for clearing a stage
  CFG.STAGE_TICKETS_BONUS = [2, 3];                 // +1 ticket at ≥2× and ≥3× the goal
  CFG.START_TICKETS = 5; CFG.START_COINS = 20;
  CFG.CHARM_SLOTS = 6;
  CFG.SHOP_OFFERS = 3;
  CFG.REFRESH_COSTS = [5, 10, 20, 35, 55, 80];      // rises with each refresh in one shop visit
  CFG.REFRESH_STAGE_STEP = 0.5;                      // …and with the stage (+50% per stage)
  CFG.ENERGY_MAX = 3;
  CFG.ENERGY_REGEN_MIN = 15;                         // minutes per heart
  CFG.ENERGY_REFILL_COINS = 60;
  CFG.ENERGY_REFILL_STEP = 40;                       // refill price rises by 40 coins per stage

  // charms: price in tickets, dur 'run' | 'stage', effect key/value
  CFG.CHARMS = [
    { id: 'lucky_leaf', price: 3, dur: 'run', fx: { luck: 10 } },
    { id: 'combo_crown', price: 4, dur: 'run', fx: { winMult: 0.5 } },
    { id: 'coin_crest', price: 2, dur: 'stage', fx: { clearMult: 0.5 } },
    { id: 'spare_stone', price: 4, dur: 'run', fx: { spare: 0.25 } },
    { id: 'ticket_star', price: 4, dur: 'run', fx: { ticketMult: 0.3 } },
    { id: 'harvest_basket', price: 3, dur: 'run', fx: { groupBonus: 3 } },
    { id: 'sun_idol', price: 4, dur: 'run', fx: { charge: 1 } },
    { id: 'jade_frog', price: 3, dur: 'stage', fx: { perFruit: 1 } },
    { id: 'jaguar_mask', price: 4, dur: 'run', fx: { bonusMult: 1 } },
    { id: 'serpent_ring', price: 4, dur: 'run', fx: { multiLine: 0.25 } },
    { id: 'sand_glass', price: 2, dur: 'stage', fx: { sets: 3 } },
    { id: 'quetzal_fan', price: 3, dur: 'run', fx: { hot: 0.1 } },
    { id: 'fruit_cherry', price: 2, dur: 'stage', fx: { fruit: 'cherry', fruitChance: 0.14 } },
    { id: 'fruit_lemon', price: 2, dur: 'stage', fx: { fruit: 'lemon', fruitChance: 0.14 } },
    { id: 'fruit_strawberry', price: 2, dur: 'stage', fx: { fruit: 'strawberry', fruitChance: 0.14 } },
    { id: 'fruit_orange', price: 2, dur: 'stage', fx: { fruit: 'orange', fruitChance: 0.14 } },
    { id: 'fruit_plum', price: 2, dur: 'stage', fx: { fruit: 'plum', fruitChance: 0.14 } },
    { id: 'fruit_grape', price: 3, dur: 'stage', fx: { fruit: 'grape', fruitChance: 0.14 } },
    { id: 'fruit_watermelon', price: 3, dur: 'stage', fx: { fruit: 'watermelon', fruitChance: 0.14 } },
    { id: 'fruit_bell', price: 3, dur: 'stage', fx: { fruit: 'bell', fruitChance: 0.12 } }
  ];
  CFG.CHARM = Object.fromEntries(CFG.CHARMS.map(c => [c.id, c]));

  // ------------------------------------------------------------------ Classic scoring
  CFG.CLASSIC = { perCell: 1, lineBase: 60, lineSq: 10, comboStep: 0.25, allClear: 800 };
  CFG.PRAISE = ['good', 'great', 'amazing', 'unbelievable'];   // by lines cleared at once (1, 2, 3, 4+)
  CFG.BIG_CLEAR_LINES = 3;                                      // idol + stone hands sequence from this many lines

  // ------------------------------------------------------------------ Daily collection
  CFG.STREAK_DAYS = 3;
  CFG.COLLECTIBLES = [
    { id: 'meadow_bloom', chance: 0.7 },
    { id: 'moon_blossom', chance: 0.25 },
    { id: 'aurora_flower', chance: 0.05 }
  ];
  CFG.WEEKLY_CARD = 'sun_orchid';

  root.CFG = CFG;
  if (typeof module !== 'undefined') module.exports = CFG;
})(typeof window !== 'undefined' ? window : globalThis);
