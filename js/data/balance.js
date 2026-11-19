/* Centralised balance + configuration. Every tunable number lives here (or in the data tables). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});

  const Config = {
    VERSION: '1.0.0',
    SAVE_KEY: 'jjk_td_save',
    ALLOW_DEBUG: true, // set to false for a release build: ?debug=1 will be ignored
    // Owner Lab: the code for it ships in every build, but it only opens for someone who enters the private owner access code.
    // `enabled` = the Lab exists in this build. `hash` is a salted PBKDF2-SHA256 of YOUR code (never the code itself).
    // Generate the block with `node tools/owner-access.js --write` (or tools/owner-access.html); leave hash empty to keep the Lab locked for everyone.
    // OWNER-ACCESS-BEGIN
    OWNER_ACCESS: { enabled: true, iterations: 210000, salt: '', hash: '' },
    // OWNER-ACCESS-END
    BOOT_TIMEOUT_MS: 15000,
  };

  const Balance = {
    // ---- geometry ----
    W: 1280, H: 720, TILE: 64, COLS: 20, ROWS: 9, FIELD_Y: 48,
    STEP: 1 / 60, // fixed simulation step
    SPEEDS: [1, 2],

    // ---- match economy ----
    sellRefund: 0.7,
    maxDeployed: 16,
    waveBonusBase: 55,
    waveBonusPerWave: 16,
    killYenMult: 1.6,
    killYenWaveGrowth: 0.025, // +2.5% yen per wave number
    intermission: 6, // seconds before auto-start of next wave
    autoStartDelay: 2.5,

    // ---- enemy scaling ----
    hpScale: (w) => 1 + 0.17 * (w - 1) + 0.013 * (w - 1) * (w - 1),
    eliteHpMult: 3.4,
    eliteYenMult: 4,
    eliteSpeedMult: 0.92,

    // ---- difficulty modes (these genuinely change gameplay) ----
    difficulty: {
      normal: {
        id: 'normal', label: 'NORMAL', hpMult: 1, countMult: 1, startYenMult: 1, baseHp: 20, yenMult: 1,
        rewardMult: 1, gemsRepeat: 8, gemsFirst: 60, eliteFrom: 1.0, eliteBoost: 1, speedMult: 1, sellRefund: 0.7,
        desc: 'Standard curses and standard resources.',
      },
      hard: {
        id: 'hard', label: 'HARD', hpMult: 1.25, countMult: 1.1, startYenMult: 0.95, baseHp: 15, yenMult: 1.0,
        rewardMult: 1.6, gemsRepeat: 15, gemsFirst: 110, eliteFrom: 0.7, eliteBoost: 1.4, speedMult: 1.03, sellRefund: 0.65,
        desc: 'Tougher, larger waves with more Elite Curses. Less starting Yen and base HP.',
      },
      special: {
        id: 'special', label: 'SPECIAL', hpMult: 1.3, countMult: 1.1, startYenMult: 1.4, baseHp: 12, yenMult: 1.05,
        rewardMult: 2.4, gemsRepeat: 25, gemsFirst: 180, eliteFrom: 0.55, eliteBoost: 1.6, speedMult: 1.05, sellRefund: 0.55,
        desc: 'Map-specific cursed rule is active. Brutal waves and only 12 base HP, 55% sell refund. Starts with 40% more Yen.',
      },
    },

    // ---- rarity ----
    rarity: {
      COMMON: { id: 'COMMON', label: 'Common', order: 0, color: '#9aa7bd', dupShards: 6, maxPlace: 6, unlockShards: 20 },
      RARE: { id: 'RARE', label: 'Rare', order: 1, color: '#4aa8ff', dupShards: 10, maxPlace: 5, unlockShards: 30 },
      EPIC: { id: 'EPIC', label: 'Epic', order: 2, color: '#b56cff', dupShards: 16, maxPlace: 4, unlockShards: 50 },
      LEGENDARY: { id: 'LEGENDARY', label: 'Legendary', order: 3, color: '#ffb23f', dupShards: 28, maxPlace: 3, unlockShards: 80 },
      MYTHIC: { id: 'MYTHIC', label: 'Mythic', order: 4, color: '#ff4d6d', dupShards: 50, maxPlace: 1, unlockShards: 120 },
      SPECIAL: { id: 'SPECIAL', label: 'Special', order: 5, color: '#38f3d0', dupShards: 28, maxPlace: 2, unlockShards: 80 },
      // The highest rarity. Only ever obtained from a 1-in-200,000 summoner roll (see Summon.JOAN_ODDS).
      JOAN: { id: 'JOAN', label: 'JOAN', order: 6, color: '#ffffff', dupShards: 500, maxPlace: 1, unlockShards: 999999 },
    },

    // ---- character meta progression ----
    charLevelCap: 30,
    charXpToNext: (lv) => 60 + 40 * (lv - 1),
    charDmgPerLevel: 0.015, // +1.5% per level above 1
    starDmg: 0.03, // +3% damage per star
    starRangeAt3: 0.1, // star 3: +0.1 range
    starCostDiscountAt5: 0.05, // star 5: -5% deployment cost
    maxStars: 5,
    starShardCosts: [10, 20, 35, 55, 80],
    starCoinCosts: [500, 1000, 2000, 4000, 8000],

    // ---- player progression ----
    playerLevelCap: 40,
    playerXpToNext: (lv) => 120 + 80 * (lv - 1),
    teamSize: 6,

    // ---- match rewards ----
    defeatRewardFraction: 0.35,
    charXpPerWave: 6,
    charXpVictoryBonus: 40,
    playerXpPerWave: 4,
    playerXpVictory: 60,

    // ---- summon ----
    gemsStart: 100, coinsStart: 400,
    summonCost1: 10, summonCost10: 100,

    // ---- base / combat constants ----
    baseHpDefault: 20,
    ccDrWindow: 1.6, // seconds of stun immunity after a stun ends (anti stun-lock)
    maxSlow: 0.8,
    elevatedRange: 0.4, // bonus tiles for units on rooftops
    wardReduction: 0.25,
    minDamage: 1,
    projectilePoolCap: 300,
    particleCap: 450,
    damageNumberCap: 60,
  };

  JJK.Config = Config;
  JJK.Balance = Balance;
})(typeof window !== 'undefined' ? window : globalThis);
