/* Deterministic wave generation (story + endless). Same map + wave number => identical wave. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;

  const THEMES = {
    swarm: { label: 'Swarm', w: { wisp: 3, skitter: 2, twin: 1 } },
    armor: { label: 'Armored Assault', w: { shell: 3, brute: 2, wisp: 1 } },
    air: { label: 'Air Raid', w: { wraith: 4, wisp: 1, skitter: 1 } },
    caster: { label: 'Curse Users', w: { hexer: 2, leech: 2, aegis: 2, wisp: 1 } },
    mixed: { label: 'Mixed Horde', w: { wisp: 2, skitter: 1, brute: 1, wraith: 1, shell: 1, leech: 1, aegis: 1, twin: 1, hexer: 1 } },
  };
  const ENDLESS_INTRO = { wisp: 1, skitter: 2, wraith: 3, brute: 4, shell: 5, twin: 6, aegis: 7, leech: 8, hexer: 9 };
  const ENDLESS_BOSSES = ['finger', 'jogo', 'mahito', 'sukuna'];
  const ELITE_MODS = Object.keys(JJK.EliteMods);

  function budget(cfg, n) { return cfg.base + cfg.per * (n - 1) + cfg.accel * (n - 1) * (n - 1); }

  const THEME_KEYS = { swarm: ['wisp'], armor: ['shell', 'brute'], air: ['wraith'], caster: ['hexer', 'leech', 'aegis'], mixed: [] };

  function pickThemeAndTypes(rng, intro, n, prevTheme, avail) {
    const debut = avail.filter((t) => intro[t] === n && t !== 'wisp');
    const cands = Object.keys(THEMES).filter((k) => {
      if (k === prevTheme) return false;
      if (k === 'mixed') return avail.length >= 4;
      return THEME_KEYS[k].some((t) => avail.includes(t));
    });
    let pool = cands;
    if (debut.length) {
      const forced = cands.filter((k) => debut.some((t) => THEMES[k].w[t]));
      if (forced.length) pool = forced;
    }
    if (n <= 2 || !pool.length) pool = ['swarm'];
    const theme = pool[Math.floor(rng.next() * pool.length)];
    return { theme, debut };
  }

  function buildEntries(rng, theme, debut, avail, bud, n) {
    const weights = THEMES[theme].w;
    const types = Object.keys(weights).filter((t) => avail.includes(t));
    const entries = [];
    let guard = 0;
    while (bud >= 8 && guard++ < 400) {
      const choices = types.map((t) => ({ t, w: weights[t] * (debut.includes(t) ? 4 : 1) }));
      const pick = Util.weighted(rng, choices).t;
      const cost = JJK.Enemies[pick].threat;
      if (cost > bud && entries.length >= 4) {
        // try cheaper filler
        const cheap = types.filter((t) => JJK.Enemies[t].threat <= bud);
        if (!cheap.length) break;
        const t2 = cheap[Math.floor(rng.next() * cheap.length)];
        entries.push({ type: t2 });
        bud -= JJK.Enemies[t2].threat;
        continue;
      }
      entries.push({ type: pick });
      bud -= cost;
    }
    if (entries.length < 4) while (entries.length < 4) entries.push({ type: types[0] || 'wisp' });
    return entries;
  }

  function schedule(rng, entries, n, lanes, theme, bossEntry, opts) {
    // group same types together unless mixed
    if (theme === 'mixed') {
      for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); const t = entries[i]; entries[i] = entries[j]; entries[j] = t; }
    } else {
      const order = {};
      entries.forEach((e, i) => { if (!(e.type in order)) order[e.type] = i; });
      entries.sort((a, b) => order[a.type] - order[b.type]);
    }
    const span = Math.min(opts.maxSpan || 30, 9 + n * 0.8);
    const gap = Util.clamp(span / Math.max(1, entries.length), 0.26, 1.4);
    let t = 0.6;
    entries.forEach((e, i) => {
      e.t = +t.toFixed(2);
      e.lane = lanes > 1 ? (i + (rng.next() < 0.15 ? 1 : 0)) % lanes : 0;
      t += gap * (0.85 + rng.next() * 0.3);
    });
    if (bossEntry) {
      bossEntry.t = 2.5;
      bossEntry.lane = 0;
      entries.push(bossEntry);
      entries.sort((a, b) => a.t - b.t);
    }
    return { duration: t };
  }

  function applyElites(rng, entries, count, intro) {
    const idxs = entries.map((e, i) => i).filter((i) => !entries[i].boss && entries[i].type !== 'mite');
    for (let k = 0; k < count && idxs.length; k++) {
      // prefer sturdier types
      idxs.sort((a, b) => JJK.Enemies[entries[b].type].threat - JJK.Enemies[entries[a].type].threat);
      const pickFrom = idxs.slice(0, Math.max(1, Math.ceil(idxs.length / 2)));
      const i = pickFrom[Math.floor(rng.next() * pickFrom.length)];
      entries[i].elite = true;
      entries[i].mod = ELITE_MODS[Math.floor(rng.next() * ELITE_MODS.length)];
      idxs.splice(idxs.indexOf(i), 1);
    }
  }

  const Waves = {
    THEMES,

    /** All waves for a story map at a difficulty. */
    generate(map, diff, rules) {
      rules = rules || {};
      const cfg = map.waveCfg;
      const lanes = map.paths.length;
      const out = [];
      let prev = null;
      const eliteFrom = rules.eliteFromWave || Math.max(2, Math.round(cfg.eliteFrom * diff.eliteFrom));
      for (let n = 1; n <= map.waves; n++) {
        out.push(Waves.wave(map, n, diff, { prev, lanes, eliteFrom }));
        prev = out[out.length - 1].theme;
      }
      return out;
    },

    wave(map, n, diff, ctx) {
      const cfg = map.waveCfg;
      const rng = Util.makeRng(Util.hashString(map.id + ':' + n));
      const intro = cfg.intro;
      const avail = Object.keys(intro).filter((t) => intro[t] <= n);
      const bossSpec = cfg.bosses[n];
      const lanes = ctx.lanes;
      const { theme, debut } = pickThemeAndTypes(rng, intro, n, ctx.prev, avail);
      let bud = budget(cfg, n) * diff.countMult * (bossSpec ? 0.5 : 1);
      if (theme === 'air') bud *= (cfg.airMult || 0.7); // fliers bypass the path: keep air raids smaller
      if (debut.length) bud *= 0.85; // gentler wave when a new curse type debuts
      const entries = buildEntries(rng, theme, debut, avail, bud, n);
      let eliteCount = 0;
      if (n >= ctx.eliteFrom && (n - ctx.eliteFrom) % cfg.eliteEvery === 0) eliteCount = Math.max(1, Math.round((1 + Math.floor((n - ctx.eliteFrom) / 6)) * diff.eliteBoost));
      if (n < 3) eliteCount = 0;
      applyElites(rng, entries, eliteCount, intro);
      let bossEntry = null;
      if (bossSpec) bossEntry = { type: bossSpec.id, boss: true, hpMult: bossSpec.hp };
      let mutator = null;
      if (cfg.mutators && !bossSpec && n >= 3) mutator = ['swift', 'hardened', 'mending', 'bloated'][Math.floor(rng.next() * 4)];
      const sched = schedule(rng, entries, n, lanes, theme, bossEntry, {});
      const label = bossSpec ? 'BOSS: ' + JJK.Bosses[bossSpec.id].name : THEMES[theme].label;
      return {
        n, theme, label, mutator, boss: bossSpec ? bossSpec.id : null, entries, duration: sched.duration,
        bonus: Balance.waveBonusBase + Balance.waveBonusPerWave * n, elite: eliteCount,
        threat: entries.reduce((s, e) => s + (e.boss ? 0 : JJK.Enemies[e.type].threat * (e.elite ? 2 : 1)), 0),
      };
    },

    /** Endless: wave n (1-based), unbounded. */
    endless(map, n, diff) {
      const cfg = map.waveCfg;
      const rng = Util.makeRng(Util.hashString('endless:' + map.id + ':' + n));
      const lanes = map.paths.length;
      const avail = Object.keys(ENDLESS_INTRO).filter((t) => ENDLESS_INTRO[t] <= n);
      const bossWave = n % 10 === 0;
      const cycle = Math.floor(n / 10) - 1;
      let bud = (cfg.base * 1.15 + cfg.per * 1.1 * (n - 1) + cfg.accel * 0.8 * (n - 1) * (n - 1)) * diff.countMult * (bossWave ? 0.5 : 1);
      const theme = n <= 2 ? 'swarm' : ['swarm', 'armor', 'air', 'caster', 'mixed', 'mixed'][Math.floor(rng.next() * 6)];
      const entries = buildEntries(rng, theme, [], avail, bud, n);
      // cap formation size: excess becomes elites instead of ever more bodies
      const MAXN = 90;
      if (entries.length > MAXN) entries.length = MAXN;
      const eliteFrac = Util.clamp(0.04 * (n - 4), 0, 0.5);
      const eliteCount = n >= 5 ? Math.round(entries.length * eliteFrac) : 0;
      applyElites(rng, entries, eliteCount, ENDLESS_INTRO);
      let bossEntry = null;
      if (bossWave) bossEntry = { type: ENDLESS_BOSSES[cycle % ENDLESS_BOSSES.length], boss: true, hpMult: 0.55 + 0.35 * cycle };
      const mutator = !bossWave && n >= 10 ? ['swift', 'hardened', 'mending', 'bloated'][Math.floor(rng.next() * 4)] : null;
      const sched = schedule(rng, entries, n, lanes, theme, bossEntry, { maxSpan: 36 });
      return {
        n, theme, label: bossWave ? 'BOSS: ' + JJK.Bosses[bossEntry.type].name : THEMES[theme].label, mutator, boss: bossWave ? bossEntry.type : null,
        entries, duration: sched.duration, bonus: Balance.waveBonusBase + Balance.waveBonusPerWave * n, elite: eliteCount,
        threat: entries.reduce((s, e) => s + (e.boss ? 0 : JJK.Enemies[e.type].threat * (e.elite ? 2 : 1)), 0),
        speedBonus: Math.min(0.4, 0.005 * n),
      };
    },

    endlessHpScale(n) { return Balance.hpScale(Math.min(n, 40)) * (1 + 0.05 * Math.max(0, n - 40)); },
  };

  JJK.Waves = Waves;
})(typeof window !== 'undefined' ? window : globalThis);
