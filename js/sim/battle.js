/* Battle simulation: headless, deterministic, event-driven. Rendering/UI subscribe to battle.events. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;
  const TILE = Balance.TILE, FY = Balance.FIELD_Y, COLS = Balance.COLS, ROWS = Balance.ROWS;
  const tx = (c) => (c + 0.5) * TILE;
  const ty = (r) => FY + (r + 0.5) * TILE;
  const EMPTY = {};
  const TARGET_MODES = ['first', 'last', 'strongest', 'weakest', 'closest'];

  // ---------------------------------------------------------------- geometry
  class PathData {
    constructor(waypoints) {
      this.pts = waypoints.map((p) => ({ x: tx(p[0]), y: ty(p[1]) }));
      this.cum = [0];
      for (let i = 1; i < this.pts.length; i++) {
        this.cum.push(this.cum[i - 1] + Math.hypot(this.pts[i].x - this.pts[i - 1].x, this.pts[i].y - this.pts[i - 1].y));
      }
      this.length = this.cum[this.cum.length - 1];
    }
    posAt(d, out) {
      const pts = this.pts, cum = this.cum;
      if (d <= 0) { out.x = pts[0].x; out.y = pts[0].y; return out; }
      if (d >= this.length) { const l = pts[pts.length - 1]; out.x = l.x; out.y = l.y; return out; }
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1], t = seg > 0 ? (d - cum[i - 1]) / seg : 0;
      out.x = a.x + (b.x - a.x) * t;
      out.y = a.y + (b.y - a.y) * t;
      return out;
    }
  }

  const geoCache = {};
  function inRect(r, c, row) { return c >= r.c && c < r.c + r.w && row >= r.r && row < r.r + r.h; }
  const Geometry = {
    tx, ty,
    get(mapId) {
      if (geoCache[mapId]) return geoCache[mapId];
      const map = JJK.Maps[mapId];
      const ground = map.paths.map((p) => new PathData(p));
      const air = map.air.map((p) => new PathData(p));
      const pathTiles = new Set();
      const tileList = [];
      for (const wp of map.paths) {
        for (let i = 1; i < wp.length; i++) {
          const a = wp[i - 1], b = wp[i];
          const c0 = Math.min(a[0], b[0]), c1 = Math.max(a[0], b[0]), r0 = Math.min(a[1], b[1]), r1 = Math.max(a[1], b[1]);
          for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
            if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
            const k = c + ',' + r;
            if (!pathTiles.has(k)) { pathTiles.add(k); tileList.push([c, r]); }
          }
        }
      }
      const slots = new Map();
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const k = c + ',' + r;
        if (pathTiles.has(k)) continue;
        if (map.blocked.some((b) => inRect(b, c, r))) continue;
        if (map.elevated.some((e) => inRect(e, c, r))) { slots.set(k, { c, r, type: 'E', x: tx(c), y: ty(r) }); continue; }
        let near = false;
        for (let i = 0; i < tileList.length && !near; i++) if (Math.max(Math.abs(tileList[i][0] - c), Math.abs(tileList[i][1] - r)) <= 2) near = true;
        if (near) slots.set(k, { c, r, type: 'G', x: tx(c), y: ty(r) });
      }
      const g = { ground, air, pathTiles, slots };
      geoCache[mapId] = g;
      return g;
    },
  };

  // ---------------------------------------------------------------- the battle
  class Battle {
    /**
     * opts: { mapId, diff, mode:'story'|'endless', team:[{id, level, stars}], seed, startYen? }
     */
    constructor(opts) {
      const map = JJK.Maps[opts.mapId];
      if (!map) throw new Error('Unknown map: ' + opts.mapId);
      if (!Array.isArray(opts.team) || opts.team.length === 0) throw new Error('Team is empty: choose at least one unit.');
      this.map = map;
      this.mapId = map.id;
      this.diffId = Balance.difficulty[opts.diff] ? opts.diff : 'normal';
      this.diff = Balance.difficulty[this.diffId];
      this.mode = opts.mode === 'endless' ? 'endless' : 'story';
      this.endless = this.mode === 'endless';
      this.geo = Geometry.get(map.id);
      this.events = new Util.Emitter();
      this.rng = Util.makeRng(opts.seed == null ? 12345 : opts.seed);

      this.rules = { speedMul: 1, killYenMul: 1, maxDeployed: Balance.maxDeployed, rangeMul: 1, regenAdd: 0, waveBonusMul: 1, eliteFromWave: null };
      if (this.diffId === 'special' && !this.endless) Object.assign(this.rules, map.special.rules);

      this.sellRefund = this.diff.sellRefund;
      this.yen = opts.startYen != null ? opts.startYen : Math.floor(map.startYen * this.diff.startYenMult);
      this.baseMax = this.diff.baseHp;
      this.baseHp = this.baseMax;
      this.wave = 0;
      this.totalWaves = this.endless ? Infinity : map.waves;
      this.waves = this.endless ? null : JJK.Waves.generate(map, this.diff, this.rules);
      this.waveSpec = null;
      this.spawnIdx = 0;
      this.waveTime = 0;
      this.pendingBonus = [];
      this.state = 'prep'; // prep | wave | intermission | victory | defeat
      this.over = false;
      this.time = 0;
      this.autoStart = false;
      this.autoTimer = 0;

      this.enemies = [];
      this.units = [];
      this.summons = [];
      this.projectiles = [];
      this.hazards = [];
      this.zones = [];
      this.timers = [];
      this.buffs = [];
      this.gDmg = 0;
      this.gSpd = 0;
      this.domain = null;
      this.grid = new Map();
      this.nextId = 1;
      this._projPool = [];
      this._scratch = [];
      this._scratch2 = [];
      this.crowBonus = 0;
      this.hakariMisses = 0;
      this.mutator = null;
      this.score = 0;
      this.hpKilled = 0;
      this.clearedWaves = 0;

      this.stats = {
        kills: 0, yenEarned: 0, baseLost: 0, sold: 0, upgrades: 0, deploys: 0, domains: 0, disabled: 0,
        bossKills: {}, bossTimes: {}, bossSpawnTime: {}, enemiesSeen: {}, bossesSeen: {}, leaks: 0,
      };
      this.deployedIds = new Set();

      // team roster (meta levels feed combat modifiers)
      this.roster = {};
      this.teamOrder = [];
      for (const t of opts.team) {
        const def = JJK.Characters[t.id];
        if (!def || this.roster[t.id]) continue;
        const stars = Util.int(t.stars, 0, 0, Balance.maxStars);
        this.roster[t.id] = {
          id: t.id, def, level: Util.int(t.level, 1, 1, Balance.charLevelCap), stars,
          cost: Math.round(def.cost * (stars >= 5 ? 1 - Balance.starCostDiscountAt5 : 1)),
        };
        this.teamOrder.push(t.id);
      }
      if (!this.teamOrder.length) throw new Error('Team has no valid characters.');
      // a team must always be able to deploy its cheapest member at the start, otherwise an all-expensive loadout is unwinnable
      if (opts.startYen == null) this.yen = Math.max(this.yen, Math.min.apply(null, this.teamOrder.map((id) => this.roster[id].cost)));
      this.synergy = { students: 0, phys: 0, supports: 0, domainUsers: 0 };
    }

    // ------------------------------------------------------------ utility
    fx(type, data) { this.events.emit('fx', Object.assign({ type }, data)); }
    schedule(delay, fn) { this.timers.push({ t: this.time + delay, fn }); }
    uid() { return this.nextId++; }
    getUnit(uid) { for (let i = 0; i < this.units.length; i++) if (this.units[i].uid === uid) return this.units[i]; return null; }
    unitAt(c, r) { return this.grid.get(c + ',' + r) || null; }
    deployCost(id) { return this.roster[id] ? this.roster[id].cost : Infinity; }
    placedCount(id) { let n = 0; for (const u of this.units) if (u.id === id) n++; return n; }
    maxPlace(id) { return Balance.rarity[this.roster[id].def.rarity].maxPlace; }
    wavesLeft() { return this.endless ? Infinity : this.totalWaves - this.wave; }

    addYen(n, x, y, silent) {
      n = Math.round(n);
      if (n <= 0) return;
      this.yen += n;
      this.stats.yenEarned += n;
      if (!silent) this.events.emit('yen', { amount: n, x, y });
    }

    // ------------------------------------------------------------ placement
    canPlace(id, c, r) {
      if (this.over) return { ok: false, reason: 'Battle is over' };
      const ro = this.roster[id];
      if (!ro) return { ok: false, reason: 'Not on your team' };
      const slot = this.geo.slots.get(c + ',' + r);
      if (!slot) return { ok: false, reason: this.geo.pathTiles.has(c + ',' + r) ? 'Cannot build on the path' : 'Not a deployment zone' };
      if (this.grid.has(c + ',' + r)) return { ok: false, reason: 'Tile occupied' };
      const place = ro.def.place;
      if (place === 'ground' && slot.type !== 'G') return { ok: false, reason: 'Ground units only' };
      if (place === 'elevated' && slot.type !== 'E') return { ok: false, reason: 'Elevated only' };
      if (this.units.length >= this.rules.maxDeployed) return { ok: false, reason: 'Deployment limit (' + this.rules.maxDeployed + ')' };
      if (this.placedCount(id) >= this.maxPlace(id)) return { ok: false, reason: 'Placement limit reached (' + this.maxPlace(id) + ')' };
      if (this.yen < ro.cost) return { ok: false, reason: 'Not enough Yen' };
      return { ok: true, slot };
    }

    place(id, c, r) {
      const chk = this.canPlace(id, c, r);
      if (!chk.ok) return { ok: false, reason: chk.reason };
      const ro = this.roster[id];
      const def = ro.def;
      this.yen -= ro.cost;
      const u = {
        uid: this.uid(), id, def, kit: JJK.Kits[def.kit] || JJK.Kits._default, c, r, x: chk.slot.x, y: chk.slot.y,
        onElevated: chk.slot.type === 'E', level: 1, invested: ro.cost, targeting: def.defaultTargeting,
        cdT: 0.35, disabledT: 0, kills: 0, damageDealt: 0, hits: 0, flags: {}, removed: false,
        synDmg: 0, synSpd: 0, buffSpdT: 0, buffSpdAmt: 0, auraT: 0, auraAmt: 0, domainCd: 0, immuneDisable: def.id === 'panda',
        placedAt: this.time, k: {}, // k = kit private state
        dmg: 0, baseSpa: 1, range: 1, rangePx: 64, canAir: false, canGround: true,
      };
      this.units.push(u);
      this.grid.set(c + ',' + r, u);
      this.deployedIds.add(id);
      this.stats.deploys++;
      this.recalcUnit(u);
      this.recalcSynergy();
      if (u.kit.init) u.kit.init(u, this);
      this.events.emit('unitPlaced', { unit: u });
      return { ok: true, unit: u };
    }

    recalcUnit(u) {
      const def = u.def, ro = this.roster[u.id], base = def.base;
      let dmg = base.dmg, spa = base.spa, range = base.range;
      const flags = Object.assign({}, def.flags);
      for (let i = 0; i < u.level - 1; i++) {
        const up = def.upgrades[i];
        dmg *= up.dmg; spa *= up.spa; range += up.range;
        Object.assign(flags, up.flags);
      }
      if (flags.pierce === undefined) flags.pierce = base.pierce || 0;
      dmg *= 1 + (ro.level - 1) * Balance.charDmgPerLevel + ro.stars * Balance.starDmg;
      if (ro.stars >= 3) range += Balance.starRangeAt3;
      if (u.onElevated) range += Balance.elevatedRange;
      range *= this.rules.rangeMul;
      u.dmg = dmg; u.baseSpa = spa; u.range = range; u.rangePx = range * TILE; u.flags = flags;
      u.canAir = def.targets !== 'ground' || !!flags.air;
      u.canGround = def.targets !== 'air';
      u.dtype = base.dtype;
    }

    recalcSynergy() {
      let students = 0, phys = 0, supports = 0, domainUsers = 0;
      for (const u of this.units) {
        const tr = u.def.traits;
        if (tr.includes('Student')) students++;
        if (tr.includes('Physical Specialist')) phys++;
        if (tr.includes('Support')) supports++;
        if (tr.includes('Domain User')) domainUsers++;
      }
      this.synergy = { students, phys, supports, domainUsers };
      for (const u of this.units) {
        const tr = u.def.traits;
        let spd = 0, dmg = 0;
        if (tr.includes('Student')) spd += students >= 5 ? 0.14 : students >= 3 ? 0.08 : 0;
        if (tr.includes('Physical Specialist')) dmg += phys >= 3 ? 0.15 : phys >= 2 ? 0.08 : 0;
        dmg += Math.min(3, supports - (tr.includes('Support') ? 1 : 0)) * 0.04;
        u.synSpd = spd; u.synDmg = dmg;
      }
      let cb = 0;
      for (const u of this.units) if (u.def.kit === 'meimei') cb = Math.max(cb, u.flags.killYenBonus || 0);
      this.crowBonus = cb;
    }

    upgradeCost(u) {
      if (u.level >= u.def.maxLevel) return null;
      return u.def.upgrades[u.level - 1].cost;
    }

    upgrade(uid) {
      const u = typeof uid === 'object' ? uid : this.getUnit(uid);
      if (!u || u.removed || this.over) return { ok: false, reason: 'No such unit' };
      const cost = this.upgradeCost(u);
      if (cost == null) return { ok: false, reason: 'Max level' };
      if (this.yen < cost) return { ok: false, reason: 'Not enough Yen' };
      this.yen -= cost;
      u.invested += cost;
      u.level++;
      this.stats.upgrades++;
      this.recalcUnit(u);
      this.recalcSynergy();
      if (u.flags.domain && u.domainCd === 0 && !u.k.domainInit) { u.k.domainInit = true; u.domainCd = 20; }
      if (u.kit.onUpgrade) u.kit.onUpgrade(u, this);
      this.events.emit('unitUpgraded', { unit: u, up: u.def.upgrades[u.level - 2] });
      return { ok: true, unit: u };
    }

    sellValue(u) { return Math.floor(u.invested * this.sellRefund); }

    sell(uid) {
      const u = typeof uid === 'object' ? uid : this.getUnit(uid);
      if (!u || u.removed) return { ok: false, reason: 'No such unit' };
      const val = this.sellValue(u);
      this.removeUnit(u);
      this.yen += val;
      this.stats.sold++;
      this.events.emit('unitSold', { unit: u, value: val });
      return { ok: true, value: val };
    }

    removeUnit(u) {
      u.removed = true;
      const i = this.units.indexOf(u);
      if (i >= 0) this.units.splice(i, 1);
      this.grid.delete(u.c + ',' + u.r);
      // release anything the unit was holding; remove its summons
      if (u.kit.onRemove) u.kit.onRemove(u, this);
      for (let k = this.summons.length - 1; k >= 0; k--) if (this.summons[k].owner === u) this.summons.splice(k, 1);
      if (this.domain && this.domain.owner === u) this.endDomain(true);
      this.recalcSynergy();
    }

    setTargeting(uid, mode) {
      const u = typeof uid === 'object' ? uid : this.getUnit(uid);
      if (!u || !u.def.targeting.includes(mode)) return false;
      u.targeting = mode;
      return true;
    }

    // ------------------------------------------------------------ multipliers
    dmgMul(u) { return 1 + u.synDmg + this.gDmg + (u.auraT > 0 ? u.auraAmt : 0); }
    spdMul(u) {
      let m = 1 + u.synSpd + this.gSpd;
      if (u.buffSpdT > 0) m += u.buffSpdAmt;
      if (u.kit.spdBonus) m += u.kit.spdBonus(u, this);
      return m < 0.2 ? 0.2 : m;
    }

    // ------------------------------------------------------------ waves
    canStartWave() {
      if (this.over) return false;
      if (this.state !== 'prep' && this.state !== 'intermission' && this.state !== 'wave') return false;
      if (this.waveSpec && this.spawnIdx < this.waveSpec.entries.length) return false; // still spawning
      return this.wave < this.totalWaves;
    }

    startWave() {
      if (!this.canStartWave()) return false;
      const n = this.wave + 1;
      const spec = this.endless ? JJK.Waves.endless(this.map, n, this.diff) : this.waves[n - 1];
      this.wave = n;
      this.waveSpec = spec;
      this.spawnIdx = 0;
      this.waveTime = 0;
      this.mutator = spec.mutator ? JJK.WaveMutators[spec.mutator] : null;
      this.pendingBonus.push({ n, bonus: Math.round(spec.bonus * this.rules.waveBonusMul) });
      this.state = 'wave';
      this.autoTimer = 0;
      for (const u of this.units) if (u.kit.onWaveStart) u.kit.onWaveStart(u, this);
      this.events.emit('wave', { n, spec, label: spec.label, mutator: this.mutator, boss: spec.boss });
      return true;
    }

    spawnEnemy(typeId, o) {
      o = o || EMPTY;
      const isBoss = !!JJK.Bosses[typeId];
      const def = isBoss ? JJK.Bosses[typeId] : JJK.Enemies[typeId];
      if (!def) throw new Error('Unknown enemy: ' + typeId);
      const wave = o.wave || Math.max(1, this.wave);
      const lane = o.lane || 0;
      const air = !!def.air;
      const pathSet = air ? this.geo.air : this.geo.ground;
      const path = pathSet[Math.min(lane, pathSet.length - 1)];
      const waveScale = this.endless ? JJK.Waves.endlessHpScale(wave) : Balance.hpScale(wave);
      const mut = o.mutator !== undefined ? o.mutator : this.mutator;
      const elite = !!o.elite && !isBoss;
      const mod = elite && o.mod ? JJK.EliteMods[o.mod] : null;

      let hp = def.hp;
      if (isBoss) hp *= (o.hpMult || 1) * this.diff.hpMult;
      else hp *= waveScale * this.diff.hpMult * (this.map.waveCfg.hpMult || 1);
      if (elite) hp *= Balance.eliteHpMult * (mod ? mod.hp : 1);
      if (mut && mut.hp) hp *= mut.hp;
      hp = Math.max(1, Math.round(hp));
      let shield = def.shield ? Math.round(def.shield * (isBoss ? 1 : waveScale * this.diff.hpMult) * (elite ? 1.5 : 1)) : 0;

      let speed = def.speed * this.rules.speedMul * this.diff.speedMult;
      if (elite) speed *= Balance.eliteSpeedMult;
      if (mod && mod.speed) speed *= mod.speed;
      if (mut && mut.speed) speed *= mut.speed;
      if (this.waveSpec && this.waveSpec.speedBonus && !isBoss) speed *= 1 + this.waveSpec.speedBonus;

      let armor = def.armor || 0;
      if (mod && mod.armorAdd) armor += mod.armorAdd;
      if (mut && mut.armorAdd) armor += mut.armorAdd;

      let yen = def.yen * (isBoss ? 1 : 1 + Balance.killYenWaveGrowth * (wave - 1)) * this.diff.yenMult * this.rules.killYenMul * Balance.killYenMult;
      if (elite) yen *= Balance.eliteYenMult;
      if (mut && mut.yen) yen *= mut.yen;

      const e = {
        id: this.uid(), type: typeId, def, boss: isBoss, elite, mod: o.mod || null, air, lane, path, pathLen: path.length,
        dist: o.dist || 0, x: 0, y: 0, hp, maxHp: hp, shield, shieldMax: shield, armor, cursedRes: 0,
        speed, yen: Math.round(yen), leak: def.leak, size: def.size * (elite ? 1.15 : 1), wave,
        alive: true, stunT: 0, slowT: 0, slowAmt: 0, rootT: 0, markStacks: 0, markT: 0, markVuln: 0.05, vulnT: 0, vulnAmt: 0,
        abStacks: 0, abAmt: 0, abT: 0, nullT: 0, ccImmuneT: 0, lastHit: -99, wardUntil: -1,
        regen: (def.regen || 0) + (mut && mut.regenAdd ? mut.regenAdd : 0) + this.rules.regenAdd,
        ward: (def.ward || 0) + (mod && mod.ward ? mod.ward : 0),
        hexT: def.hexCd ? def.hexCd * (0.4 + 0.6 * this.rng.next()) : 0,
        heldBy: 0, holdUntil: 0, breakawayUntil: 0, crowMark: false, invulnT: 0, speedMul: 1, armorBonus: 0,
        spawnTime: this.time, ai: null, owner: o.owner || 0,
      };
      path.posAt(e.dist, e);
      if (isBoss) {
        e.knockImmune = !!def.knockImmune;
        const AI = JJK.BossAI && JJK.BossAI[def.ai];
        if (AI) { e.ai = {}; AI.init(this, e); }
        this.stats.bossSpawnTime[typeId] = this.time;
      }
      if (elite) e.knockImmune = true;
      this.enemies.push(e);
      this.stats.enemiesSeen[typeId] = true;
      if (isBoss) this.stats.bossesSeen[typeId] = true;
      this.events.emit('spawn', { enemy: e });
      if (isBoss && !o.silent) this.events.emit('bossSpawn', { enemy: e });
      return e;
    }

    // ------------------------------------------------------------ status
    stun(e, dur) {
      if (!e.alive || e.ccImmuneT > 0 || (e.def.stunImmune)) return false;
      dur *= 1 - (e.def.ccResist || 0);
      if (dur <= 0.05) return false;
      if (dur > e.stunT) e.stunT = dur;
      return true;
    }
    slow(e, amt, dur) {
      if (!e.alive) return;
      dur *= 1 - (e.def.ccResist || 0) * 0.5;
      if (e.boss) amt *= 0.75;
      amt = Math.min(amt, Balance.maxSlow);
      if (amt >= e.slowAmt || e.slowT <= 0) e.slowAmt = e.slowT > 0 ? Math.max(e.slowAmt, amt) : amt;
      if (dur > e.slowT) e.slowT = dur;
    }
    root(e, dur) { if (e.alive && dur > e.rootT) e.rootT = dur; }
    knockback(e, tiles) {
      if (!e.alive || e.knockImmune) return false;
      e.dist = Math.max(0, e.dist - tiles * TILE);
      e.path.posAt(e.dist, e);
      return true;
    }
    mark(e, max, vuln, dur) {
      e.markStacks = Math.min(max, e.markStacks + 1);
      e.markVuln = vuln;
      e.markT = dur || 6;
    }
    vulnerable(e, amt, dur) { e.vulnAmt = Math.max(amt, e.vulnT > 0 ? e.vulnAmt : 0); e.vulnT = Math.max(e.vulnT, dur); }
    armorBreak(e, amt, max, dur) { e.abAmt = amt; e.abStacks = Math.min(max, e.abStacks + 1); e.abT = dur; }
    nullify(e, dur) { e.nullT = Math.max(e.nullT, dur); }

    // ------------------------------------------------------------ damage
    damage(e, amount, o) {
      if (!e.alive || !(amount > 0)) return 0;
      o = o || EMPTY;
      const type = o.type || 'phys';
      let d = amount;
      if (e.invulnT > 0) d = 0;
      let vuln = e.vulnAmt;
      if (e.markStacks > 0) vuln += e.markStacks * e.markVuln;
      d *= 1 + vuln;
      if (e.ai && e.ai.mod) d *= e.ai.mod(this, e, o);
      if (e.wardUntil > this.time && e.nullT <= 0 && !o.ignoreWard) d *= 1 - Balance.wardReduction;
      if (type === 'phys') {
        let a = e.armor + e.armorBonus - e.abStacks * e.abAmt - (o.pierce || 0);
        a = a < 0 ? 0 : a > 0.9 ? 0.9 : a;
        d *= 1 - a;
      } else if (type === 'cursed') {
        d *= 1 - e.cursedRes;
      }
      if (d < Balance.minDamage && e.invulnT <= 0) d = Balance.minDamage;
      let dealt = d;
      if (e.shield > 0 && !o.pierceShield) {
        const ab = Math.min(e.shield, d);
        e.shield -= ab; d -= ab;
        if (e.shield <= 0) { e.shield = 0; this.fx('shieldBreak', { x: e.x, y: e.y }); }
      }
      e.hp -= d;
      e.lastHit = this.time;
      if (o.src) o.src.damageDealt += dealt;
      this.hpKilled += d;
      this.events.emit('hit', { x: e.x, y: e.y, dmg: dealt, crit: !!o.crit, kind: o.kind || 'hit', type, enemy: e, src: o.src || null });
      if (e.ai && e.ai.onHit) e.ai.onHit(this, e, dealt, o);
      if (e.hp <= 0) this.kill(e, o.src);
      return dealt;
    }

    aoe(x, y, rPx, amount, o) {
      o = o || EMPTY;
      const air = o.air !== false, ground = o.ground !== false, ex = o.exclude;
      const r2 = rPx * rPx;
      let n = 0;
      const list = this.enemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive || e === ex || (e.air ? !air : !ground)) continue;
        const rr = rPx + e.size * 0.3;
        if (Util.dist2(x, y, e.x, e.y) <= rr * rr || Util.dist2(x, y, e.x, e.y) <= r2) { this.damage(e, amount, o); n++; }
      }
      return n;
    }

    lineHit(x1, y1, x2, y2, widthPx, amount, o, cb) {
      o = o || EMPTY;
      const air = o.air !== false, ground = o.ground !== false;
      const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1;
      let n = 0;
      const list = this.enemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive || (e.air ? !air : !ground)) continue;
        let t = ((e.x - x1) * dx + (e.y - y1) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = x1 + dx * t, py = y1 + dy * t;
        const w = widthPx / 2 + e.size * 0.3;
        if (Util.dist2(px, py, e.x, e.y) <= w * w) { this.damage(e, amount, o); if (cb) cb(e); n++; }
      }
      return n;
    }

    kill(e, src) {
      if (!e.alive) return;
      e.alive = false;
      e.hp = 0;
      let yen = e.yen;
      if (e.crowMark && this.crowBonus > 0) yen = Math.round(yen * (1 + this.crowBonus));
      this.addYen(yen, e.x, e.y);
      this.stats.kills++;
      this.score += e.boss ? 1500 : e.elite ? 40 : 10;
      if (src) src.kills++;
      if (e.heldBy) { /* released automatically when panda ticks */ }
      if (e.def.split && !this.over) {
        for (let k = 0; k < e.def.split.n; k++) {
          const c = this.spawnEnemy(e.def.split.type, { lane: e.lane, dist: Math.max(0, e.dist - k * 14), wave: e.wave, mutator: null });
          c.markStacks = 0;
        }
      }
      if (e.boss) this.onBossDeath(e);
      this.events.emit('kill', { enemy: e, src, yen });
    }

    onBossDeath(e) {
      const id = e.type;
      this.stats.bossKills[id] = (this.stats.bossKills[id] || 0) + 1;
      this.stats.bossTimes[id] = Math.round((this.time - e.spawnTime) * 10) / 10;
      for (const o of this.enemies) if (o.alive && o.owner === e.id) { o.alive = false; o.hp = 0; this.fx('poof', { x: o.x, y: o.y }); }
      this.hazards = this.hazards.filter((h) => h.owner !== e.id);
      this.events.emit('bossDeath', { enemy: e });
    }

    // ------------------------------------------------------------ projectiles
    fire(p) {
      const pr = this._projPool.length ? this._projPool.pop() : {};
      pr.x = p.x; pr.y = p.y; pr.target = p.target; pr.speed = p.speed || 520; pr.dmg = p.dmg; pr.kind = p.kind || 'bolt';
      pr.unit = p.unit || null; pr.data = p.data || null; pr.color = p.color || '#fff'; pr.life = 3; pr.alive = true;
      pr.tx = p.target ? p.target.x : p.tx; pr.ty = p.target ? p.target.y : p.ty;
      this.projectiles.push(pr);
      return pr;
    }

    // ------------------------------------------------------------ targeting
    enemiesNear(x, y, rPx, out, air, ground) {
      out.length = 0;
      const list = this.enemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive || (e.air ? !air : !ground)) continue;
        const rr = rPx + e.size * 0.3;
        if (Util.dist2(x, y, e.x, e.y) <= rr * rr) out.push(e);
      }
      return out;
    }

    /** Deterministic target selection. Ties are always broken by lowest enemy id. */
    pickTarget(u, o) {
      o = o || EMPTY;
      const mode = o.mode || u.targeting;
      const list = this.enemies;
      const air = o.air !== undefined ? o.air : u.canAir, ground = o.ground !== undefined ? o.ground : u.canGround;
      const rangePx = o.rangePx || u.rangePx, ex = o.exclude;
      let best = null, bestScore = 0;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive || e === ex || (e.air ? !air : !ground) || e.untargetable) continue;
        const d2 = Util.dist2(u.x, u.y, e.x, e.y);
        const rr = rangePx + e.size * 0.3;
        if (d2 > rr * rr) continue;
        let score;
        switch (mode) {
          case 'last': score = e.dist; break;                 // lowest progress is best (minimise)
          case 'strongest': score = -(e.hp + e.shield); break;
          case 'weakest': score = e.hp + e.shield; break;
          case 'closest': score = d2; break;
          default: score = e.pathLen - e.dist; break;          // first: least remaining distance
        }
        if (best === null || score < bestScore || (score === bestScore && e.id < best.id)) { best = e; bestScore = score; }
      }
      return best;
    }

    // ------------------------------------------------------------ hazards & disables
    isDisableImmune(u) {
      if (u.immuneDisable) return true;
      for (let i = 0; i < this.units.length; i++) {
        const p = this.units[i];
        if (p.flags.ward && p.disabledT <= 0 && Util.dist(p.x, p.y, u.x, u.y) <= p.flags.ward * TILE) return true;
      }
      return false;
    }
    disableUnit(u, dur) {
      if (u.removed) return false;
      if (this.isDisableImmune(u)) { this.fx('resist', { x: u.x, y: u.y }); return false; }
      if (dur > u.disabledT) u.disabledT = dur;
      this.stats.disabled++;
      this.events.emit('unitDisabled', { unit: u, dur });
      return true;
    }
    hazard(h) {
      h.t = 0; h.id = this.uid();
      this.hazards.push(h);
      this.events.emit('telegraph', { hazard: h });
      return h;
    }
    unitsInHazard(h, out) {
      out.length = 0;
      for (const u of this.units) {
        if (h.shape === 'all') out.push(u);
        else if (h.shape === 'circle') { if (Util.dist2(u.x, u.y, h.x, h.y) <= h.r * h.r) out.push(u); }
        else if (h.shape === 'rect') { if (u.x >= h.x && u.x <= h.x + h.w && u.y >= h.y && u.y <= h.y + h.h) out.push(u); }
      }
      return out;
    }

    addBuff(kind, amt, dur) { this.buffs.push({ kind, amt, t: dur }); }

    // ------------------------------------------------------------ summons
    spawnSummon(owner, defId, extra) {
      const sd = JJK.SummonDefs[defId];
      const s = Object.assign({
        uid: this.uid(), owner, def: sd, kind: sd.kind, x: owner.x, y: owner.y, cd: 0.5 + this.rng.next() * 0.5, target: null,
        life: Infinity, homeAngle: this.rng.next() * 6.283, tmp: false,
      }, extra || {});
      this.summons.push(s);
      return s;
    }

    // ------------------------------------------------------------ domains
    canActivateDomain(u) {
      if (!u || u.removed || this.over || !u.flags.domain) return false;
      return u.domainCd <= 0 && !this.domain && u.disabledT <= 0;
    }
    activateDomain(uid) {
      const u = typeof uid === 'object' ? uid : this.getUnit(uid);
      if (!this.canActivateDomain(u)) return false;
      const dom = JJK.Domains[u.flags.domain];
      this.domain = { id: dom.id, def: dom, owner: u, t: 0, dur: dom.dur, data: {} };
      u.domainCd = dom.cd;
      this.stats.domains++;
      if (this.synergy.domainUsers >= 2) {
        for (const o of this.units) if (o !== u && o.flags.domain && o.domainCd > 0) o.domainCd = Math.max(0, o.domainCd - 12);
      }
      const Dm = JJK.DomainFx[dom.id];
      if (Dm && Dm.start) Dm.start(this, this.domain, u);
      this.events.emit('domain', { domain: this.domain, unit: u });
      return true;
    }
    endDomain(silent) {
      if (!this.domain) return;
      const d = this.domain;
      const Dm = JJK.DomainFx[d.id];
      if (Dm && Dm.end) Dm.end(this, d);
      this.domain = null;
      if (!silent) this.events.emit('domainEnd', { domain: d });
    }

    // ------------------------------------------------------------ main update
    update(dt) {
      if (this.over) return;
      if (!(dt > 0)) return;            // zero / negative / NaN steps are ignored
      if (dt > 0.1) dt = 0.1;           // a stalled tab must not tunnel enemies through the map
      this.time += dt;

      // timers
      if (this.timers.length) {
        for (let i = this.timers.length - 1; i >= 0; i--) {
          const tm = this.timers[i];
          if (tm.t <= this.time) {
            this.timers.splice(i, 1);
            try { tm.fn(); } catch (err) { if (G.console) console.error('[timer]', err); }
          }
        }
      }

      // global buffs
      let gd = 0, gs = 0;
      for (let i = this.buffs.length - 1; i >= 0; i--) {
        const b = this.buffs[i];
        b.t -= dt;
        if (b.t <= 0) { this.buffs.splice(i, 1); continue; }
        if (b.kind === 'dmg') gd += b.amt; else gs += b.amt;
      }
      this.gDmg = gd; this.gSpd = gs;

      // spawning
      if (this.state === 'wave' && this.waveSpec) {
        this.waveTime += dt;
        const ents = this.waveSpec.entries;
        while (this.spawnIdx < ents.length && ents[this.spawnIdx].t <= this.waveTime) {
          const en = ents[this.spawnIdx++];
          this.spawnEnemy(en.type, { lane: en.lane, elite: en.elite, mod: en.mod, hpMult: en.hpMult, wave: this.wave });
        }
      }

      this.updateEnemies(dt);
      this.updateUnits(dt);
      this.updateSummons(dt);
      this.updateProjectiles(dt);
      this.updateZones(dt);
      this.updateHazards(dt);
      this.updateDomain(dt);
      this.cleanup();
      if (this.over) return;
      this.checkWaveProgress(dt);
    }

    updateEnemies(dt) {
      const list = this.enemies, now = this.time;
      // hexer wards (aura) first
      for (let i = 0; i < list.length; i++) {
        const h = list[i];
        if (!h.alive || h.ward <= 0 || h.nullT > 0) continue;
        const r2 = h.ward * TILE * h.ward * TILE;
        for (let j = 0; j < list.length; j++) {
          const o = list[j];
          if (o !== h && o.alive && Util.dist2(h.x, h.y, o.x, o.y) <= r2) o.wardUntil = now + 0.25;
        }
      }
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive) continue;
        if (e.stunT > 0) { e.stunT -= dt; if (e.stunT <= 0) { e.stunT = 0; e.ccImmuneT = e.boss ? 3 : Balance.ccDrWindow; } }
        else if (e.ccImmuneT > 0) e.ccImmuneT -= dt;
        if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
        if (e.rootT > 0) e.rootT -= dt;
        if (e.markT > 0) { e.markT -= dt; if (e.markT <= 0) e.markStacks = 0; }
        if (e.vulnT > 0) { e.vulnT -= dt; if (e.vulnT <= 0) e.vulnAmt = 0; }
        if (e.abT > 0) { e.abT -= dt; if (e.abT <= 0) e.abStacks = 0; }
        if (e.nullT > 0) e.nullT -= dt;
        if (e.invulnT > 0) e.invulnT -= dt;
        if (e.nullT <= 0) {
          if (e.regen > 0 && e.hp < e.maxHp && now - e.lastHit >= 1.5) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
          if (e.shieldMax > 0 && e.shield < e.shieldMax && now - e.lastHit >= (e.def.shieldRegenDelay || 4)) e.shield = Math.min(e.shieldMax, e.shield + (e.def.shieldRegen || 20) * (e.shieldMax / (e.def.shield || 1)) * dt);
        }
        if (e.ai) { const AI = JJK.BossAI[e.def.ai]; AI.update(this, e, dt); if (!e.alive) continue; }
        if (e.def.hexCd) this.updateHexer(e, dt);
        // movement
        if (e.stunT > 0 || e.rootT > 0 || e.frozen) continue;
        let sp = e.speed * e.speedMul;
        if (e.slowAmt > 0) sp *= 1 - e.slowAmt;
        e.dist += sp * dt;
        if (e.dist >= e.pathLen) { this.leak(e); continue; }
        e.path.posAt(e.dist, e);
      }
    }

    updateHexer(e, dt) {
      if (e.stunT > 0 || e.nullT > 0) return;
      e.hexT -= dt;
      if (e.hexT > 0) return;
      // nearest non-immune unit in range
      const rng = e.def.hexRange * TILE;
      let best = null, bd = Infinity;
      for (const u of this.units) {
        if (u.disabledT > 0 || u.immuneDisable) continue;
        const d = Util.dist2(u.x, u.y, e.x, e.y);
        if (d <= rng * rng && d < bd) { best = u; bd = d; }
      }
      if (!best) { e.hexT = 0.5; return; }
      e.hexT = e.def.hexCd;
      const dur = e.def.hexDur;
      this.hazard({
        shape: 'circle', x: best.x, y: best.y, r: TILE * 0.55, dur: 1.0, color: '#b050e0', label: 'HEX', owner: e.id, cancelOnOwnerDeath: true,
        onResolve: (b, h) => { const t = b.getUnit(best.uid); if (t) b.disableUnit(t, dur); },
      });
    }

    leak(e) {
      e.alive = false;
      e.hp = 0;
      e.reached = true;
      if (!this.godMode) { this.baseHp -= e.leak; this.stats.baseLost += e.leak; }
      this.stats.leaks++;
      this.events.emit('leak', { enemy: e });
      if (this.baseHp <= 0) { this.baseHp = 0; this.finish(false); }
    }

    updateUnits(dt) {
      const units = this.units;
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (u.removed) continue;
        if (u.domainCd > 0) u.domainCd = Math.max(0, u.domainCd - dt);
        if (u.auraT > 0) u.auraT -= dt;
        if (u.disabledT > 0) { u.disabledT -= dt; continue; }
        if (u.buffSpdT > 0) u.buffSpdT -= dt;
        const kit = u.kit;
        u.cdT -= dt * this.spdMul(u);
        if (kit.tick) kit.tick(u, this, dt);
        if (kit.noAttack || u.removed) continue;
        if (u.cdT <= 0) {
          const t = this.pickTarget(u);
          if (t) {
            const done = kit.attack(u, t, this);
            if (done !== false) u.cdT += u.baseSpa; else u.cdT = 0;
            if (u.cdT < 0.02) u.cdT = 0.02;
          } else u.cdT = 0;
        }
      }
    }

    updateSummons(dt) {
      const list = this.summons;
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        if (s.owner.removed) { list.splice(i, 1); continue; }
        if (s.life !== Infinity) { s.life -= dt; if (s.life <= 0) { list.splice(i, 1); continue; } }
        if (s.owner.disabledT > 0) continue;
        const K = JJK.Kits.summon[s.kind];
        if (K) K(s, this, dt);
      }
    }

    updateProjectiles(dt) {
      const list = this.projectiles;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt;
        if (p.target) { if (p.target.alive) { p.tx = p.target.x; p.ty = p.target.y; } else p.target = null; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
        if (d <= step + 4 || p.life <= 0) {
          p.x = p.tx; p.y = p.ty;
          const H = JJK.Kits.projectiles[p.kind];
          if (H && p.life > 0) H(this, p);
          p.alive = false;
        } else { p.x += (dx / d) * step; p.y += (dy / d) * step; }
        if (!p.alive) {
          list[i] = list[list.length - 1]; list.pop();
          if (this._projPool.length < Balance.projectilePoolCap) this._projPool.push(p);
        }
      }
    }

    updateZones(dt) {
      const zs = this.zones;
      for (let i = zs.length - 1; i >= 0; i--) {
        const z = zs[i];
        z.t -= dt;
        if (z.t <= 0 || z.owner.removed) { zs.splice(i, 1); continue; }
        z.tick -= dt;
        const r2 = z.r * z.r;
        for (const e of this.enemies) {
          if (!e.alive || e.air) continue;
          if (Util.dist2(z.x, z.y, e.x, e.y) <= r2) {
            this.slow(e, z.slow, 0.4);
            if (z.tick <= 0) this.damage(e, z.dmg, { type: 'cursed', src: z.owner, kind: 'water' });
          }
        }
        if (z.tick <= 0) z.tick = 1;
      }
    }

    updateHazards(dt) {
      const hs = this.hazards;
      for (let i = hs.length - 1; i >= 0; i--) {
        const h = hs[i];
        h.t += dt;
        if (h.t >= h.dur) {
          hs.splice(i, 1);
          try { if (h.onResolve) h.onResolve(this, h); } catch (err) { if (G.console) console.error('[hazard]', err); }
          this.events.emit('hazardResolved', { hazard: h });
        }
      }
    }

    updateDomain(dt) {
      const d = this.domain;
      if (!d) return;
      d.t += dt;
      const Dm = JJK.DomainFx[d.id];
      if (Dm && Dm.tick) Dm.tick(this, d, dt);
      if (d.t >= d.dur) this.endDomain();
    }

    cleanup() {
      const list = this.enemies;
      let w = 0;
      for (let i = 0; i < list.length; i++) if (list[i].alive) list[w++] = list[i];
      list.length = w;
    }

    checkWaveProgress(dt) {
      if (this.state === 'wave') {
        const spawning = this.waveSpec && this.spawnIdx < this.waveSpec.entries.length;
        if (!spawning && this.enemies.length === 0) {
          let bonus = 0;
          for (const p of this.pendingBonus) bonus += p.bonus;
          this.pendingBonus.length = 0;
          this.addYen(bonus, 640, 300, true);
          this.clearedWaves = this.wave;
          this.events.emit('waveClear', { n: this.wave, bonus });
          if (!this.endless && this.wave >= this.totalWaves) { this.finish(true); return; }
          this.state = 'intermission';
          this.autoTimer = Balance.intermission;
        }
      } else if (this.state === 'intermission' && this.autoStart) {
        this.autoTimer -= dt;
        if (this.autoTimer <= 0) this.startWave();
      }
    }

    finish(victory) {
      if (this.over) return;
      this.over = true;
      this.victory = victory;
      this.state = victory ? 'victory' : 'defeat';
      this.endDomain(true);
      this.hazards.length = 0;
      this.timers.length = 0;
      this.events.emit(victory ? 'victory' : 'defeat', { summary: this.getSummary() });
    }

    // ------------------------------------------------------------ summary & debug
    getSummary() {
      const s = this.stats;
      const wavesCleared = this.clearedWaves;
      const endlessScore = Math.floor(this.hpKilled / 12 + this.wave * 150 + (Object.values(s.bossKills).reduce((a, b) => a + b, 0)) * 1500);
      return {
        mapId: this.mapId, diff: this.diffId, mode: this.mode, victory: !!this.victory, wave: this.wave, wavesCleared,
        totalWaves: this.endless ? null : this.totalWaves, kills: s.kills, yenEarned: s.yenEarned, baseLost: s.baseLost, sold: s.sold, disabled: s.disabled,
        upgrades: s.upgrades, deploys: s.deploys, domains: s.domains, bossKills: Object.assign({}, s.bossKills),
        bossTimes: Object.assign({}, s.bossTimes), duration: Math.round(this.time), score: this.endless ? endlessScore : this.score,
        deployedIds: Array.from(this.deployedIds), loadout: this.teamOrder.slice(), enemiesSeen: Object.keys(s.enemiesSeen),
        bossesSeen: Object.keys(s.bossesSeen),
        debug: !!this.debugUsed, unitStats: this.units.map((u) => ({ id: u.id, kills: u.kills, damage: Math.round(u.damageDealt) })),
      };
    }

    /** Debug helpers (only wired up by the debug panel). */
    debugJumpToWave(n) {
      if (this.over) return false;
      this.debugUsed = true;
      n = Math.max(1, Math.min(n, this.endless ? 9999 : this.totalWaves));
      this.enemies.forEach((e) => { e.alive = false; });
      this.cleanup();
      this.wave = n - 1; this.waveSpec = null; this.spawnIdx = 0; this.pendingBonus.length = 0;
      this.state = 'intermission'; this.autoTimer = 0;
      return true;
    }
    debugInstantVictory() { this.debugUsed = true; this.finish(true); }
    debugInstantDefeat() { this.debugUsed = true; this.baseHp = 0; this.finish(false); }
  }

  Battle.TARGET_MODES = TARGET_MODES;
  JJK.Battle = Battle;
  JJK.Geometry = Geometry;
  JJK.PathData = PathData;
})(typeof window !== 'undefined' ? window : globalThis);
