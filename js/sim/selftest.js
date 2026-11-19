/* Self-test suite (headless, no DOM): exercises every character, enemy, boss, map and summon banner against the real simulation.
   Used by the Owner Lab ("SELF-TEST" tab) in the browser and by tests/owner.test.js in Node. Never touches the player's save. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Balance, Util } = JJK;
  const STEP = Balance.STEP;

  const step = (b, sec) => { const n = Math.round(sec / STEP); for (let i = 0; i < n && !b.over; i++) b.update(STEP); };
  const slotsOf = (b, type) => { const a = []; for (const s of b.geo.slots.values()) if (s.type === type) a.push(s); return a; };
  function enemyNear(b, u, type, o) {
    const e = b.spawnEnemy(type, o || {});
    let best = 0, bd = Infinity; const tmp = { x: 0, y: 0 };
    for (let d = 0; d < e.path.length; d += 4) { e.path.posAt(d, tmp); const q = (tmp.x - u.x) ** 2 + (tmp.y - u.y) ** 2; if (q < bd) { bd = q; best = d; } }
    e.dist = best; e.path.posAt(best, e);
    return e;
  }
  function must(c, msg) { if (!c) throw new Error(msg); }
  const mkBattle = (team, o) => new JJK.Battle(Object.assign({ mapId: 'tokyo', diff: 'normal', team: team.map((id) => ({ id, level: 1, stars: 0 })), seed: 7, startYen: 1e7 }, o || {}));

  // ---------------------------------------------------------------- task factories
  const tasks = [];
  const add = (group, name, run) => tasks.push({ group, name, run });

  function characterTasks() {
    for (const id of JJK.CharacterOrder) {
      add('characters', id, () => {
        const d = JJK.Characters[id], notes = [];
        must(d.kit && JJK.Kits[d.kit], 'missing kit ' + d.kit);
        must(d.upgrades.length + 1 === d.maxLevel, 'maxLevel mismatch');
        for (const u of d.upgrades) must(u.cost > 0, 'upgrade without cost');
        const place = d.place === 'elevated' ? 'E' : 'G';
        for (const lvl of [1, d.maxLevel]) {
          const b = mkBattle([id, 'yuji']);
          const sl = slotsOf(b, place)[0];
          const y0 = b.yen, r = b.place(id, sl.c, sl.r);
          must(r.ok, 'place failed: ' + r.reason);
          must(y0 - b.yen === b.roster[id].cost, 'deploy cost mismatch ' + (y0 - b.yen) + ' vs ' + b.roster[id].cost);
          const u = r.unit;
          while (u.level < lvl) must(b.upgrade(u).ok, 'upgrade failed');
          for (let i = 0; i < 5; i++) { const e = enemyNear(b, u, i % 2 ? 'brute' : 'wisp'); e.speedMul = 0.001; }
          if (d.targets !== 'ground') { const a = enemyNear(b, u, 'wraith'); a.speedMul = 0.001; }
          step(b, 25);
          must(Number.isFinite(b.baseHp) && Number.isFinite(b.yen), 'state went non-finite');
          const acts = u.damageDealt > 0 || u.kit.noAttack || /Support|Amplifier/.test(d.role);
          must(acts, 'L' + lvl + ' never did anything');
          if (lvl === d.maxLevel) notes.push('dealt ' + Math.round(u.damageDealt));
        }
        // placement limit: maxPlace is honoured exactly
        const b = mkBattle([id]), max = b.maxPlace(id), sls = slotsOf(b, place);
        if (sls.length > max) {
          for (let i = 0; i < max; i++) must(b.place(id, sls[i].c, sls[i].r).ok, 'placement ' + (i + 1) + '/' + max + ' refused');
          must(!b.place(id, sls[max].c, sls[max].r).ok, 'placed more than the limit of ' + max);
          notes.push('limit ' + max + ' ok');
        }
        return notes.join(', ');
      });
    }
  }

  function enemyTasks() {
    for (const id of Object.keys(JJK.Enemies)) {
      add('enemies', id, () => {
        const b = mkBattle(['yuji'], { mapId: 'shibuya' });
        b.state = 'wave';
        const e = b.spawnEnemy(id, { wave: 12 });
        must(e.hp > 0 && Number.isFinite(e.hp) && e.speed > 0, 'bad stats hp=' + e.hp + ' speed=' + e.speed);
        const d0 = e.dist; step(b, 6);
        if (e.alive) must(e.dist > d0 || e.stunT > 0, 'never moved');
        const y0 = b.yen; const e2 = b.spawnEnemy(id, { wave: 12 });
        b.damage(e2, (e2.hp + e2.shield) * 1000 + 1, { type: 'true', pierceShield: true, ignoreWard: true });
        must(!e2.alive, 'could not be killed');
        return 'hp ' + Math.round(e.maxHp) + ', speed ' + e.speed.toFixed(1) + ', kill yen +' + Math.round(b.yen - y0);
      });
    }
  }

  function bossTasks() {
    for (const id of Object.keys(JJK.Bosses)) {
      add('bosses', id, () => {
        // 1) the boss AI runs for a minute with nothing in its way, base protected: no exceptions, state stays sane
        let b = mkBattle(['yuji'], { mapId: 'shinjuku', diff: 'special' });
        b.state = 'wave'; b.canStartWave = () => false; b.godMode = true;
        const phases = []; b.events.on('bossPhase', (ev) => phases.push(ev.name));
        const e = b.spawnEnemy(id, { wave: 30 });
        must(e.hp > 0 && Number.isFinite(e.hp), 'bad boss hp');
        step(b, 60);
        must(Number.isFinite(b.baseHp), 'base hp not finite');
        // 2) a Jahjuan erases it
        b = mkBattle(['jahjuan'], { mapId: 'shinjuku', diff: 'special' });
        b.state = 'wave'; b.canStartWave = () => false;
        const u = b.place('jahjuan', slotsOf(b, 'G')[0].c, slotsOf(b, 'G')[0].r).unit;
        const k = enemyNear(b, u, id, { wave: 30 }); k.speedMul = 0.001; k.hp = k.maxHp = Math.max(k.maxHp, 1e7);
        step(b, 20);
        must(!k.alive, 'survived 20s next to Jahjuan');
        return 'AI ran 60s' + (phases.length ? ', phases: ' + Array.from(new Set(phases)).slice(0, 5).join(' / ') : '') + '; erased by Jahjuan';
      });
    }
  }

  function mapTasks() {
    for (const mid of Object.keys(JJK.Maps)) {
      for (const diff of ['normal', 'hard', 'special']) {
        add('maps', mid + ' · ' + diff, () => {
          const m = JJK.Maps[mid];
          const b = mkBattle(['yuji', 'nobara'], { mapId: mid, diff, startYen: 5000 });
          must(Array.isArray(b.waves) && b.waves.length === m.waves, 'wave count ' + (b.waves && b.waves.length) + ' vs ' + m.waves);
          const sl = slotsOf(b, 'G')[0]; must(b.place('yuji', sl.c, sl.r).ok, 'cannot deploy');
          must(b.startWave(), 'wave 1 did not start');
          step(b, 30);
          must(Number.isFinite(b.baseHp), 'base hp not finite');
          return m.waves + ' waves generated, wave 1 ran 30s';
        });
      }
      add('maps', mid + ' · endless', () => {
        const b = mkBattle(['yuji'], { mapId: mid, diff: 'normal', mode: 'endless', startYen: 5000 });
        must(b.startWave(), 'endless wave 1 did not start'); step(b, 20);
        return 'endless wave 1 ran';
      });
    }
  }

  function summonTasks() {
    const banners = () => [JJK.Banners.standard, JJK.Banners.culling].concat(JJK.Banners.featured);
    add('summon', 'banner data & rates', () => {
      for (const bn of banners()) {
        for (let c = 0; c <= bn.pity.hard; c += Math.max(1, Math.floor(bn.pity.hard / 9))) {
          const r = JJK.SummonMath.tierRates(bn, c), s = Object.values(r).reduce((a, x) => a + x, 0);
          must(Math.abs(s - 100) < 1e-6, bn.id + ' rates sum ' + s + ' at pity ' + c);
        }
        for (const t of Object.keys(bn.pool)) for (const cid of bn.pool[t]) { must(JJK.Characters[cid], bn.id + ' unknown ' + cid); must(JJK.Characters[cid].rarity !== 'JOAN', bn.id + ' pool contains a JOAN'); }
        if (bn.featured) must((bn.pool[bn.featured.tier] || []).includes(bn.featured.id), bn.id + ' featured not in pool');
      }
      return banners().length + ' banners';
    });
    add('summon', 'simulate 6,000 pulls per banner', () => {
      const out = [];
      for (const bn of banners()) {
        const sm = new JJK.SaveManager(new Util.MemoryStorage()); sm.load();
        const p = new JJK.Profile(sm, { now: () => Date.UTC(2026, 5, 10, 12) });
        p.debugUnlockAll = true; sm.data.currencies.gems = 1e9;
        const rng = Util.makeRng(99), jr = Util.makeRng(1234); rng.joan = () => jr.next();
        const counts = {}, order = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']; let since = 0, worst = 0;
        for (let i = 0; i < 600; i++) {
          const r = p.summon(bn.id, 10, rng); must(r.ok, bn.id + ' summon failed: ' + r.reason);
          for (const x of r.results) {
            must(JJK.Characters[x.id], 'unknown id ' + x.id);
            counts[x.tier] = (counts[x.tier] || 0) + 1;
            if (x.tier === 'JOAN') continue;
            if (order.indexOf(x.tier) >= order.indexOf(bn.pity.tier)) since = 0; else { since++; worst = Math.max(worst, since); }
          }
        }
        must(worst <= bn.pity.hard, bn.id + ' went ' + worst + ' pulls without ' + bn.pity.tier + ' (hard pity ' + bn.pity.hard + ')');
        out.push(bn.id + ' ' + Object.keys(counts).map((t) => t[0] + t.slice(1, 3).toLowerCase() + ':' + counts[t]).join(' '));
      }
      return out.join(' | ');
    });
    add('summon', 'JOAN odds are exactly 1 in 200,000', () => {
      const S = JJK.SummonMath;
      must(S.JOAN_ODDS === 200000, 'odds constant');
      must(S.rollJoan({ joan: () => 0 }) && !S.rollJoan({ joan: () => 1 / 200000 }) && !S.rollJoan({ next: () => 0 }), 'threshold semantics');
      const r = Util.makeRng(2026); let hits = 0; const N = 2000000;
      for (let i = 0; i < N; i++) if (S.rollJoan({ joan: () => r.next() })) hits++;
      must(hits <= 30, 'too many hits: ' + hits);
      return hits + ' hits in ' + N.toLocaleString('en-US') + ' rolls (expected ~10)';
    });
    add('summon', 'forced JOAN pull grants Jahjuan; extras become shards', () => {
      const sm = new JJK.SaveManager(new Util.MemoryStorage()); sm.load();
      const p = new JJK.Profile(sm, { now: () => 0 }); sm.data.currencies.gems = 1e6;
      const rng = Util.makeRng(1); rng.joan = () => 0;
      const r = p.summon('standard', 10, rng); must(r.ok && r.results.every((x) => x.id === 'jahjuan' && x.tier === 'JOAN'), 'not all JOAN');
      must(p.owns('jahjuan') && p.shardsOf('jahjuan') === 9 * Balance.rarity.JOAN.dupShards, 'shard maths');
      must(!p.canUnlockWithShards('jahjuan'), 'shard-unlockable');
      return 'ok';
    });
  }

  function jahjuanTasks() {
    add('jahjuan', 'costs ¥300, one placement, erases every enemy type (shield/ward/armour)', () => {
      const b = mkBattle(['jahjuan']), sl = slotsOf(b, 'G'), y0 = b.yen;
      const r = b.place('jahjuan', sl[0].c, sl[0].r); must(r.ok, 'place'); must(y0 - b.yen === 300, 'cost ' + (y0 - b.yen));
      must(!b.place('jahjuan', sl[1].c, sl[1].r).ok, 'second placement allowed');
      const u = r.unit, es = [];
      for (const t of Object.keys(JJK.Enemies)) { const e = enemyNear(b, u, t); e.speedMul = 0.001; e.shield = 5e6; e.armorBonus = 0.9; e.wardUntil = 1e9; es.push(e); }
      step(b, 1.5);
      for (const e of es) must(!e.alive, e.type + ' survived');
      return es.length + ' enemy types erased';
    });
  }

  function dataTasks() {
    add('data', 'content integrity', () => {
      const out = [];
      for (const id of JJK.CharacterOrder) {
        const d = JJK.Characters[id];
        must(JJK.Balance.rarity[d.rarity], id + ' rarity'); must(d.art && d.art.outfit, id + ' art'); must(d.unlock && d.unlock.type, id + ' unlock');
        for (const up of d.upgrades) { const dom = up.flags && up.flags.domain; if (dom) must(JJK.Domains[dom] && JJK.DomainFx[dom], id + ' domain ' + dom); }
      }
      for (const id of Object.keys(JJK.Bosses)) must(JJK.BossAI[JJK.Bosses[id].ai], 'boss AI for ' + id);
      for (const id of JJK.BossOrder) must(JJK.Bosses[id], 'BossOrder ' + id);
      for (const id of JJK.EnemyOrder) must(JJK.Enemies[id], 'EnemyOrder ' + id);
      out.push(JJK.CharacterOrder.length + ' characters', Object.keys(JJK.Enemies).length + ' enemies', Object.keys(JJK.Bosses).length + ' bosses', Object.keys(JJK.Maps).length + ' maps');
      return out.join(', ');
    });
  }

  characterTasks(); enemyTasks(); bossTasks(); mapTasks(); summonTasks(); jahjuanTasks(); dataTasks();

  JJK.SelfTest = {
    groups: ['characters', 'enemies', 'bosses', 'maps', 'summon', 'jahjuan', 'data'],
    tasks,
    /** Run (a subset of) the suite. `tick(done,total,result)` is called after each task; `pause()` may return a promise to keep a UI responsive. */
    async run(o) {
      o = o || {};
      const list = tasks.filter((t) => !o.groups || o.groups.includes(t.group) && (!o.filter || t.name.includes(o.filter)));
      const results = []; const t0 = Date.now();
      for (let i = 0; i < list.length; i++) {
        const t = list[i], s0 = Date.now(); let r;
        try { r = { group: t.group, name: t.name, ok: true, detail: t.run() || '' }; }
        catch (e) { r = { group: t.group, name: t.name, ok: false, detail: (e && e.message) || String(e) }; }
        r.ms = Date.now() - s0; results.push(r);
        if (o.tick) o.tick(i + 1, list.length, r);
        if (o.pause) await o.pause();
      }
      return { results, total: results.length, passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, ms: Date.now() - t0 };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
