/* Character roster (data-driven). Adding a character = add a definition here (+ kit logic in sim/kits.js if unique). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});

  const UP = [0.6, 0.9, 1.4, 2.0, 3.0]; // default upgrade cost multipliers (x deployment cost)

  // Upgrade helper. dmg/spa are multipliers; range is additive (tiles); flags override kit flags.
  const U = (name, desc, o) => Object.assign({ name, desc, dmg: 1, spa: 1, range: 0, flags: {} }, o || {});

  const C = {};
  const add = (def) => { C[def.id] = def; };

  add({
    id: 'yuji', name: 'Yuji Itadori', short: 'Yuji', title: 'Vessel of Sukuna', rarity: 'COMMON', role: 'Melee DPS',
    traits: ['Student', 'Physical Specialist', 'Sorcerer'], attackType: 'Melee', place: 'ground', targets: 'ground',
    cost: 150, base: { dmg: 16, spa: 0.55, range: 1.7, dtype: 'phys' }, kit: 'yuji', flags: {},
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'first',
    desc: 'Fast, cheap and reliable. Short reach, but his fists scale from raw brawling into cursed-energy shockwaves.',
    unlock: { type: 'start' }, color: '#ff7aa8',
    art: { skin: '#f4cfae', hair: '#e58aa8', hairStyle: 'spiky', eye: '#b8742c', outfit: '#243566', trim: '#c63a46', acc: 'hood' },
    upgrades: [
      U('Conditioned Fists', 'Faster, harder punches.', { dmg: 1.25, spa: 0.95 }),
      U('Divergent Fist', 'Each strike echoes with a delayed second hit (60%).', { dmg: 1.1, flags: { divergent: 0.6 } }),
      U('Black Flash', 'Every 5th hit lands a Black Flash (x2.6, ignores half armor).', { dmg: 1.1, flags: { bfEvery: 5, bfMult: 2.6 } }),
      U('Cursed Energy Control', 'Strikes release a shockwave: splash damage, and he can now hit Air targets.', { dmg: 1.25, range: 0.5, flags: { splash: 1.1, splashDmg: 0.55, air: true } }),
      U('Maximum Output', 'Black Flash every 3rd hit with a wider shockwave.', { dmg: 1.3, spa: 0.92, flags: { bfEvery: 3, splash: 1.6 } }),
    ],
  });

  add({
    id: 'panda', name: 'Panda', short: 'Panda', title: 'Abnormal Cursed Corpse', rarity: 'COMMON', role: 'Tank / Blocker',
    traits: ['Student', 'Physical Specialist', 'Cursed Spirit'], attackType: 'Melee (Blocker)', place: 'ground', targets: 'ground',
    cost: 250, base: { dmg: 28, spa: 1.3, range: 1.5, dtype: 'phys' }, kit: 'panda', flags: { holdMax: 1, holdTime: 3.2 },
    targeting: ['first', 'closest'], defaultTargeting: 'first',
    desc: 'Plants himself on the path and holds enemies in place while pummelling them. Immune to disables and can ward neighbours. Bosses resist being held.',
    unlock: { type: 'start' }, color: '#e8e8e8',
    art: { skin: '#f2f2f2', hair: '#222', hairStyle: 'panda', eye: '#111', outfit: '#1f2c52', trim: '#eee', acc: 'ears' },
    upgrades: [
      U('Gorilla Core', 'Heavier slams.', { dmg: 1.3 }),
      U('Double Block', 'Holds up to 2 enemies at once.', { flags: { holdMax: 2 } }),
      U('Steadfast Ward', 'Panda and allies within 1.6 tiles cannot be disabled.', { flags: { ward: 1.6 } }),
      U('Gorilla Mode', 'Longer reach, harder and faster slams.', { dmg: 1.4, spa: 0.85, range: 0.3 }),
      U('Drumming Beat', 'Slams stun for 0.6s and he holds up to 3 enemies.', { flags: { stunSlam: 0.6, holdMax: 3 } }),
    ],
  });

  add({
    id: 'nobara', name: 'Nobara Kugisaki', short: 'Nobara', title: 'Straw Doll Technique', rarity: 'RARE', role: 'Burst / Debuff',
    traits: ['Student', 'Sorcerer'], attackType: 'Projectile', place: 'any', targets: 'both',
    cost: 300, base: { dmg: 12, spa: 0.9, range: 3.2, dtype: 'phys' }, kit: 'nobara', flags: { markMax: 3, markVuln: 0.05, multi: 1, resonance: 0 },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'first',
    desc: 'Nails mark enemies, and marked enemies take extra damage from everyone. Resonance detonates the marks for burst damage.',
    unlock: { type: 'start' }, color: '#ff9a3c',
    art: { skin: '#f3cfb0', hair: '#d9783a', hairStyle: 'bob', eye: '#8b4a1c', outfit: '#243566', trim: '#c63a46', acc: 'hairpin' },
    upgrades: [
      U('Hammer & Nails', 'Sharper nails.', { dmg: 1.25 }),
      U('Resonance', 'Every 10s, detonates marks: burst damage per mark stack.', { flags: { resonance: 10 } }),
      U('Straw Doll Barrage', 'Throws two nails per attack.', { spa: 1.05, flags: { multi: 2 } }),
      U('Hairpin', 'Resonance every 7s with splash. Longer range.', { range: 0.5, flags: { resonance: 7, resoSplash: 1.2 } }),
      U('Binding Resonance', 'Up to 5 marks; each mark adds +8% damage taken.', { dmg: 1.25, flags: { markMax: 5, markVuln: 0.08 } }),
    ],
  });

  add({
    id: 'megumi', name: 'Megumi Fushiguro', short: 'Megumi', title: 'Ten Shadows Technique', rarity: 'RARE', role: 'Summoner',
    traits: ['Student', 'Summoner', 'Domain User', 'Sorcerer'], attackType: 'Summons', place: 'any', targets: 'both',
    cost: 350, base: { dmg: 11, spa: 0.7, range: 2.6, dtype: 'phys' }, kit: 'megumi', flags: { dogs: 2, nue: false, max: false },
    targeting: ['first', 'strongest', 'closest'], defaultTargeting: 'first',
    desc: 'Commands shikigami: Divine Dogs chase ground curses, Nue strikes from the sky, Max Elephant floods the lane. Unlocks the Chimera Shadow Garden domain.',
    unlock: { type: 'start' }, color: '#5a7bff',
    art: { skin: '#f1cdb0', hair: '#1b1f2e', hairStyle: 'spiky', eye: '#2a3a6e', outfit: '#243566', trim: '#c63a46', acc: 'none' },
    upgrades: [
      U('Divine Dogs Trained', 'Dogs bite harder.', { dmg: 1.3 }),
      U('Nue', 'Summons Nue: a winged shikigami that shocks groups and hits Air targets.', { flags: { nue: true } }),
      U('Third Hound', 'A third dog joins the pack. Wider patrol.', { range: 0.4, flags: { dogs: 3 } }),
      U('Max Elephant', 'Floods the lane with slowing water.', { dmg: 1.15, flags: { max: true } }),
      U('Chimera Shadow Garden', 'Unlocks Domain: Chimera Shadow Garden. Shikigami hit 30% harder.', { dmg: 1.3, flags: { domain: 'shadowGarden' } }),
    ],
  });

  add({
    id: 'maki', name: 'Maki Zenin', short: 'Maki', title: 'Cursed Tool Specialist', rarity: 'RARE', role: 'Anti-Armor',
    traits: ['Student', 'Physical Specialist'], attackType: 'Melee (Armor Break)', place: 'ground', targets: 'ground',
    cost: 350, base: { dmg: 34, spa: 1.05, range: 1.8, dtype: 'phys', pierce: 0.5 }, kit: 'maki', flags: { armorBreak: 0, sweepEvery: 0, armoredBonus: 0 },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'strongest',
    desc: 'Pure physical specialist. Slices through armored curses and shreds their defences for the rest of the team.',
    unlock: { type: 'map', map: 'detention', hint: 'Clear Detention Center.' }, color: '#69c27a',
    art: { skin: '#f0cbb0', hair: '#2e3b34', hairStyle: 'ponytail', eye: '#3a6b4a', outfit: '#243566', trim: '#c63a46', acc: 'glasses' },
    upgrades: [
      U('Spear Mastery', 'Sharper strikes that pierce more armor.', { dmg: 1.25, flags: { pierce: 0.6 } }),
      U('Armor Break', 'Hits strip 5% armor per stack (5 stacks, 5s).', { flags: { armorBreak: 0.05 } }),
      U('Playful Cloud', 'Every 4th strike is a spinning sweep hitting all nearby.', { flags: { sweepEvery: 4 } }),
      U('Heavenly Reach', 'Longer reach, faster and harder.', { dmg: 1.25, spa: 0.92, range: 0.4 }),
      U('Zenin Zero', 'Ignores all armor. +60% damage to armored curses.', { flags: { pierce: 1, armoredBonus: 0.6 } }),
    ],
  });

  add({
    id: 'inumaki', name: 'Toge Inumaki', short: 'Inumaki', title: 'Cursed Speech', rarity: 'RARE', role: 'Crowd Control',
    traits: ['Student', 'Support', 'Sorcerer'], attackType: 'Cursed Speech', place: 'any', targets: 'both',
    cost: 400, base: { dmg: 18, spa: 7.5, range: 3.0, dtype: 'cursed' }, kit: 'inumaki', flags: { speech: ['slow'], maxTargets: 3, crush: false },
    targeting: ['first', 'strongest', 'closest'], defaultTargeting: 'first',
    desc: 'Casts commands that slow, stun, blast back or crush groups of curses. Cooldown-based with built-in stun diminishing returns: no permanent stun-lock.',
    unlock: { type: 'mission', mission: 'kills_150', hint: 'Mission: defeat 150 curses.' }, color: '#c48cff',
    art: { skin: '#f3d6bc', hair: '#e9e9f4', hairStyle: 'spiky', eye: '#8a5cd0', outfit: '#243566', trim: '#c63a46', acc: 'mask' },
    upgrades: [
      U('Stop', 'Adds a 1.4s stun to the speech rotation.', { flags: { speech: ['slow', 'stop'] } }),
      U('Blast Away', 'Adds a knockback that shoves enemies back along the path.', { flags: { speech: ['slow', 'stop', 'blast'] } }),
      U('Throat Medicine', 'Casts 20% faster.', { spa: 0.8 }),
      U('Explode', 'Adds a cursed-energy blast. Affects up to 5 enemies.', { dmg: 1.4, flags: { speech: ['slow', 'stop', 'blast', 'explode'], maxTargets: 5 } }),
      U('Crush', 'Every cast slows, stuns and damages up to 8 enemies.', { spa: 0.9, flags: { crush: true, maxTargets: 8 } }),
    ],
  });

  add({
    id: 'nanami', name: 'Kento Nanami', short: 'Nanami', title: 'Ratio Technique', rarity: 'EPIC', role: 'Precision DPS',
    traits: ['Sorcerer'], attackType: 'Ranged Strike', place: 'any', targets: 'both',
    cost: 600, base: { dmg: 22, spa: 0.8, range: 2.6, dtype: 'phys' }, kit: 'nanami', flags: { ratioEvery: 4, ratioMult: 3.2, ratioPierce: 0.7 },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'strongest',
    desc: 'Periodically lands a 7:3 critical that ignores most armor and hurts bosses. The dependable answer to tough enemies.',
    unlock: { type: 'summon' }, color: '#e9c46a',
    art: { skin: '#f1cfb2', hair: '#e8c872', hairStyle: 'slick', eye: '#5a4a2a', outfit: '#d9c9a0', trim: '#7a5a2a', acc: 'glasses' },
    upgrades: [
      U('Blunt Blade Mastery', 'Cleaner strikes.', { dmg: 1.2 }),
      U('Overtime', 'After 12s of fighting, 8s of +35% attack speed (30s cooldown).', { flags: { overtime: true } }),
      U('Ratio: 7:3', 'Critical every 3rd attack.', { flags: { ratioEvery: 3 } }),
      U('Weak Point Focus', 'Critical hits x4.0. Slightly longer reach.', { range: 0.4, flags: { ratioMult: 4 } }),
      U('Collapse', 'Ratio strikes shatter the target: splash damage.', { dmg: 1.2, flags: { collapse: 1 } }),
    ],
  });

  add({
    id: 'meimei', name: 'Mei Mei', short: 'Mei Mei', title: 'Bird Strike', rarity: 'EPIC', role: 'Economy / Support',
    traits: ['Support', 'Sorcerer'], attackType: 'Ranged Chain', place: 'any', targets: 'both',
    cost: 500, base: { dmg: 14, spa: 0.85, range: 3.0, dtype: 'phys' }, kit: 'meimei', flags: { bounces: 1, waveYen: 25, killYenBonus: 0.15, axeEvery: 0, frenzyCd: 0 },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'first',
    desc: 'Crows scout for profit. Generates Yen every wave and marks enemies so they pay out more. Light damage, strong economy.',
    unlock: { type: 'summon' }, color: '#7de0e0',
    art: { skin: '#f2d4bc', hair: '#cfe3f0', hairStyle: 'long', eye: '#2a7a8a', outfit: '#2c2f4d', trim: '#7de0e0', acc: 'crow' },
    upgrades: [
      U('Crow Scouts', 'Wave-start income rises to 45 Yen.', { flags: { waveYen: 45 } }),
      U('Chain Crows', 'Crows bounce between 2 extra enemies.', { dmg: 1.2, flags: { bounces: 2 } }),
      U('Axe Throw', 'Every 5th attack is a heavy axe throw (x3.2).', { flags: { axeEvery: 5, axeMult: 3.2 } }),
      U('Crow Frenzy', 'Ability: every 30s, 6s of triple attack speed.', { flags: { frenzyCd: 30 } }),
      U('Bounty Marks', 'Marked enemies pay +40% Yen. Wave income 90.', { flags: { killYenBonus: 0.4, waveYen: 90 } }),
    ],
  });

  add({
    id: 'todo', name: 'Aoi Todo', short: 'Todo', title: 'Boogie Woogie', rarity: 'EPIC', role: 'Control / Utility',
    traits: ['Student', 'Physical Specialist', 'Sorcerer'], attackType: 'Melee + Control', place: 'ground', targets: 'ground',
    cost: 700, base: { dmg: 26, spa: 0.85, range: 1.8, dtype: 'phys' }, kit: 'todo', flags: { bwCd: 10, bwPush: 3.2, bwRange: 3.0, bfEvery: 0, swap: false, brother: false },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'first',
    desc: 'A brawler who claps to teleport enemies backward along the path, buying the whole team time. Bosses are only nudged.',
    unlock: { type: 'challenge', challenge: 'endless_20', hint: 'Challenge: reach wave 20 in Endless.' }, color: '#f07a3a',
    art: { skin: '#e8b890', hair: '#2a1d16', hairStyle: 'topknot', eye: '#3a2a1a', outfit: '#4a2a2a', trim: '#e0b040', acc: 'scar' },
    upgrades: [
      U('Bruiser', 'Harder, faster fists.', { dmg: 1.2, spa: 0.95 }),
      U('Black Flash Rhythm', 'Every 5th punch is a Black Flash (x2.4).', { flags: { bfEvery: 5, bfMult: 2.4 } }),
      U('Swap', 'Boogie Woogie swaps the front-most and rear-most enemies in range. Cooldown 8s.', { flags: { swap: true, bwCd: 8 } }),
      U('Long Clap', 'Pushes enemies 4.8 tiles back and clap reach grows.', { dmg: 1.2, range: 0.5, flags: { bwPush: 4.8, bwRange: 3.6 } }),
      U('Brothers in Arms', 'Claps rally allies within 2.5 tiles: +25% attack speed for 4s. Cooldown 6.5s.', { flags: { brother: true, bwCd: 6.5 } }),
    ],
  });

  add({
    id: 'choso', name: 'Choso', short: 'Choso', title: 'Blood Manipulation', rarity: 'EPIC', role: 'Line Piercer',
    traits: ['Cursed Spirit'], attackType: 'Piercing Beam', place: 'any', targets: 'both',
    cost: 800, base: { dmg: 70, spa: 2.6, range: 4.0, dtype: 'cursed' }, kit: 'choso', flags: { beamWidth: 0.55, supernovaCd: 0, supernovaCount: 0, redScale: 0 },
    targeting: ['first', 'strongest', 'closest'], defaultTargeting: 'first',
    desc: 'Charges Piercing Blood: a long beam that hits every enemy on the line. Devastating on straight lanes and packed formations.',
    unlock: { type: 'boss', boss: 'jogo', hint: 'Boss drop: defeat Jogo.' }, color: '#e04646',
    art: { skin: '#e9c7a8', hair: '#2a1c1c', hairStyle: 'ponytail', eye: '#3a2020', outfit: '#6a2a2a', trim: '#e04646', acc: 'cheek' },
    upgrades: [
      U('Blood Compression', 'Denser blood.', { dmg: 1.25 }),
      U('Convergence', 'Charges 20% faster.', { spa: 0.8 }),
      U('Supernova', 'Every 18s, blood shards rain on up to 6 enemies.', { flags: { supernovaCd: 18, supernovaCount: 6 } }),
      U('Flowing Red Scale', 'After Supernova: +40% attack speed for 6s.', { flags: { redScale: 0.4 } }),
      U('Blood Overflow', 'Wider beam; Supernova fires 10 shards.', { dmg: 1.2, flags: { beamWidth: 0.95, supernovaCount: 10 } }),
    ],
  });

  add({
    id: 'hakari', name: 'Kinji Hakari', short: 'Hakari', title: 'Private Pure Love Train', rarity: 'LEGENDARY', role: 'Ramping Brawler',
    traits: ['Domain User', 'Sorcerer'], attackType: 'Melee (Ramp)', place: 'ground', targets: 'ground',
    cost: 1000, base: { dmg: 38, spa: 0.75, range: 1.8, dtype: 'phys' }, kit: 'hakari', flags: { rampMax: 0.5, jackpotEvery: 0, jackpotYen: 0, splash: 0 },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'first',
    desc: 'Every consecutive hit makes him faster. Jackpot strikes pay out Yen, and his domain is a gamble that can turn a whole wave.',
    unlock: { type: 'summon' }, color: '#ff5fd0',
    art: { skin: '#f0cbac', hair: '#1a1a1a', hairStyle: 'pompadour', eye: '#7a3a5a', outfit: '#b02a8a', trim: '#ffe36a', acc: 'shades' },
    upgrades: [
      U('Pachinko Rush', 'Heavier blows.', { dmg: 1.2 }),
      U('Overdrive', 'Ramp-up cap rises to +100% attack speed.', { flags: { rampMax: 1.0 } }),
      U('Jackpot Strikes', 'Every 7th hit pays out 20 Yen and deals x3.', { flags: { jackpotEvery: 7, jackpotYen: 20 } }),
      U('Gambler\'s Stamina', 'Longer reach and splash on every hit.', { dmg: 1.2, range: 0.4, flags: { splash: 0.9 } }),
      U('Idle Death Gamble', 'Unlocks Domain: Idle Death Gamble.', { dmg: 1.2, flags: { domain: 'idleDeath' } }),
    ],
  });

  add({
    id: 'yuta', name: 'Yuta Okkotsu', short: 'Yuta', title: 'Special Grade Sorcerer', rarity: 'LEGENDARY', role: 'Hybrid DPS',
    traits: ['Student', 'Domain User', 'Sorcerer'], attackType: 'Hybrid', place: 'any', targets: 'both',
    cost: 1500, base: { dmg: 58, spa: 1.0, range: 2.6, dtype: 'cursed' }, kit: 'yuta', flags: { waveEvery: 3, rikaCd: 0, rikaDur: 0, copyChance: 0 },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'strongest',
    desc: 'Swordsman and caster in one. Summons Rika to power up, copies control techniques, and unlocks Authentic Mutual Love.',
    unlock: { type: 'summon' }, color: '#ff7ab8',
    art: { skin: '#f2d6bf', hair: '#14141c', hairStyle: 'slick', eye: '#2a2a3a', outfit: '#eaeaf4', trim: '#c63a46', acc: 'sword' },
    upgrades: [
      U('Cursed Katana', 'Cursed energy sharpens the blade.', { dmg: 1.2 }),
      U('Rika', 'Manifests Rika for 12s (35s cooldown): +60% damage, faster strikes, splash.', { flags: { rikaCd: 35, rikaDur: 12 } }),
      U('Copy', 'Attacks have a 25% chance to copy Stop (stun) or Slow.', { flags: { copyChance: 0.25 } }),
      U('Rika Unleashed', 'Rika lasts 17s with a 30s cooldown. Longer reach.', { dmg: 1.25, range: 0.4, flags: { rikaCd: 30, rikaDur: 17 } }),
      U('Authentic Mutual Love', 'Unlocks Domain: Authentic Mutual Love.', { dmg: 1.2, flags: { domain: 'mutualLove' } }),
    ],
  });

  add({
    id: 'toji', name: 'Toji Fushiguro', short: 'Toji', title: 'The Sorcerer Killer', rarity: 'SPECIAL', role: 'Assassin',
    traits: ['Physical Specialist'], attackType: 'Melee (Execute)', place: 'ground', targets: 'ground',
    cost: 900, base: { dmg: 30, spa: 0.45, range: 1.8, dtype: 'phys', pierce: 0.35 }, kit: 'toji', flags: { executeAt: 0.3, executeMult: 1.8, nullify: false, chainEvery: 0 },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'weakest',
    desc: 'No cursed energy, no mercy. Strips shields and regeneration and executes weakened enemies. Cannot be summoned: it must be earned.',
    unlock: { type: 'secret', hint: 'A man with no cursed energy... Win on HARD with 3+ units, all Physical Specialists.' }, color: '#38f3d0',
    art: { skin: '#e4bf9c', hair: '#14110f', hairStyle: 'short', eye: '#2a3a3a', outfit: '#1d2230', trim: '#38f3d0', acc: 'scarlip' },
    upgrades: [
      U('Inverted Spear of Heaven', 'Hits strip Shields and halt Regeneration for 4s.', { dmg: 1.1, flags: { nullify: true } }),
      U('Playful Cloud', 'Every 5th attack chains to 2 nearby enemies.', { flags: { chainEvery: 5 } }),
      U('Split Soul Katana', 'Pierces 70% armor.', { dmg: 1.2, flags: { pierce: 0.7 } }),
      U('Predator', 'Executes below 40% HP for x2.2. Faster.', { spa: 0.88, flags: { executeAt: 0.4, executeMult: 2.2 } }),
      U('Heavenly Restriction', 'Fully awakened: faster, harder, longer reach.', { dmg: 1.3, spa: 0.8, range: 0.3 }),
    ],
  });

  add({
    id: 'gojo', name: 'Satoru Gojo', short: 'Gojo', title: 'The Strongest', rarity: 'MYTHIC', role: 'Late-Game Carry',
    traits: ['Domain User', 'Sorcerer'], attackType: 'Area (Pull)', place: 'any', targets: 'both',
    cost: 2500, upMult: [0.6, 0.9, 1.3, 1.8, 2.4],
    base: { dmg: 52, spa: 1.5, range: 3.4, dtype: 'cursed' }, kit: 'gojo', flags: { redEvery: 0, redMult: 2.4, redKnock: 1.2, purple: false, purpleCd: 16, purpleMult: 8, purpleWidth: 0.9 },
    targeting: ['first', 'strongest', 'closest'], defaultTargeting: 'first',
    desc: 'Starts with Blue, gravity that clumps enemies together. Evolves into Red, Hollow Purple and finally Unlimited Void. Brutally expensive; every technique runs on cooldowns.',
    unlock: { type: 'summon' }, color: '#7fd0ff',
    art: { skin: '#f4dac6', hair: '#f4f7ff', hairStyle: 'spiky', eye: '#6fc8ff', outfit: '#1a2038', trim: '#6fc8ff', acc: 'blindfold' },
    upgrades: [
      U('Reversal: Red', 'Every 3rd cast is Red: a wide concussive blast (x2.4) that knocks enemies back.', { flags: { redEvery: 3 } }),
      U('Infinity', 'Longer reach, faster casting.', { dmg: 1.2, spa: 0.9, range: 0.5 }),
      U('Hollow Purple', 'Every 16s fires a piercing beam that hits every enemy in a line for massive damage.', { flags: { purple: true } }),
      U('Refined Technique', 'Purple every 12s and wider. Red every 2nd cast.', { dmg: 1.25, flags: { purpleCd: 12, purpleWidth: 1.25, redEvery: 2 } }),
      U('Unlimited Void', 'Unlocks Domain: Unlimited Void.', { dmg: 1.2, spa: 0.9, flags: { domain: 'unlimitedVoid' } }),
    ],
  });

  // ---- finalize defs: costs, derived data ----
  for (const id in C) {
    const d = C[id];
    const mult = d.upMult || UP;
    d.upgrades.forEach((u, i) => { u.cost = Math.round((d.cost * mult[i]) / 5) * 5; });
    d.maxLevel = d.upgrades.length + 1; // unit level 1..6
  }

  // Domain definitions (gameplay effects live in sim/kits.js; data here drives UI & balance)
  const Domains = {
    unlimitedVoid: { id: 'unlimitedVoid', name: 'Unlimited Void', owner: 'gojo', cd: 100, dur: 5, color: '#9fd7ff', style: 'void',
      desc: 'For 5s: all curses are frozen in place (bosses are slowed 70% and take +25% damage) and all allies attack 25% faster.' },
    shadowGarden: { id: 'shadowGarden', name: 'Chimera Shadow Garden', owner: 'megumi', cd: 80, dur: 8, color: '#4a5cff', style: 'shadow',
      desc: 'For 8s: all curses are slowed 45% and sink into shadow, and your shikigami swarm in greater numbers hitting 50% harder.' },
    idleDeath: { id: 'idleDeath', name: 'Idle Death Gamble', owner: 'hakari', cd: 70, dur: 12, color: '#ff5fd0', style: 'slots',
      desc: 'Spin the reels! A 1-in-6 JACKPOT empowers every ally for 12s (+60% attack speed, +30% damage). Misses still pay a smaller reward. Odds improve after every miss.' },
    mutualLove: { id: 'mutualLove', name: 'Authentic Mutual Love', owner: 'yuta', cd: 110, dur: 10, color: '#ff7ab8', style: 'love',
      desc: 'For 10s: allies deal +40% damage and Rika batters every curse on the field once per second.' },
  };

  // Shikigami / summon definitions used by the reusable summon system.
  const SummonDefs = {
    dog: { id: 'dog', name: 'Divine Dog', kind: 'chaser', speed: 170, spa: 0.7, dmgMult: 1.0, ground: true, air: false, color: '#f2f4ff', size: 16 },
    nue: { id: 'nue', name: 'Nue', kind: 'striker', cd: 3.2, radius: 0.95, dmgMult: 2.1, stun: 0.35, air: true, color: '#ffe36a', size: 22 },
    max: { id: 'max', name: 'Max Elephant', kind: 'zone', cd: 7, radius: 1.5, dmgMult: 0.7, slow: 0.45, slowDur: 3.2, color: '#4aa8ff', size: 24 },
  };

  const Traits = {
    Student: { desc: 'Tokyo/Kyoto students. 3+ in your team: Students +8% attack speed. 5+: +14%.', tiers: [[3, 0.08], [5, 0.14]] },
    'Physical Specialist': { desc: 'Pure physical combatants. 2+ in your team: +8% damage for Physical Specialists. 3+: +15%.', tiers: [[2, 0.08], [3, 0.15]] },
    Support: { desc: 'Each deployed Support unit grants +4% damage to all other allies (max 3 supports).', tiers: [[1, 0.04]] },
    'Domain User': { desc: 'With 2+ Domain Users deployed, activating a Domain lowers the other Domain Users\' cooldowns by 12s.', tiers: [[2, 12]] },
    Summoner: { desc: 'Commands shikigami.', tiers: [] },
    Sorcerer: { desc: 'A jujutsu sorcerer.', tiers: [] },
    'Cursed Spirit': { desc: 'Cursed-energy being.', tiers: [] },
  };

  JJK.Characters = C;
  JJK.CharacterOrder = ['yuji', 'panda', 'nobara', 'megumi', 'maki', 'inumaki', 'nanami', 'meimei', 'todo', 'choso', 'hakari', 'yuta', 'toji', 'gojo'];
  JJK.Domains = Domains;
  JJK.SummonDefs = SummonDefs;
  JJK.Traits = Traits;
})(typeof window !== 'undefined' ? window : globalThis);
