/* SaveManager: versioned, validated, corruption-safe localStorage persistence. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance, Config } = JJK;
  const CURRENT_VERSION = 1;

  const DIFFS = ['normal', 'hard', 'special'];
  const START_CHARS = ['yuji', 'panda', 'nobara', 'megumi'];

  function defaults(now) {
    now = now || Date.now();
    const chars = {};
    START_CHARS.forEach((id) => { chars[id] = { level: 1, xp: 0, stars: 0 }; });
    return {
      saveVersion: CURRENT_VERSION,
      createdAt: now,
      updatedAt: now,
      player: { level: 1, xp: 0 },
      currencies: { coins: Balance.coinsStart, gems: Balance.gemsStart },
      characters: chars,
      shards: {},
      loadout: START_CHARS.slice(),
      items: { xpS: 2, xpM: 0, xpL: 0 },
      progress: { maps: {} },
      endless: { bestWave: 0, bestScore: 0, byMap: {} },
      bossRecords: {},
      summon: { pity: {}, lost: {}, total: 0, history: [] },
      shop: { purchases: {} },
      missions: { claimed: {} },
      daily: { day: 0, progress: {}, claimed: {} },
      challenges: { done: {} },
      stats: { kills: 0, bossKills: 0, wins: 0, losses: 0, matches: 0, upgrades: 0, deploys: 0, domains: 0, coinsEarned: 0, gemsEarned: 0, yenEarned: 0, sells: 0, playSeconds: 0 },
      index: { enemies: {}, bosses: {} },
      settings: { master: 0.8, music: 0.5, sfx: 0.8, muted: false, autoStart: false, dmgNumbers: true, shake: true, showRanges: true, showSlots: true, reduced: false, skipSummonAnim: false, lastMap: 'tokyo', lastDiff: 'normal', lastMode: 'story' },
      lastRewards: null,
      flags: {},
    };
  }

  // ---- sanitizers ----
  const intIn = (v, def, min, max) => Util.int(v, def, min, max);
  const boolIn = (v, def) => (typeof v === 'boolean' ? v : def);
  const objIn = (v) => (Util.isObj(v) ? v : {});

  function sanitizeCounts(src, validate) {
    const out = {};
    const o = objIn(src);
    for (const k of Object.keys(o)) {
      if (validate && !validate(k)) continue;
      const n = intIn(o[k], 0, 0, 1e9);
      if (n > 0) out[k] = n;
    }
    return out;
  }
  function sanitizeFlagMap(src, validate) {
    const out = {};
    const o = objIn(src);
    for (const k of Object.keys(o)) { if (o[k] === true && (!validate || validate(k))) out[k] = true; }
    return out;
  }

  /** Validate & sanitise a (possibly hostile / incomplete) save object. Returns a fresh, trusted object. */
  function validate(raw, now) {
    const d = defaults(now);
    if (!Util.isObj(raw)) return d;
    const R = raw;
    const Ch = JJK.Characters;
    const cap = Balance.charLevelCap;

    d.saveVersion = CURRENT_VERSION;
    d.createdAt = intIn(R.createdAt, d.createdAt, 0, 8.64e15);
    d.updatedAt = intIn(R.updatedAt, d.updatedAt, 0, 8.64e15);

    const p = objIn(R.player);
    d.player.level = intIn(p.level, 1, 1, Balance.playerLevelCap);
    d.player.xp = intIn(p.xp, 0, 0, 1e9);

    const cur = objIn(R.currencies);
    d.currencies.coins = intIn(cur.coins, d.currencies.coins, 0, 1e9);
    d.currencies.gems = intIn(cur.gems, d.currencies.gems, 0, 1e7);

    // characters
    if (Util.isObj(R.characters)) {
      d.characters = {};
      for (const id of Object.keys(R.characters)) {
        if (!Ch[id]) continue;
        const c = objIn(R.characters[id]);
        d.characters[id] = { level: intIn(c.level, 1, 1, cap), xp: intIn(c.xp, 0, 0, 1e9), stars: intIn(c.stars, 0, 0, Balance.maxStars) };
      }
    }
    // starter characters are always owned (also fixes saves made before a character became a starter)
    const addedStarters = [];
    START_CHARS.forEach((id) => { if (Ch[id] && !d.characters[id]) { d.characters[id] = { level: 1, xp: 0, stars: 0 }; addedStarters.push(id); } });

    d.shards = sanitizeCounts(R.shards, (k) => !!Ch[k]);

    // loadout: unique, owned, max team size
    const lo = [];
    if (Array.isArray(R.loadout)) {
      for (const id of R.loadout) {
        if (typeof id === 'string' && d.characters[id] && !lo.includes(id) && lo.length < Balance.teamSize) lo.push(id);
      }
    }
    for (const id of addedStarters) if (lo.length < Balance.teamSize && !lo.includes(id)) lo.push(id);
    d.loadout = lo;

    d.items = { xpS: 0, xpM: 0, xpL: 0 };
    const it = objIn(R.items);
    for (const k of Object.keys(d.items)) d.items[k] = intIn(it[k], 0, 0, 1e6);

    // progress
    const maps = objIn(objIn(R.progress).maps);
    for (const mid of Object.keys(maps)) {
      if (!JJK.Maps[mid]) continue;
      const entry = {};
      for (const df of DIFFS) {
        const e = objIn(objIn(maps[mid])[df]);
        if (e.cleared || e.clears || e.bestWave) {
          entry[df] = {
            cleared: !!e.cleared, clears: intIn(e.clears, e.cleared ? 1 : 0, 0, 1e6), bestWave: intIn(e.bestWave, 0, 0, 1000),
            bestTime: intIn(e.bestTime, 0, 0, 1e7), flawless: !!e.flawless,
          };
        }
      }
      d.progress.maps[mid] = entry;
    }

    const en = objIn(R.endless);
    d.endless.bestWave = intIn(en.bestWave, 0, 0, 100000);
    d.endless.bestScore = intIn(en.bestScore, 0, 0, 1e12);
    const bm = objIn(en.byMap);
    for (const mid of Object.keys(bm)) {
      if (!JJK.Maps[mid]) continue;
      d.endless.byMap[mid] = { bestWave: intIn(objIn(bm[mid]).bestWave, 0, 0, 100000), bestScore: intIn(objIn(bm[mid]).bestScore, 0, 0, 1e12) };
    }

    const br = objIn(R.bossRecords);
    for (const id of Object.keys(br)) {
      if (!JJK.Bosses[id]) continue;
      d.bossRecords[id] = { kills: intIn(objIn(br[id]).kills, 0, 0, 1e6), bestTime: intIn(objIn(br[id]).bestTime, 0, 0, 1e7) };
    }

    const sm = objIn(R.summon);
    d.summon.pity = sanitizeCounts(sm.pity);
    d.summon.lost = sanitizeFlagMap(sm.lost);
    d.summon.total = intIn(sm.total, 0, 0, 1e9);
    d.summon.history = Array.isArray(sm.history) ? sm.history.filter((x) => typeof x === 'string' && Ch[x]).slice(-40) : [];

    d.shop.purchases = sanitizeCounts(objIn(R.shop).purchases);
    d.missions.claimed = sanitizeFlagMap(objIn(R.missions).claimed);

    const dy = objIn(R.daily);
    d.daily.day = intIn(dy.day, 0, 0, 1e7);
    d.daily.progress = sanitizeCounts(dy.progress);
    d.daily.claimed = sanitizeFlagMap(dy.claimed);

    d.challenges.done = sanitizeFlagMap(objIn(R.challenges).done);

    const st = objIn(R.stats);
    for (const k of Object.keys(d.stats)) d.stats[k] = intIn(st[k], 0, 0, 1e12);

    d.index.enemies = sanitizeFlagMap(objIn(R.index).enemies);
    d.index.bosses = sanitizeFlagMap(objIn(R.index).bosses);

    const s = objIn(R.settings);
    const D = d.settings;
    D.master = Util.num(s.master, D.master, 0, 1);
    D.music = Util.num(s.music, D.music, 0, 1);
    D.sfx = Util.num(s.sfx, D.sfx, 0, 1);
    D.muted = boolIn(s.muted, D.muted);
    D.autoStart = boolIn(s.autoStart, D.autoStart);
    D.dmgNumbers = boolIn(s.dmgNumbers, D.dmgNumbers);
    D.shake = boolIn(s.shake, D.shake);
    D.showRanges = boolIn(s.showRanges, D.showRanges);
    D.showSlots = boolIn(s.showSlots, D.showSlots);
    D.reduced = boolIn(s.reduced, D.reduced);
    D.skipSummonAnim = boolIn(s.skipSummonAnim, D.skipSummonAnim);
    D.lastMap = JJK.Maps[s.lastMap] ? s.lastMap : D.lastMap;
    D.lastDiff = DIFFS.includes(s.lastDiff) ? s.lastDiff : D.lastDiff;
    D.lastMode = s.lastMode === 'endless' ? 'endless' : 'story';

    d.lastRewards = Util.isObj(R.lastRewards) ? R.lastRewards : null;
    d.flags = sanitizeFlagMap(R.flags);
    return d;
  }

  /** migrations[v] upgrades a save from version v to v+1. Never wipe data blindly. */
  const migrations = {
    // v0 (pre-release flat format) -> v1
    0: (o) => {
      const n = {};
      n.player = { level: o.playerLevel || o.level || 1, xp: o.xp || 0 };
      n.currencies = { coins: o.coins, gems: o.gems };
      n.characters = {};
      (Array.isArray(o.owned) ? o.owned : []).forEach((id) => { n.characters[id] = { level: 1, xp: 0, stars: 0 }; });
      n.loadout = o.team || o.loadout || [];
      n.settings = o.settings || {};
      n.saveVersion = 1;
      return n;
    },
  };

  function migrate(obj) {
    if (!Util.isObj(obj)) return obj;
    let v = Number.isFinite(obj.saveVersion) ? Math.floor(obj.saveVersion) : 0;
    if (v < 0) v = 0;
    let o = obj;
    while (v < CURRENT_VERSION) {
      const fn = migrations[v];
      if (!fn) break;
      o = fn(o);
      v = (o && o.saveVersion) || v + 1;
    }
    return o;
  }

  class SaveManager {
    constructor(storage) {
      this.storage = storage || new Util.MemoryStorage();
      this.key = Config.SAVE_KEY;
      this.data = defaults();
      this.status = 'new';
      this.lastError = null;
      this.writeFailures = 0;
    }

    _read(key) { try { return this.storage.getItem(key); } catch (e) { this.lastError = e; return null; } }
    _write(key, val) { try { this.storage.setItem(key, val); return true; } catch (e) { this.lastError = e; return false; } }

    /** Load progress. NEVER throws: corrupt/missing/old saves fall back safely. */
    load() {
      const raw = this._read(this.key);
      if (raw === null || raw === undefined || raw === '') {
        // maybe a previous-slot backup exists
        const prev = this._read(this.key + '_prev');
        if (prev) { const r = this._tryParse(prev); if (r) { this.data = r; this.status = 'recovered'; return this.data; } }
        this.data = defaults(); this.status = 'new'; return this.data;
      }
      const parsed = this._tryParse(raw);
      if (parsed) {
        const wasOld = this._rawVersion !== CURRENT_VERSION;
        this.data = parsed;
        this.status = wasOld ? 'migrated' : 'loaded';
        if (wasOld) { this._write(this.key + '_backup_v' + this._rawVersion, raw); this.save(); }
        return this.data;
      }
      // main slot corrupt: keep a copy for forensics, try previous slot
      this._write(this.key + '_corrupt', raw);
      const prev = this._read(this.key + '_prev');
      const p2 = prev ? this._tryParse(prev) : null;
      if (p2) { this.data = p2; this.status = 'recovered'; return this.data; }
      this.data = defaults(); this.status = 'corrupt-reset';
      return this.data;
    }

    _tryParse(str) {
      try {
        const obj = JSON.parse(str);
        if (!Util.isObj(obj)) return null;
        this._rawVersion = Number.isFinite(obj.saveVersion) ? Math.floor(obj.saveVersion) : 0;
        if (this._rawVersion > CURRENT_VERSION) { /* newer save from a future build: validate conservatively */ obj.saveVersion = CURRENT_VERSION; }
        return validate(migrate(obj));
      } catch (e) { this.lastError = e; return null; }
    }

    save() {
      try {
        this.data.updatedAt = Date.now();
        const json = JSON.stringify(this.data);
        const old = this._read(this.key);
        if (old) this._write(this.key + '_prev', old);
        const ok = this._write(this.key, json);
        if (!ok) this.writeFailures++;
        return ok;
      } catch (e) { this.lastError = e; this.writeFailures++; return false; }
    }

    migrate(obj) { return migrate(obj); }
    validate(obj) { return validate(obj); }
    defaults() { return defaults(); }

    resetProgress() {
      const raw = this._read(this.key);
      if (raw) this._write(this.key + '_reset_backup', raw);
      this.data = defaults();
      this.status = 'new';
      this.save();
      return this.data;
    }
  }

  SaveManager.CURRENT_VERSION = CURRENT_VERSION;
  SaveManager.defaults = defaults;
  SaveManager.validate = validate;
  SaveManager.migrate = migrate;
  SaveManager.START_CHARS = START_CHARS;
  JJK.SaveManager = SaveManager;
})(typeof window !== 'undefined' ? window : globalThis);
