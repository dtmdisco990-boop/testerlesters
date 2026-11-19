/* Map definitions. Paths are waypoint lists in tile coordinates (axis-aligned segments). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});

  const Maps = {
    tokyo: {
      id: 'tokyo', order: 1, name: 'Tokyo Jujutsu High', short: 'Tokyo High', waves: 15, recommendedLevel: 1,
      desc: 'A long snaking courtyard. The rooftop in the centre commands both lanes. Learn the basics here.',
      twist: 'Rooftop slots in the middle cover three lane segments. Only ranged units fit up there.',
      startYen: 420, rewardScale: 1, bg: 'tokyo',
      paths: [[[-1, 2], [3, 2], [3, 6], [8, 6], [8, 2], [13, 2], [13, 6], [17, 6], [17, 3], [19, 3]]],
      air: [[[-1, 1], [10, 2.5], [19, 3]]],
      elevated: [{ c: 9, r: 3, w: 4, h: 3 }],
      blocked: [{ c: 0, r: 0, w: 7, h: 2 }, { c: 14, r: 0, w: 3, h: 1 }, { c: 0, r: 7, w: 20, h: 2 }],
      waveCfg: { airMult: 0.45, base: 66, per: 12, accel: 0.5, intro: { wisp: 1, skitter: 3, brute: 5, wraith: 6, twin: 8, shell: 9, leech: 11, aegis: 12 }, eliteFrom: 8, eliteEvery: 2, bosses: { 15: { id: 'finger', hp: 1 } }, mutators: false, hpMult: 1 },
      special: { id: 'swiftnight', label: 'Swift Night', desc: 'All curses move 20% faster, but Yen from kills is worth 25% more.', rules: { speedMul: 1.2, killYenMul: 1.25 } },
      unlock: { level: 1, map: null },
      enemies: ['wisp', 'skitter', 'brute', 'wraith', 'twin', 'shell', 'leech', 'aegis'], boss: 'finger',
    },
    detention: {
      id: 'detention', order: 2, name: 'Detention Center', short: 'Detention', waves: 20, recommendedLevel: 4,
      desc: 'Long cell-block corridors. Rows between the lanes touch two paths at once. Curse Users appear and start disabling your units.',
      twist: 'Curse Users hex your units. Keep Panda nearby to ward, and kill hexers first.',
      startYen: 480, rewardScale: 1.35, bg: 'detention',
      paths: [[[-1, 1], [15, 1], [15, 3], [2, 3], [2, 5], [15, 5], [15, 7], [19, 7]]],
      air: [[[-1, 0.5], [9, 4], [19, 7]]],
      elevated: [{ c: 3, r: 6, w: 11, h: 3 }],
      blocked: [{ c: 16, r: 0, w: 4, h: 6 }, { c: 0, r: 6, w: 3, h: 3 }],
      waveCfg: { base: 80, per: 15, accel: 0.55, intro: { wisp: 1, skitter: 2, shell: 3, wraith: 4, twin: 6, leech: 7, hexer: 8, brute: 9, aegis: 10 }, eliteFrom: 6, eliteEvery: 2, bosses: { 10: { id: 'finger', hp: 0.45 }, 20: { id: 'jogo', hp: 1 } }, mutators: false, hpMult: 1.05 },
      special: { id: 'lockdown', label: 'Lockdown', desc: 'Only 10 units may be deployed at once. Elite Curses appear from wave 3.', rules: { maxDeployed: 10, eliteFromWave: 3 } },
      unlock: { level: 3, map: 'tokyo' },
      enemies: ['wisp', 'skitter', 'shell', 'wraith', 'twin', 'leech', 'hexer', 'brute', 'aegis'], boss: 'jogo',
    },
    shibuya: {
      id: 'shibuya', order: 3, name: 'Shibuya Incident', short: 'Shibuya', waves: 25, recommendedLevel: 8,
      desc: 'Two entrances feed one crossing. Flying curses, shielded elites and a Special Grade waiting at the end.',
      twist: 'Two lanes spawn at once and merge in the centre. Defending the merge handles both, but the opening lanes need cover too.',
      startYen: 700, rewardScale: 1.8, bg: 'shibuya',
      paths: [
        [[-1, 1], [8, 1], [8, 4], [14, 4], [14, 6], [19, 6]],
        [[-1, 7], [5, 7], [5, 4], [8, 4], [14, 4], [14, 6], [19, 6]],
      ],
      air: [[[-1, 0.5], [10, 3], [19, 6]], [[-1, 8], [10, 5], [19, 6]]],
      elevated: [{ c: 9, r: 0, w: 5, h: 3 }, { c: 15, r: 0, w: 4, h: 3 }],
      blocked: [{ c: 0, r: 2, w: 4, h: 4 }, { c: 16, r: 7, w: 4, h: 2 }],
      waveCfg: { base: 75, per: 12, accel: 0.38, intro: { wisp: 1, skitter: 1, brute: 3, wraith: 4, shell: 5, leech: 6, twin: 7, aegis: 8, hexer: 9 }, eliteFrom: 5, eliteEvery: 2, bosses: { 12: { id: 'finger', hp: 0.6 }, 18: { id: 'jogo', hp: 0.5 }, 25: { id: 'mahito', hp: 1 } }, mutators: false, hpMult: 1.1 },
      special: { id: 'blackout', label: 'Blackout', desc: 'The Veil dampens cursed energy: all unit ranges -15%.', rules: { rangeMul: 0.85 } },
      unlock: { level: 6, map: 'detention' },
      enemies: ['wisp', 'skitter', 'brute', 'wraith', 'shell', 'leech', 'twin', 'aegis', 'hexer'], boss: 'mahito',
    },
    temple: {
      id: 'temple', order: 4, name: 'Cursed Temple', short: 'Cursed Temple', waves: 30, recommendedLevel: 12,
      desc: 'A spiral shrine where the King of Curses waits. Every wave carries a cursed mutation. Three bosses.',
      twist: 'Each wave carries a random Mutation (Swift, Hardened, Mending, Bloated). Sukuna\'s attacks are telegraphed: watch the red zones.',
      startYen: 850, rewardScale: 2.4, bg: 'temple',
      paths: [[[-1, 4], [4, 4], [4, 1], [10, 1], [10, 7], [16, 7], [16, 3], [19, 3]]],
      air: [[[-1, 3], [10, 4], [19, 3]]],
      elevated: [{ c: 5, r: 2, w: 5, h: 5 }, { c: 11, r: 2, w: 5, h: 4 }],
      blocked: [{ c: 0, r: 0, w: 4, h: 3 }, { c: 17, r: 5, w: 3, h: 4 }, { c: 0, r: 6, w: 8, h: 3 }],
      waveCfg: { base: 72, per: 12, accel: 0.33, intro: { wisp: 1, skitter: 1, shell: 2, wraith: 3, brute: 4, leech: 5, twin: 6, aegis: 7, hexer: 8 }, eliteFrom: 4, eliteEvery: 2, bosses: { 10: { id: 'jogo', hp: 0.5 }, 20: { id: 'mahito', hp: 0.55 }, 30: { id: 'sukuna', hp: 1 } }, mutators: true, hpMult: 1.15 },
      special: { id: 'sukunaaura', label: 'King\'s Aura', desc: 'Every curse regenerates 1.5% HP/s, and wave bonus Yen is halved.', rules: { regenAdd: 0.015, waveBonusMul: 0.5 } },
      unlock: { level: 10, map: 'shibuya' },
      enemies: ['wisp', 'skitter', 'shell', 'wraith', 'brute', 'leech', 'twin', 'aegis', 'hexer'], boss: 'sukuna',
    },
    shinjuku: {
      id: 'shinjuku', order: 5, name: 'Shinjuku Gauntlet', short: 'Shinjuku', waves: 45, recommendedLevel: 18,
      desc: 'The Culling Game finale. Forty-five waves and five bosses on two merging lanes: Hanami, Dagon, Mahito, Mahoraga and Heian-era Sukuna. The hardest map in the game.',
      twist: 'Every boss tests a different skill: target the Buds, burst the Exposed window, break the wheel with nullify, and clash the Shrine with a Domain at exactly the right moment.',
      startYen: 1100, rewardScale: 4.2, bg: 'shinjuku',
      paths: [
        [[-1, 1], [14, 1], [14, 4], [7, 4], [7, 7], [19, 7]],
        [[-1, 4], [7, 4], [7, 7], [19, 7]],
      ],
      air: [[[-1, 0.5], [10, 4], [19, 7]], [[-1, 8], [10, 5], [19, 7]]],
      elevated: [{ c: 8, r: 0, w: 5, h: 3 }, { c: 1, r: 5, w: 5, h: 3 }, { c: 15, r: 2, w: 4, h: 3 }],
      blocked: [{ c: 15, r: 0, w: 5, h: 2 }, { c: 0, r: 2, w: 5, h: 1 }, { c: 0, r: 8, w: 6, h: 1 }, { c: 8, r: 8, w: 4, h: 1 }],
      waveCfg: {
        base: 82, per: 13, accel: 0.3, airMult: 0.6,
        intro: { wisp: 1, skitter: 1, shell: 2, brute: 3, wraith: 4, leech: 5, twin: 6, aegis: 7, hexer: 8 },
        eliteFrom: 3, eliteEvery: 1,
        bosses: { 10: { id: 'hanami', hp: 0.8 }, 20: { id: 'dagon', hp: 0.8 }, 30: { id: 'mahito', hp: 1.4 }, 38: { id: 'mahoraga', hp: 0.9 }, 45: { id: 'sukunaH', hp: 0.9 } },
        mutators: true, hpMult: 1.3,
      },
      special: { id: 'culling', label: 'Culling Game', desc: 'Curses move 10% faster and regenerate 1% HP/s. Wave bonus Yen is cut by 40% and at most 12 units may be deployed.', rules: { speedMul: 1.1, regenAdd: 0.01, waveBonusMul: 0.6, maxDeployed: 12 } },
      unlock: { level: 15, map: 'temple', diff: 'hard' },
      enemies: ['wisp', 'skitter', 'brute', 'wraith', 'shell', 'leech', 'twin', 'aegis', 'hexer'], boss: 'sukunaH',
    },
  };

  JJK.Maps = Maps;
  JJK.MapOrder = ['tokyo', 'detention', 'shibuya', 'temple', 'shinjuku'];
})(typeof window !== 'undefined' ? window : globalThis);
