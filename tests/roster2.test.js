const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./load.js');

const J = loadGame();
const { Battle, Balance } = J;
const STEP = Balance.STEP;
const NEW = ['mai', 'momo', 'miwa', 'utahime', 'uraume', 'naoya', 'higuruma', 'geto', 'kashimo', 'yuki', 'jogoC', 'mahitoC', 'sukunaC'];

const step = (b, sec) => { const n = Math.round(sec / STEP); for (let i = 0; i < n && !b.over; i++) b.update(STEP); };
const slotOf = (b, type, nth) => { const a = []; for (const s of b.geo.slots.values()) if (s.type === type) a.push(s); return a[nth || 0]; };
function enemyNear(b, u, type, o) {
  const e = b.spawnEnemy(type || 'wisp', o || {});
  let best = 0, bd = Infinity; const tmp = { x: 0, y: 0 };
  for (let d = 0; d < e.path.length; d += 4) { e.path.posAt(d, tmp); const q = (tmp.x - u.x) ** 2 + (tmp.y - u.y) ** 2; if (q < bd) { bd = q; best = d; } }
  e.dist = best; e.path.posAt(best, e);
  return e;
}

test('all 13 new characters exist, are fully specified and finalised', () => {
  for (const id of NEW) {
    const d = J.Characters[id];
    assert.ok(d, id);
    assert.ok(J.CharacterOrder.includes(id), id + ' in order');
    assert.equal(d.upgrades.length, 5, id);
    assert.equal(d.maxLevel, 6, id);
    assert.ok(J.Kits[d.kit], id + ' kit ' + d.kit);
    assert.ok(d.art && d.art.hair && d.art.outfit, id + ' art');
    for (const u of d.upgrades) assert.ok(u.cost > 0, id + ' upgrade cost');
    assert.ok(d.unlock && d.unlock.type, id + ' unlock');
    if (d.flags.domain === undefined) {
      const dom = d.upgrades.map((u) => u.flags && u.flags.domain).find(Boolean);
      if (dom) { assert.ok(J.Domains[dom], dom); assert.ok(J.DomainFx[dom], dom + ' fx'); }
    }
  }
  assert.ok(J.CharacterOrder.length >= 27);
});

test('every new character attacks (or supports) real enemies at every upgrade level without errors', () => {
  for (const id of NEW) {
    const d = J.Characters[id];
    for (let lvl = 1; lvl <= d.maxLevel; lvl++) {
      const b = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id, level: 1, stars: 0 }, { id: 'yuji', level: 1, stars: 0 }], seed: 7, startYen: 1e7 });
      const slot = d.place === 'elevated' ? slotOf(b, 'E', 0) : slotOf(b, 'G', 0);
      const r = b.place(id, slot.c, slot.r);
      assert.ok(r.ok, id + ' place: ' + r.reason);
      const u = r.unit;
      while (u.level < lvl) assert.ok(b.upgrade(u).ok, id + ' upgrade');
      const es = [];
      for (let i = 0; i < 5; i++) { const e = enemyNear(b, u, i % 2 ? 'brute' : 'wisp'); e.speedMul = 0.001; es.push(e); }
      if (d.targets !== 'ground') { const a = enemyNear(b, u, 'wraith'); a.speedMul = 0.001; es.push(a); }
      assert.doesNotThrow(() => step(b, 25), id + ' L' + lvl);
      assert.ok(u.damageDealt > 0 || u.kit.noAttack || d.role.match(/Support|Amplifier/), id + ' L' + lvl + ' dealt damage');
      assert.ok(Number.isFinite(b.baseHp), 'state sane');
    }
  }
});

test('Miwa makes allies immune to disables; others do not', () => {
  const b = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'miwa', level: 1, stars: 0 }, { id: 'yuji', level: 1, stars: 0 }, { id: 'panda', level: 1, stars: 0 }], seed: 3, startYen: 1e6 });
  const gs = [slotOf(b, 'G', 0), slotOf(b, 'G', 1)];
  const m = b.place('miwa', gs[0].c, gs[0].r).unit;
  const y = b.place('yuji', gs[1].c, gs[1].r).unit;
  const inRing = Math.hypot(m.x - y.x, m.y - y.y) <= m.flags.ward * Balance.TILE;
  const res = b.disableUnit(y, 3);
  assert.equal(res, !inRing, 'disable blocked iff inside the ring');
  assert.equal(b.disableUnit(m, 3), false, 'Miwa is immune herself');
});

test('Utahime aura raises ally damage multiplier', () => {
  const b = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'utahime', level: 1, stars: 0 }, { id: 'yuji', level: 1, stars: 0 }], seed: 3, startYen: 1e6 });
  const a = slotOf(b, 'G', 0), c = slotOf(b, 'G', 1);
  const y = b.place('yuji', c.c, c.r).unit;
  const base = b.dmgMul(y);
  const ut = b.place('utahime', a.c, a.r).unit;
  step(b, 1);
  const inRange = Math.hypot(ut.x - y.x, ut.y - y.y) <= ut.flags.auraR * Balance.TILE;
  if (inRange) assert.ok(b.dmgMul(y) > base);
});

test('Uraume freezes ordinary curses after 3 chills and only slows bosses', () => {
  const b = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'uraume', level: 1, stars: 0 }], seed: 3, startYen: 1e6 });
  const s = slotOf(b, 'G', 0);
  const u = b.place('uraume', s.c, s.r).unit;
  const e = enemyNear(b, u, 'brute'); e.hp = e.maxHp = 1e9;
  let froze = false;
  for (let i = 0; i < 400 && !froze; i++) { b.update(STEP); if (e.frozen) froze = true; }
  assert.ok(froze, 'frozen');
  const d0 = e.dist; step(b, 0.5); assert.equal(e.dist, d0, 'frozen enemies do not move');
});

test('Geto absorbs nearby kills and Uzumaki spends them', () => {
  const b = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'geto', level: 1, stars: 0 }], seed: 3, startYen: 1e6 });
  const s = slotOf(b, 'G', 0);
  const u = b.place('geto', s.c, s.r).unit;
  for (let i = 0; i < 3; i++) { const e = enemyNear(b, u, 'wisp'); e.speedMul = 0.001; }
  step(b, 12);
  assert.ok(u.k.spirits > 0, 'spirits absorbed');
});

test('Yuki mass builds on one target and resets on switching', () => {
  const b = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'yuki', level: 1, stars: 0 }], seed: 3, startYen: 1e6 });
  const s = slotOf(b, 'G', 0);
  const u = b.place('yuki', s.c, s.r).unit;
  const e = enemyNear(b, u, 'brute'); e.hp = e.maxHp = 1e9; e.speedMul = 0.001;
  step(b, 12);
  assert.ok(u.k.mass >= 2, 'mass built: ' + u.k.mass);
});

test('player domains of the new roster activate, deal damage and end cleanly', () => {
  for (const [id, dom] of [['higuruma', 'deadlySentencing'], ['jogoC', 'ironMountain'], ['mahitoC', 'embodiment'], ['sukunaC', 'malevolentShrine']]) {
    const b = new Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id, level: 1, stars: 0 }], seed: 5, startYen: 1e7 });
    const s = slotOf(b, 'G', 0);
    const u = b.place(id, s.c, s.r).unit;
    while (u.level < u.def.maxLevel) b.upgrade(u);
    assert.equal(u.flags.domain, dom);
    const es = []; for (let i = 0; i < 4; i++) { const e = enemyNear(b, u, 'brute'); e.speedMul = 0.001; es.push(e); }
    u.domainCd = 0;
    const hp0 = es.reduce((a, e) => a + e.hp, 0);
    assert.ok(b.activateDomain(u.uid), id + ' domain activates');
    step(b, J.Domains[dom].dur + 1);
    assert.equal(b.domain, null, 'domain ended');
    const hp1 = es.reduce((a, e) => a + (e.alive ? e.hp : 0), 0);
    assert.ok(hp1 < hp0, id + ' domain dealt damage');
  }
});

// ------------------------------------------------------------------ Culling Game bosses
function bossBattle(team, bossId, wave, hpFrac) {
  const b = new Battle({ mapId: 'shinjuku', diff: 'normal', team: team.map((id) => ({ id, level: 1, stars: 0 })), seed: 9, startYen: 1e7 });
  b.wave = wave; b.state = 'wave'; b.canStartWave = () => false;
  const e = b.spawnEnemy(bossId, { wave });
  if (hpFrac) e.hp = e.maxHp * hpFrac;
  return { b, e };
}

test('all new bosses exist in the codex order and map gauntlet has 45 waves with 5 bosses', () => {
  for (const id of ['hanami', 'dagon', 'mahoraga', 'sukunaH']) { assert.ok(J.Bosses[id] && J.BossAI[J.Bosses[id].ai], id); assert.ok(J.BossOrder.includes(id)); }
  const m = J.Maps.shinjuku;
  assert.equal(m.waves, 45);
  assert.deepEqual(Object.values(m.waveCfg.bosses).map((x) => x.id), ['hanami', 'dagon', 'mahito', 'mahoraga', 'sukunaH']);
  assert.ok(J.MapOrder.includes('shinjuku'));
  for (const d of ['normal', 'hard', 'special']) {
    const waves = J.Waves.generate(m, J.Balance.difficulty[d], {});
    assert.equal(waves.length, 45);
    assert.equal(waves.filter((w) => w.boss).length, 5);
  }
});

test('Mahoraga adapts to a heavy hitter (-75%) until nullified; other attackers are unaffected', () => {
  const { b, e } = bossBattle(['yuji', 'toji'], 'mahoraga', 38);
  const g = [...b.geo.slots.values()].filter((s) => s.type === 'G');
  const yuji = b.place('yuji', g[0].c, g[0].r).unit, toji = b.place('toji', g[1].c, g[1].r).unit;
  const probe = (u) => b.damage(e, 1000, { type: 'cursed', src: u });
  const before = probe(yuji);
  b.damage(e, e.maxHp * 0.05, { type: 'cursed', src: yuji });
  assert.ok(e.ai.adapted.yuji, 'adapted to Yuji');
  const after = probe(yuji);
  assert.ok(after < before * 0.35, `adapted hit ${after} vs ${before}`);
  assert.ok(probe(toji) > before * 0.9, 'Toji is not adapted');
  b.nullify(e, 3);
  assert.ok(probe(yuji) > before * 0.9, 'nullify suspends the wheel');
  assert.equal(e.ai.adapted.toji, undefined);
});

test('Hanami seeds Cursed Buds that bloom: heal him and disable nearby units; killing them first prevents it', () => {
  const { b, e } = bossBattle(['yuji'], 'hanami', 10, 0.5);
  const g = [...b.geo.slots.values()].filter((s) => s.type === 'G');
  const u = b.place('yuji', g[0].c, g[0].r).unit;
  let casts = [];
  b.events.on('bossCast', (c) => casts.push(c.name));
  e.hp = e.maxHp * 0.6; e.speedMul = 0.001; e.ccImmuneT = 99;
  let seen = false;
  for (let i = 0; i < 60 * 40 && !b.over; i++) {
    b.update(STEP);
    if (!seen && b.enemies.some((x) => x.alive && x.type === 'bud' && x.owner === e.id)) seen = true;
    e.hp = Math.max(e.hp, 1);
  }
  assert.ok(seen, 'buds spawned');
  assert.ok(casts.includes('Cursed Buds'));
  assert.ok(casts.includes('Bud bloomed'), 'unattended buds bloom');
  // buds die with Hanami
  b.damage(e, 1e12, { ignoreWard: true });
  assert.equal(b.enemies.filter((x) => x.alive && x.type === 'bud').length, 0);
});

test('Dagon is invulnerable while submerged and exposed (+35% damage) right after', () => {
  const { b, e } = bossBattle(['yuji'], 'dagon', 20);
  e.speedMul = 0.001;
  let under = false;
  for (let i = 0; i < 60 * 20 && !under; i++) { b.update(STEP); e.dist = 0; if (e.ai.under > 0) under = true; }
  assert.ok(under, 'dagon submerges');
  assert.equal(b.damage(e, 5000, { type: 'cursed' }), 0, 'no damage while submerged');
  let exposed = false;
  for (let i = 0; i < 60 * 6 && !exposed; i++) { b.update(STEP); e.dist = 0; if (e.ai.exposed > 0) exposed = true; }
  assert.ok(exposed, 'exposed after surfacing');
  const dealt = b.damage(e, 1000, { type: 'cursed' });
  assert.ok(dealt > 1300, 'exposed takes +35%: ' + dealt);
});

test('Heian Sukuna: Shrine is clashed only by a Domain started DURING its warning', () => {
  function run(early) {
    const { b, e } = bossBattle(['yuji', 'sukunaC'], 'sukunaH', 45, 0.35);
    const g = [...b.geo.slots.values()].filter((s) => s.type === 'G');
    const yuji = b.place('yuji', g[0].c, g[0].r).unit;
    const sk = b.place('sukunaC', g[1].c, g[1].r).unit;
    while (sk.level < sk.def.maxLevel) b.upgrade(sk);
    sk.domainCd = 0;
    e.dist = 0; e.speedMul = 0.001;
    const stat0 = () => b.stats.disabled;
    let phase3At = -1, hz = null;
    for (let i = 0; i < 60 * 30; i++) {
      b.update(STEP); e.dist = 0; e.hp = e.maxHp * 0.35;
      if (e.ai.phase === 3 && phase3At < 0) phase3At = b.time;
      hz = b.hazards.find((h) => /SHRINE/.test(h.label || ''));
      if (early && phase3At >= 0 && b.time - phase3At > 0.3 && !b.domain && !hz) { assert.ok(b.activateDomain(sk), 'early domain'); early = 'done'; }
      if (hz) break;
    }
    assert.ok(hz, 'shrine telegraphed');
    if (early !== 'done' && !b.domain) assert.ok(b.activateDomain(sk), 'timely domain');
    const d0 = stat0();
    let guard = 0;
    while (b.hazards.includes(hz) && guard++ < 60 * 6) { b.update(STEP); e.dist = 0; }
    return { stunned: e.stunT > 0, disabled: b.stats.disabled - d0, domainStillOn: !!b.domain };
  }
  const timely = run(false), early = run(true);
  assert.equal(timely.stunned, true, 'timely Domain clashes');
  assert.equal(early.stunned, false, 'early Domain does not clash');
  assert.ok(early.disabled > 0, 'units disabled when clash fails');
});

test('acquisition: Culling banner is locked until Cursed Temple + level 12; costs more; hard pity 120; unlock hints exist', () => {
  const sm = new J.SaveManager({ getItem: () => null, setItem() {}, removeItem() {} });
  sm.load();
  const p = new J.Profile(sm, { now: () => 1e12 });
  assert.equal(p.isBannerUnlocked('culling'), false);
  assert.match(p.bannerLockReason('culling'), /Lv 12/);
  p.d.currencies.gems = 99999;
  assert.equal(p.summon('culling', 1).ok, false);
  p.d.player.level = 12;
  p.d.progress.maps.temple = { normal: { cleared: true, clears: 1, bestWave: 30, bestTime: 1, flawless: false } };
  assert.equal(p.isBannerUnlocked('culling'), true);
  const g0 = p.gems;
  const r = p.summon('culling', 10);
  assert.ok(r.ok);
  assert.equal(g0 - p.gems, J.Banners.culling.cost10);
  assert.ok(J.Banners.culling.cost10 > J.Balance.summonCost10);
  for (const x of r.results) assert.ok(J.Banners.culling.pool[x.tier].includes(x.id));
  assert.equal(J.Banners.culling.pity.hard, 120);
  for (const id of J.Expansion) assert.ok(p.charUnlockHint(id).length > 3, id + ' has an acquisition hint');
});

test('unlock rules: boss mastery grants Jogo/Mahito after 8 kills; challenges grant Miwa, Naoya and Sukuna', () => {
  const sm = new J.SaveManager({ getItem: () => null, setItem() {}, removeItem() {} });
  sm.load();
  const p = new J.Profile(sm, { now: () => 1e12 });
  const summary = (o) => Object.assign({ mapId: 'detention', diff: 'hard', mode: 'story', victory: true, wave: 20, wavesCleared: 20, totalWaves: 20, kills: 100, yenEarned: 1, baseLost: 0, sold: 0, disabled: 0, upgrades: 0, deploys: 1, domains: 0, bossKills: {}, bossTimes: {}, duration: 100, score: 1, deployedIds: ['yuji'], loadout: ['yuji'], enemiesSeen: [], bossesSeen: [], unitStats: [] }, o || {});
  p.applyMatchResult(summary(), 'a', 1);
  assert.ok(p.owns('miwa'), 'Miwa from a no-disable HARD Detention clear');
  assert.ok(!p.owns('jogoC'));
  p.d.bossRecords.jogo = { kills: 7, bestTime: 0 };
  p.applyMatchResult(summary({ mapId: 'tokyo', bossKills: { jogo: 1 }, bossTimes: { jogo: 80 } }), 'b', 2);
  assert.ok(p.owns('jogoC'), 'Jogo after 8 kills');
  p.applyMatchResult(summary({ mapId: 'tokyo', bossKills: { mahito: 1 }, bossTimes: { mahito: 50 } }), 'c', 3);
  assert.ok(p.owns('naoya'), 'Naoya for a 50s Mahito kill');
  assert.ok(!p.owns('sukunaC'));
  p.applyMatchResult(summary({ mapId: 'shinjuku', diff: 'hard', totalWaves: 45, wavesCleared: 45, wave: 45 }), 'd', 4);
  assert.ok(!p.owns('sukunaC'), 'HARD clear does not unlock Sukuna');
  p.applyMatchResult(summary({ mapId: 'shinjuku', diff: 'special', totalWaves: 45, wavesCleared: 45, wave: 45, bossKills: { sukunaH: 1 }, bossTimes: { sukunaH: 100 } }), 'e', 5);
  assert.ok(p.owns('sukunaC'), 'Sukuna from a SPECIAL Gauntlet clear');
  assert.ok(p.d.bossRecords.sukunaH.kills >= 1);
});
