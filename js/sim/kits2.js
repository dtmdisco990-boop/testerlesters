/* Kits for the expansion roster (see data/characters2.js). Same contracts as kits.js:
   attack(u,t,b) / tick(u,b,dt) / spdBonus(u) / init(u,b) / noAttack, summon kinds and domain effects. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;
  const TILE = Balance.TILE;
  const K = JJK.Kits, DomainFx = JJK.DomainFx;

  /** Enemies inside radius (px) of x,y, copied so callers may kill while iterating. */
  function near(b, x, y, r, air, ground) { return b.enemiesNear(x, y, r, b._scratch2, air !== false, ground !== false).slice(); }
  function byHp(list, desc) { list.sort((a, z) => (desc ? (z.hp + z.shield) - (a.hp + a.shield) : (a.hp + a.shield) - (z.hp + z.shield)) || a.id - z.id); return list; }
  const line = (b, a, t, color, width) => b.fx('beam', { x1: a.x, y1: a.y, x2: t.x, y2: t.y, color, width: width || 4 });
  const cdTick = (k, key, init, dt) => { if (k[key] === undefined) k[key] = init; k[key] -= dt; return k[key] <= 0; };

  // ------------------------------------------------------------ INVINCIBLE JAHJUAN: erases everything in reach
  // Sweeps every ~0.1s. The damage is typeless ("true": skips armour and cursed resistance), pierces shields and
  // wards, and scales with the target's own HP so adaptation / vulnerability multipliers can never save it.
  // The only thing that stops it is a boss's own invulnerability window (damage is zeroed there by Battle.damage).
  K.jahjuan = {
    noAttack: true,
    tick(u, b, dt) {
      if (!cdTick(u, 'sweepT', 0, dt)) return;
      u.sweepT = u.baseSpa;
      const list = near(b, u.x, u.y, u.rangePx);
      if (!list.length) return;
      const base = u.dmg * b.dmgMul(u);
      for (const e of list) {
        if (!e.alive) continue;
        const need = (e.hp + e.shield) * 1000 + 1;
        b.damage(e, Math.max(base, need), { type: 'true', src: u, kind: 'erase', pierceShield: true, ignoreWard: true, crit: true });
        if (!e.alive) b.fx('poof', { x: e.x, y: e.y });
      }
      u.fxT = (u.fxT || 0) - u.baseSpa;
      if (u.fxT <= 0) { u.fxT = 0.5; b.fx('shock', { x: u.x, y: u.y, r: u.rangePx, color: '#ffd23a' }); }
    },
  };

  // ------------------------------------------------------------ Mai: constructed bullets
  K.mai = {
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      const made = f.createEvery && u.hits % f.createEvery === 0;
      const dmg = u.dmg * b.dmgMul(u) * (made ? f.createMult : 1);
      b.damage(t, dmg, { type: 'phys', src: u, pierce: made ? 1 : f.pierce, crit: !!made, kind: made ? 'blackflash' : 'bullet' });
      b.fx('beam', { x1: u.x, y1: u.y - 8, x2: t.x, y2: t.y, color: made ? '#ffb060' : '#f0e0c0', width: made ? 6 : 3 });
      if (made && f.boom) { b.aoe(t.x, t.y, f.boom * TILE, dmg * 0.45, { type: 'phys', src: u, pierce: 1, exclude: t, kind: 'wave' }); b.fx('shock', { x: t.x, y: t.y, r: f.boom * TILE, color: '#ffb060' }); }
      if (made && f.ricochet) {
        const c = near(b, t.x, t.y, 2.4 * TILE).filter((e) => e !== t);
        if (c.length) { c.sort((a, z) => Util.dist2(t.x, t.y, a.x, a.y) - Util.dist2(t.x, t.y, z.x, z.y) || a.id - z.id); b.damage(c[0], dmg * 0.7, { type: 'phys', src: u, pierce: 1, kind: 'bullet' }); line(b, t, c[0], '#ffb060', 3); }
      }
    },
  };

  // ------------------------------------------------------------ Momo: wind vs. Air
  K.momo = {
    attack(u, t, b) {
      const f = u.flags;
      let dmg = u.dmg * b.dmgMul(u);
      if (t.air) dmg *= f.airMult;
      b.damage(t, dmg, { type: 'cursed', src: u, kind: 'wave' });
      b.fx('beam', { x1: u.x, y1: u.y - 10, x2: t.x, y2: t.y, color: '#c8e8a0', width: 4 });
      if (t.alive && t.air && f.gale) b.slow(t, f.gale, 2);
    },
    tick(u, b, dt) {
      const f = u.flags;
      if (!f.cyclone) return;
      if (!cdTick(u.k, 'cy', f.cyclone * 0.5, dt)) return;
      const air = near(b, u.x, u.y, u.rangePx, true, false).filter((e) => e.air);
      if (!air.length) { u.k.cy = 0; return; }
      for (const e of air) {
        if (!e.alive) continue;
        b.damage(e, u.dmg * b.dmgMul(u) * 1.4 * (f.airMult / 2.2), { type: 'cursed', src: u, kind: 'wave' });
        if (f.airMult >= 3 && e.alive) b.stun(e, 0.5);
        b.fx('spark', { x: e.x, y: e.y, color: '#c8e8a0' });
      }
      b.fx('shock', { x: u.x, y: u.y, r: u.rangePx, color: '#c8e8a0' });
      u.k.cy = f.cyclone;
    },
  };

  // ------------------------------------------------------------ Miwa: Simple Domain (ward flag handled in battle.isDisableImmune)
  K.miwa = {
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      const rip = f.riposte && u.hits % f.riposte === 0;
      b.damage(t, u.dmg * b.dmgMul(u) * (rip ? 2.4 : 1), { type: 'phys', src: u, kind: 'katana', crit: !!rip });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: rip ? '#ff8aa8' : '#9ad8c8', bf: !!rip });
    },
    tick(u, b) {
      const f = u.flags;
      if (!f.flow) return;
      const r = f.ward * TILE;
      for (const o of b.units) {
        if (o === u || o.removed || Util.dist(o.x, o.y, u.x, u.y) > r) continue;
        if (o.buffSpdT <= 0.3) { o.buffSpdT = 0.3; o.buffSpdAmt = f.flow; }
      }
    },
  };

  // ------------------------------------------------------------ Utahime: aura + Amplification
  K.utahime = {
    attack(u, t, b) {
      b.damage(t, u.dmg * b.dmgMul(u), { type: 'cursed', src: u, kind: 'wave' });
      b.fx('beam', { x1: u.x, y1: u.y - 10, x2: t.x, y2: t.y, color: '#b89aff', width: 3 });
    },
    tick(u, b, dt) {
      const f = u.flags, r = f.auraR * TILE;
      for (const o of b.units) {
        if (o === u || o.removed || Util.dist(o.x, o.y, u.x, u.y) > r) continue;
        o.auraAmt = o.auraStamp === b.time ? Math.max(o.auraAmt, f.aura) : f.aura;
        o.auraStamp = b.time; o.auraT = 0.3;
      }
      if (f.chantCd && cdTick(u.k, 'ch', f.chantCd * 0.5, dt)) {
        let best = null, bs = -1;
        for (const o of b.units) {
          if (o === u || o.removed || o.def.kit === 'miwa' || o.def.kit === 'inumaki' || o.def.kit === 'megumi' || Util.dist(o.x, o.y, u.x, u.y) > r) continue;
          const s = o.dmg / o.baseSpa;
          if (s > bs) { bs = s; best = o; }
        }
        if (best) {
          best.buffSpdT = Math.max(best.buffSpdT, 5); best.buffSpdAmt = Math.max(best.buffSpdAmt, f.chantSpd);
          b.fx('buff', { x: best.x, y: best.y, color: '#b89aff' });
          u.k.ch = f.chantCd;
        } else u.k.ch = 0;
      }
    },
  };

  // ------------------------------------------------------------ Uraume: chill -> freeze
  K.uraume = {
    attack(u, t, b) {
      const f = u.flags;
      let dmg = u.dmg * b.dmgMul(u);
      b.damage(t, dmg, { type: 'cursed', src: u, kind: 'shard' });
      b.fx('beam', { x1: u.x, y1: u.y - 10, x2: t.x, y2: t.y, color: '#8ad8ff', width: 4 });
      if (!t.alive) return;
      if (t.chillUntil === undefined || b.time > t.chillUntil) t.chill = 0;
      if (t.noChillUntil > b.time) return;
      t.chill = (t.chill || 0) + 1; t.chillUntil = b.time + 4;
      b.slow(t, 0.15 * t.chill, 2);
      if (t.chill >= f.chillMax) {
        t.chill = 0;
        if (t.boss) { b.slow(t, 0.5, 2.5); b.vulnerable(t, 0.15, 2.5); t.noChillUntil = b.time + 6; }
        else {
          const dur = f.freeze;
          t.frozen = true; t.frozenUntil = Math.max(t.frozenUntil || 0, b.time + dur); t.noChillUntil = b.time + dur + 1.5;
          b.vulnerable(t, f.shatter, dur);
          b.schedule(dur, () => { if (t.alive && b.time >= t.frozenUntil - 0.001) t.frozen = false; });
        }
        b.fx('shock', { x: t.x, y: t.y, r: 38, color: '#bfeaff', bolt: true });
      }
    },
    tick(u, b, dt) {
      const f = u.flags;
      if (!f.frostCd || !cdTick(u.k, 'fr', f.frostCd * 0.5, dt)) return;
      const c = near(b, u.x, u.y, u.rangePx + TILE * 0.5);
      if (!c.length) { u.k.fr = 0; return; }
      for (const e of c) b.slow(e, 0.5, 3);
      b.fx('shock', { x: u.x, y: u.y, r: u.rangePx + TILE * 0.5, color: '#8ad8ff' });
      u.k.fr = f.frostCd;
    },
  };

  // ------------------------------------------------------------ Naoya: frames
  K.naoya = {
    attack(u, t, b) {
      const f = u.flags, dmg = u.dmg * b.dmgMul(u);
      b.damage(t, dmg, { type: 'phys', src: u, kind: 'punch' });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: '#ffd24a' });
      if (f.echo) b.schedule(0.07, () => { if (t.alive && !u.removed) { b.damage(t, dmg * f.echo, { type: 'phys', src: u, kind: 'punch' }); b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: '#fff2a8' }); } });
    },
    tick(u, b, dt) {
      const f = u.flags;
      if (!f.lockCd || !cdTick(u.k, 'lk', f.lockCd * 0.5, dt)) return;
      const c = near(b, u.x, u.y, u.rangePx + TILE, false, true);
      if (!c.length) { u.k.lk = 0; return; }
      c.sort((a, z) => (a.pathLen - a.dist) - (z.pathLen - z.dist) || a.id - z.id);
      for (const e of c.slice(0, f.lockN)) { b.stun(e, f.lockT); b.fx('boogie', { x1: u.x, y1: u.y, x2: e.x, y2: e.y }); }
      u.k.lk = f.lockCd;
    },
  };

  // ------------------------------------------------------------ Higgurma: Judgeman
  K.higuruma = {
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      const conf = f.confiscateEvery && u.hits % f.confiscateEvery === 0;
      if (conf) { t.shield = 0; b.nullify(t, 6); }
      b.damage(t, u.dmg * b.dmgMul(u) * (conf ? 1.5 : 1), { type: 'cursed', src: u, kind: 'slam', crit: !!conf });
      b.fx(conf ? 'impact' : 'shock', { x: t.x, y: t.y, r: conf ? 46 : 30, color: '#d8d0b0' });
      if (f.execAt && t.alive && !t.boss && t.hp / t.maxHp <= f.execAt) { b.damage(t, t.hp + t.shield + 1, { type: 'cursed', src: u, kind: 'blackflash', crit: true, pierceShield: true }); b.fx('impact', { x: t.x, y: t.y, r: 50, color: '#fff' }); }
    },
  };
  DomainFx.deadlySentencing = {
    start(b, d, u) {
      d.data.guilty = u.flags.guiltyDmg || 0.35;
      for (const e of b.enemies) if (e.alive) b.vulnerable(e, d.data.guilty, 1);
      b.fx('clap', { x: u.x, y: u.y });
    },
    tick(b, d) { for (const e of b.enemies) if (e.alive) b.vulnerable(e, d.data.guilty, 0.5); },
    end(b, d) {
      const u = d.owner;
      for (const e of b.enemies.slice()) {
        if (!e.alive) continue;
        if (e.boss) b.damage(e, e.maxHp * 0.06, { type: 'cursed', src: u, kind: 'blackflash', crit: true, pierceShield: true });
        else if (e.hp / e.maxHp < 0.35) b.damage(e, e.hp + e.shield + 1, { type: 'cursed', src: u, kind: 'blackflash', crit: true, pierceShield: true });
        else b.damage(e, u.dmg * b.dmgMul(u) * 2, { type: 'cursed', src: u, kind: 'slam' });
        if (e.alive) b.fx('impact', { x: e.x, y: e.y, r: 40, color: '#d8d0b0' });
      }
    },
  };

  // ------------------------------------------------------------ Geto: absorb, Dragon, Uzumaki
  K.geto = {
    init(u, b) {
      u.k.spirits = 0;
      u.k.off = b.events.on('kill', (ev) => {
        if (u.removed) { u.k.off(); return; }
        const e = ev.enemy;
        if (!e || e.boss || e.def.split || e.owner) return;
        if (Util.dist(u.x, u.y, e.x, e.y) <= u.rangePx + TILE * 1.5) { u.k.spirits = Math.min(10, u.k.spirits + 1); b.fx('summon', { x: e.x, y: e.y, color: '#a47bff' }); }
      });
    },
    onRemove(u) { if (u.k.off) u.k.off(); },
    attack(u, t, b) {
      const f = u.flags;
      const dmg = u.dmg * b.dmgMul(u) * (1 + u.k.spirits * f.absorb);
      b.damage(t, dmg, { type: 'cursed', src: u, kind: 'wave' });
      b.fx('beam', { x1: u.x, y1: u.y - 10, x2: t.x, y2: t.y, color: '#a47bff', width: 4 + Math.min(4, u.k.spirits * 0.5) });
    },
    tick(u, b, dt) {
      const f = u.flags;
      if (f.dragon && !b.summons.some((s) => s.owner === u && s.def.id === 'dragon')) { b.spawnSummon(u, 'dragon', { life: Infinity }); b.fx('summon', { x: u.x, y: u.y, color: '#ff8ad8' }); }
      if (f.uzumakiCd && u.k.spirits > 0 && cdTick(u.k, 'uz', f.uzumakiCd * 0.5, dt)) {
        const t = b.pickTarget(u, { mode: 'strongest' });
        if (!t) { u.k.uz = 0; return; }
        const sp = u.k.spirits;
        u.k.spirits = 0; u.k.uz = f.uzumakiCd;
        b.fx('purpleCharge', { x: u.x, y: u.y });
        b.schedule(0.5, () => {
          if (u.removed || b.over) return;
          const t2 = t.alive ? t : (b.pickTarget(u, { mode: 'strongest' }) || t);
          const dx = t2.x - u.x, dy = t2.y - u.y, d = Math.hypot(dx, dy) || 1, len = u.rangePx + TILE * 2;
          const x2 = u.x + (dx / d) * len, y2 = u.y + (dy / d) * len;
          b.lineHit(u.x, u.y, x2, y2, TILE * 0.9, u.dmg * b.dmgMul(u) * (f.uzumakiMult + 0.5 * sp), { type: 'cursed', src: u, kind: 'purple', crit: true, pierceShield: true });
          b.fx('purple', { x1: u.x, y1: u.y, x2, y2, width: TILE * 0.9 });
        });
      }
    },
  };
  // Rainbow Dragon
  K.summon.orbiter = (s, b, dt) => {
    const o = s.owner, d = s.def, f = o.flags;
    s.homeAngle += dt * 1.6;
    const R = Math.max(70, o.rangePx * 0.62);
    const gx = o.x + Math.cos(s.homeAngle) * R, gy = o.y + Math.sin(s.homeAngle) * R * 0.55 - 22;
    s.face = Math.cos(s.homeAngle + 1.57) >= 0 ? 1 : -1;
    s.x += (gx - s.x) * Math.min(1, dt * 5); s.y += (gy - s.y) * Math.min(1, dt * 5);
    s.cd -= dt * b.spdMul(o);
    if (s.cd > 0) return;
    const c = near(b, s.x, s.y, d.radius * TILE + 40, true, true);
    if (!c.length) { s.cd = 0; return; }
    c.sort((a, z) => Util.dist2(s.x, s.y, a.x, a.y) - Util.dist2(s.x, s.y, z.x, z.y) || a.id - z.id);
    const e = c[0], dmg = o.dmg * d.dmgMult * (f.dragonPow || 1) * b.dmgMul(o);
    b.damage(e, dmg, { type: 'cursed', src: o, kind: 'bite' });
    b.aoe(e.x, e.y, 0.6 * TILE, dmg * 0.5, { type: 'cursed', src: o, exclude: e, kind: 'bite' });
    b.fx('shock', { x: e.x, y: e.y, r: 0.6 * TILE, color: '#ff8ad8' });
    s.cd = d.cd;
  };

  // ------------------------------------------------------------ Kashimo: Amber
  K.kashimo = {
    spdBonus(u) { return u.k.amberT > 0 ? 1.2 : u.k.burnT > 0 ? -0.4 : 0; },
    attack(u, t, b) {
      const f = u.flags, k = u.k;
      const chains = f.chains + (k.amberT > 0 ? 3 : 0);
      let dmg = u.dmg * b.dmgMul(u), prev = t;
      const hit = [t];
      b.damage(t, dmg, { type: 'cursed', src: u, kind: 'bolt' });
      line(b, { x: u.x, y: u.y - 10 }, t, '#ffe36a', 4);
      for (let i = 0; i < chains; i++) {
        const c = near(b, prev.x, prev.y, 1.9 * TILE).filter((e) => !hit.includes(e));
        if (!c.length) break;
        c.sort((a, z) => Util.dist2(prev.x, prev.y, a.x, a.y) - Util.dist2(prev.x, prev.y, z.x, z.y) || a.id - z.id);
        const n = c[0];
        dmg *= 0.82;
        b.damage(n, dmg, { type: 'cursed', src: u, kind: 'bolt' });
        line(b, prev, n, '#fff2a8', 3);
        hit.push(n); prev = n;
      }
    },
    tick(u, b, dt) {
      const f = u.flags, k = u.k;
      if (k.amberT > 0) { k.amberT -= dt; if (k.amberT <= 0) { k.amberT = 0; k.burnT = f.burn; b.fx('poof', { x: u.x, y: u.y }); } return; }
      if (k.burnT > 0) { k.burnT -= dt; return; }
      if (!f.amberCd) return;
      if (k.acd === undefined) k.acd = f.amberCd * 0.5;
      k.acd -= dt;
      if (k.acd > 0) return;
      const c = near(b, u.x, u.y, u.rangePx);
      if (c.length >= 4 || c.some((e) => e.boss) || k.acd < -12) { k.amberT = f.amberDur; k.acd = f.amberCd; b.fx('rika', { x: u.x, y: u.y }); }
    },
  };

  // ------------------------------------------------------------ Yuki: Virtual Mass, Garuda
  K.yuki = {
    attack(u, t, b) {
      const f = u.flags, k = u.k;
      if (k.tid === t.id) k.mass = Math.min(f.massMax, (k.mass || 0) + 1); else { k.tid = t.id; k.mass = 0; }
      const full = k.mass >= f.massMax;
      b.damage(t, u.dmg * b.dmgMul(u) * (1 + k.mass * f.massStep), { type: 'phys', src: u, pierce: f.pierce + (full ? 0.2 : 0), kind: full ? 'slam' : 'punch', crit: full });
      b.fx(full ? 'impact' : 'slash', { x: t.x, y: t.y, r: 54, x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: full ? '#d8e0ff' : '#ffffff' });
    },
    tick(u, b) {
      const f = u.flags;
      if (f.garudaCd && !b.summons.some((s) => s.owner === u && s.def.id === 'garuda')) { b.spawnSummon(u, 'garuda', { life: Infinity }); b.fx('summon', { x: u.x, y: u.y, color: '#d8e0ff' }); }
    },
  };
  K.summon.diver = (s, b, dt) => {
    const o = s.owner, d = s.def, f = o.flags;
    if (s.dive) {
      const t = s.dive;
      if (!t.alive) { s.dive = null; s.cd = 1; return; }
      s.x += (t.x - s.x) * Math.min(1, dt * 14); s.y += (t.y - 10 - s.y) * Math.min(1, dt * 14);
      if (Util.dist(s.x, s.y, t.x, t.y - 10) < 16) {
        const dmg = o.dmg * d.dmgMult * b.dmgMul(o);
        const rr = d.radius * TILE;
        for (const e of near(b, t.x, t.y, rr)) { b.damage(e, dmg, { type: 'phys', src: o, kind: 'slam', crit: true }); if (e.alive) b.stun(e, d.stun); }
        if (f.garudaCd <= 6) for (const e of near(b, t.x, t.y, 2.2 * TILE, false, true)) if (e.alive && !e.knockImmune && e !== t) { e.dist += Util.clamp(t.dist - e.dist, -TILE * 1.2, TILE * 1.2); e.path.posAt(e.dist, e); }
        b.fx('impact', { x: t.x, y: t.y, r: rr, color: '#d8e0ff' });
        s.dive = null; s.cd = f.garudaCd;
      }
      return;
    }
    s.homeAngle += dt * 0.8;
    s.x += (o.x + 40 + Math.cos(s.homeAngle) * 10 - s.x) * Math.min(1, dt * 5);
    s.y += (o.y - 56 + Math.sin(s.homeAngle * 2) * 5 - s.y) * Math.min(1, dt * 5);
    s.cd -= dt * b.spdMul(o);
    if (s.cd > 0) return;
    const t = b.pickTarget(o, { mode: 'strongest', rangePx: o.rangePx * 1.4, air: true, ground: true });
    if (!t) { s.cd = 0; return; }
    s.dive = t;
  };

  // ------------------------------------------------------------ Jogo (playable): flames
  function ignite(b, u, e, pct) {
    if (!e.alive || (e.burnUntil || 0) > b.time) return;
    e.burnUntil = b.time + 3;
    const per = u.dmg * b.dmgMul(u) * pct / 4;
    for (let i = 1; i <= 4; i++) b.schedule(0.75 * i, () => { if (e.alive && !u.removed) { b.damage(e, per, { type: 'cursed', src: u, kind: 'burn' }); b.fx('spark', { x: e.x, y: e.y, color: '#ff8a3a' }); } });
  }
  K.jogoC = {
    attack(u, t, b) {
      const f = u.flags, dmg = u.dmg * b.dmgMul(u);
      b.damage(t, dmg, { type: 'cursed', src: u, kind: 'red' });
      b.aoe(t.x, t.y, f.splash * TILE * 0.6, dmg * 0.55, { type: 'cursed', src: u, exclude: t, kind: 'wave', air: false });
      b.fx('red', { x: t.x, y: t.y, r: f.splash * TILE * 0.6, x1: u.x, y1: u.y });
      ignite(b, u, t, f.burn);
    },
    tick(u, b, dt) {
      const f = u.flags;
      if (!f.emberCd || !cdTick(u.k, 'em', f.emberCd * 0.5, dt)) return;
      const c = byHp(near(b, u.x, u.y, u.rangePx), true).slice(0, 4);
      if (!c.length) { u.k.em = 0; return; }
      for (const e of c) { b.damage(e, u.dmg * b.dmgMul(u) * 1.4, { type: 'cursed', src: u, kind: 'burn' }); ignite(b, u, e, f.burn); b.fx('spark', { x: e.x, y: e.y, color: '#ff6a2a' }); line(b, u, e, '#ff9a4a', 2); }
      u.k.em = f.emberCd;
    },
  };
  DomainFx.ironMountain = {
    start(b, d, u) { d.data.n = 0; b.fx('impact', { x: u.x, y: u.y, r: 160, color: '#ff6a2a' }); },
    tick(b, d, dt) {
      d.data.n -= dt;
      if (d.data.n > 0) return;
      d.data.n = 0.5;
      const u = d.owner, base = u.dmg * b.dmgMul(u) * 0.8;
      for (const e of b.enemies.slice()) {
        if (!e.alive) continue;
        b.damage(e, e.boss ? base * 0.5 : base, { type: 'cursed', src: u, kind: 'burn' });
        b.nullify(e, 0.6);
      }
      b.fx('rikaBarrage', { x: u.x, y: u.y });
    },
  };

  // ------------------------------------------------------------ Mahito (playable): souls
  K.mahitoC = {
    attack(u, t, b) {
      const f = u.flags, base = u.dmg * b.dmgMul(u);
      b.damage(t, base, { type: 'cursed', src: u, kind: 'transfigure', pierceShield: false });
      b.fx('copy', { x: t.x, y: t.y });
      if (!t.alive) return;
      if (f.soulDmg) b.damage(t, Math.min((t.maxHp - t.hp) * f.soulDmg, base * 8), { type: 'cursed', src: u, kind: 'transfigure', pierceShield: true });
      if (t.alive && b.rng.next() < f.morph) {
        const cut = t.boss ? t.maxHp * 0.02 : t.hp * 0.6;
        b.damage(t, cut, { type: 'cursed', src: u, kind: 'blackflash', crit: true, pierceShield: true });
        b.fx('impact', { x: t.x, y: t.y, r: 44, color: '#c8a0ff' });
      }
    },
  };
  DomainFx.embodiment = {
    start(b, d, u) { d.data.n = 1; b.addBuff('spd', 0.3, d.dur); b.fx('summon', { x: u.x, y: u.y, color: '#c8a0ff' }); },
    tick(b, d, dt) {
      d.data.n -= dt;
      if (d.data.n > 0) return;
      d.data.n = 1;
      const u = d.owner;
      for (const e of b.enemies.slice()) if (e.alive) { b.damage(e, e.hp * (e.boss ? 0.015 : 0.04) + 1, { type: 'cursed', src: u, kind: 'transfigure', pierceShield: true }); b.fx('copy', { x: e.x, y: e.y }); }
    },
  };

  // ------------------------------------------------------------ Sukuna (playable)
  K.sukunaC = {
    attack(u, t, b) {
      const f = u.flags, k = u.k;
      u.hits++;
      const base = u.dmg * b.dmgMul(u);
      const cleave = f.cleave && u.hits % f.cleave === 0;
      let first = base;
      if (cleave) first += t.boss ? base * 3 : t.hp * 0.18;
      b.damage(t, first, { type: 'cursed', src: u, kind: cleave ? 'blackflash' : 'slash', crit: !!cleave });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: cleave ? '#ff2a3a' : '#fff0f0', bf: !!cleave });
      if (f.slashes > 1) {
        const c = near(b, t.x, t.y, 2.4 * TILE).filter((e) => e !== t);
        c.sort((a, z) => Util.dist2(t.x, t.y, a.x, a.y) - Util.dist2(t.x, t.y, z.x, z.y) || a.id - z.id);
        for (const e of c.slice(0, f.slashes - 1)) { b.damage(e, base * 0.7, { type: 'cursed', src: u, kind: 'slash' }); line(b, t, e, '#ff7a8a', 3); }
      }
    },
    tick(u, b, dt) {
      const f = u.flags;
      if (!f.fuga || !cdTick(u.k, 'fg', f.fuga * 0.5, dt)) return;
      const t = b.pickTarget(u, { mode: 'strongest' });
      if (!t) { u.k.fg = 0; return; }
      u.k.fg = f.fuga;
      b.fx('purpleCharge', { x: u.x, y: u.y });
      b.schedule(0.6, () => {
        if (u.removed || b.over) return;
        const t2 = t.alive ? t : (b.pickTarget(u, { mode: 'strongest' }) || t);
        const dmg = u.dmg * b.dmgMul(u) * 4.5;
        b.aoe(t2.x, t2.y, 1.7 * TILE, dmg, { type: 'cursed', src: u, kind: 'red', crit: true });
        b.fx('impact', { x: t2.x, y: t2.y, r: 1.7 * TILE, color: '#ff5a2a' });
        for (const e of near(b, t2.x, t2.y, 1.7 * TILE)) ignite(b, u, e, 0.5);
      });
    },
  };
  DomainFx.malevolentShrine = {
    start(b, d, u) { d.data.n = 0; b.fx('clash', { x: u.x, y: u.y }); },
    tick(b, d, dt) {
      d.data.n -= dt;
      if (d.data.n > 0) return;
      d.data.n = 0.3;
      const u = d.owner, base = u.dmg * b.dmgMul(u) * 0.5;
      for (const e of b.enemies.slice()) if (e.alive) b.damage(e, e.boss ? base * 0.7 : base, { type: 'cursed', src: u, kind: 'slash', pierceShield: true });
      b.fx('rikaBarrage', { x: u.x, y: u.y });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
