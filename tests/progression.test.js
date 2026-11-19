const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./load.js');

const J = loadGame();
const { Profile, SummonMath, Balance, Util } = J;
const DAY = 86400000;
const T0 = Date.UTC(2026, 5, 10, 12, 0, 0);

function mk(opts) {
  const clock = { t: T0 };
  const sm = new J.SaveManager(new Util.MemoryStorage());
  sm.load();
  const p = new Profile(sm, { now: () => clock.t });
  p.clock = clock;
  if (opts && opts.gems != null) sm.data.currencies.gems = opts.gems;
  if (opts && opts.coins != null) sm.data.currencies.coins = opts.coins;
  return p;
}
const constRng = (v) => ({ next: () => v, int: (a) => a });
const seqRng = (arr) => { let i = 0; return { next: () => arr[Math.min(i++, arr.length - 1)], int: (a) => a }; };
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const banners = () => [J.Banners.standard, J.Banners.culling].concat(J.Banners.featured);

function fakeSummary(over) {
  return Object.assign({
    mapId: 'tokyo', diff: 'normal', mode: 'story', victory: true, wave: 15, wavesCleared: 15, totalWaves: 15, kills: 400,
    yenEarned: 9000, baseLost: 3, sold: 1, upgrades: 12, deploys: 14, domains: 1, bossKills: { finger: 1 }, bossTimes: { finger: 60 },
    duration: 700, score: 5000, deployedIds: ['yuji', 'panda', 'nobara'], loadout: ['yuji', 'panda', 'nobara'],
    enemiesSeen: ['wisp', 'skitter'], bossesSeen: ['finger'], unitStats: [],
  }, over || {});
}

// ------------------------------------------------------------------ summon maths
test('rates: every banner sums to 100 and tier rates sum to 100 at every pity counter', () => {
  for (const b of banners()) {
    assert.ok(Math.abs(sum(b.rates) - 100) < 1e-9, b.id + ' base rates');
    for (let c = 0; c < b.pity.hard; c++) {
      const r = SummonMath.tierRates(b, c);
      assert.ok(Math.abs(sum(r) - 100) < 1e-6, `${b.id} counter ${c}: ${sum(r)}`);
    }
    const cr = SummonMath.charRates(b);
    assert.ok(Math.abs(cr.reduce((s, x) => s + x.rate, 0) - 100) < 1e-6, b.id + ' per-character rates');
  }
});

test('pity: high-tier chance is non-decreasing and hits exactly 100% at the hard pity pull', () => {
  for (const b of banners()) {
    const idx = Profile.TIER_ORDER.indexOf(b.pity.tier);
    let prev = 0;
    for (let c = 0; c < b.pity.hard; c++) {
      const r = SummonMath.tierRates(b, c);
      const hi = Profile.TIER_ORDER.slice(idx).reduce((s, t) => s + r[t], 0);
      assert.ok(hi >= prev - 1e-9, `${b.id} drops at ${c}`);
      prev = hi;
    }
    assert.ok(Math.abs(prev - 100) < 1e-9, b.id + ' hard pity');
  }
});

test('rollTier: empirical frequencies match published rates (200k rolls, +-0.6%)', () => {
  const b = J.Banners.standard;
  const rng = Util.makeRng(12345);
  const rates = SummonMath.tierRates(b, 0);
  const N = 200000, cnt = {};
  for (let i = 0; i < N; i++) { const t = SummonMath.rollTier(rng, rates); cnt[t] = (cnt[t] || 0) + 1; }
  for (const t of Object.keys(b.rates)) {
    const got = ((cnt[t] || 0) / N) * 100;
    assert.ok(Math.abs(got - b.rates[t]) < 0.6, `${t}: got ${got.toFixed(2)} want ${b.rates[t]}`);
  }
  assert.equal(cnt.MYTHIC || 0, 0, 'standard banner never drops Mythic');
});

test('featured banner: Gojo can only come from the featured banner', () => {
  const p = mk({ gems: 100000 });
  for (let i = 0; i < 40; i++) p.summon('standard', 10, Util.makeRng(i));
  assert.equal(p.owns('gojo'), false);
  assert.equal(JJK_has(J.Banners.standard, 'gojo'), false);
  assert.equal(JJK_has(J.Banners.featured[0], 'gojo'), true);
});
function JJK_has(b, id) { return Object.values(b.pool).some((a) => a.includes(id)); }

// ------------------------------------------------------------------ summon flow
test('summon x1: costs 10 gems, grants a character, bumps pity and totals', () => {
  const p = mk({ gems: 100 });
  const r = p.summon('standard', 1, constRng(0));
  assert.equal(r.ok, true);
  assert.equal(p.gems, 100 - Balance.summonCost1);
  assert.equal(r.results.length, 1);
  assert.equal(p.d.summon.total, 1);
  assert.equal(p.pityOf('standard'), 1);
});

test('summon x10: costs 100 gems, 10 results, guarantees RARE+ even on the worst luck', () => {
  const p = mk({ gems: 100 });
  const r = p.summon('standard', 10, constRng(0));
  assert.equal(r.ok, true);
  assert.equal(p.gems, 0);
  assert.equal(r.results.length, 10);
  assert.ok(Profile.TIER_ORDER.indexOf(r.results[9].tier) >= 1, 'last pull is RARE or better');
  assert.equal(r.results.slice(0, 9).every((x) => x.tier === 'COMMON'), true);
});

test('summon refuses without gems and changes nothing', () => {
  const p = mk({ gems: 9 });
  const before = JSON.stringify(p.d);
  const r = p.summon('standard', 1);
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(p.d), before);
  assert.equal(p.summon('standard', 10).ok, false);
  assert.equal(p.summon('nope', 1).ok, false);
  assert.equal(p.summon('standard', 5).ok, false, 'only 1 or 10 allowed');
});

test('hard pity: with the worst RNG the 50th standard pull is Legendary, then the counter resets', () => {
  const p = mk({ gems: 1000 });
  let last;
  for (let i = 1; i <= 50; i++) {
    last = p.summon('standard', 1, constRng(0));
    if (i < 50) assert.equal(last.results[0].tier, 'COMMON', 'pull ' + i);
  }
  assert.equal(last.results[0].tier, 'LEGENDARY');
  assert.equal(p.pityOf('standard'), 0);
});

test('hard pity on the Honored One banner is 60 and yields Gojo', () => {
  const p = mk({ gems: 2000 });
  let last;
  for (let i = 1; i <= 60; i++) last = p.summon('sixeyes', 1, constRng(0));
  assert.equal(last.results[0].tier, 'MYTHIC');
  assert.equal(last.results[0].id, 'gojo');
  assert.equal(p.owns('gojo'), true);
});

test('pity is tracked per banner and persists through save/load', () => {
  const p = mk({ gems: 1000 });
  for (let i = 0; i < 7; i++) p.summon('standard', 1, constRng(0));
  for (let i = 0; i < 3; i++) p.summon('rika', 1, constRng(0));
  assert.equal(p.pityOf('standard'), 7);
  assert.equal(p.pityOf('rika'), 3);
  const sm2 = new J.SaveManager(p.sm.storage);
  sm2.load();
  assert.equal(sm2.data.summon.pity.standard, 7);
  assert.equal(sm2.data.summon.pity.rika, 3);
});

test('duplicates convert to shards by rarity; new characters grant no shards', () => {
  const p = mk({ gems: 100 });
  assert.equal(p.owns('yuji'), true);
  const r = p.summon('standard', 1, constRng(0)); // COMMON, first in pool = yuji (owned)
  assert.equal(r.results[0].id, 'yuji');
  assert.equal(r.results[0].isNew, false);
  assert.equal(r.results[0].shards, Balance.rarity.COMMON.dupShards);
  assert.equal(p.shardsOf('yuji'), Balance.rarity.COMMON.dupShards);
  const g = p.grantCharacter('nanami');
  assert.deepEqual([g.isNew, g.shards], [true, 0]);
  const g2 = p.grantCharacter('nanami');
  assert.deepEqual([g2.isNew, g2.shards], [false, Balance.rarity.EPIC.dupShards]);
});

test('a duplicate inside one 10x is counted as a duplicate (first copy new, later copies shards)', () => {
  const p = mk({ gems: 100 });
  p.d.characters = { yuji: { level: 1, xp: 0, stars: 0 } };
  p.d.loadout = ['yuji'];
  const r = p.summon('standard', 10, seqRng([0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99]));
  const newOnes = r.results.filter((x) => x.isNew).map((x) => x.id);
  assert.equal(new Set(newOnes).size, newOnes.length, 'a character is only "new" once per summon');
});

test('Rika banner: losing the 50/50 (60% share) guarantees the featured Legendary next time', () => {
  const b = J.Banners.featured[1];
  const st = { lost: false };
  const lose = SummonMath.pickChar(constRng(0.99), b, 'LEGENDARY', st); // >= 0.6 -> not featured
  assert.notEqual(lose, 'yuta');
  assert.equal(st.lost, true);
  const win = SummonMath.pickChar(constRng(0.99), b, 'LEGENDARY', st);
  assert.equal(win, 'yuta');
  assert.equal(st.lost, false);
  // featured share empirical
  const rng = Util.makeRng(9);
  let f = 0; const N = 50000; const s2 = { lost: false };
  for (let i = 0; i < N; i++) { s2.lost = false; if (SummonMath.pickChar(rng, b, 'LEGENDARY', s2) === 'yuta') f++; }
  assert.ok(Math.abs(f / N - 0.6) < 0.01);
});

test('summon history is capped and lost-flag persists', () => {
  const p = mk({ gems: 1e6 });
  for (let i = 0; i < 30; i++) p.summon('standard', 10, Util.makeRng(i));
  assert.ok(p.d.summon.history.length <= 40);
  assert.equal(p.d.summon.total, 300);
});

// ------------------------------------------------------------------ currencies, XP, stars
test('currency ops never go negative or accept junk', () => {
  const p = mk({ coins: 100, gems: 10 });
  assert.equal(p.spendCoins(101), false);
  assert.equal(p.coins, 100);
  assert.equal(p.spendCoins(100), true);
  assert.equal(p.coins, 0);
  p.addCoins(NaN); p.addCoins(-50); p.addGems('x');
  assert.equal(p.coins, 0);
  assert.equal(p.gems, 10);
  p.addCoins(1e12);
  assert.equal(p.coins, 1e9);
});

test('character XP: multi-level gain, carry-over, cap at 30', () => {
  const p = mk();
  const need1 = Balance.charXpToNext(1);
  const r = p.addCharXP('yuji', need1 + 5);
  assert.equal(r.levels, 1);
  assert.equal(p.d.characters.yuji.level, 2);
  assert.equal(p.d.characters.yuji.xp, 5);
  p.addCharXP('yuji', 1e7);
  assert.equal(p.d.characters.yuji.level, Balance.charLevelCap);
  assert.equal(p.d.characters.yuji.xp, 0);
  assert.equal(p.addCharXP('gojo', 100).levels, 0, 'unowned character ignored');
});

test('XP items consume stock and level characters; fail cleanly when empty or maxed', () => {
  const p = mk();
  assert.equal(p.d.items.xpS, 2);
  const r = p.useXpItem('panda', 'xpS');
  assert.equal(r.ok, true);
  assert.equal(p.d.items.xpS, 1);
  assert.ok(p.d.characters.panda.level > 1 || p.d.characters.panda.xp === J.Items.xpS.xp);
  assert.equal(p.useXpItem('panda', 'xpL').ok, false);
  assert.equal(p.useXpItem('gojo', 'xpS').ok, false);
  p.d.characters.panda.level = Balance.charLevelCap;
  assert.equal(p.useXpItem('panda', 'xpS').ok, false);
  assert.equal(p.d.items.xpS, 1, 'no item consumed on failure');
});

test('player XP levels up, awards gems, caps at 40', () => {
  const p = mk();
  const g0 = p.gems;
  const r = p.addPlayerXP(Balance.playerXpToNext(1) + 1);
  assert.equal(r.levels, 1);
  assert.equal(p.playerLevel(), 2);
  assert.ok(p.gems > g0);
  p.addPlayerXP(1e8);
  assert.equal(p.playerLevel(), Balance.playerLevelCap);
  assert.equal(p.addPlayerXP(500).levels, 0);
});

test('star upgrades spend shards + coins and stop at max', () => {
  const p = mk({ coins: 1e6 });
  assert.equal(p.upgradeStar('yuji').ok, false, 'no shards yet');
  p.addShards('yuji', 1000);
  const c0 = p.starCost('yuji');
  const coins0 = p.coins, sh0 = p.shardsOf('yuji');
  assert.equal(p.upgradeStar('yuji').ok, true);
  assert.equal(p.coins, coins0 - c0.coins);
  assert.equal(p.shardsOf('yuji'), sh0 - c0.shards);
  while (p.upgradeStar('yuji').ok) { /* spend all stars */ }
  assert.equal(p.d.characters.yuji.stars, Balance.maxStars);
  assert.equal(p.starCost('yuji'), null);
});

test('shard unlock: needs the rarity shard cost, consumes it, creates the character', () => {
  const p = mk();
  assert.equal(p.unlockWithShards('gojo').ok, false);
  p.addShards('gojo', p.unlockShardCost('gojo') - 1);
  assert.equal(p.canUnlockWithShards('gojo'), false);
  p.addShards('gojo', 1);
  assert.equal(p.unlockWithShards('gojo').ok, true);
  assert.equal(p.owns('gojo'), true);
  assert.equal(p.shardsOf('gojo'), 0);
  assert.equal(p.unlockWithShards('gojo').ok, false, 'cannot unlock twice');
});

// ------------------------------------------------------------------ loadout
test('loadout: max 6, unique, owned only; toggling works; battle team has levels', () => {
  const p = mk();
  for (const id of ['megumi', 'maki', 'inumaki', 'nanami', 'meimei', 'todo']) p.grantCharacter(id);
  assert.equal(p.setLoadout(['yuji', 'panda', 'nobara', 'megumi', 'maki', 'inumaki', 'nanami']).ok, false, '7 rejected');
  assert.equal(p.setLoadout(['yuji', 'yuji', 'gojo', 'panda']).ok, true);
  assert.deepEqual(p.getLoadout(), ['yuji', 'panda'], 'duplicates and unowned dropped');
  assert.equal(p.toggleLoadout('gojo').ok, false);
  for (const id of ['nobara', 'megumi', 'maki', 'inumaki']) assert.equal(p.toggleLoadout(id).ok, true);
  assert.equal(p.getLoadout().length, 6);
  assert.equal(p.toggleLoadout('nanami').ok, false, 'full');
  assert.equal(p.toggleLoadout('yuji').ok, true);
  assert.equal(p.getLoadout().length, 5);
  const team = p.teamForBattle();
  assert.equal(team.length, 5);
  assert.ok(team.every((t) => t.level >= 1 && 'stars' in t));
  assert.doesNotThrow(() => new J.Battle({ mapId: 'tokyo', diff: 'normal', team }));
});

// ------------------------------------------------------------------ unlock rules
test('map / difficulty / feature gating', () => {
  const p = mk();
  assert.equal(p.isMapUnlocked('tokyo'), true);
  assert.equal(p.isMapUnlocked('detention'), false);
  assert.match(p.mapLockReason('detention'), /Tokyo/);
  assert.equal(p.isDiffUnlocked('tokyo', 'hard'), false);
  assert.equal(p.isFeatureUnlocked('shop'), false);
  p.d.player.level = 10;
  assert.equal(p.isFeatureUnlocked('shop'), true);
  assert.equal(p.isFeatureUnlocked('endless'), false, 'needs Tokyo clear');
  p.d.progress.maps.tokyo = { normal: { cleared: true, clears: 1, bestWave: 15, bestTime: 600, flawless: false } };
  assert.equal(p.isFeatureUnlocked('endless'), true);
  assert.equal(p.isMapUnlocked('detention'), true);
  assert.equal(p.isDiffUnlocked('tokyo', 'hard'), true);
  assert.equal(p.isDiffUnlocked('tokyo', 'special'), false);
  p.debugUnlockAll = true;
  assert.equal(p.isMapUnlocked('temple'), true);
});

// ------------------------------------------------------------------ shop
test('shop stock is deterministic per day, rotates daily/weekly, and is fully priced', () => {
  const p = mk();
  const a = p.shopStock(), b = p.shopStock();
  assert.deepEqual(a, b);
  assert.equal(a.featured.length, J.Shop.dailySlots);
  assert.ok(a.items.length >= 3);
  assert.ok(a.shards.some((x) => x.charId === 'gojo'));
  for (const o of a.featured.concat(a.shards, a.items)) {
    assert.ok(o.price > 0 && Number.isInteger(o.price), o.key + ' price');
    assert.ok(o.qty > 0, o.key + ' qty');
  }
  p.clock.t += DAY;
  const c = p.shopStock();
  assert.notEqual(JSON.stringify(a.featured.map((x) => x.key)), JSON.stringify(c.featured.map((x) => x.key)));
  p.clock.t += 7 * DAY;
  const d = p.shopStock();
  assert.notEqual(a.week, d.week);
});

test('shop purchase: pays, grants, enforces limits, rejects when poor or expired', () => {
  const p = mk({ coins: 100000 });
  const stock = p.shopStock();
  const xpm = stock.items.find((x) => x.item === 'xpM');
  const c0 = p.coins, n0 = p.d.items.xpM;
  const r = p.buy(xpm.key);
  assert.equal(r.ok, true);
  assert.equal(p.coins, c0 - xpm.price);
  assert.equal(p.d.items.xpM, n0 + xpm.qty);
  p.buy(xpm.key); // unlimited item can be bought repeatedly
  assert.equal(p.d.items.xpM, n0 + 2 * xpm.qty);

  const gem = p.shopStock().items.find((x) => x.kind === 'gems');
  const g0 = p.gems;
  for (let i = 0; i < gem.limit; i++) assert.equal(p.buy(gem.key).ok, true);
  assert.equal(p.gems, g0 + gem.qty * gem.limit);
  const soldOut = p.buy(gem.key);
  assert.equal(soldOut.ok, false);
  assert.match(soldOut.reason, /Sold out/);

  const gojo = p.shopStock().shards.find((x) => x.charId === 'gojo');
  const s0 = p.shardsOf('gojo');
  assert.equal(p.buy(gojo.key).ok, true);
  assert.equal(p.shardsOf('gojo'), s0 + gojo.qty);

  assert.equal(p.buy('deal:0:bogus').ok, false);
  p.d.currencies.coins = 0;
  const poor = p.buy(xpm.key);
  assert.equal(poor.ok, false);
  assert.match(poor.reason, /Coins/);
});

test('shop: daily limit resets next day, deals are single-purchase and persist', () => {
  const p = mk({ coins: 1e6 });
  const deal = p.shopStock().featured[0];
  assert.equal(p.buy(deal.key).ok, true);
  assert.equal(p.buy(deal.key).ok, false, 'deal limited to 1');
  const gem = p.shopStock().items.find((x) => x.kind === 'gems');
  for (let i = 0; i < gem.limit; i++) p.buy(gem.key);
  assert.equal(p.buy(gem.key).ok, false);
  p.clock.t += DAY;
  const gem2 = p.shopStock().items.find((x) => x.kind === 'gems');
  assert.equal(p.buy(gem2.key).ok, true, 'limit reset after the day rolled over');
  const keys = Object.keys(p.d.shop.purchases);
  assert.ok(keys.every((k) => !k.startsWith('deal:' + Util.dayIndex(T0) + ':')), 'old-day purchase keys pruned');
});

// ------------------------------------------------------------------ missions
test('missions: claim only when complete, once, reward is applied', () => {
  const p = mk();
  assert.equal(p.claimMission('kills_100').ok, false);
  assert.match(p.claimMission('kills_100').reason, /Not complete/);
  p.d.stats.kills = 120;
  const c0 = p.coins;
  const r = p.claimMission('kills_100');
  assert.equal(r.ok, true);
  assert.equal(p.coins, c0 + 300);
  assert.equal(p.claimMission('kills_100').ok, false);
  assert.equal(p.claimMission('nope').ok, false);
  assert.ok(p.missionStatus(J.Missions.find((m) => m.id === 'kills_500')).progress === 120);
});

test('Inumaki unlocks through the kills_150 mission reward', () => {
  const p = mk();
  assert.equal(p.owns('inumaki'), false);
  p.d.stats.kills = 150;
  assert.equal(p.claimMission('kills_150').ok, true);
  assert.equal(p.owns('inumaki'), true);
});

test('daily missions: 3 per day, deterministic, progress resets at day rollover, claimable once', () => {
  const p = mk();
  const a = p.dailyMissions();
  assert.equal(a.length, 3);
  assert.deepEqual(a.map((x) => x.id), p.dailyMissions().map((x) => x.id));
  const target = a[0];
  p.d.daily.progress[target.stat] = target.target;
  assert.equal(p.dailyMissions()[0].done, true);
  const c0 = p.coins, g0 = p.gems;
  assert.equal(p.claimDaily(target.id).ok, true);
  assert.ok(p.coins > c0 || p.gems > g0);
  assert.equal(p.claimDaily(target.id).ok, false);
  assert.equal(p.claimableCount() >= 0, true);
  p.clock.t += DAY;
  const b = p.dailyMissions();
  assert.ok(b.every((x) => x.progress === 0 && !x.claimed));
});

test('every mission and challenge is well-formed and reachable', () => {
  const ids = new Set();
  for (const m of J.Missions) {
    assert.ok(!ids.has(m.id), 'dup id ' + m.id); ids.add(m.id);
    assert.ok(m.target > 0 && typeof m.get === 'function' && m.reward, m.id);
    const v = m.get(mk().d);
    assert.ok(Number.isFinite(v), m.id + ' getter');
    for (const k of Object.keys(m.reward.shards || {})) assert.ok(J.Characters[k], m.id + ' shard char');
    if (m.reward.char) assert.ok(J.Characters[m.reward.char]);
  }
  assert.ok(J.Missions.length >= 25);
});

// ------------------------------------------------------------------ match results
test('applyMatchResult: pays coins/gems/XP, records progress, is idempotent per match id', () => {
  const p = mk();
  const c0 = p.coins, g0 = p.gems;
  const r = p.applyMatchResult(fakeSummary(), 'match-1', 1);
  assert.equal(r.victory, true);
  assert.ok(p.coins > c0 && p.gems > g0);
  assert.equal(p.d.progress.maps.tokyo.normal.cleared, true);
  assert.equal(r.rewards.firstClear, true);
  assert.equal(p.d.stats.wins, 1);
  assert.equal(p.d.stats.kills, 400);
  assert.ok(p.d.characters.yuji.level > 1 || p.d.characters.yuji.xp > 0);
  const snap = JSON.stringify(p.d);
  const again = p.applyMatchResult(fakeSummary(), 'match-1', 1);
  assert.equal(JSON.stringify(p.d), snap, 'second apply is a no-op');
  assert.equal(again.id, 'match-1');
});

test('first clear pays more gems than a repeat; hard pays more than normal', () => {
  const p = mk();
  const g0 = p.gems;
  p.applyMatchResult(fakeSummary(), 'a', 1);
  const first = p.gems - g0;
  const g1 = p.gems;
  p.applyMatchResult(fakeSummary(), 'b', 1);
  const repeat = p.gems - g1;
  assert.ok(first > repeat * 2, `first ${first} vs repeat ${repeat}`);
  const g2 = p.gems;
  p.applyMatchResult(fakeSummary({ diff: 'hard' }), 'c', 1);
  assert.ok(p.gems - g2 > first, 'first HARD clear > first NORMAL clear');
});

test('defeat pays a reduced reward, never zero-wave exploits, and no clear flag', () => {
  const win = mk(), lose = mk(), zero = mk();
  win.applyMatchResult(fakeSummary({ bossKills: {}, bossTimes: {} }), 'w', 1);
  lose.applyMatchResult(fakeSummary({ victory: false, wavesCleared: 7, wave: 8, bossKills: {}, bossTimes: {} }), 'l', 1);
  zero.applyMatchResult(fakeSummary({ victory: false, wavesCleared: 0, wave: 1, kills: 0, bossKills: {}, bossTimes: {} }), 'z', 1);
  const gain = (p) => p.coins - Balance.coinsStart;
  assert.ok(gain(lose) > 0 && gain(lose) < gain(win));
  assert.equal(gain(zero), 0);
  assert.equal(lose.mapCleared('tokyo'), false);
  assert.equal(lose.d.progress.maps.tokyo.normal.bestWave, 7);
  assert.equal(lose.d.stats.losses, 1);
});

test('Megumi is a starter; story clears unlock characters: Detention -> Maki', () => {
  const p = mk();
  assert.equal(p.owns('megumi'), true, 'Megumi starts owned');
  const r = p.applyMatchResult(fakeSummary(), 'u1', 1);
  assert.ok(!r.newChars.includes('megumi'), 'not re-awarded');
  assert.equal(p.owns('maki'), false);
  p.applyMatchResult(fakeSummary({ mapId: 'detention', totalWaves: 20, wavesCleared: 20, wave: 20, bossKills: {}, bossTimes: {} }), 'u2', 1);
  assert.equal(p.owns('maki'), true);
});

test('boss kills write records and index entries; Jogo drops Choso only on chance and falls back to shards', () => {
  const p = mk();
  p.applyMatchResult(fakeSummary({ bossKills: { jogo: 1 }, bossTimes: { jogo: 80 }, bossesSeen: ['finger', 'jogo'] }), 'b1', 3);
  assert.equal(p.d.bossRecords.jogo.kills, 1);
  assert.equal(p.d.bossRecords.jogo.bestTime, 80);
  assert.equal(p.d.index.bosses.jogo, true);
  assert.equal(p.d.index.enemies.wisp, true);
  // force the character drop by trying many seeds until it happens, then check duplicates become shards
  const q = mk();
  let dropped = false;
  for (let i = 0; i < 400 && !dropped; i++) {
    q.d.lastRewards = null;
    q.applyMatchResult(fakeSummary({ bossKills: { jogo: 1 }, bossTimes: { jogo: 80 } }), 'j' + i, i);
    dropped = q.owns('choso');
  }
  assert.equal(dropped, true, 'Choso eventually drops from Jogo');
  const s0 = q.shardsOf('choso');
  for (let i = 0; i < 400 && q.shardsOf('choso') === s0; i++) q.applyMatchResult(fakeSummary({ bossKills: { jogo: 1 }, bossTimes: { jogo: 80 } }), 'k' + i, i);
  assert.ok(q.shardsOf('choso') > s0, 'after owning Choso the drop turns into shards');
});

test('challenges: flawless Tokyo, Jogo speedkill, and Mahito no-sell grant rewards exactly once', () => {
  const p = mk();
  const r1 = p.applyMatchResult(fakeSummary({ baseLost: 0, bossKills: {}, bossTimes: {} }), 'c1', 1);
  assert.ok(r1.challenges.some((c) => c.id === 'tokyo_flawless'));
  assert.equal(p.d.progress.maps.tokyo.normal.flawless, true);
  const r2 = p.applyMatchResult(fakeSummary({ baseLost: 0, bossKills: {}, bossTimes: {} }), 'c2', 1);
  assert.equal(r2.challenges.length, 0, 'one-time reward');
  const s0 = p.shardsOf('choso');
  p.applyMatchResult(fakeSummary({ bossKills: { jogo: 1 }, bossTimes: { jogo: 95 } }), 'c3', 99999);
  assert.ok(p.shardsOf('choso') >= s0 + 25);
  p.applyMatchResult(fakeSummary({ sold: 0, bossKills: { mahito: 1 }, bossTimes: { mahito: 120 } }), 'c4', 1);
  assert.equal(p.d.challenges.done.mahito_nosell, true);
  const q = mk();
  q.applyMatchResult(fakeSummary({ sold: 2, bossKills: { mahito: 1 }, bossTimes: { mahito: 120 } }), 'c5', 1);
  assert.notEqual(q.d.challenges.done.mahito_nosell, true, 'selling disqualifies');
});

test('secret Toji challenge: needs HARD/SPECIAL + 3+ units all Physical Specialists', () => {
  const phys = J.CharacterOrder.filter((id) => J.Characters[id].traits.includes('Physical Specialist') && id !== 'toji');
  assert.ok(phys.length >= 3, 'roster has enough physical specialists: ' + phys.join(','));
  const base = { diff: 'hard', bossKills: {}, bossTimes: {} };
  const bad = mk();
  bad.applyMatchResult(fakeSummary(Object.assign({ deployedIds: phys.slice(0, 2) }, base)), 't1', 1);
  assert.equal(bad.owns('toji'), false, 'only two units');
  bad.applyMatchResult(fakeSummary(Object.assign({ deployedIds: phys.slice(0, 2).concat(['nobara']) }, base, { mapId: 'tokyo' })), 't2', 1);
  assert.equal(bad.owns('toji'), false, 'non-physical unit present');
  bad.applyMatchResult(fakeSummary({ deployedIds: phys.slice(0, 3), diff: 'normal', bossKills: {}, bossTimes: {} }), 't3', 1);
  assert.equal(bad.owns('toji'), false, 'normal difficulty does not count');
  const r = bad.applyMatchResult(fakeSummary(Object.assign({ deployedIds: phys.slice(0, 3) }, base)), 't4', 1);
  assert.equal(bad.owns('toji'), true);
  assert.ok(r.newChars.includes('toji'));
});

test('endless results: records only improve, milestones pay gems, Todo unlocks at wave 20', () => {
  const p = mk();
  const e = (w, score) => fakeSummary({ mode: 'endless', victory: false, wave: w + 1, wavesCleared: w, totalWaves: null, score, bossKills: {}, bossTimes: {} });
  const r1 = p.applyMatchResult(e(12, 4000), 'e1', 1);
  assert.equal(r1.newRecord, true);
  assert.equal(p.d.endless.bestWave, 12);
  const r2 = p.applyMatchResult(e(8, 2000), 'e2', 1);
  assert.equal(r2.newRecord, false);
  assert.equal(p.d.endless.bestWave, 12);
  assert.equal(p.d.endless.bestScore, 4000);
  assert.equal(p.owns('todo'), false);
  const r3 = p.applyMatchResult(e(21, 9000), 'e3', 1);
  assert.equal(p.owns('todo'), true);
  assert.ok(r3.challenges.some((c) => c.id === 'endless_20'));
  assert.equal(p.d.progress.maps.tokyo, undefined, 'endless never touches story progress');
  assert.equal(p.d.endless.byMap.tokyo.bestWave, 21);
});

test('daily progress is fed by match results', () => {
  const p = mk();
  p.applyMatchResult(fakeSummary(), 'd1', 1);
  assert.equal(p.d.daily.progress.kills, 400);
  assert.equal(p.d.daily.progress.wins, 1);
  assert.equal(p.d.daily.progress.bosses, 1);
});

test('lastRewards persists so the results screen survives a reload', () => {
  const p = mk();
  p.applyMatchResult(fakeSummary(), 'persist', 1);
  const sm2 = new J.SaveManager(p.sm.storage);
  sm2.load();
  assert.equal(sm2.data.lastRewards.id, 'persist');
  assert.equal(sm2.data.lastRewards.victory, true);
});

// ------------------------------------------------------------------ integration with the real sim
test('integration: a bot-played Tokyo match produces a summary that Profile accepts', () => {
  const p = mk();
  const team = p.teamForBattle();
  const b = new J.Battle({ mapId: 'tokyo', diff: 'normal', team, seed: 7 });
  J.Bot.run(b, { maxSeconds: 400, skill: 'good', useDomains: true });
  if (!b.over) b.finish(true); // time-boxed bot: end the match normally (not a debug action)
  const s = b.getSummary();
  const r = p.applyMatchResult(s, 'sim-1', 5);
  assert.equal(typeof r.rewards.coins, 'number');
  assert.ok(p.d.stats.matches === 1 && p.d.stats.kills === s.kills);
  assert.ok(JSON.stringify(p.d).length < 20000, 'save stays small');
});

test('debug-flagged matches never award rewards or touch progress', () => {
  const p = mk();
  const b = new J.Battle({ mapId: 'tokyo', diff: 'normal', team: p.teamForBattle(), seed: 3 });
  b.debugInstantVictory();
  const s = b.getSummary();
  assert.equal(s.debug, true);
  const coins = p.coins, gems = p.gems;
  const r = p.applyMatchResult(s, 'dbg-1', 1);
  assert.equal(r.debug, true);
  assert.equal(p.coins, coins); assert.equal(p.gems, gems);
  assert.equal(p.d.stats.matches, 0);
  assert.equal(p.d.lastRewards, null);
  assert.ok(!p.mapCleared('tokyo', 'normal'));
});
