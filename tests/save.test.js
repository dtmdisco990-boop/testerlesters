const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./load');

function fresh() {
  const JJK = loadGame();
  const storage = new JJK.Util.MemoryStorage();
  const sm = new JJK.SaveManager(storage);
  return { JJK, storage, sm };
}

test('new game gets defaults with starter roster', () => {
  const { sm } = fresh();
  const d = sm.load();
  assert.equal(sm.status, 'new');
  assert.deepEqual(Object.keys(d.characters).sort(), ['megumi', 'nobara', 'panda', 'yuji']);
  assert.deepEqual(d.loadout, ['yuji', 'panda', 'nobara', 'megumi']);
  assert.equal(d.saveVersion, 1);
  assert.ok(d.currencies.gems >= 100);
});

test('save then load round-trips', () => {
  const { JJK, storage, sm } = fresh();
  sm.load();
  sm.data.currencies.coins = 12345;
  sm.data.characters.megumi = { level: 7, xp: 30, stars: 2 };
  sm.data.settings.master = 0.33;
  assert.ok(sm.save());
  const sm2 = new JJK.SaveManager(storage);
  const d = sm2.load();
  assert.equal(sm2.status, 'loaded');
  assert.equal(d.currencies.coins, 12345);
  assert.deepEqual(d.characters.megumi, { level: 7, xp: 30, stars: 2 });
  assert.equal(d.settings.master, 0.33);
});

test('corrupted JSON falls back safely and keeps a forensic copy', () => {
  const { JJK, storage, sm } = fresh();
  storage.setItem(JJK.Config.SAVE_KEY, '{not json!!');
  const d = sm.load();
  assert.equal(sm.status, 'corrupt-reset');
  assert.ok(d.characters.yuji);
  assert.equal(storage.getItem(JJK.Config.SAVE_KEY + '_corrupt'), '{not json!!');
});

test('corrupted main slot recovers from previous slot', () => {
  const { JJK, storage, sm } = fresh();
  sm.load();
  sm.data.currencies.coins = 777;
  sm.save();
  sm.data.currencies.coins = 888;
  sm.save(); // _prev now has 777
  storage.setItem(JJK.Config.SAVE_KEY, 'garbage');
  const sm2 = new JJK.SaveManager(storage);
  const d = sm2.load();
  assert.equal(sm2.status, 'recovered');
  assert.equal(d.currencies.coins, 777);
});

test('hostile / invalid values are sanitised', () => {
  const { JJK, storage, sm } = fresh();
  const bad = {
    saveVersion: 1,
    currencies: { coins: -50, gems: 'lots' },
    player: { level: 9999, xp: NaN },
    characters: { yuji: { level: 500, xp: -3, stars: 99 }, notacharacter: { level: 3 }, gojo: 'nope' },
    loadout: ['yuji', 'yuji', 'gojo', 'ghost', 42, 'panda', 'nobara', 'megumi'],
    settings: { master: 7, music: 'x', muted: 'yes', lastMap: 'nowhere', lastDiff: 'insane' },
    shards: { yuji: 20.7, nothere: 5, gojo: -4 },
    progress: { maps: { tokyo: { normal: { cleared: true, clears: 'many' } }, fake: {} } },
    stats: { kills: 'abc' },
  };
  storage.setItem(JJK.Config.SAVE_KEY, JSON.stringify(bad));
  const d = sm.load();
  assert.equal(d.currencies.coins, 0);
  assert.equal(d.currencies.gems, 100);
  assert.equal(d.player.level, JJK.Balance.playerLevelCap);
  assert.equal(d.player.xp, 0);
  assert.equal(d.characters.yuji.level, JJK.Balance.charLevelCap);
  assert.equal(d.characters.yuji.stars, JJK.Balance.maxStars);
  assert.equal(d.characters.yuji.xp, 0);
  assert.ok(!d.characters.notacharacter);
  assert.ok(d.characters.gojo, 'gojo with junk value is still a valid owned id (sanitised)');
  assert.deepEqual(d.loadout, ['yuji', 'gojo', 'panda', 'nobara', 'megumi'].filter((id) => d.characters[id]).slice(0, 6));
  assert.ok(d.loadout.length <= 6);
  assert.equal(new Set(d.loadout).size, d.loadout.length);
  assert.equal(d.settings.master, 1);
  assert.equal(d.settings.muted, false);
  assert.equal(d.settings.lastMap, 'tokyo');
  assert.equal(d.settings.lastDiff, 'normal');
  assert.equal(d.shards.yuji, 20);
  assert.ok(!d.shards.nothere && !d.shards.gojo);
  assert.equal(d.progress.maps.tokyo.normal.cleared, true);
  assert.ok(!d.progress.maps.fake);
  assert.equal(d.stats.kills, 0);
});

test('old (v0) save migrates without losing progress', () => {
  const { JJK, storage, sm } = fresh();
  const legacy = { coins: 4321, gems: 55, owned: ['yuji', 'megumi', 'gojo'], playerLevel: 6, team: ['gojo', 'yuji'], settings: { master: 0.2 } };
  storage.setItem(JJK.Config.SAVE_KEY, JSON.stringify(legacy));
  const d = sm.load();
  assert.equal(sm.status, 'migrated');
  assert.equal(d.currencies.coins, 4321);
  assert.equal(d.currencies.gems, 55);
  assert.equal(d.player.level, 6);
  assert.ok(d.characters.megumi && d.characters.gojo);
  assert.deepEqual(d.loadout.slice(0, 2), ['gojo', 'yuji']);
  assert.ok(['panda', 'nobara'].every((id) => d.characters[id]), 'missing starters granted');
  assert.equal(d.settings.master, 0.2);
  assert.equal(d.saveVersion, 1);
  assert.ok(storage.getItem(JJK.Config.SAVE_KEY + '_backup_v0'), 'old save backed up before migration');
});

test('save from a future version still loads conservatively', () => {
  const { JJK, storage, sm } = fresh();
  storage.setItem(JJK.Config.SAVE_KEY, JSON.stringify({ saveVersion: 99, currencies: { coins: 10, gems: 2 }, newFeature: { x: 1 } }));
  const d = sm.load();
  assert.equal(d.currencies.coins, 10);
  assert.equal(d.saveVersion, 1);
});

test('storage that throws on write does not crash the game', () => {
  const { JJK, sm } = fresh();
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() {} };
  const sm2 = new JJK.SaveManager(bad);
  const d = sm2.load();
  assert.ok(d.characters.yuji);
  assert.equal(sm2.save(), false);
  assert.ok(sm2.writeFailures >= 1);
});

test('resetProgress wipes progress but keeps a backup', () => {
  const { JJK, storage, sm } = fresh();
  sm.load();
  sm.data.currencies.coins = 99999;
  sm.save();
  sm.resetProgress();
  assert.notEqual(sm.data.currencies.coins, 99999);
  assert.ok(storage.getItem(JJK.Config.SAVE_KEY + '_reset_backup').includes('99999'));
});

test('empty character table is repaired so the player is never stuck', () => {
  const { JJK, storage, sm } = fresh();
  storage.setItem(JJK.Config.SAVE_KEY, JSON.stringify({ saveVersion: 1, characters: {} }));
  const d = sm.load();
  assert.ok(d.characters.yuji);
});

test('an older save missing a (new) starter gets it granted and added to the team if there is room', () => {
  const { sm } = fresh();
  const d = sm.validate({ saveVersion: 1, characters: { yuji: { level: 4, xp: 0, stars: 1 }, panda: { level: 1, xp: 0, stars: 0 }, nobara: { level: 2, xp: 0, stars: 0 } }, loadout: ['yuji', 'panda', 'nobara'] });
  assert.ok(d.characters.megumi, 'megumi granted');
  assert.equal(d.characters.yuji.level, 4, 'existing progress kept');
  assert.deepEqual(d.loadout, ['yuji', 'panda', 'nobara', 'megumi']);
});
