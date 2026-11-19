/* Enemy archetypes + boss definitions. Each archetype demands a different answer. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});

  const E = {
    wisp: {
      id: 'wisp', name: 'Basic Curse', hp: 60, speed: 52, armor: 0, yen: 8, leak: 1, threat: 10, size: 26, color: '#8a5cd0',
      desc: 'A formless grade-4 curse. Weak alone, dangerous in numbers.', tip: 'Any damage works. Splash is efficient.',
    },
    skitter: {
      id: 'skitter', name: 'Fast Curse', hp: 34, speed: 112, armor: 0, yen: 7, leak: 1, threat: 9, size: 22, color: '#ff5a5a',
      desc: 'Skitters along the path at twice the pace.', tip: 'Slows and stuns catch these. Hit them early in the path.',
    },
    brute: {
      id: 'brute', name: 'Tank Curse', hp: 300, speed: 34, armor: 0.1, yen: 30, leak: 3, threat: 45, size: 44, color: '#4a8a5a', ccResist: 0.35,
      desc: 'A bloated curse with a massive health pool. Costs 3 base HP if it leaks.', tip: 'Sustained single-target DPS. Resists stuns by 35%.',
    },
    wraith: {
      id: 'wraith', name: 'Flying Curse', hp: 75, speed: 78, armor: 0, yen: 12, leak: 1, threat: 20, size: 30, color: '#4ad0c8', air: true,
      desc: 'Flies straight toward the base, ignoring the path. Ground-only units cannot hit it.', tip: 'Needs ranged units: Nobara, Nanami, Megumi (Nue), Choso, Mei Mei, Gojo, Yuta.',
    },
    shell: {
      id: 'shell', name: 'Armored Curse', hp: 170, speed: 42, armor: 0.55, yen: 20, leak: 2, threat: 32, size: 36, color: '#b8b8c8',
      desc: 'Bone plating cuts physical damage by 55%. Cursed-energy attacks ignore the plating.', tip: 'Maki and Toji pierce armor. Cursed attacks bypass it.',
    },
    leech: {
      id: 'leech', name: 'Regenerating Curse', hp: 140, speed: 46, armor: 0, yen: 22, leak: 1, threat: 30, size: 32, color: '#e0508a', regen: 0.06,
      desc: 'Heals 6% max HP per second after avoiding damage for 1.5s.', tip: 'Burst it down. Toji halts its regeneration.',
    },
    aegis: {
      id: 'aegis', name: 'Shielded Curse', hp: 90, shield: 140, speed: 48, armor: 0, yen: 24, leak: 1, threat: 34, size: 32, color: '#58b0ff', shieldRegenDelay: 4, shieldRegen: 28,
      desc: 'A cursed barrier absorbs 140 damage and regrows if left alone.', tip: 'High per-hit damage and Toji strip barriers. Chip damage is wasted.',
    },
    twin: {
      id: 'twin', name: 'Split Curse', hp: 130, speed: 46, armor: 0, yen: 18, leak: 1, threat: 26, size: 34, color: '#e0a040', split: { type: 'mite', n: 2 },
      desc: 'Splits into two Mites when destroyed.', tip: 'Area attacks clear the spawn. Do not overkill them with single target.',
    },
    mite: {
      id: 'mite', name: 'Mite', hp: 45, speed: 74, armor: 0, yen: 3, leak: 1, threat: 0, size: 18, color: '#e0c070',
      desc: 'Fragment of a Split Curse.', tip: 'Fast and fragile.',
    },
    hexer: {
      id: 'hexer', name: 'Curse User', hp: 120, speed: 44, armor: 0, yen: 38, leak: 2, threat: 50, size: 34, color: '#a040c8', ward: 2.2, hexCd: 9, hexRange: 3.2, hexDur: 3,
      desc: 'A sorcerer-like curse. Wards nearby curses (-25% damage taken) and hexes your units, disabling them for 3s.', tip: 'Kill first. Panda\'s Ward makes allies immune to its hexes.',
    },
  };

  const B = {
    finger: {
      id: 'finger', name: 'Finger Bearer', title: 'Special Grade Vessel', hp: 4200, speed: 24, armor: 0.2, yen: 400, leak: 12, size: 70, color: '#d8c8a8', boss: true,
      ccResist: 0.6, knockImmune: true, ai: 'finger', air: false,
      desc: 'A curse empowered by a Sukuna finger. Sheds cursed shells as it weakens and calls in reinforcements.',
      mechanics: ['Every 33% HP lost: gains a Cursed Shell (absorbs 18% max HP).', 'Summons Fast Curses every 11s (telegraphed ring).', 'Below 33% HP: enraged, +40% speed.'],
      drops: [{ kind: 'shards', id: 'todo', n: [4, 8], chance: 0.6 }, { kind: 'shards', id: 'maki', n: [3, 6], chance: 0.4 }],
      rewardCoins: 250,
    },
    jogo: {
      id: 'jogo', name: 'Jogo', title: 'Special Grade Disaster Curse', hp: 7800, speed: 22, armor: 0.1, yen: 700, leak: 15, size: 76, color: '#e8602a', boss: true,
      ccResist: 0.6, knockImmune: true, ai: 'jogo', burnImmune: true,
      desc: 'A volcanic curse. Calls meteors on your units: telegraphed, but they disable everything caught in the blast.',
      mechanics: ['Meteors mark a unit tile and strike 1.8s later: units in the blast are disabled for 5s.', 'Below 50% HP: two meteors at once, faster.', 'Below 20%: Maximum: Meteor (huge radius, 2.5s telegraph) and Jogo is left exhausted: +50% damage taken for 4s.'],
      drops: [{ kind: 'char', id: 'choso', chance: 0.3, fallbackShards: 20 }, { kind: 'shards', id: 'choso', n: [6, 12], chance: 0.8 }],
      rewardCoins: 450,
    },
    mahito: {
      id: 'mahito', name: 'Mahito', title: 'Special Grade Curse', hp: 11500, speed: 30, armor: 0, yen: 1000, leak: 20, size: 66, color: '#9ab0c8', boss: true,
      ccResist: 0.6, knockImmune: true, ai: 'mahito',
      desc: 'Reshapes his own soul mid-fight. His form changes every few seconds. Read the form, change your approach.',
      mechanics: ['SPEED form: fast, fragile. BULWARK form: slow, 60% armor. SPLIT form: spawns clones.', 'Soul Touch: telegraphs your strongest unit, then disables it for 6s.', 'Below 25%: Self-Embodiment of Perfection, a 4s telegraph that disables 3 units unless you outlast it.'],
      drops: [{ kind: 'shards', id: 'yuta', n: [4, 8], chance: 0.6 }, { kind: 'shards', id: 'hakari', n: [4, 8], chance: 0.5 }],
      rewardCoins: 700,
    },
    sukuna: {
      id: 'sukuna', name: 'Ryomen Sukuna', title: 'King of Curses', hp: 23000, speed: 24, armor: 0.1, yen: 2500, leak: 25, size: 84, color: '#c8404a', boss: true,
      ccResist: 0.7, knockImmune: true, ai: 'sukuna',
      desc: 'The King of Curses. Three phases, every major attack telegraphed. Can be out-played, never out-tanked.',
      mechanics: ['Phase 1 Cleave: a telegraphed slash across a whole row or column disables units for 6s.', 'Phase 2 Dismantle: volleys of telegraphed slashes. Summons curses.', 'Phase 3 Malevolent Shrine (30% HP): 5s warning. It disables all units not warded, unless you activate a Domain to clash with it. A clash stuns Sukuna.'],
      drops: [{ kind: 'shards', id: 'gojo', n: [8, 14], chance: 1 }, { kind: 'shards', id: 'yuta', n: [6, 12], chance: 0.7 }],
      rewardCoins: 1500,
    },
  };

  E.bud = {
    id: 'bud', name: 'Cursed Bud', hp: 340, speed: 24, armor: 0, yen: 0, leak: 0, threat: 0, size: 30, color: '#ff9ad0',
    desc: 'A flower seeded by Hanami. Blooms after 9 seconds.', tip: 'Kill before it blooms: each survivor heals Hanami and disables nearby units.',
  };

  B.hanami = {
    id: 'hanami', name: 'Hanami', title: 'Special Grade Forest Curse', hp: 18000, speed: 22, armor: 0.15, yen: 1500, leak: 22, size: 78, color: '#6aa86a', boss: true,
    ccResist: 0.65, knockImmune: true, ai: 'hanami',
    desc: 'The forest given form. Roots your units in place and seeds Cursed Buds that feed it. You must answer the buds or the fight never ends.',
    mechanics: ['Flower Field: a telegraphed bloom roots (disables) units for 5s.', 'Cursed Buds: 3 buds march beside it. Every bud alive after 9s heals Hanami 4% and disables nearby units. Switch targeting to hit them.', 'Below 50% HP: faster blooms, and Flower Field Domain (4.5s warning) disables every unarded unit unless you clash with a Domain.'],
    drops: [{ kind: 'char', id: 'kashimo', chance: 0.18, fallbackShards: 20 }, { kind: 'shards', id: 'kashimo', n: [5, 10], chance: 0.8 }],
    rewardCoins: 1200,
  };
  B.dagon = {
    id: 'dagon', name: 'Dagon', title: 'Special Grade Ocean Curse', hp: 26000, speed: 24, armor: 0.1, yen: 1800, leak: 24, size: 80, color: '#4a7ac8', boss: true,
    ccResist: 0.65, knockImmune: true, ai: 'dagon',
    desc: 'The sea itself. Dagon dives and cannot be hurt while submerged: time your burst for the moment he surfaces exposed.',
    mechanics: ['Submerge: every 17s he is invulnerable for 3s, then Exposed: +35% damage taken for 4s. Save your Domain and big hits for the exposure.', 'Death Swarm: a wave of fast curses every 12s.', 'Horizon of the Captivating Skiff (4s warning): disables all unwarded units. Clash it with a Domain activated during the warning. At 50% HP it comes twice as often.'],
    drops: [{ kind: 'shards', id: 'geto', n: [4, 8], chance: 0.5 }, { kind: 'shards', id: 'higuruma', n: [4, 8], chance: 0.5 }],
    rewardCoins: 1600,
  };
  B.mahoraga = {
    id: 'mahoraga', name: 'Mahoraga', title: 'Divine General', hp: 42000, speed: 20, armor: 0.2, yen: 3000, leak: 28, size: 88, color: '#e8e4d0', boss: true,
    ccResist: 0.85, knockImmune: true, ai: 'mahoraga',
    desc: 'Adapts to everything. Each attacker that deals enough damage is adapted to: their hits are cut by 75% for the rest of the fight. The wheel stops turning only while he is nullified.',
    mechanics: ['Adaptation: after 4.5% of its max HP in damage, a character\'s attacks are cut by 75% forever.', 'Nullify breaks the wheel: Toji (nullify upgrade) and Higuruma (Confiscation) suspend ALL adaptation while they keep hitting.', 'Divine Slash: telegraphed row AND column that disables units for 6s.', 'Four or more adaptations: +25% speed. Six or more: +20% armor.'],
    drops: [{ kind: 'shards', id: 'toji', n: [3, 6], chance: 0.4 }, { kind: 'shards', id: 'yuki', n: [4, 8], chance: 0.5 }],
    rewardCoins: 3200,
  };
  B.sukunaH = {
    id: 'sukunaH', name: 'Ryomen Sukuna', title: 'King of Curses (Heian Era)', hp: 70000, speed: 22, armor: 0.15, yen: 6000, leak: 40, size: 92, color: '#d02a3a', boss: true,
    ccResist: 0.85, knockImmune: true, ai: 'sukunaH',
    desc: 'Sukuna at his peak. Four phases. Shrine can only be clashed by a Domain activated DURING its warning: an early Domain does nothing, and a late one fails.',
    mechanics: ['Cleave rows and columns, Dismantle volleys and Fuga (large, 2.4s warning) disable units. Miwa\'s ring and Panda are immune.', 'Phase 3 (40%): Malevolent Shrine every 22s. Activate a Domain during the 3.8s warning to clash: Sukuna is stunned 4s and takes +40% damage. Otherwise every unit not warded is disabled for 6s and he heals 3% per unit.', 'Phase 4 (15%): everything at once, +35% speed.'],
    drops: [{ kind: 'shards', id: 'gojo', n: [14, 22], chance: 1 }, { kind: 'shards', id: 'sukunaC', n: [10, 20], chance: 1 }],
    rewardCoins: 6000,
  };

  JJK.Enemies = E;
  JJK.Bosses = B;
  JJK.EnemyOrder = ['wisp', 'skitter', 'brute', 'wraith', 'shell', 'leech', 'aegis', 'twin', 'hexer'];
  JJK.BossOrder = ['finger', 'jogo', 'mahito', 'sukuna', 'hanami', 'dagon', 'mahoraga', 'sukunaH'];
  JJK.EliteMods = {
    swift: { label: 'Swift', speed: 1.3, hp: 1 },
    bulwark: { label: 'Bulwark', armorAdd: 0.25, hp: 1.1 },
    warded: { label: 'Warded', ward: 2.0, hp: 1 },
  };
  JJK.WaveMutators = {
    swift: { id: 'swift', label: 'Swift Curses', desc: 'Enemies move 25% faster.', speed: 1.25 },
    hardened: { id: 'hardened', label: 'Hardened Curses', desc: 'Enemies gain +15% armor.', armorAdd: 0.15 },
    mending: { id: 'mending', label: 'Mending Curses', desc: 'Enemies regenerate 2% HP/s.', regenAdd: 0.02 },
    bloated: { id: 'bloated', label: 'Bloated Curses', desc: 'Enemies have +30% HP but pay +30% Yen.', hp: 1.3, yen: 1.3 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
