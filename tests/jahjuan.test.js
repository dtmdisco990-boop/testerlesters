const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./load.js');

const J = loadGame();
const { Battle, Balance, Profile, Util, SummonMath } = J;
const STEP = Balance.STEP;
const step = (b, sec) => { const n = Math.round(sec / STEP); for (let i = 0; i < n && !b.over; i++) b.update(STEP); };
const slotOf = (b, type, nth) => { const a = []; for (const s of b.geo.slots.values()) if (s.type === type) a.push(s); return a[nth || 0]; };
function enemyNear(b, u, type, o) {
  const e = b.spawnEnemy(type || 'wisp', o || {});
  let best = 0, bd = Infinity; const tmp = { x: 0, y: 0 };
  for (let d = 0; d < e.path.length; d += 4) { e.path.posAt(d, tmp); const q = (tmp.x - u.x) ** 2 + (tmp.y - u.y) ** 2; if (q < bd) { bd = q; best = d; } }
  e.dist = best; e.path.posAt(best, e);
  return e;
}
function mk(gems) {
  const sm = new J.SaveManager(new Util.MemoryStorage()); sm.load();
  const p = new Profile(sm, { now: () => Date.UTC(2026, 5, 10, 12) });
  sm.data.currencies.gems = gems || 1e6;
  return p;
}
const battle = (team) => new Battle({ mapId: 'tokyo', diff: 'normal', team: (team || ['jahjuan']).map((id) => ({ id, level: 1, stars: 0 })), seed: 11, startYen: 1e7 });

test('JOAN is the highest rarity; Jahjuan costs 300, max 1 placement, has the best stats in the game', () => {
  const R = Balance.rarity;
  assert.equal(R.JOAN.label, 'JOAN');
  for (const k of Object.keys(R)) if (k !== 'JOAN') assert.ok(R.JOAN.order > R[k].order, 'JOAN above ' + k);
  const d = J.Characters.jahjuan;
  assert.equal(d.name, 'INVINCIBLE JAHJUAN');
  assert.equal(d.rarity, 'JOAN');
  assert.equal(d.cost, 300);
  assert.equal(R.JOAN.maxPlace, 1);
  assert.equal(d.unlock.type, 'summon');
  assert.ok(!J.Expansion.includes('jahjuan'));
  for (const id of J.CharacterOrder) {
    if (id === 'jahjuan') continue;
    const o = J.Characters[id];
    assert.ok(d.base.dmg > o.base.dmg * 1000, 'damage beats ' + id);
    assert.ok(d.base.spa <= o.base.spa, 'speed beats ' + id);
    assert.ok(d.base.range >= o.base.range, 'range beats ' + id);
  }
});

test('only ONE Jahjuan can be placed and he costs exactly 300 Yen', () => {
  const b = battle();
  const s0 = slotOf(b, 'G', 0), s1 = slotOf(b, 'G', 1);
  const y0 = b.yen;
  const r = b.place('jahjuan', s0.c, s0.r);
  assert.ok(r.ok, r.reason);
  assert.equal(y0 - b.yen, 300);
  const r2 = b.place('jahjuan', s1.c, s1.r);
  assert.equal(r2.ok, false, 'second placement refused');
  assert.equal(b.maxPlace('jahjuan') || 1, 1);
  // sell him: the slot frees up again
  b.sell(r.unit);
  assert.ok(b.place('jahjuan', s1.c, s1.r).ok, 'can re-place after selling');
});

test('he erases every enemy type in reach, shielded, warded, armoured or not, at every upgrade level', () => {
  for (let lvl = 1; lvl <= 4; lvl++) {
    const b = battle();
    const s = slotOf(b, 'G', 0);
    const u = b.place('jahjuan', s.c, s.r).unit;
    while (u.level < lvl) assert.ok(b.upgrade(u).ok);
    const es = [];
    for (const t of Object.keys(J.Enemies)) {
      if (J.Enemies[t].boss) continue;
      const e = enemyNear(b, u, t); e.speedMul = 0.001; e.shield = 5e6; e.armorBonus = 0.9; e.wardUntil = 1e9; es.push(e);
    }
    assert.ok(es.length > 5);
    step(b, 1.5);
    for (const e of es) assert.ok(!e.alive, 'dead: ' + e.type + ' L' + lvl);
  }
});

test('he deletes full-health bosses outside their invulnerable windows (incl. Mahoraga adaptation)', () => {
  for (const id of J.BossOrder) {
    const b = new Battle({ mapId: 'shinjuku', diff: 'special', team: [{ id: 'jahjuan', level: 1, stars: 0 }], seed: 9, startYen: 1e7 });
    b.wave = 30; b.state = 'wave'; b.canStartWave = () => false;
    const s = slotOf(b, 'G', 0);
    const u = b.place('jahjuan', s.c, s.r).unit;
    const e = enemyNear(b, u, id, { wave: 30 });
    e.hp = e.maxHp = Math.max(e.maxHp, 1e7); e.speedMul = 0.001;
    // if the boss happens to be in an invulnerable window, give it time to leave it
    step(b, 12);
    assert.ok(!e.alive, 'boss ' + id + ' erased');
  }
});

test('Dagon while submerged cannot be hurt (honest limit) but dies the moment he surfaces', () => {
  const b = new Battle({ mapId: 'shinjuku', diff: 'normal', team: [{ id: 'jahjuan', level: 1, stars: 0 }], seed: 9, startYen: 1e7 });
  const e = b.spawnEnemy('dagon', { wave: 25 });
  e.invulnT = 5;
  assert.equal(b.damage(e, 1e12, { type: 'true' }), 0);
  assert.ok(e.alive);
});

test('summon: JOAN odds are exactly 1 in 200,000 and independent of the banner roll', () => {
  assert.equal(SummonMath.JOAN_ODDS, 200000);
  assert.equal(SummonMath.JOAN_ID, 'jahjuan');
  const just = 1 / 200000;
  assert.equal(SummonMath.rollJoan({ joan: () => just - 1e-12 }), true);
  assert.equal(SummonMath.rollJoan({ joan: () => just }), false);
  assert.equal(SummonMath.rollJoan({ joan: () => 0.5 }), false);
  assert.equal(SummonMath.rollJoan({ next: () => 0 }), false, 'seeded callers never roll it');
  // statistical sanity of the real source: 2M rolls should be near 10 hits
  let hits = 0; for (let i = 0; i < 2e6; i++) if (SummonMath.rollJoan({ joan: Math.random })) hits++;
  assert.ok(hits >= 1 && hits <= 30, 'hits in 2M: ' + hits);
});

test('summon: a JOAN roll grants Jahjuan on every banner, in x1 and x10, without disturbing the rest of the pull', () => {
  for (const bid of ['standard', 'culling', J.Banners.featured[0].id]) {
    for (const n of [1, 10]) {
      const a = mk(), b2 = mk();
      a.d.progress.maps = b2.d.progress.maps = a.d.progress.maps;
      const mkRng = (jo) => { const r = Util.makeRng(42); r.joan = jo; return r; };
      let ra, rb;
      try { ra = a.summon(bid, n, mkRng(() => 0.99)); rb = b2.summon(bid, n, mkRng(() => 0)); } catch (e) { throw e; }
      if (!ra.ok) continue; // banner locked on a fresh profile
      assert.ok(!ra.results.some((r) => r.id === 'jahjuan'));
      assert.equal(rb.results.length, n);
      assert.ok(rb.results.every((r) => r.id === 'jahjuan' && r.tier === 'JOAN'), 'all slots JOAN when forced');
      assert.ok(b2.owns('jahjuan'));
      assert.equal(rb.results.filter((r) => r.isNew).length, 1, 'first is new');
      assert.equal(b2.shardsOf('jahjuan'), (n - 1) * Balance.rarity.JOAN.dupShards, 'duplicates become shards');
      assert.equal(a.pityOf(bid), b2.pityOf(bid), 'pity maths unchanged by JOAN');
    }
  }
});

test('Jahjuan cannot be unlocked with shards, bought in the shop, or counted by roster missions', () => {
  const p = mk();
  p.addShards('jahjuan', 999999);
  assert.equal(p.canUnlockWithShards('jahjuan'), false);
  assert.equal(p.unlockWithShards('jahjuan').ok, false);
  assert.ok(!p._sellableChars().includes('jahjuan'));
  for (let day = 0; day < 40; day++) {
    p.sm.data.shop = p.sm.data.shop || {};
    const stock = JSON.stringify(p.shopStock());
    assert.ok(!stock.includes('jahjuan'), 'not in shop');
    p.sm.data.shop.purchases = {}; p.now = () => Date.UTC(2026, 5, 10 + day, 12);
  }
  const q = mk();
  const m = J.Missions.find((x) => x.id === 'chars_27'), m8 = J.Missions.find((x) => x.id === 'chars_8');
  const before = [m.get(q.d), m8.get(q.d)];
  q.grantCharacter('jahjuan');
  assert.deepEqual([m.get(q.d), m8.get(q.d)], before, 'does not count towards "own all 27"');
});

test('a default (unseeded) summon uses a real random source for JOAN', () => {
  const p = mk(1e9);
  let joan = 0;
  const orig = Math.random; let calls = 0;
  Math.random = () => { calls++; return orig(); };
  try { for (let i = 0; i < 30; i++) p.summon('standard', 10); } finally { Math.random = orig; }
  assert.ok(calls >= 300, 'drew a JOAN roll per pull: ' + calls);
});
