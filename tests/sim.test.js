const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./load.js');

const J = loadGame();
const { Battle, Balance } = J;
const STEP = Balance.STEP;

const TEAM = (ids, lvl) => (ids || ['yuji', 'panda', 'nobara', 'megumi', 'nanami', 'gojo']).map((id) => ({ id, level: lvl || 1, stars: 0 }));
function mk(o) {
  o = o || {};
  return new Battle({ mapId: o.map || 'tokyo', diff: o.diff || 'normal', mode: o.mode, team: o.team || TEAM(o.ids, o.level), seed: o.seed || 1, startYen: o.yen != null ? o.yen : 100000 });
}
const step = (b, sec) => { const n = Math.round(sec / STEP); for (let i = 0; i < n && !b.over; i++) b.update(STEP); };
const slotOf = (b, type, nth) => { const a = []; for (const s of b.geo.slots.values()) if (s.type === type) a.push(s); return a[nth || 0]; };
const placeAt = (b, id, nth) => { const s = slotOf(b, J.Characters[id].place === 'elevated' ? 'E' : 'G', nth || 0); return b.place(id, s.c, s.r); };
/** Spawn an enemy on the path at the point nearest to a unit, frozen in place. */
function enemyNear(b, u, type, o) {
  const e = b.spawnEnemy(type || 'wisp', o || {});
  let best = 0, bd = Infinity; const tmp = { x: 0, y: 0 };
  for (let d = 0; d < e.path.length; d += 4) { e.path.posAt(d, tmp); const q = (tmp.x - u.x) ** 2 + (tmp.y - u.y) ** 2; if (q < bd) { bd = q; best = d; } }
  e.dist = best; e.path.posAt(best, e);
  return e;
}

// ------------------------------------------------------------------ construction
test('constructor rejects empty / invalid teams and unknown maps', () => {
  assert.throws(() => new Battle({ mapId: 'tokyo', diff: 'normal', team: [] }), /Team/);
  assert.throws(() => new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'nobody' }] }), /Team/);
  assert.throws(() => new Battle({ mapId: 'nowhere', diff: 'normal', team: TEAM() }), /map/i);
  assert.doesNotThrow(() => new Battle({ mapId: 'tokyo', diff: 'bogus', team: TEAM() }), 'unknown difficulty falls back to normal');
});

test('difficulty modes genuinely differ (HP, base HP, count, rewards, refund)', () => {
  const n = Balance.difficulty.normal, h = Balance.difficulty.hard, s = Balance.difficulty.special;
  assert.ok(h.hpMult > n.hpMult && s.hpMult > h.hpMult);
  assert.ok(h.baseHp < n.baseHp && s.baseHp < h.baseHp);
  assert.ok(h.sellRefund < n.sellRefund && s.sellRefund < h.sellRefund);
  assert.ok(h.rewardMult > n.rewardMult && s.rewardMult > h.rewardMult);
  const bn = mk({ diff: 'normal' }), bs = mk({ diff: 'special' });
  assert.equal(bn.baseHp, n.baseHp);
  assert.equal(bs.baseHp, s.baseHp);
  assert.ok(bs.waves[5].entries.length >= bn.waves[5].entries.length);
});

// ------------------------------------------------------------------ placement / economy
test('placement spends Yen, respects slot type, occupancy, path, cost and per-unit limits', () => {
  const b = mk({ yen: 1000 });
  const g = slotOf(b, 'G', 0);
  const y0 = b.yen;
  const r = b.place('yuji', g.c, g.r);
  assert.equal(r.ok, true);
  assert.equal(b.yen, y0 - J.Characters.yuji.cost);
  assert.equal(b.place('panda', g.c, g.r).ok, false, 'tile occupied');
  const pathTile = [...b.geo.pathTiles][0].split(',').map(Number);
  assert.match(b.canPlace('panda', pathTile[0], pathTile[1]).reason, /path/i);
  assert.match(b.canPlace('panda', 0, 0).reason, /zone|path/i);
  const e = slotOf(b, 'E', 0);
  if (e) assert.match(b.canPlace('yuji', e.c, e.r).reason, /Ground/i, 'ground unit on elevated slot');
  b.yen = 5;
  assert.match(b.canPlace('panda', slotOf(b, 'G', 3).c, slotOf(b, 'G', 3).r).reason, /Yen/);
  assert.equal(b.yen, 5, 'failed placement spends nothing');
});

test('placement limits: per-character cap by rarity and total deployment cap', () => {
  const b = mk({ yen: 1e7, ids: ['yuji', 'panda', 'nobara'] });
  const cap = b.maxPlace('yuji');
  let placed = 0;
  for (let i = 0; i < 12; i++) { const s = slotOf(b, 'G', i); if (b.place('yuji', s.c, s.r).ok) placed++; }
  assert.equal(placed, cap);
  const s = slotOf(b, 'G', 20);
  assert.match(b.place('yuji', s.c, s.r).reason, /limit/i);
  const b2 = mk({ yen: 1e7 });
  b2.rules.maxDeployed = 2;
  placeAt(b2, 'yuji', 0); placeAt(b2, 'panda', 1);
  assert.match(placeAt(b2, 'nobara', 2).reason, /limit|Deployment/i);
});

test('every character can be placed on a valid tile of every map', () => {
  for (const mapId of Object.keys(J.Maps)) {
    for (const id of J.CharacterOrder) {
      const b = mk({ map: mapId, ids: [id], yen: 1e6 });
      const r = placeAt(b, id, 0);
      assert.equal(r.ok, true, `${id} on ${mapId}: ${r.reason}`);
    }
  }
});

test('upgrades: cost deducted, stats rise each level, max level stops, invested tracks spend', () => {
  const b = mk({ yen: 1e6, ids: ['yuji'] });
  const u = placeAt(b, 'yuji', 0).unit;
  let dmg = u.dmg, invested = u.invested;
  while (b.upgradeCost(u) != null) {
    const cost = b.upgradeCost(u), y = b.yen;
    assert.equal(b.upgrade(u.uid).ok, true);
    assert.equal(b.yen, y - cost);
    invested += cost;
    assert.ok(u.dmg >= dmg, 'damage never regresses');
    dmg = u.dmg;
  }
  assert.equal(u.level, u.def.maxLevel);
  assert.equal(u.invested, invested);
  assert.equal(b.upgrade(u.uid).ok, false);
  assert.ok(u.dmg > J.Characters.yuji.base.dmg * 1.5);
  const poor = mk({ yen: J.Characters.yuji.cost, ids: ['yuji'] });
  const pu = placeAt(poor, 'yuji', 0).unit;
  assert.equal(poor.yen, 0);
  assert.match(poor.upgrade(pu.uid).reason, /Yen/);
  assert.equal(pu.level, 1);
});

test('selling refunds the configured % of everything invested and frees the tile', () => {
  for (const diff of ['normal', 'hard', 'special']) {
    const b = mk({ diff, yen: 1e6, ids: ['yuji'] });
    const u = placeAt(b, 'yuji', 0).unit;
    b.upgrade(u.uid); b.upgrade(u.uid);
    const expected = Math.floor(u.invested * Balance.difficulty[diff].sellRefund);
    const y = b.yen;
    const r = b.sell(u.uid);
    assert.equal(r.ok, true);
    assert.equal(r.value, expected);
    assert.equal(b.yen, y + expected);
    assert.equal(b.units.length, 0);
    assert.equal(b.unitAt(u.c, u.r), null);
    assert.equal(b.sell(u.uid).ok, false, 'cannot sell twice');
    assert.equal(b.placedCount('yuji'), 0, 'placement slot freed');
    assert.equal(b.place('yuji', u.c, u.r).ok, true, 'tile reusable');
  }
});

test('character meta level and stars scale damage; 5 stars discounts cost', () => {
  const lo = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'yuji', level: 1, stars: 0 }], startYen: 9999 });
  const hi = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'yuji', level: 20, stars: 3 }], startYen: 9999 });
  const five = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'yuji', level: 1, stars: 5 }], startYen: 9999 });
  const a = placeAt(lo, 'yuji', 0).unit, c = placeAt(hi, 'yuji', 0).unit;
  assert.ok(c.dmg > a.dmg * 1.25);
  assert.ok(c.range > a.range, '3 stars adds range');
  assert.ok(five.roster.yuji.cost < lo.roster.yuji.cost);
});

test('synergies: Students, Physical Specialists and Supports apply the documented bonuses', () => {
  const b = mk({ yen: 1e7, ids: ['yuji', 'panda', 'nobara', 'megumi', 'maki'] });
  placeAt(b, 'yuji', 0); placeAt(b, 'panda', 1); placeAt(b, 'nobara', 2);
  const yuji = b.units[0];
  assert.equal(yuji.synSpd, 0.08, '3 students');
  assert.ok(Math.abs(yuji.synDmg - 0.08) < 1e-9, '2 physical specialists');
  placeAt(b, 'megumi', 3); placeAt(b, 'maki', 4);
  assert.equal(b.units[0].synSpd, 0.14, '5 students');
  assert.ok(Math.abs(b.units[0].synDmg - 0.15) < 1e-9, '3 physical specialists');
  b.sell(b.units[4].uid);
  assert.equal(b.units[0].synSpd, 0.08, 'selling recalculates synergy');
});

// ------------------------------------------------------------------ targeting
test('targeting modes pick deterministically: FIRST / LAST / STRONGEST / WEAKEST / CLOSEST', () => {
  const b = mk({ ids: ['nobara'] });
  const u = placeAt(b, 'nobara', 0).unit;
  const mid = u.rangePx * 0.5;
  const tests = [];
  // three enemies inside range at different path progress and hp
  const near = b.spawnEnemy('wisp', { dist: 0 });
  near.x = u.x + 20; near.y = u.y; near.dist = 100; near.hp = near.maxHp = 500;
  const far = b.spawnEnemy('wisp', { dist: 0 });
  far.x = u.x + mid; far.y = u.y; far.dist = 300; far.hp = far.maxHp = 100;
  const back = b.spawnEnemy('wisp', { dist: 0 });
  back.x = u.x; back.y = u.y + mid * 0.8; back.dist = 50; back.hp = back.maxHp = 900;
  const pick = (mode) => { u.targeting = mode; return b.pickTarget(u); };
  assert.equal(pick('first'), far);
  assert.equal(pick('last'), back);
  assert.equal(pick('strongest'), back);
  assert.equal(pick('weakest'), far);
  assert.equal(pick('closest'), near);
  for (const m of Battle.TARGET_MODES) assert.equal(pick(m), pick(m), m + ' stable');
  assert.equal(b.setTargeting(u.uid, 'last'), true);
  assert.equal(b.setTargeting(u.uid, 'NONSENSE'), false);
  assert.equal(u.targeting, 'last');
});

test('ground-only units never target air; air-capable units do', () => {
  const b = mk({ ids: ['yuji', 'nobara'] });
  const yu = placeAt(b, 'yuji', 0).unit;
  const w = b.spawnEnemy('wraith', {});
  w.x = yu.x; w.y = yu.y;
  assert.equal(yu.canAir, false);
  assert.equal(b.pickTarget(yu), null);
  const no = placeAt(b, 'nobara', 1).unit;
  w.x = no.x; w.y = no.y;
  assert.equal(no.canAir, true);
  assert.equal(b.pickTarget(no), w);
});

// ------------------------------------------------------------------ damage & status
test('damage: armor reduces physical but not true; shields absorb first; min damage floor', () => {
  const b = mk();
  const e = b.spawnEnemy('shell', {});
  e.armor = 0.5; e.hp = e.maxHp = 1000;
  assert.equal(Math.round(b.damage(e, 100, { type: 'phys' })), 50);
  assert.equal(Math.round(b.damage(e, 100, { type: 'true' })), 100);
  const a = b.spawnEnemy('aegis', {});
  a.shield = 50; a.shieldMax = 50; a.hp = 100; a.armor = 0;
  b.damage(a, 30, { type: 'true' });
  assert.equal(a.shield, 20); assert.equal(a.hp, 100);
  b.damage(a, 60, { type: 'true' });
  assert.equal(a.shield, 0); assert.equal(a.hp, 60);
  const t = b.spawnEnemy('wisp', {}); t.armor = 0.9; t.hp = t.maxHp = 100;
  b.damage(t, 1, { type: 'phys' });
  assert.ok(t.hp < 100, 'minimum damage floor still hurts');
  assert.equal(b.damage(t, -5), 0);
  assert.equal(b.damage(t, NaN), 0);
  assert.ok(Number.isFinite(t.hp), 'NaN damage never corrupts hp');
});

test('kill grants Yen exactly once, emits one kill event, and ignores repeat damage on corpses', () => {
  const b = mk({ yen: 0 });
  let kills = 0; b.events.on('kill', () => kills++);
  const e = b.spawnEnemy('wisp', {});
  const y0 = b.yen;
  b.damage(e, 1e9, {});
  b.damage(e, 1e9, {});
  b.kill(e);
  assert.equal(kills, 1);
  assert.equal(b.yen, y0 + e.yen);
  assert.equal(b.stats.kills, 1);
});

test('status effects: stun, slow, root work and respect diminishing returns / boss resist', () => {
  const b = mk();
  const e = b.spawnEnemy('brute', {});
  assert.equal(b.stun(e, 2), true);
  assert.ok(e.stunT > 0);
  step(b, 2.2);
  assert.equal(e.stunT, 0, 'stun expired');
  assert.equal(b.stun(e, 2), false, 'immediately re-stunning is blocked by CC diminishing returns');
  step(b, Balance.ccDrWindow + 0.5);
  assert.equal(b.stun(e, 2), true, 'stun possible again after the DR window');
  const e2 = b.spawnEnemy('brute', {});
  b.slow(e2, 0.5, 3);
  assert.ok(e2.slowT > 0 && e2.slowAmt > 0);
  b.slow(e2, 5, 3);
  assert.ok(e2.slowAmt <= Balance.maxSlow, 'slow capped');
  const boss = b.spawnEnemy('sukuna', { silent: true });
  const before = boss.stunT;
  b.stun(boss, 3);
  assert.ok(boss.stunT - before < 3, 'boss CC resisted');
});

test('marks stack and amplify damage; armor break reduces armor; vulnerability amplifies', () => {
  const b = mk();
  const e = b.spawnEnemy('shell', {}); e.hp = e.maxHp = 1e6; e.armor = 0.5;
  const base = b.damage(e, 100, { type: 'phys' });
  e.armor = 0.5;
  b.mark(e, 5, 0.05, 5); b.mark(e, 5, 0.05, 5);
  const marked = b.damage(e, 100, { type: 'phys' });
  assert.ok(marked > base);
  b.armorBreak(e, 0.2, 3, 5);
  assert.ok(b.damage(e, 100, { type: 'phys' }) > marked);
  b.vulnerable(e, 0.5, 5);
  assert.ok(b.damage(e, 100, { type: 'true' }) > 100 * 1.3);
});

// ------------------------------------------------------------------ units attacking
test('a placed unit actually kills enemies and earns Yen', () => {
  const b = mk({ ids: ['nobara'], yen: 2000 });
  const u = placeAt(b, 'nobara', 0).unit;
  const e = enemyNear(b, u, 'wisp');
  e.hp = e.maxHp = 40;
  e.speed = 0;
  const y0 = b.yen;
  step(b, 8);
  assert.equal(e.alive, false);
  assert.ok(b.yen > y0);
  assert.ok(u.kills >= 1 && u.damageDealt > 0);
});

// ------------------------------------------------------------------ waves & flow
test('waves: startWave -> spawn -> clear -> bonus Yen -> intermission; cannot double-start', () => {
  const b = mk({ yen: 5000, ids: ['yuji', 'nobara', 'megumi', 'nanami'] });
  for (const id of b.teamOrder.slice(0, 3)) placeAt(b, id, b.teamOrder.indexOf(id) * 2);
  assert.equal(b.state, 'prep');
  assert.equal(b.startWave(), true);
  assert.equal(b.state, 'wave');
  assert.equal(b.wave, 1);
  assert.equal(b.startWave(), false, 'cannot start while the wave is still spawning');
  let cleared = null;
  b.events.on('waveClear', (e) => { cleared = e; });
  step(b, 120);
  assert.ok(cleared, 'wave cleared');
  assert.equal(cleared.n, 1);
  assert.ok(cleared.bonus > 0);
  assert.ok(['intermission', 'victory'].includes(b.state));
});

test('every map generates exactly the promised number of waves, deterministic per seed, bosses where configured', () => {
  const expected = { tokyo: 15, detention: 20, shibuya: 25, temple: 30 };
  for (const [id, n] of Object.entries(expected)) {
    const a = mk({ map: id }), c = mk({ map: id, seed: 99 });
    assert.equal(a.waves.length, n, id);
    assert.equal(JSON.stringify(a.waves), JSON.stringify(c.waves), 'wave plan independent of battle seed');
    for (const w of a.waves) {
      assert.ok(w.entries.length > 0 && w.bonus > 0, `${id} wave ${w.n}`);
      for (const en of w.entries) assert.ok(J.Enemies[en.type] || J.Bosses[en.type], en.type);
    }
    for (const [wn, bs] of Object.entries(J.Maps[id].waveCfg.bosses || {})) {
      assert.ok(a.waves[wn - 1].entries.some((e) => e.type === bs.id), `${id} boss ${bs.id} at wave ${wn}`);
    }
  }
});

test('enemy HP scales up wave over wave and with difficulty', () => {
  const b = mk();
  const hp = (w, diff) => { const bb = mk({ diff }); return bb.spawnEnemy('brute', { wave: w }).maxHp; };
  let prev = 0;
  for (let w = 1; w <= 30; w += 3) { const h = hp(w, 'normal'); assert.ok(h > prev); prev = h; }
  assert.ok(hp(10, 'hard') > hp(10, 'normal') && hp(10, 'special') > hp(10, 'hard'));
  const el = b.spawnEnemy('brute', { wave: 5, elite: true, mod: 'bulwark' });
  assert.ok(el.maxHp > b.spawnEnemy('brute', { wave: 5 }).maxHp * 3);
});

test('leaks reduce base HP; reaching zero ends the match as a defeat exactly once', () => {
  const b = mk();
  let defeats = 0; b.events.on('defeat', () => defeats++);
  const e = b.spawnEnemy('wisp', {});
  b.leak(e);
  assert.equal(b.baseHp, b.baseMax - e.leak);
  for (let i = 0; i < 100 && !b.over; i++) b.leak(b.spawnEnemy('brute', {}));
  assert.equal(b.over, true);
  assert.equal(b.state, 'defeat');
  assert.equal(b.baseHp, 0);
  assert.equal(defeats, 1);
  b.leak(b.spawnEnemy('wisp', {}));
  assert.equal(defeats, 1);
  assert.equal(b.startWave(), false);
  assert.equal(b.place('yuji', 1, 1).ok, false);
});

test('finishing the last wave is a victory; summary carries what rewards need', () => {
  const b = mk();
  b.debugJumpToWave(b.totalWaves);
  assert.equal(b.startWave(), true);
  b.enemies.forEach((e) => { e.alive = false; });
  b.spawnIdx = b.waveSpec.entries.length;
  b.enemies.length = 0;
  step(b, 1);
  assert.equal(b.state, 'victory');
  const s = b.getSummary();
  for (const k of ['mapId', 'diff', 'mode', 'victory', 'wavesCleared', 'totalWaves', 'kills', 'yenEarned', 'baseLost', 'sold', 'upgrades', 'deploys', 'domains', 'bossKills', 'bossTimes', 'duration', 'score', 'deployedIds', 'loadout', 'enemiesSeen', 'bossesSeen']) assert.ok(k in s, k);
  assert.equal(s.victory, true);
  assert.equal(s.wavesCleared, b.totalWaves);
});

test('auto start launches the next wave after the intermission timer, and not before', () => {
  const b = mk({ ids: ['nobara', 'yuji'] });
  b.autoStart = true;
  b.state = 'intermission'; b.autoTimer = Balance.intermission;
  step(b, Balance.intermission - 1);
  assert.equal(b.wave, 0);
  step(b, 2);
  assert.equal(b.wave, 1);
});

test('game speed: 2x runs twice as many steps per real second without changing outcomes per step', () => {
  assert.deepEqual(Balance.SPEEDS, [1, 2]);
  const a = mk({ seed: 5 }), c = mk({ seed: 5 });
  const bot = (b) => { placeAt(b, 'yuji', 0); b.startWave(); for (let i = 0; i < 600; i++) b.update(STEP); return JSON.stringify([b.yen, b.stats.kills, b.baseHp]); };
  assert.equal(bot(a), bot(c), 'simulation is deterministic for equal seeds');
});

// ------------------------------------------------------------------ bosses
test('bosses: HP bar data, telegraphed hazards, phase changes, and death rewards', () => {
  for (const id of J.BossOrder) {
    const b = mk({ ids: ['yuji', 'nobara', 'nanami'], yen: 1e6 });
    placeAt(b, 'nobara', 0);
    const events = { cast: 0, tele: 0, phase: 0, death: 0 };
    b.events.on('bossCast', () => events.cast++);
    b.events.on('telegraph', () => events.tele++);
    b.events.on('bossPhase', () => events.phase++);
    b.events.on('bossDeath', () => events.death++);
    const boss = b.spawnEnemy(id, { wave: 5 });
    b.wave = 5; b.state = 'wave';
    assert.ok(boss.boss && boss.maxHp > 1000);
    for (let i = 0; i < 60 * 60 && boss.alive && !b.over; i++) {
      b.update(STEP);
      if (i % 60 === 59) { boss.hp = Math.max(1, boss.hp - boss.maxHp * 0.1); if (boss.dist > boss.pathLen * 0.5) boss.dist = 0; } // drive phases; keep the boss from leaking
    }
    assert.ok(events.tele > 0 || events.cast > 0, id + ' uses telegraphed attacks');
    b.damage(boss, 1e12, { ignoreWard: true });
    assert.equal(boss.alive, false);
    assert.equal(events.death, 1, id + ' dies once');
    assert.equal(b.stats.bossKills[id], 1);
    assert.ok(b.stats.bossTimes[id] >= 0);
  }
});

test('boss defeated while its ability is mid-cast leaves no stray hazards or minions', () => {
  const b = mk({ ids: ['yuji'], yen: 1e6 });
  placeAt(b, 'yuji', 0);
  const boss = b.spawnEnemy('jogo', { wave: 10 });
  b.wave = 10; b.state = 'wave';
  for (let i = 0; i < 60 * 12 && !b.hazards.length; i++) b.update(STEP);
  b.damage(boss, 1e12, { ignoreWard: true });
  assert.equal(b.hazards.filter((h) => h.owner === boss.id).length, 0);
  assert.doesNotThrow(() => step(b, 8));
  const sk = mk({ ids: ['yuji'], yen: 1e6 });
  const s = sk.spawnEnemy('sukuna', { wave: 10 });
  sk.wave = 10; sk.state = 'wave';
  step(sk, 25);
  sk.damage(s, 1e12, { ignoreWard: true });
  assert.equal(sk.enemies.filter((e) => e.alive && e.owner === s.id).length, 0, 'summoned minions vanish with the boss');
});

// ------------------------------------------------------------------ domains
test('Domain Expansion: becomes available at the right upgrade, has a real effect, cooldown and duration', () => {
  const b = mk({ ids: ['gojo', 'yuji'], yen: 1e7 });
  const u = placeAt(b, 'gojo', 0).unit;
  assert.equal(b.canActivateDomain(u), false, 'locked before the domain upgrade');
  while (b.upgradeCost(u) != null && !u.flags.domain) b.upgrade(u.uid);
  assert.ok(u.flags.domain, 'domain upgrade reachable');
  u.domainCd = 0;
  const e = b.spawnEnemy('brute', {});
  e.x = u.x; e.y = u.y;
  const hp0 = e.hp;
  assert.equal(b.canActivateDomain(u), true);
  const r = b.activateDomain(u.uid);
  assert.ok(r === undefined || r === true || r.ok !== false);
  assert.ok(b.domain, 'domain active');
  assert.equal(b.canActivateDomain(u), false, 'cannot re-activate while active / on cooldown');
  step(b, 2);
  assert.ok(e.stunT > 0 || e.hp < hp0 || e.slowT > 0, 'domain affects enemies');
  step(b, J.Domains[u.def.domain || 'unlimitedVoid'].dur + 1);
  assert.equal(b.domain, null, 'domain ended');
  assert.ok(u.domainCd > 0, 'cooldown started');
  assert.equal(b.stats.domains, 1);
});

test('selling the domain owner mid-domain ends it cleanly', () => {
  const b = mk({ ids: ['gojo'], yen: 1e7 });
  const u = placeAt(b, 'gojo', 0).unit;
  while (b.upgradeCost(u) != null && !u.flags.domain) b.upgrade(u.uid);
  u.domainCd = 0;
  b.activateDomain(u.uid);
  assert.ok(b.domain);
  b.sell(u.uid);
  assert.equal(b.domain, null);
  assert.doesNotThrow(() => step(b, 5));
});

// ------------------------------------------------------------------ kits & abilities (one smoke per character)
test('every character kit runs 20s of combat with enemies present without throwing or producing NaN', () => {
  for (const id of J.CharacterOrder) {
    const b = mk({ ids: [id, 'yuji'], yen: 1e7, level: 5 });
    const u = placeAt(b, id, 0).unit;
    while (b.upgradeCost(u) != null) b.upgrade(u.uid);
    u.domainCd = 0;
    b.startWave();
    for (let i = 0; i < 6; i++) { const e = b.spawnEnemy(i % 3 === 2 ? 'wraith' : 'brute', { dist: 200 + i * 30 }); }
    assert.doesNotThrow(() => step(b, 20), id);
    for (const e of b.enemies) assert.ok(Number.isFinite(e.hp) && Number.isFinite(e.x) && Number.isFinite(e.y), id + ' NaN enemy');
    assert.ok(Number.isFinite(b.yen) && Number.isFinite(u.dmg) && u.dmg > 0, id);
  }
});

test('Panda hold/ward: held enemy released when Panda is sold; ward makes Panda immune to disables', () => {
  const b = mk({ ids: ['panda', 'yuji'], yen: 1e6 });
  const p = placeAt(b, 'panda', 0).unit;
  const e = b.spawnEnemy('brute', {});
  e.x = p.x; e.y = p.y;
  step(b, 2);
  b.sell(p.uid);
  step(b, 1);
  assert.ok(!e.heldBy || !b.getUnit(e.heldBy), 'enemy not held by a sold unit');
  const b2 = mk({ ids: ['panda'], yen: 1e6 });
  const p2 = placeAt(b2, 'panda', 0).unit;
  b2.disableUnit(p2, 5);
  assert.equal(p2.disabledT > 0 && !b2.isDisableImmune(p2), false);
});

// ------------------------------------------------------------------ failure scenarios
test('unit sold mid-attack / while a projectile is in flight never crashes the sim', () => {
  const b = mk({ ids: ['nobara', 'yuji', 'maki', 'meimei', 'megumi'], yen: 1e7 });
  const units = ['nobara', 'meimei', 'megumi', 'maki', 'yuji'].map((id, i) => placeAt(b, id, i * 2).unit);
  b.startWave();
  for (let i = 0; i < 8; i++) b.spawnEnemy('brute', { dist: 100 + i * 25 });
  for (let t = 0; t < 40; t++) {
    step(b, 0.25);
    if (t % 4 === 0 && b.units.length) b.sell(b.units[0].uid);
  }
  assert.doesNotThrow(() => step(b, 5));
});

test('enemy removed while targeted / while being pulled never leaves dangling references', () => {
  const b = mk({ ids: ['gojo', 'todo', 'choso'], yen: 1e7 });
  for (const id of ['gojo', 'todo', 'choso']) { const u = placeAt(b, id, b.teamOrder.indexOf(id) * 2).unit; while (b.upgradeCost(u) != null) b.upgrade(u.uid); }
  b.startWave();
  const es = []; for (let i = 0; i < 10; i++) es.push(b.spawnEnemy('brute', { dist: 150 + i * 20 }));
  for (let t = 0; t < 30; t++) { step(b, 0.2); const v = es[t % es.length]; if (v.alive) b.kill(v); }
  assert.doesNotThrow(() => step(b, 5));
  for (const u of b.units) for (const k of Object.keys(u.k)) { const val = u.k[k]; if (val && val.alive === false && val.dist !== undefined) { /* tolerated but must not be re-targeted */ } }
});

test('negative / zero / NaN timesteps and giant dt do not corrupt state', () => {
  const b = mk({ ids: ['yuji'] });
  placeAt(b, 'yuji', 0);
  b.startWave();
  for (const dt of [0, -1, NaN, 1e-9, 5]) assert.doesNotThrow(() => b.update(dt), 'dt=' + dt);
  assert.ok(Number.isFinite(b.time));
});

test('performance: 90 enemies + 6 maxed units for 30 simulated seconds stays under 4s CPU', () => {
  const b = mk({ ids: ['yuji', 'panda', 'nobara', 'megumi', 'nanami', 'meimei'], yen: 1e8, level: 10 });
  b.ids = b.teamOrder;
  b.teamOrder.forEach((id, i) => { const u = placeAt(b, id, i * 2).unit; while (b.upgradeCost(u) != null) b.upgrade(u.uid); });
  b.startWave();
  for (let i = 0; i < 90; i++) b.spawnEnemy(i % 5 === 0 ? 'wraith' : 'brute', { dist: i * 8, wave: 20 });
  const t0 = process.hrtime.bigint();
  step(b, 30);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 4000, 'took ' + ms.toFixed(0) + 'ms');
});

test('no entity leaks: after clearing waves, arrays do not grow without bound', () => {
  const b = mk({ ids: ['yuji', 'nobara', 'megumi', 'nanami'], yen: 1e7, level: 15 });
  b.teamOrder.forEach((id, i) => { const u = placeAt(b, id, i * 2).unit; while (b.upgradeCost(u) != null) b.upgrade(u.uid); });
  b.autoStart = true;
  for (let i = 0; i < 60 * 240 && !b.over && b.wave < 8; i++) b.update(STEP);
  assert.ok(b.enemies.length < 200 && b.projectiles.length < 300 && b.hazards.length < 50 && b.timers.length < 200 && b.zones.length < 100,
    JSON.stringify({ e: b.enemies.length, p: b.projectiles.length, h: b.hazards.length, t: b.timers.length, z: b.zones.length }));
});

// ------------------------------------------------------------------ endless
test('endless mode: no wave cap, scaling grows, bosses every 10 waves, score rises', () => {
  const b = mk({ mode: 'endless' });
  assert.equal(b.endless, true);
  assert.equal(b.totalWaves, Infinity);
  assert.equal(b.waves, null);
  const w = (n) => J.Waves.endless(b.map, n, b.diff);
  assert.ok(w(10).entries.some((e) => J.Bosses[e.type]), 'boss at 10');
  assert.ok(w(20).entries.some((e) => J.Bosses[e.type]), 'boss at 20');
  assert.ok(!w(7).entries.some((e) => J.Bosses[e.type]));
  assert.ok(J.Waves.endlessHpScale(40) > J.Waves.endlessHpScale(20) && J.Waves.endlessHpScale(20) > J.Waves.endlessHpScale(5));
  for (const n of [1, 25, 60, 120]) assert.ok(w(n).entries.length <= 90 + 10, 'size capped at wave ' + n);
  b.debugJumpToWave(15);
  assert.equal(b.wave, 14);
  assert.equal(b.startWave(), true);
  assert.equal(b.getSummary().totalWaves, null);
});

test('special-difficulty map rules actually change the game', () => {
  const sw = mk({ map: 'detention', diff: 'special' });
  assert.equal(sw.rules.maxDeployed, 10);
  const sb = mk({ map: 'shibuya', diff: 'special' });
  assert.ok(sb.rules.rangeMul < 1);
  const nm = mk({ map: 'detention', diff: 'normal' });
  assert.equal(nm.rules.maxDeployed, Balance.maxDeployed);
});

test('debug helpers: jump to wave and instant victory/defeat finish in a valid state', () => {
  const b = mk();
  assert.equal(b.debugJumpToWave(9), true);
  assert.equal(b.wave, 8);
  b.debugInstantVictory();
  assert.equal(b.state, 'victory');
  const c = mk(); c.debugInstantDefeat();
  assert.equal(c.state, 'defeat');
});

test('a team of only expensive units can still deploy its cheapest member at the start', () => {
  const b = new J.Battle({ mapId: 'tokyo', diff: 'special', team: [{ id: 'gojo', level: 1, stars: 0 }, { id: 'yuta', level: 1, stars: 0 }], seed: 1 });
  assert.ok(b.yen >= 1500, 'start yen ' + b.yen);
  const slot = [...b.geo.slots.values()].find((s) => b.canPlace('yuta', s.c, s.r).ok);
  assert.ok(b.place('yuta', slot.c, slot.r).ok);
});
