/* Character kits: per-character mechanics, summon behaviours, projectile handlers, and player Domains. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;
  const TILE = Balance.TILE;

  const rem = (e) => e.pathLen - e.dist;
  function nearest(b, x, y, r, air, ground, exclude) {
    const c = b._scratch2;
    b.enemiesNear(x, y, r, c, air !== false, ground !== false);
    let best = null, bd = Infinity;
    for (let i = 0; i < c.length; i++) {
      const e = c[i];
      if (e === exclude) continue;
      const d = Util.dist2(x, y, e.x, e.y);
      if (d < bd || (d === bd && best && e.id < best.id)) { best = e; bd = d; }
    }
    return best;
  }
  function endpoint(u, t, len) {
    const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy) || 1;
    return { x: u.x + (dx / d) * len, y: u.y + (dy / d) * len };
  }
  function sortByMode(list, mode, u) {
    switch (mode) {
      case 'strongest': list.sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield) || a.id - b.id); break;
      case 'weakest': list.sort((a, b) => (a.hp + a.shield) - (b.hp + b.shield) || a.id - b.id); break;
      case 'last': list.sort((a, b) => a.dist - b.dist || a.id - b.id); break;
      case 'closest': list.sort((a, b) => Util.dist2(u.x, u.y, a.x, a.y) - Util.dist2(u.x, u.y, b.x, b.y) || a.id - b.id); break;
      default: list.sort((a, b) => rem(a) - rem(b) || a.id - b.id);
    }
  }

  const K = {};

  // Fallback so an unknown kit still works: plain single-target hit.
  K._default = {
    attack(u, t, b) {
      b.damage(t, u.dmg * b.dmgMul(u), { type: u.dtype, src: u });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: u.def.color });
    },
  };

  // ------------------------------------------------------------ Yuji
  K.yuji = {
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      let mult = 1, bf = false;
      if (f.bfEvery && u.hits % f.bfEvery === 0) { mult = f.bfMult || 2.6; bf = true; }
      const dmg = u.dmg * b.dmgMul(u) * mult;
      b.damage(t, dmg, { type: 'phys', src: u, crit: bf, pierce: bf ? 0.5 : 0, kind: bf ? 'blackflash' : 'punch' });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: bf ? '#ff3b5c' : '#ffd0e0', bf });
      if (f.divergent) {
        b.schedule(0.18, () => { if (t.alive && !u.removed) { b.damage(t, u.dmg * b.dmgMul(u) * f.divergent, { type: 'phys', src: u, kind: 'punch' }); b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: '#ffd0e0' }); } });
      }
      if (f.splash) {
        b.aoe(t.x, t.y, f.splash * TILE, dmg * (f.splashDmg || 0.55), { type: 'cursed', src: u, kind: 'wave', exclude: t });
        b.fx('shock', { x: t.x, y: t.y, r: f.splash * TILE, color: '#ff9ac0' });
      }
    },
  };

  // ------------------------------------------------------------ Panda (blocker)
  function releaseHeld(u, b, e, idx) {
    u.k.held.splice(idx, 1);
    e.heldBy = 0;
    e.breakawayUntil = b.time + 5;
  }
  K.panda = {
    init(u) { u.k.held = []; },
    tick(u, b) {
      const f = u.flags, held = u.k.held, reach = u.rangePx;
      for (let i = held.length - 1; i >= 0; i--) {
        const e = held[i];
        if (!e.alive || e.heldBy !== u.uid || b.time >= e.holdUntil || Util.dist(u.x, u.y, e.x, e.y) > reach + e.size * 0.5) releaseHeld(u, b, e, i);
        else if (e.rootT < 0.12) e.rootT = 0.12;
      }
      if (held.length < (f.holdMax || 1)) {
        const c = b._scratch;
        b.enemiesNear(u.x, u.y, reach * 0.92, c, false, true);
        c.sort((a, z) => rem(a) - rem(z) || a.id - z.id);
        for (let i = 0; i < c.length && held.length < f.holdMax; i++) {
          const e = c[i];
          if (e.heldBy || b.time < e.breakawayUntil) continue;
          e.heldBy = u.uid;
          const base = f.holdTime || 3.2;
          e.holdUntil = b.time + (e.boss ? base * 0.33 : base);
          held.push(e);
          e.rootT = Math.max(e.rootT, 0.12);
          b.fx('hold', { x: e.x, y: e.y });
        }
      }
    },
    onRemove(u, b) { for (let i = u.k.held.length - 1; i >= 0; i--) releaseHeld(u, b, u.k.held[i], i); },
    attack(u, t, b) {
      const f = u.flags, dmg = u.dmg * b.dmgMul(u);
      b.damage(t, dmg, { type: 'phys', src: u, kind: 'slam' });
      b.aoe(t.x, t.y, TILE * 0.8, dmg * 0.4, { type: 'phys', src: u, air: false, exclude: t, kind: 'slam' });
      if (f.stunSlam && t.alive) b.stun(t, f.stunSlam);
      b.fx('slam', { x: t.x, y: t.y, r: TILE * 0.8 });
    },
  };

  // ------------------------------------------------------------ Nobara
  K.nobara = {
    attack(u, t, b) {
      const n = u.flags.multi || 1;
      for (let i = 0; i < n; i++) {
        const tgt = i === 0 ? t : (b.pickTarget(u, { exclude: t }) || t);
        b.fire({ x: u.x, y: u.y - 8, target: tgt, speed: 640, dmg: u.dmg * b.dmgMul(u), kind: 'nail', unit: u, color: '#ffb36a' });
      }
    },
    tick(u, b, dt) {
      const f = u.flags;
      if (!(f.resonance > 0)) return;
      u.k.reso = (u.k.reso === undefined ? f.resonance * 0.5 : u.k.reso) - dt;
      if (u.k.reso > 0) return;
      const c = b._scratch;
      b.enemiesNear(u.x, u.y, u.rangePx + TILE, c, true, true);
      let any = false;
      for (let i = 0; i < c.length; i++) if (c[i].markStacks > 0) { any = true; break; }
      if (!any) { u.k.reso = 0; return; }
      const targets = c.filter((e) => e.markStacks > 0);
      for (const e of targets) {
        if (!e.alive) continue;
        const stacks = e.markStacks;
        e.markStacks = 0; e.markT = 0;
        b.damage(e, u.dmg * b.dmgMul(u) * 1.1 * stacks, { type: 'cursed', src: u, kind: 'resonance', crit: true });
        if (f.resoSplash) b.aoe(e.x, e.y, f.resoSplash * TILE, u.dmg * b.dmgMul(u) * 0.5 * stacks, { type: 'cursed', src: u, exclude: e, kind: 'resonance' });
        b.fx('resonance', { x: e.x, y: e.y, r: (f.resoSplash || 0.5) * TILE });
      }
      u.k.reso = f.resonance;
    },
  };

  // ------------------------------------------------------------ Megumi (summoner)
  K.megumi = {
    noAttack: true,
    init(u) { u.k.chk = 0; },
    tick(u, b, dt) {
      u.k.chk -= dt;
      if (u.k.chk > 0) return;
      u.k.chk = 0.5;
      const f = u.flags;
      let dogs = 0, nue = 0, max = 0;
      for (const s of b.summons) {
        if (s.owner !== u || s.tmp) continue;
        if (s.def.id === 'dog') dogs++; else if (s.def.id === 'nue') nue++; else if (s.def.id === 'max') max++;
      }
      while (dogs < f.dogs) { b.spawnSummon(u, 'dog', { homeAngle: dogs * 2.1 }); dogs++; b.fx('summon', { x: u.x, y: u.y, color: '#cfd8ff' }); }
      if (f.nue && !nue) { b.spawnSummon(u, 'nue', { life: Infinity }); b.fx('summon', { x: u.x, y: u.y, color: '#ffe36a' }); }
      if (f.max && !max) { b.spawnSummon(u, 'max'); b.fx('summon', { x: u.x, y: u.y, color: '#4aa8ff' }); }
    },
  };
  const shadowMul = (b) => (b.domain && b.domain.id === 'shadowGarden' ? 1.5 : 1);
  K.summon = {
    chaser(s, b, dt) {
      const o = s.owner, d = s.def;
      const reach = o.rangePx;
      if (!s.target || !s.target.alive || Util.dist(o.x, o.y, s.target.x, s.target.y) > reach + 40) {
        s.target = b.pickTarget(o, { air: false, ground: true, rangePx: reach });
      }
      let gx, gy;
      if (s.target) { gx = s.target.x; gy = s.target.y; } else { s.homeAngle += dt * 0.6; gx = o.x + Math.cos(s.homeAngle) * 48; gy = o.y + 8 + Math.sin(s.homeAngle) * 28; }
      const dx = gx - s.x, dy = gy - s.y, dist = Math.hypot(dx, dy);
      const bite = s.target ? d.size + s.target.size * 0.35 : 4;
      if (dist > bite) {
        const st = Math.min(dist, d.speed * dt);
        s.x += (dx / dist) * st; s.y += (dy / dist) * st;
        s.face = dx >= 0 ? 1 : -1;
      }
      s.cd -= dt;
      if (s.target && dist <= bite + 6 && s.cd <= 0) {
        b.damage(s.target, o.dmg * d.dmgMult * b.dmgMul(o) * shadowMul(b), { type: 'phys', src: o, kind: 'bite' });
        s.cd = d.spa / b.spdMul(o);
        b.fx('bite', { x: s.target.x, y: s.target.y });
      }
    },
    striker(s, b, dt) {
      const o = s.owner, d = s.def;
      s.cd -= dt * b.spdMul(o);
      const t = s.target && s.target.alive ? s.target : null;
      let gx = o.x + 46, gy = o.y - 40;
      if (t) { gx = t.x; gy = t.y - 20; }
      s.x += (gx - s.x) * Math.min(1, dt * 6);
      s.y += (gy - s.y) * Math.min(1, dt * 6);
      if (s.cd > 0) return;
      const tgt = b.pickTarget(o, { air: true, ground: true, mode: 'strongest' });
      if (!tgt) { s.target = null; s.cd = 0; return; }
      s.target = tgt;
      const rr = d.radius * TILE;
      const c = b._scratch2;
      b.enemiesNear(tgt.x, tgt.y, rr, c, true, true);
      const dmg = o.dmg * d.dmgMult * b.dmgMul(o) * shadowMul(b);
      const hit = c.slice();
      for (const e of hit) { if (!e.alive) continue; b.damage(e, dmg, { type: 'cursed', src: o, kind: 'shock' }); if (e.alive) b.stun(e, d.stun); }
      b.fx('shock', { x: tgt.x, y: tgt.y, r: rr, color: '#ffe36a', bolt: true });
      s.cd = d.cd;
    },
    zone(s, b, dt) {
      const o = s.owner, d = s.def;
      s.x += (o.x - 46 - s.x) * Math.min(1, dt * 4);
      s.y += (o.y + 20 - s.y) * Math.min(1, dt * 4);
      s.cd -= dt * b.spdMul(o);
      if (s.cd > 0) return;
      const t = b.pickTarget(o, { air: false, ground: true, mode: 'first' });
      if (!t) { s.cd = 0; return; }
      b.zones.push({ x: t.x, y: t.y, r: d.radius * TILE, t: 3.5, tick: 0, slow: d.slow, dmg: o.dmg * d.dmgMult * shadowMul(b), owner: o });
      b.fx('water', { x: t.x, y: t.y, r: d.radius * TILE });
      s.cd = d.cd;
    },
  };

  // ------------------------------------------------------------ Maki
  K.maki = {
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      let dmg = u.dmg * b.dmgMul(u);
      if (f.armoredBonus && t.armor + t.armorBonus >= 0.3) dmg *= 1 + f.armoredBonus;
      b.damage(t, dmg, { type: 'phys', src: u, pierce: f.pierce, kind: 'spear' });
      if (f.armorBreak && t.alive) b.armorBreak(t, f.armorBreak, 5, 5);
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: '#b8f0c0' });
      if (f.sweepEvery && u.hits % f.sweepEvery === 0) {
        b.aoe(u.x, u.y, 1.5 * TILE, dmg * 0.9, { type: 'phys', src: u, pierce: f.pierce, air: false, kind: 'sweep' });
        b.fx('sweep', { x: u.x, y: u.y, r: 1.5 * TILE, color: '#b8f0c0' });
      }
    },
  };

  // ------------------------------------------------------------ Inumaki
  const SPEECH = {
    slow: { word: 'DON\'T MOVE', color: '#9ad0ff' }, stop: { word: 'STOP', color: '#ffe36a' }, blast: { word: 'BLAST AWAY', color: '#ff9a6a' },
    explode: { word: 'EXPLODE', color: '#ff5a7a' }, crush: { word: 'CRUSH', color: '#c48cff' },
  };
  K.inumaki = {
    noAttack: true,
    tick(u, b, dt) {
      const k = u.k, f = u.flags;
      if (k.castT === undefined) { k.castT = 1.5; k.idx = 0; }
      k.castT -= dt * b.spdMul(u);
      if (k.castT > 0) return;
      const c = b._scratch;
      b.enemiesNear(u.x, u.y, u.rangePx, c, u.canAir, u.canGround);
      if (!c.length) { k.castT = 0; return; }
      sortByMode(c, u.targeting, u);
      const list = c.slice(0, f.maxTargets);
      const kind = f.crush ? 'crush' : f.speech[k.idx++ % f.speech.length];
      const base = u.dmg * b.dmgMul(u);
      for (const e of list) {
        if (!e.alive) continue;
        if (kind === 'crush') { b.slow(e, 0.5, 3); b.stun(e, 1.2); b.damage(e, base * 1.3, { type: 'cursed', src: u, kind: 'speech' }); }
        else if (kind === 'slow') { b.slow(e, 0.5, 3.5); b.damage(e, base * 0.6, { type: 'cursed', src: u, kind: 'speech' }); }
        else if (kind === 'stop') { b.stun(e, 1.4); b.damage(e, base * 0.6, { type: 'cursed', src: u, kind: 'speech' }); }
        else if (kind === 'blast') { b.knockback(e, 1.6); b.slow(e, 0.3, 1.5); b.damage(e, base * 0.6, { type: 'cursed', src: u, kind: 'speech' }); }
        else if (kind === 'explode') { b.damage(e, base * 2.2, { type: 'cursed', src: u, kind: 'speech', crit: true }); b.fx('shock', { x: e.x, y: e.y, r: TILE * 0.7, color: '#ff5a7a' }); }
      }
      const sp = SPEECH[kind];
      b.fx('speech', { x: u.x, y: u.y, r: u.rangePx, word: sp.word, color: sp.color });
      k.castT = u.baseSpa;
    },
  };

  // ------------------------------------------------------------ Nanami
  K.nanami = {
    spdBonus(u) { return u.k.otT > 0 ? 0.35 : 0; },
    attack(u, t, b) {
      const f = u.flags, k = u.k;
      u.hits++;
      const crit = f.ratioEvery && u.hits % f.ratioEvery === 0;
      let mult = crit ? f.ratioMult : 1;
      if (crit && t.boss) mult *= 1.5;
      const dmg = u.dmg * b.dmgMul(u) * mult;
      b.damage(t, dmg, { type: 'phys', src: u, crit, pierce: crit ? f.ratioPierce : 0, kind: crit ? 'ratio' : 'strike' });
      b.fx(crit ? 'ratio' : 'slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, x: t.x, y: t.y, color: '#ffe9a0' });
      if (crit && f.collapse) b.aoe(t.x, t.y, f.collapse * TILE, dmg * 0.5, { type: 'phys', src: u, exclude: t, pierce: f.ratioPierce });
      k.fightT = (k.fightT || 0) + u.baseSpa;
      k.idleT = 0;
    },
    tick(u, b, dt) {
      const k = u.k, f = u.flags;
      if (k.otT > 0) k.otT -= dt;
      if (k.otCd > 0) k.otCd -= dt;
      k.idleT = (k.idleT || 0) + dt;
      if (k.idleT > 3) k.fightT = 0;
      if (f.overtime && (k.fightT || 0) >= 12 && !(k.otCd > 0)) { k.otT = 8; k.otCd = 30; k.fightT = 0; b.fx('buff', { x: u.x, y: u.y, color: '#ffe9a0' }); }
    },
  };

  // ------------------------------------------------------------ Mei Mei
  K.meimei = {
    spdBonus(u) { return u.k.frenzyT > 0 ? 2 : 0; },
    onWaveStart(u, b) { if (u.flags.waveYen) b.addYen(u.flags.waveYen, u.x, u.y - 20); },
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      const axe = f.axeEvery && u.hits % f.axeEvery === 0;
      b.fire({ x: u.x, y: u.y - 8, target: t, speed: 560, dmg: u.dmg * b.dmgMul(u) * (axe ? f.axeMult : 1), kind: 'crow', unit: u, color: axe ? '#ff9a6a' : '#7de0e0', data: { bounces: f.bounces, hit: [t.id], axe } });
    },
    tick(u, b, dt) {
      const k = u.k, f = u.flags;
      if (k.frenzyT > 0) k.frenzyT -= dt;
      if (f.frenzyCd) {
        if (k.fcd === undefined) k.fcd = 8;
        k.fcd -= dt;
        if (k.fcd <= 0) {
          const t = b.pickTarget(u);
          if (t) { k.frenzyT = 6; k.fcd = f.frenzyCd; b.fx('buff', { x: u.x, y: u.y, color: '#7de0e0' }); } else k.fcd = 0;
        }
      }
    },
  };

  // ------------------------------------------------------------ Todo
  K.todo = {
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      let mult = 1, bf = false;
      if (f.bfEvery && u.hits % f.bfEvery === 0) { mult = f.bfMult || 2.4; bf = true; }
      b.damage(t, u.dmg * b.dmgMul(u) * mult, { type: 'phys', src: u, crit: bf, pierce: bf ? 0.4 : 0, kind: bf ? 'blackflash' : 'punch' });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: bf ? '#ff3b5c' : '#ffd9b0', bf });
    },
    tick(u, b, dt) {
      const f = u.flags, k = u.k;
      if (k.bw === undefined) k.bw = f.bwCd * 0.5;
      k.bw -= dt;
      if (k.bw > 0) return;
      const c = b._scratch;
      b.enemiesNear(u.x, u.y, f.bwRange * TILE, c, true, true);
      if (!c.length) { k.bw = 0; return; }
      c.sort((a, z) => rem(a) - rem(z) || a.id - z.id);
      let used = false;
      if (f.swap && c.length >= 2) {
        const front = c[0], rear = c[c.length - 1];
        if (front !== rear && !front.boss && !rear.boss && front.air === rear.air && Math.abs(rem(rear) - rem(front)) > TILE * 1.5) {
          const fx = [front.x, front.y], rx = [rear.x, rear.y];
          const tmp = { path: front.path, dist: front.dist, lane: front.lane, pathLen: front.pathLen };
          front.path = rear.path; front.dist = rear.dist; front.lane = rear.lane; front.pathLen = rear.pathLen;
          rear.path = tmp.path; rear.dist = tmp.dist; rear.lane = tmp.lane; rear.pathLen = tmp.pathLen;
          front.path.posAt(front.dist, front); rear.path.posAt(rear.dist, rear);
          b.stun(front, 0.4); b.stun(rear, 0.4);
          b.fx('boogie', { x1: fx[0], y1: fx[1], x2: front.x, y2: front.y });
          b.fx('boogie', { x1: rx[0], y1: rx[1], x2: rear.x, y2: rear.y });
          used = true;
        }
      }
      if (!used) {
        const e = c[0];
        const fromX = e.x, fromY = e.y;
        const push = e.boss ? f.bwPush * 0.3 : e.knockImmune ? f.bwPush * 0.5 : f.bwPush;
        e.dist = Math.max(0, e.dist - push * TILE);
        e.path.posAt(e.dist, e);
        if (!e.boss) b.stun(e, 0.5);
        b.fx('boogie', { x1: fromX, y1: fromY, x2: e.x, y2: e.y });
      }
      b.fx('clap', { x: u.x, y: u.y });
      if (f.brother) {
        for (const o of b.units) if (o !== u && Util.dist(o.x, o.y, u.x, u.y) <= 2.5 * TILE) { o.buffSpdT = 4; o.buffSpdAmt = 0.25; }
        u.buffSpdT = 4; u.buffSpdAmt = 0.25;
      }
      k.bw = f.bwCd;
    },
  };

  // ------------------------------------------------------------ Yuta
  K.yuta = {
    spdBonus(u) { return u.k.rikaT > 0 ? 0.3 : 0; },
    attack(u, t, b) {
      const f = u.flags, k = u.k;
      u.hits++;
      const rika = k.rikaT > 0;
      const dmg = u.dmg * b.dmgMul(u) * (rika ? 1.6 : 1);
      b.damage(t, dmg, { type: 'cursed', src: u, kind: 'katana', crit: rika });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: rika ? '#ff7ab8' : '#e8e8ff', bf: rika });
      if (rika) b.aoe(t.x, t.y, 1.1 * TILE, dmg * 0.6, { type: 'cursed', src: u, exclude: t });
      if (f.waveEvery && u.hits % f.waveEvery === 0) {
        const e2 = endpoint(u, t, u.rangePx + TILE);
        b.lineHit(u.x, u.y, e2.x, e2.y, TILE * 0.6, dmg * 0.7, { type: 'cursed', src: u, kind: 'beam' });
        b.fx('beam', { x1: u.x, y1: u.y, x2: e2.x, y2: e2.y, color: '#ff9ad0', width: TILE * 0.5 });
      }
      if (f.copyChance && t.alive && b.rng.next() < f.copyChance) {
        if (b.rng.next() < 0.5) b.stun(t, 0.8); else b.slow(t, 0.4, 3);
        b.fx('copy', { x: t.x, y: t.y });
      }
    },
    tick(u, b, dt) {
      const f = u.flags, k = u.k;
      if (k.rikaT > 0) k.rikaT -= dt;
      if (f.rikaCd) {
        if (k.rikaT <= 0) {
          if (k.rcd === undefined) k.rcd = 6;
          k.rcd -= dt;
          if (k.rcd <= 0) {
            if (b.pickTarget(u)) { k.rikaT = f.rikaDur; k.rcd = f.rikaCd; b.fx('rika', { x: u.x, y: u.y }); } else k.rcd = 0;
          }
        }
      }
    },
  };

  // ------------------------------------------------------------ Gojo
  K.gojo = {
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      const red = f.redEvery && u.hits % f.redEvery === 0;
      const base = u.dmg * b.dmgMul(u);
      if (red) {
        const r = 1.3 * TILE;
        const c = b._scratch2;
        b.enemiesNear(t.x, t.y, r, c, true, true);
        const list = c.slice();
        for (const e of list) { if (!e.alive) continue; b.damage(e, base * f.redMult, { type: 'cursed', src: u, kind: 'red', crit: true }); if (e.alive) b.knockback(e, f.redKnock); }
        b.fx('red', { x: t.x, y: t.y, r, x1: u.x, y1: u.y });
      } else {
        const r = 0.9 * TILE;
        const c = b._scratch2;
        b.enemiesNear(t.x, t.y, r, c, true, true);
        const list = c.slice();
        for (const e of list) {
          if (!e.alive) continue;
          b.damage(e, base, { type: 'cursed', src: u, kind: 'blue' });
          if (e.alive && e !== t && !e.knockImmune && e.air === t.air) {
            const diff = t.dist - e.dist;
            e.dist += Util.clamp(diff, -TILE * 0.6, TILE * 0.6);
            e.path.posAt(e.dist, e);
          }
        }
        b.fx('blue', { x: t.x, y: t.y, r, x1: u.x, y1: u.y });
      }
    },
    tick(u, b, dt) {
      const f = u.flags, k = u.k;
      if (!f.purple) return;
      if (k.pcd === undefined) k.pcd = 4;
      k.pcd -= dt;
      if (k.pcd > 0) return;
      const t = b.pickTarget(u);
      if (!t) { k.pcd = 0; return; }
      k.pcd = f.purpleCd;
      b.fx('purpleCharge', { x: u.x, y: u.y });
      b.schedule(0.6, () => {
        if (u.removed || b.over) return;
        const t2 = b.pickTarget(u) || t;
        const e2 = endpoint(u, t2, u.rangePx + TILE * 3);
        b.lineHit(u.x, u.y, e2.x, e2.y, f.purpleWidth * TILE, u.dmg * b.dmgMul(u) * f.purpleMult, { type: 'cursed', src: u, kind: 'purple', crit: true, pierceShield: true });
        b.fx('purple', { x1: u.x, y1: u.y, x2: e2.x, y2: e2.y, width: f.purpleWidth * TILE });
      });
    },
  };

  // ------------------------------------------------------------ Choso
  K.choso = {
    spdBonus(u) { return u.k.rsT > 0 ? u.flags.redScale : 0; },
    attack(u, t, b) {
      const f = u.flags;
      const e2 = endpoint(u, t, u.rangePx + TILE * 2);
      const w = f.beamWidth * TILE;
      b.lineHit(u.x, u.y, e2.x, e2.y, w, u.dmg * b.dmgMul(u), { type: 'cursed', src: u, kind: 'beam' });
      b.fx('beam', { x1: u.x, y1: u.y, x2: e2.x, y2: e2.y, color: '#e04646', width: w });
    },
    tick(u, b, dt) {
      const f = u.flags, k = u.k;
      if (k.rsT > 0) k.rsT -= dt;
      if (!f.supernovaCd) return;
      if (k.sn === undefined) k.sn = f.supernovaCd * 0.5;
      k.sn -= dt;
      if (k.sn > 0) return;
      const c = b._scratch;
      b.enemiesNear(u.x, u.y, u.rangePx, c, u.canAir, u.canGround);
      if (!c.length) { k.sn = 0; return; }
      sortByMode(c, 'first', u);
      const list = c.slice(0, f.supernovaCount);
      list.forEach((e, i) => {
        b.schedule(0.08 * i, () => {
          if (u.removed || !e.alive) return;
          b.aoe(e.x, e.y, 0.8 * TILE, u.dmg * b.dmgMul(u) * 0.55, { type: 'cursed', src: u, kind: 'shard' });
          b.fx('shock', { x: e.x, y: e.y, r: 0.8 * TILE, color: '#e04646' });
        });
      });
      if (f.redScale) k.rsT = 6;
      k.sn = f.supernovaCd;
    },
  };

  // ------------------------------------------------------------ Hakari
  K.hakari = {
    spdBonus(u) { return Math.min(u.flags.rampMax, (u.k.stacks || 0) * 0.05); },
    attack(u, t, b) {
      const f = u.flags, k = u.k;
      u.hits++;
      k.stacks = Math.min(40, (k.stacks || 0) + 1);
      k.decay = 2.5;
      let mult = 1;
      const jackpot = f.jackpotEvery && u.hits % f.jackpotEvery === 0;
      if (jackpot) { mult = 3; b.addYen(f.jackpotYen, u.x, u.y - 20); b.fx('jackpot', { x: u.x, y: u.y }); }
      const dmg = u.dmg * b.dmgMul(u) * mult;
      b.damage(t, dmg, { type: 'phys', src: u, crit: !!jackpot, kind: jackpot ? 'blackflash' : 'punch' });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: jackpot ? '#ffe36a' : '#ffb0e8', bf: jackpot });
      if (f.splash) b.aoe(t.x, t.y, f.splash * TILE, dmg * 0.5, { type: 'phys', src: u, exclude: t });
    },
    tick(u, b, dt) {
      const k = u.k;
      if (k.decay > 0) { k.decay -= dt; if (k.decay <= 0) k.stacks = 0; }
    },
  };

  // ------------------------------------------------------------ Toji
  K.toji = {
    attack(u, t, b) {
      const f = u.flags;
      u.hits++;
      let mult = 1;
      const execute = t.hp / t.maxHp <= f.executeAt;
      if (execute) mult = f.executeMult;
      if (f.nullify) { t.shield = 0; b.nullify(t, 4); }
      b.damage(t, u.dmg * b.dmgMul(u) * mult, { type: 'phys', src: u, pierce: f.pierce, kind: 'katana', crit: execute });
      b.fx('slash', { x1: u.x, y1: u.y, x2: t.x, y2: t.y, color: execute ? '#ff3b5c' : '#38f3d0', bf: execute });
      if (f.chainEvery && u.hits % f.chainEvery === 0) {
        const c = b._scratch;
        b.enemiesNear(t.x, t.y, 1.8 * TILE, c, false, true);
        sortByMode(c, 'closest', t);
        let n = 0;
        for (const e of c.slice()) {
          if (e === t || !e.alive) continue;
          if (f.nullify) { e.shield = 0; b.nullify(e, 4); }
          b.damage(e, u.dmg * b.dmgMul(u) * 0.8, { type: 'phys', src: u, pierce: f.pierce, kind: 'katana' });
          b.fx('slash', { x1: t.x, y1: t.y, x2: e.x, y2: e.y, color: '#38f3d0' });
          if (++n >= 2) break;
        }
      }
    },
  };

  // ------------------------------------------------------------ projectile handlers
  K.projectiles = {
    nail(b, p) {
      const u = p.unit;
      const e = p.target || nearest(b, p.x, p.y, 40, true, true);
      if (!e || !e.alive || !u) return;
      b.damage(e, p.dmg, { type: 'phys', src: u, kind: 'nail' });
      if (e.alive) b.mark(e, u.flags.markMax, u.flags.markVuln, 6);
      b.fx('spark', { x: e.x, y: e.y, color: '#ffb36a' });
    },
    crow(b, p) {
      const u = p.unit, d = p.data;
      const e = p.target || nearest(b, p.x, p.y, 40, true, true);
      if (!e || !e.alive || !u) return;
      b.damage(e, p.dmg, { type: 'phys', src: u, kind: d.axe ? 'axe' : 'crow', crit: d.axe });
      if (e.alive) e.crowMark = true;
      b.fx('spark', { x: e.x, y: e.y, color: '#7de0e0' });
      if (d.bounces > 0) {
        const c = b._scratch2;
        b.enemiesNear(e.x, e.y, 2.2 * TILE, c, true, true);
        let best = null, bd = Infinity;
        for (let i = 0; i < c.length; i++) {
          const o = c[i];
          if (d.hit.includes(o.id)) continue;
          const dd = Util.dist2(e.x, e.y, o.x, o.y);
          if (dd < bd) { best = o; bd = dd; }
        }
        if (best) b.fire({ x: e.x, y: e.y, target: best, speed: 620, dmg: p.dmg * 0.7, kind: 'crow', unit: u, color: '#7de0e0', data: { bounces: d.bounces - 1, hit: d.hit.concat(best.id), axe: false } });
      }
    },
  };

  // ------------------------------------------------------------ Domain effects
  const DomainFx = {
    unlimitedVoid: {
      start(b, d) {
        for (const e of b.enemies) if (e.alive) voidHit(b, e, d.dur);
        b.addBuff('spd', 0.25, d.dur);
      },
      tick(b, d) { for (const e of b.enemies) if (e.alive && !e.boss && e.stunT < 0.3) e.stunT = 0.3; else if (e.boss && e.slowT < 0.3) voidHit(b, e, 0.5); },
    },
    shadowGarden: {
      start(b, d, u) {
        for (let i = 0; i < 4; i++) b.spawnSummon(u, 'dog', { tmp: true, life: d.dur, homeAngle: i * 1.57 });
        b.fx('summon', { x: u.x, y: u.y, color: '#4a5cff' });
      },
      tick(b, d) { for (const e of b.enemies) if (e.alive) b.slow(e, 0.45, 0.35); },
    },
    idleDeath: {
      start(b, d) { d.data.rollAt = 2.0; d.data.rolled = false; d.data.result = null; },
      tick(b, d) {
        if (d.data.rolled || d.t < d.data.rollAt) return;
        d.data.rolled = true;
        const chance = Math.min(1, 1 / 6 + b.hakariMisses * 0.12);
        if (b.rng.next() < chance) {
          d.data.result = 'jackpot';
          b.hakariMisses = 0;
          d.dur = 12;
          b.addBuff('spd', 0.6, 12);
          b.addBuff('dmg', 0.3, 12);
        } else {
          b.hakariMisses++;
          const roll = Math.floor(b.rng.next() * 3);
          d.dur = d.t + 1.4;
          if (roll === 0) { d.data.result = 'yen'; b.addYen(120 + 10 * b.wave, 640, 300); }
          else if (roll === 1) { d.data.result = 'stun'; for (const e of b.enemies) if (e.alive) b.stun(e, 1.4); }
          else { d.data.result = 'power'; b.addBuff('dmg', 0.25, 6); }
        }
        b.fx('slotsRoll', { result: d.data.result });
      },
    },
    mutualLove: {
      start(b, d) { b.addBuff('dmg', 0.4, d.dur); d.data.next = 0.5; },
      tick(b, d, dt) {
        d.data.next -= dt;
        if (d.data.next > 0) return;
        d.data.next = 1;
        const u = d.owner;
        const base = u.dmg * b.dmgMul(u) * 0.8;
        for (const e of b.enemies.slice()) if (e.alive) b.damage(e, e.boss ? base * 0.5 : base, { type: 'cursed', src: u, kind: 'rika' });
        b.fx('rikaBarrage', { x: u.x, y: u.y });
      },
    },
  };
  function voidHit(b, e, dur) {
    if (!e.boss) { e.stunT = Math.max(e.stunT, dur); } else { e.slowAmt = 0.7; e.slowT = Math.max(e.slowT, dur); b.vulnerable(e, 0.25, dur); }
  }

  JJK.Kits = K;
  JJK.DomainFx = DomainFx;
})(typeof window !== 'undefined' ? window : globalThis);
