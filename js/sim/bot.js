/* Heuristic auto-player. Used by balance tests and the Debug panel's "autoplay". Not part of normal gameplay. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;
  const TILE = Balance.TILE;

  const Bot = {
    /** Score a deployment tile for a unit: how much path length falls inside its range (weighted toward the base). */
    tileScore(b, slot, def, rangeTiles, melee) {
      const r = (rangeTiles + (slot.type === 'E' ? Balance.elevatedRange : 0)) * TILE * b.rules.rangeMul;
      let score = 0;
      const paths = b.geo.ground;
      for (let pi = 0; pi < paths.length; pi++) {
        const p = paths[pi];
        for (let d = 0; d < p.length; d += 24) {
          const pos = p.posAt(d, { x: 0, y: 0 });
          if (Util.dist2(slot.x, slot.y, pos.x, pos.y) <= r * r) score += 1 + (d / p.length) * 0.4;
        }
      }
      return score;
    },

    pickTile(b, id) {
      const ro = b.roster[id];
      const def = ro.def;
      let best = null, bs = -1;
      const rangeTiles = def.base.range + (def.upgrades.reduce((a, u) => a + u.range, 0)) * 0.5;
      for (const slot of b.geo.slots.values()) {
        const chk = b.canPlace(id, slot.c, slot.r);
        if (!chk.ok && chk.reason !== 'Not enough Yen') continue;
        if (b.unitAt(slot.c, slot.r)) continue;
        const s = Bot.tileScore(b, slot, def, rangeTiles, def.place === 'ground') + (slot.type === 'E' ? 0.5 : 0);
        if (s > bs) { bs = s; best = slot; }
      }
      return best;
    },

    /** Play to completion. opts: { maxSeconds, skill: 'good'|'poor'|'idle', useDomains } */
    run(b, opts) {
      opts = opts || {};
      const maxT = opts.maxSeconds || 3600;
      const skill = opts.skill || 'good';
      const step = Balance.STEP;
      let decisionT = 0;
      const order = b.teamOrder.slice().sort((x, y) => b.roster[x].cost - b.roster[y].cost);
      const hasAir = b.teamOrder.some((id) => { const d = b.roster[id].def; return d.targets !== 'ground'; });
      while (!b.over && b.time < maxT) {
        decisionT -= step;
        if (decisionT <= 0) { decisionT = 0.4; Bot.decide(b, order, skill, hasAir, opts); }
        b.update(step);
      }
      return b.getSummary();
    },

    decide(b, order, skill, hasAir, opts) {
      if (skill === 'idle') { if (b.canStartWave() && b.state !== 'wave') b.startWave(); return; }
      let actions = 0;
      while (actions++ < 10) {
        let acted = false;
        const unplaced = order.filter((id) => b.placedCount(id) === 0);
        if (skill === 'poor') {
          const cand = order.filter((id) => b.roster[id].cost <= b.yen && b.placedCount(id) < b.maxPlace(id));
          for (const id of cand) { const slot = Bot.randomSlot(b, id); if (slot && b.place(id, slot.c, slot.r).ok) { acted = true; break; } }
        } else if (unplaced.length && b.units.length < b.rules.maxDeployed) {
          // get every team member out once: most expensive affordable first
          const afford = unplaced.filter((id) => b.roster[id].cost <= b.yen).sort((x, y) => b.roster[y].cost - b.roster[x].cost);
          // spend on the best affordable unit; if a clearly better unit is within reach, wait for it
          const best = unplaced.slice().sort((x, y) => b.roster[y].cost - b.roster[x].cost)[0];
          const wait = afford.length && afford[0] !== best && b.roster[best].cost <= b.yen * 1.35 && b.units.length >= 3;
          if (afford.length && !wait) {
            const id = b.units.length < 3 ? afford[afford.length - 1] : afford[0];
            const slot = Bot.pickTile(b, id);
            if (slot && b.place(id, slot.c, slot.r).ok) acted = true;
          }
          if (!acted) {
            // save for a unit that is close; otherwise keep improving what is already deployed
            const cheapest = Math.min.apply(null, unplaced.map((id) => b.roster[id].cost));
            if (cheapest <= b.yen * 1.5) break;
          }
        }
        if (!acted && skill !== 'poor') {
          // upgrades by value, with duplicates of cheap damage when slots allow
          let bu = null, bv = -1;
          for (const u of b.units) {
            const cost = b.upgradeCost(u);
            if (cost == null || cost > b.yen) continue;
            const stage = u.level;
            const v = (u.dmg / u.baseSpa) / cost / (1 + stage * 0.15) * (u.def.kit === 'panda' || u.def.kit === 'inumaki' || u.def.kit === 'meimei' ? 0.6 : 1);
            if (v > bv) { bv = v; bu = u; }
          }
          const want = 4 + Math.floor(b.wave / 3);
          if (!unplaced.length && b.units.length < Math.min(want, b.rules.maxDeployed)) {
            const cand = order.filter((id) => b.roster[id].cost <= b.yen && b.placedCount(id) < b.maxPlace(id) && b.roster[id].def.kit !== 'inumaki' && b.roster[id].def.kit !== 'meimei').sort((x, y) => (b.placedCount(x) - b.placedCount(y)) || (b.roster[x].cost - b.roster[y].cost));
            for (const id of cand) { const slot = Bot.pickTile(b, id); if (slot && b.place(id, slot.c, slot.r).ok) { acted = true; break; } }
          }
          if (!acted && bu) { b.upgrade(bu); acted = true; }
        }
        if (!acted) break;
      }
      if (opts && opts.useDomains !== false) {
        for (const u of b.units) if (b.canActivateDomain(u) && b.enemies.length > 4) { b.activateDomain(u); break; }
      }
      if ((b.state === 'prep' && b.units.length > 0) || b.state === 'intermission') { if (b.canStartWave()) b.startWave(); }
    },

    randomSlot(b, id) {
      const slots = Array.from(b.geo.slots.values()).filter((s) => b.canPlace(id, s.c, s.r).ok);
      return slots.length ? slots[b.rng.int(0, slots.length - 1)] : null;
    },
  };

  JJK.Bot = Bot;
})(typeof window !== 'undefined' ? window : globalThis);
