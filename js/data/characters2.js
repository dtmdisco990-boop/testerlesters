/* Expansion roster: 13 harder-to-get sorcerers and curses. Loaded after characters.js; behaviour lives in sim/kits2.js.
   Acquisition is deliberately gated: the Culling Game banner (tiny rates), boss mastery, challenges, and the Shinjuku Gauntlet. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const C = JJK.Characters;
  const UP = [0.6, 0.9, 1.4, 2.0, 3.0];
  const U = (name, desc, o) => Object.assign({ name, desc, dmg: 1, spa: 1, range: 0, flags: {} }, o || {});
  JJK.Expansion = ['mai', 'momo', 'miwa', 'utahime', 'uraume', 'naoya', 'higuruma', 'geto', 'kashimo', 'yuki', 'jogoC', 'mahitoC', 'sukunaC'];
  const ALL = ['first', 'last', 'strongest', 'weakest', 'closest'];
  const add = (def) => { C[def.id] = def; JJK.CharacterOrder.push(def.id); };

  // ---------------------------------------------------------------- RARE
  add({
    id: 'mai', name: 'Mai Zenin', short: 'Mai', title: 'Construction', rarity: 'RARE', role: 'Marksman',
    traits: ['Student', 'Sorcerer'], attackType: 'Sniper Shot', place: 'any', targets: 'both',
    cost: 350, base: { dmg: 24, spa: 1.4, range: 4.4, dtype: 'phys', pierce: 0.15 }, kit: 'mai', flags: { createEvery: 6, createMult: 3, ricochet: false, boom: 0 },
    targeting: ALL, defaultTargeting: 'strongest',
    desc: 'A patient sniper. Every few shots she constructs a perfect bullet that ignores armour and hits three times as hard.',
    unlock: { type: 'mission', mission: 'kills_500', hint: 'Mission: defeat 500 curses.' }, color: '#d9783a',
    art: { skin: '#f3cfb0', hair: '#7a3a2a', hairStyle: 'ponytail', eye: '#8a4a3a', outfit: '#243566', trim: '#c63a46', acc: 'rifle' },
    upgrades: [
      U('Long Barrel', 'Sharper aim, more reach.', { dmg: 1.2, range: 0.3 }),
      U('Quick Draw', 'Reloads 15% faster.', { spa: 0.85 }),
      U('Created Bullet', 'A constructed bullet every 4th shot.', { flags: { createEvery: 4 } }),
      U('Ricochet', 'Constructed bullets ricochet to a second enemy for 70%.', { dmg: 1.15, flags: { ricochet: true } }),
      U('Perfect Construction', 'Constructed bullets detonate: splash damage. Every 3rd shot is constructed.', { dmg: 1.2, flags: { createEvery: 3, boom: 1.1 } }),
    ],
  });

  add({
    id: 'momo', name: 'Momo Nishimiya', short: 'Momo', title: 'Wind Broom', rarity: 'RARE', role: 'Anti-Air',
    traits: ['Student', 'Sorcerer'], attackType: 'Wind Blades', place: 'any', targets: 'both',
    cost: 330, base: { dmg: 15, spa: 0.7, range: 3.2, dtype: 'cursed' }, kit: 'momo', flags: { airMult: 2.2, gale: 0, cyclone: 0 },
    targeting: ALL, defaultTargeting: 'first',
    desc: 'Rides a broom above the field. Her wind blades hit Air curses for more than double damage, and later buffet them out of formation.',
    unlock: { type: 'mission', mission: 'clear_detention', hint: 'Mission: complete Detention Center.' }, color: '#c8e8a0',
    art: { skin: '#f3d3b8', hair: '#8a5a3a', hairStyle: 'bob', eye: '#5a8a4a', outfit: '#2c4a3a', trim: '#e8e0b0', acc: 'broom' },
    upgrades: [
      U('Sharper Winds', 'Stronger blades.', { dmg: 1.25 }),
      U('Gale', 'Hits slow Air curses by 35% for 2s.', { flags: { gale: 0.35 } }),
      U('Broom Sprint', 'Casts 15% faster.', { spa: 0.85, range: 0.3 }),
      U('Cyclone', 'Every 8s a cyclone hits every Air curse in range for 140%.', { dmg: 1.1, flags: { cyclone: 8 } }),
      U('Sky Sovereign', 'Air curses take x3 and are stunned 0.5s by Cyclone.', { dmg: 1.2, flags: { airMult: 3, cyclone: 6 } }),
    ],
  });

  add({
    id: 'miwa', name: 'Kasumi Miwa', short: 'Miwa', title: 'Simple Domain', rarity: 'RARE', role: 'Ward Support',
    traits: ['Student', 'Support', 'Sorcerer'], attackType: 'Katana (Counter)', place: 'ground', targets: 'ground',
    cost: 280, base: { dmg: 11, spa: 0.8, range: 1.6, dtype: 'phys' }, kit: 'miwa', flags: { ward: 1.6, flow: 0, riposte: 0 },
    targeting: ['first', 'closest', 'strongest'], defaultTargeting: 'closest',
    desc: 'Her Simple Domain makes every ally nearby immune to disables: the counter to Curse Users and boss telegraphs. A weak fighter with an irreplaceable bubble.',
    unlock: { type: 'challenge', challenge: 'miwa_untouched', hint: 'Challenge: clear Detention Center on HARD with no unit ever disabled.' }, color: '#9ad8c8',
    art: { skin: '#f4d6c0', hair: '#26263a', hairStyle: 'bob', eye: '#2a5a5a', outfit: '#243566', trim: '#9ad8c8', acc: 'sword' },
    upgrades: [
      U('Draw Speed', 'Faster, harder cuts.', { dmg: 1.3, spa: 0.92 }),
      U('Wider Bubble', 'Simple Domain radius 2.2 tiles.', { flags: { ward: 2.2 } }),
      U('Falling Blossom', 'Allies in the bubble attack 10% faster.', { flags: { flow: 0.1 } }),
      U('Riposte', 'Every 4th cut is a counter strike (x2.4).', { dmg: 1.2, flags: { riposte: 4 } }),
      U('Unbroken Ring', 'Radius 2.9 tiles; the bubble speeds allies by 18%.', { flags: { ward: 2.9, flow: 0.18 } }),
    ],
  });

  // ---------------------------------------------------------------- EPIC
  add({
    id: 'utahime', name: 'Utahime Iori', short: 'Utahime', title: 'Solo Forbidden Area', rarity: 'EPIC', role: 'Amplifier',
    traits: ['Support', 'Sorcerer'], attackType: 'Chant (Aura)', place: 'any', targets: 'both',
    cost: 550, base: { dmg: 8, spa: 1.2, range: 3.0, dtype: 'cursed' }, kit: 'utahime', flags: { aura: 0.1, auraR: 2.6, chantCd: 0, chantSpd: 0.4 },
    targeting: ALL, defaultTargeting: 'first',
    desc: 'Her chant amplifies cursed technique: every ally in her aura deals more damage, and a timed Amplification hands the strongest ally a burst of speed.',
    unlock: { type: 'mission', mission: 'domain_10', hint: 'Mission: use Domain Expansions 10 times.' }, color: '#b89aff',
    art: { skin: '#f3d6c4', hair: '#2a2a36', hairStyle: 'long', eye: '#6a4aa8', outfit: '#cfc6e0', trim: '#8a5cd0', acc: 'hairpin', outfitStyle: 'robe' },
    upgrades: [
      U('Clear Voice', 'Aura +4% damage.', { dmg: 1.2, flags: { aura: 0.14 } }),
      U('Amplification', 'Every 14s, the highest-damage ally attacks 40% faster for 5s.', { flags: { chantCd: 14 } }),
      U('Resonant Hall', 'Aura radius 3.4 tiles.', { range: 0.4, flags: { auraR: 3.4 } }),
      U('Encore', 'Amplification every 10s and +60% speed.', { flags: { chantCd: 10, chantSpd: 0.6 } }),
      U('Solo Forbidden Area', 'Aura +24% damage to every ally in range.', { dmg: 1.25, flags: { aura: 0.24 } }),
    ],
  });

  add({
    id: 'uraume', name: 'Uraume', short: 'Uraume', title: 'Ice Formation', rarity: 'EPIC', role: 'Freeze Control',
    traits: ['Cursed Spirit', 'Sorcerer'], attackType: 'Ice Shard', place: 'any', targets: 'both',
    cost: 650, base: { dmg: 20, spa: 0.9, range: 3.4, dtype: 'cursed' }, kit: 'uraume', flags: { chillMax: 3, freeze: 1.2, frostCd: 0, shatter: 0.25 },
    targeting: ALL, defaultTargeting: 'strongest',
    desc: 'Each shard chills. Three chills freeze an enemy solid: frozen curses take extra damage from everyone. Bosses are slowed instead of frozen.',
    unlock: { type: 'boss', boss: 'mahito', hint: 'Boss drop: defeat Mahito (12% drop, shards otherwise).' }, color: '#8ad8ff',
    art: { skin: '#f0f0f8', hair: '#e8f0ff', hairStyle: 'long', eye: '#8ac8ff', outfit: '#e8eef8', trim: '#8ac8ff', acc: 'frost', outfitStyle: 'robe' },
    upgrades: [
      U('Rime', 'Colder shards.', { dmg: 1.25 }),
      U('Deep Freeze', 'Freezes last 1.8s.', { flags: { freeze: 1.8 } }),
      U('Frost Ring', 'Every 15s a frost ring slows every curse in range by 50% for 3s.', { flags: { frostCd: 15 } }),
      U('Brittle', 'Frozen enemies take +40% damage.', { dmg: 1.1, flags: { shatter: 0.4 } }),
      U('Absolute Zero', 'Chill 2 stacks to freeze; Frost Ring every 10s.', { dmg: 1.2, spa: 0.9, flags: { chillMax: 2, frostCd: 10 } }),
    ],
  });

  add({
    id: 'naoya', name: 'Naoya Zenin', short: 'Naoya', title: 'Projection Sorcery', rarity: 'EPIC', role: 'Speed DPS',
    traits: ['Sorcerer'], attackType: 'Rapid Strikes', place: 'ground', targets: 'ground',
    cost: 750, base: { dmg: 10, spa: 0.28, range: 1.8, dtype: 'phys' }, kit: 'naoya', flags: { echo: 0.5, lockCd: 0, lockN: 0, lockT: 1.0 },
    targeting: ['first', 'last', 'strongest', 'weakest', 'closest'], defaultTargeting: 'first',
    desc: 'Twenty-four frames per second, and he is faster than all of them. Wild attack speed, every hit echoing; frame-locks groups in place.',
    unlock: { type: 'challenge', challenge: 'naoya_blitz', hint: 'Challenge: defeat Mahito within 55 seconds of his arrival (or Sukuna within 90).' }, color: '#ffd24a',
    art: { skin: '#f2d2b6', hair: '#d8c880', hairStyle: 'slick', eye: '#7a4a2a', outfit: '#3a2a5a', trim: '#ffd24a', acc: 'earring', outfitStyle: 'suit' },
    upgrades: [
      U('Frame Rate', 'Faster hands.', { spa: 0.9 }),
      U('Afterimage', 'Echo hits deal 70%.', { dmg: 1.15, flags: { echo: 0.7 } }),
      U('Frame Lock', 'Every 12s, freezes up to 3 enemies in range for 1s.', { flags: { lockCd: 12, lockN: 3 } }),
      U('Speed Run', 'Harder hits, 2 extra locked targets.', { dmg: 1.3, flags: { lockN: 5, lockCd: 10 } }),
      U('Sixty Frames', 'Frame Lock every 8s, locks last 1.6s.', { dmg: 1.2, spa: 0.9, flags: { lockCd: 8, lockT: 1.6, lockN: 6 } }),
    ],
  });

  // ---------------------------------------------------------------- LEGENDARY
  add({
    id: 'higuruma', name: 'Hiromi Higuruma', short: 'Higuruma', title: 'Judgeman', rarity: 'LEGENDARY', role: 'Verdict / Control',
    traits: ['Domain User', 'Sorcerer'], attackType: 'Gavel Strike', place: 'any', targets: 'both',
    cost: 1300, base: { dmg: 80, spa: 1.8, range: 3.0, dtype: 'cursed' }, kit: 'higuruma', flags: { confiscateEvery: 0, execAt: 0, guiltyDmg: 0 },
    targeting: ALL, defaultTargeting: 'strongest',
    desc: 'The court is in session. Gavel strikes confiscate abilities, and his Deadly Sentencing domain condemns every curse: guilty curses take far more damage and are executed at the verdict.',
    unlock: { type: 'summon' }, color: '#d8d0b0',
    art: { skin: '#e8cdb4', hair: '#1c1a22', hairStyle: 'short', eye: '#3a3a48', outfit: '#4a4a5a', trim: '#d8d0b0', acc: 'gavel', outfitStyle: 'suit' },
    upgrades: [
      U('Objection', 'Heavier gavel.', { dmg: 1.2 }),
      U('Confiscation', 'Every 4th strike confiscates the target: strips shields and regeneration for 6s.', { flags: { confiscateEvery: 4 } }),
      U('Cross-Examination', 'Casts 15% faster; confiscation every 3rd strike.', { spa: 0.85, flags: { confiscateEvery: 3 } }),
      U('Executioner\'s Sword', 'Strikes execute non-boss curses below 22% HP.', { dmg: 1.25, flags: { execAt: 0.22 } }),
      U('Deadly Sentencing', 'Unlocks Domain: Deadly Sentencing.', { dmg: 1.2, flags: { domain: 'deadlySentencing', guiltyDmg: 0.35 } }),
    ],
  });

  add({
    id: 'geto', name: 'Suguru Geto', short: 'Geto', title: 'Cursed Spirit Manipulation', rarity: 'LEGENDARY', role: 'Absorb / Summoner',
    traits: ['Summoner', 'Cursed Spirit', 'Sorcerer'], attackType: 'Spirit Barrage', place: 'any', targets: 'both',
    cost: 1400, base: { dmg: 38, spa: 1.0, range: 3.2, dtype: 'cursed' }, kit: 'geto', flags: { absorb: 0.04, dragon: false, uzumakiCd: 0, uzumakiMult: 0 },
    targeting: ALL, defaultTargeting: 'strongest',
    desc: 'Every curse that falls near him is absorbed into his arsenal, boosting his damage. Calls the Rainbow Dragon, and unleashes everything he has stored in Maximum: Uzumaki.',
    unlock: { type: 'summon' }, color: '#a47bff',
    art: { skin: '#f0d2b8', hair: '#16121e', hairStyle: 'halfup', eye: '#2a2438', outfit: '#3a2f58', trim: '#e8e0d0', acc: 'earring', outfitStyle: 'robe' },
    upgrades: [
      U('Spirit Pool', 'Each absorbed curse gives +5% damage (max 10).', { dmg: 1.15, flags: { absorb: 0.05 } }),
      U('Rainbow Dragon', 'Summons the Rainbow Dragon, which circles and bites.', { flags: { dragon: true } }),
      U('Spirit Swarm', 'Casts 15% faster.', { spa: 0.85, range: 0.3 }),
      U('Maximum: Uzumaki', 'Every 18s, fires a beam that consumes stored spirits: x(2 + 0.5 per spirit).', { dmg: 1.2, flags: { uzumakiCd: 18, uzumakiMult: 2 } }),
      U('Perfect Absorption', 'Spirits give +7% each; Uzumaki every 14s, dragon bites harder.', { dmg: 1.2, flags: { absorb: 0.07, uzumakiCd: 14, dragonPow: 1.5 } }),
    ],
  });

  add({
    id: 'kashimo', name: 'Hajime Kashimo', short: 'Kashimo', title: 'Mythical Beast Amber', rarity: 'LEGENDARY', role: 'Chain Lightning',
    traits: ['Sorcerer'], attackType: 'Chain Lightning', place: 'any', targets: 'both',
    cost: 1200, base: { dmg: 34, spa: 0.7, range: 2.8, dtype: 'cursed' }, kit: 'kashimo', flags: { chains: 2, amberCd: 0, amberDur: 8, burn: 5 },
    targeting: ALL, defaultTargeting: 'first',
    desc: 'Lightning leaps between curses. Mythical Beast Amber doubles his speed and chains for a few seconds, then leaves him burnt out: time it for the big wave, not the first one.',
    unlock: { type: 'boss', boss: 'hanami', hint: 'Boss drop: defeat Hanami in the Shinjuku Gauntlet (18% drop, shards otherwise).' }, color: '#ffe36a',
    art: { skin: '#eac8a8', hair: '#f0e8a0', hairStyle: 'spiky', eye: '#ffe36a', outfit: '#2a2a3a', trim: '#ffe36a', acc: 'scar', outfitStyle: 'suit' },
    upgrades: [
      U('Voltage', 'Harder bolts.', { dmg: 1.25 }),
      U('Forked', 'Chains to 3 enemies.', { flags: { chains: 3 } }),
      U('Static Field', 'Casts 15% faster.', { spa: 0.85 }),
      U('Mythical Beast Amber', 'Every 30s: 8s of x2.2 attack speed and +3 chains. Then 5s burnout (x0.6 speed).', { flags: { amberCd: 30 } }),
      U('Overcharge', 'Amber every 24s lasting 10s; burnout shrinks to 3s.', { dmg: 1.25, flags: { amberCd: 24, amberDur: 10, burn: 3 } }),
    ],
  });

  add({
    id: 'yuki', name: 'Yuki Tsukumo', short: 'Yuki', title: 'Star Rage', rarity: 'LEGENDARY', role: 'Mass Striker',
    traits: ['Sorcerer'], attackType: 'Heavy Strike', place: 'ground', targets: 'ground',
    cost: 1600, base: { dmg: 120, spa: 2.2, range: 2.2, dtype: 'phys', pierce: 0.2 }, kit: 'yuki', flags: { massMax: 3, massStep: 0.25, garudaCd: 0 },
    targeting: ['first', 'strongest', 'closest', 'weakest'], defaultTargeting: 'strongest',
    desc: 'Every strike on the same target adds Virtual Mass: damage climbs until it lands like a falling star. Switching targets resets the mass, so focus fire wins.',
    unlock: { type: 'summon' }, color: '#d8e0ff',
    art: { skin: '#f3dcc8', hair: '#f4f4fc', hairStyle: 'long', eye: '#6aa8d8', outfit: '#1c1c26', trim: '#d8e0ff', acc: 'star', outfitStyle: 'suit' },
    upgrades: [
      U('Star Rage', 'Heavier fists.', { dmg: 1.2 }),
      U('Mass Surge', 'Mass stacks to 4.', { flags: { massMax: 4 } }),
      U('Garuda', 'Garuda dives every 9s on the strongest enemy: heavy damage and a 1.2s stun.', { flags: { garudaCd: 9 } }),
      U('Full Mass', 'Mass stacks to 6, +30% per stack.', { dmg: 1.2, flags: { massMax: 6, massStep: 0.3 } }),
      U('Black Hole', 'Garuda dives every 6s and pulls enemies together; faster strikes.', { dmg: 1.2, spa: 0.88, flags: { garudaCd: 6 } }),
    ],
  });

  add({
    id: 'jogoC', name: 'Jogo', short: 'Jogo', title: 'Disaster Flames', rarity: 'LEGENDARY', role: 'Burn / Splash',
    traits: ['Cursed Spirit', 'Domain User'], attackType: 'Meteors', place: 'any', targets: 'ground',
    cost: 1100, base: { dmg: 46, spa: 1.5, range: 3.2, dtype: 'cursed' }, kit: 'jogoC', flags: { burn: 0.4, splash: 1.1, emberCd: 0 },
    targeting: ALL, defaultTargeting: 'strongest', model: 'jogo',
    desc: 'The volcano himself. Fireballs splash and set curses alight, burning for a third of the hit over time. Ember Insects swarm the strongest enemies and Coffin of the Iron Mountain scorches the whole field.',
    unlock: { type: 'bossKills', boss: 'jogo', n: 8, hint: 'Boss mastery: defeat Jogo 8 times.' }, color: '#ff6a2a',
    art: { skin: '#a89888', hair: '#ff6a2a', hairStyle: 'panda', eye: '#ff7a1a', outfit: '#3a2a2a', trim: '#ff6a2a', acc: 'ears' },
    upgrades: [
      U('Kindling', 'Hotter fires.', { dmg: 1.25 }),
      U('Ember Insects', 'Every 10s, insects burn the 4 strongest enemies in range.', { flags: { emberCd: 10 } }),
      U('Wider Blaze', 'Bigger splash; burn deals 60% of the hit.', { range: 0.3, flags: { splash: 1.5, burn: 0.6 } }),
      U('Maximum: Meteor', 'Faster casting; meteors hit harder.', { dmg: 1.3, spa: 0.85 }),
      U('Coffin of the Iron Mountain', 'Unlocks Domain: Coffin of the Iron Mountain.', { dmg: 1.2, flags: { domain: 'ironMountain' } }),
    ],
  });

  add({
    id: 'mahitoC', name: 'Mahito', short: 'Mahito', title: 'Idle Transfiguration', rarity: 'LEGENDARY', role: 'Soul Reshaper',
    traits: ['Cursed Spirit', 'Domain User'], attackType: 'Soul Touch', place: 'ground', targets: 'ground',
    cost: 1250, base: { dmg: 42, spa: 0.9, range: 1.9, dtype: 'cursed' }, kit: 'mahitoC', flags: { morph: 0.12, soulDmg: 0, shapeCd: 0 },
    targeting: ['first', 'strongest', 'weakest', 'closest'], defaultTargeting: 'strongest', model: 'mahito',
    desc: 'Every touch reshapes a soul: a chance to collapse a curse to a fraction of its health, and a blow that ignores armour. Self-Embodiment of Perfection is a brutal gamble on tempo.',
    unlock: { type: 'bossKills', boss: 'mahito', n: 8, hint: 'Boss mastery: defeat Mahito 8 times.' }, color: '#9ab0c8',
    art: { skin: '#9ab0c8', hair: '#34445e', hairStyle: 'long', eye: '#d8b820', outfit: '#6a7e9c', trim: '#c8a0ff', acc: 'cheek' },
    upgrades: [
      U('Soul Touch', 'Harder touches.', { dmg: 1.25 }),
      U('Polymorph', 'Morph chance 20%.', { flags: { morph: 0.2 } }),
      U('Idle Transfiguration', 'Touches also deal 25% of the target\'s missing HP.', { flags: { soulDmg: 0.25 } }),
      U('Soul Multiplicity', 'Casts 15% faster; morph chance 28%.', { spa: 0.85, flags: { morph: 0.28 } }),
      U('Self-Embodiment of Perfection', 'Unlocks Domain: Self-Embodiment of Perfection.', { dmg: 1.2, flags: { domain: 'embodiment' } }),
    ],
  });

  // ---------------------------------------------------------------- MYTHIC (earned, never summoned)
  add({
    id: 'sukunaC', name: 'Ryomen Sukuna', short: 'Sukuna', title: 'King of Curses (Heian Era)', rarity: 'MYTHIC', role: 'Absolute Carry',
    traits: ['Cursed Spirit', 'Domain User'], attackType: 'Dismantle / Cleave', place: 'any', targets: 'both',
    cost: 3500, upMult: [0.5, 0.8, 1.1, 1.5, 2.0], base: { dmg: 120, spa: 1.1, range: 3.6, dtype: 'cursed' }, kit: 'sukunaC', flags: { cleave: 0, fuga: 0, slashes: 2 },
    targeting: ALL, defaultTargeting: 'first', model: 'sukuna',
    desc: 'Cannot be summoned. Dismantle shreds enemies in a line, Cleave takes a percentage of any non-boss curse\'s health, and Fuga burns the field. His Malevolent Shrine unleashes a continuous barrage. Earned only by surviving the Shinjuku Gauntlet.',
    unlock: { type: 'challenge', challenge: 'gauntlet_special', hint: 'Challenge: clear the Shinjuku Gauntlet on SPECIAL (45 waves, five bosses, no mercy).' }, color: '#ff2a3a',
    art: { skin: '#e8c4a8', hair: '#f08aa8', hairStyle: 'spiky', eye: '#d01830', outfit: '#6a1418', trim: '#e8d8c8', acc: 'cheek' },
    upgrades: [
      U('Dismantle', 'Slices a second enemy for 70%.', { dmg: 1.15, flags: { slashes: 3 } }),
      U('Cleave', 'Every 4th attack cleaves: 18% of a normal curse\'s current HP (bosses: x4 damage).', { flags: { cleave: 4 } }),
      U('Fuga', 'Every 14s an arrow of fire detonates on the strongest enemy.', { dmg: 1.1, flags: { fuga: 14 } }),
      U('World Cutting Slash', 'Slashes hit 5 targets; Cleave every 3rd attack.', { dmg: 1.25, flags: { slashes: 5, cleave: 3 } }),
      U('Malevolent Shrine', 'Unlocks Domain: Malevolent Shrine.', { dmg: 1.25, spa: 0.9, flags: { domain: 'malevolentShrine', fuga: 10 } }),
    ],
  });


  // ---------------------------------------------------------------- JOAN (summoner only, 1 in 200,000)
  add({
    id: 'jahjuan', name: 'INVINCIBLE JAHJUAN', short: 'Jahjuan', title: 'Invincible', rarity: 'JOAN', role: 'Annihilator',
    traits: ['Sorcerer'], attackType: 'Invincible Aura', place: 'any', targets: 'both',
    cost: 300, base: { dmg: 99999999, spa: 0.12, range: 7.5, dtype: 'true' }, kit: 'jahjuan', flags: { annihilate: true },
    targeting: ['first'], defaultTargeting: 'first',
    desc: 'The strongest unit in the game. Anything that comes within his reach is erased: armour, shields, wards and adaptation do nothing. Only ONE can ever be placed, and it costs just 300 Yen. Cannot be hurt by anything but a submerged or phased boss\'s own invulnerability windows.',
    unlock: { type: 'summon', hint: 'Summoner only: a 1 in 200,000 chance on every single pull, on any banner.' }, color: '#ffd23a',
    art: { skin: '#e8c4a8', hair: '#1a1a22', hairStyle: 'short', eye: '#202020', outfit: '#2a63d8', trim: '#ffd23a', acc: 'headphones' },
    upgrades: [
      U('Wider Aura', 'Reach +1.5 tiles.', { range: 1.5 }),
      U('Faster Erasure', 'Sweeps even faster.', { spa: 0.8 }),
      U('Boundless', 'Reach +2 tiles. Nothing escapes.', { range: 2, dmg: 2 }),
    ],
  });

  // ---- finalize derived data for the new defs ----
  for (const id of ['mai', 'momo', 'miwa', 'utahime', 'uraume', 'naoya', 'higuruma', 'geto', 'kashimo', 'yuki', 'jogoC', 'mahitoC', 'sukunaC']) {
    const d = C[id], mult = d.upMult || UP;
    d.upgrades.forEach((u, i) => { u.cost = Math.round((d.cost * mult[i]) / 5) * 5; });
    d.maxLevel = d.upgrades.length + 1;
  }
  { const j = C.jahjuan; j.upgrades.forEach((u, i) => { u.cost = 300 + i * 100; }); j.maxLevel = j.upgrades.length + 1; }

  // ---- new domains ----
  const D = JJK.Domains;
  D.deadlySentencing = { id: 'deadlySentencing', name: 'Deadly Sentencing', owner: 'higuruma', cd: 95, dur: 8, color: '#d8d0b0', style: 'court',
    desc: 'For 8s: a trial begins. Every curse is Guilty (+35% damage taken). At the verdict, non-boss curses below 35% HP are executed and bosses lose 6% max HP.' };
  D.ironMountain = { id: 'ironMountain', name: 'Coffin of the Iron Mountain', owner: 'jogoC', cd: 85, dur: 6, color: '#ff6a2a', style: 'lava',
    desc: 'For 6s: the whole field burns. Every curse takes heavy damage over time and cannot regenerate; bosses take half.' };
  D.embodiment = { id: 'embodiment', name: 'Self-Embodiment of Perfection', owner: 'mahitoC', cd: 100, dur: 6, color: '#c8a0ff', style: 'soul',
    desc: 'For 6s: the field flows with soul. Every curse loses 4% of its current HP per second (bosses 1.5%) and every ally attacks 30% faster.' };
  D.malevolentShrine = { id: 'malevolentShrine', name: 'Malevolent Shrine', owner: 'sukunaC', cd: 120, dur: 9, color: '#ff2a3a', style: 'shrine',
    desc: 'For 9s: a ceaseless storm of slashes. Every curse takes heavy cursed damage every 0.3s. Cannot be clashed. Everything else is a footnote.' };

  // ---- new summon definitions ----
  const S = JJK.SummonDefs;
  S.dragon = { id: 'dragon', name: 'Rainbow Dragon', kind: 'orbiter', speed: 210, cd: 1.1, radius: 0.9, dmgMult: 0.9, color: '#ff8ad8', size: 24 };
  S.garuda = { id: 'garuda', name: 'Garuda', kind: 'diver', cd: 9, radius: 1.1, dmgMult: 3.2, stun: 1.2, color: '#d8e0ff', size: 24 };
})(typeof window !== 'undefined' ? window : globalThis);
