/* Boss AI. Every major attack is telegraphed via battle hazards (visible zones) before it resolves. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;
  const TILE = Balance.TILE, FY = Balance.FIELD_Y, W = Balance.W, ROWS = Balance.ROWS;

  // extra enemy used by Mahito's Split form
  JJK.Enemies.mahitoClone = {
    id: 'mahitoClone', name: 'Idle Transfiguration', hp: 150, speed: 70, armor: 0, yen: 30, leak: 3, threat: 0, size: 30, color: '#9ab0c8',
    desc: 'A soulless copy of Mahito.', tip: 'Vanishes if Mahito falls.',
  };

  const randUnit = (b) => (b.units.length ? b.units[b.rng.int(0, b.units.length - 1)] : null);
  const topUnit = (b) => {
    let best = null;
    for (const u of b.units) if (!best || u.damageDealt > best.damageDealt) best = u;
    return best;
  };
  function say(b, e, name, color) { b.events.emit('bossCast', { enemy: e, name, color: color || '#ff5a5a' }); }
  function phase(b, e, name) { b.events.emit('bossPhase', { enemy: e, name }); }
  function disableIn(b, h, dur) {
    const c = [];
    b.unitsInHazard(h, c);
    for (const u of c) b.disableUnit(u, dur);
    return c.length;
  }
  function circle(b, e, x, y, r, dur, label, color, dis, extra) {
    return b.hazard(Object.assign({
      shape: 'circle', x, y, r, dur, label, color, owner: e.id, cancelOnOwnerDeath: true,
      onResolve: (bb, h) => { if (dis) disableIn(bb, h, dis); bb.fx('impact', { x, y, r, color }); },
    }, extra || {}));
  }

  const AI = {};

  AI.finger = {
    init(b, e) { const a = e.ai; a.shells = 0; a.addT = 7; },
    update(b, e, dt) {
      const a = e.ai, r = e.hp / e.maxHp;
      const give = (name) => { e.shield += e.maxHp * 0.18; phase(b, e, name); b.fx('shell', { x: e.x, y: e.y }); };
      if (a.shells < 1 && r <= 0.66) { a.shells = 1; give('Cursed Shell'); }
      if (a.shells < 2 && r <= 0.33) { a.shells = 2; give('Cursed Shell'); e.speedMul = 1.4; phase(b, e, 'Enraged'); }
      a.addT -= dt;
      if (a.addT <= 0 && e.stunT <= 0) {
        a.addT = 11;
        say(b, e, 'Reinforcements', '#ffd27a');
        const dist = e.dist, lane = e.lane;
        circle(b, e, e.x, e.y, TILE * 1.2, 1.0, 'REINFORCEMENTS', '#ffd27a', 0, {
          onResolve: (bb) => { if (!e.alive) return; for (let i = 0; i < 3; i++) bb.spawnEnemy('skitter', { lane, dist: Math.max(0, e.dist - i * 20), wave: bb.wave }); },
        });
      }
    },
  };

  AI.jogo = {
    init(b, e) { const a = e.ai; a.meteorT = 6; a.maxT = 0; a.exhaust = 0; },
    update(b, e, dt) {
      const a = e.ai, r = e.hp / e.maxHp;
      if (a.exhaust > 0) { a.exhaust -= dt; e.rootT = Math.max(e.rootT, 0.2); }
      if (r <= 0.5 && !a.p2) { a.p2 = true; phase(b, e, 'Ember Insects'); }
      if (r <= 0.2 && !a.p3) { a.p3 = true; a.maxT = 1; phase(b, e, 'Maximum Overdrive'); }
      if (a.p3) {
        a.maxT -= dt;
        if (a.maxT <= 0 && b.units.length) {
          a.maxT = 22;
          // aim at the densest cluster of units
          let best = null, bn = -1;
          for (const u of b.units) { let n = 0; for (const o of b.units) if (Util.dist(u.x, u.y, o.x, o.y) <= TILE * 2.4) n++; if (n > bn) { best = u; bn = n; } }
          say(b, e, 'Maximum: Meteor', '#ff3a1a');
          circle(b, e, best.x, best.y, TILE * 2.4, 2.5, 'MAXIMUM: METEOR', '#ff3a1a', 6, {
            onResolve: (bb, h) => {
              disableIn(bb, h, 6);
              bb.fx('impact', { x: h.x, y: h.y, r: h.r, color: '#ff3a1a' });
              if (e.alive) { a.exhaust = 3.5; e.stunT = Math.max(e.stunT, 3); bb.vulnerable(e, 0.5, 4); phase(bb, e, 'Exhausted'); }
            },
          });
        }
      }
      a.meteorT -= dt;
      if (a.meteorT <= 0 && b.units.length) {
        const n = a.p2 ? 2 : 1;
        a.meteorT = a.p2 ? 6 : 9;
        say(b, e, 'Meteor', '#ff6a2a');
        const used = [];
        for (let i = 0; i < n; i++) {
          let u = randUnit(b), tries = 0;
          while (u && used.includes(u) && tries++ < 5) u = randUnit(b);
          if (!u) continue;
          used.push(u);
          circle(b, e, u.x, u.y, TILE * 1.4, 1.8, 'METEOR', '#ff6a2a', 5);
        }
      }
    },
  };

  const FORMS = ['speed', 'bulwark', 'split'];
  AI.mahito = {
    init(b, e) { const a = e.ai; a.form = -1; a.formT = 0; a.touchT = 9; a.done = false; },
    update(b, e, dt) {
      const a = e.ai, r = e.hp / e.maxHp;
      a.formT -= dt;
      if (a.formT <= 0) {
        a.form = (a.form + 1) % 3;
        a.formT = 14;
        const f = FORMS[a.form];
        e.armorBonus = 0; e.speedMul = 1;
        if (f === 'speed') { e.speedMul = 2.0; phase(b, e, 'SPEED FORM'); }
        else if (f === 'bulwark') { e.speedMul = 0.6; e.armorBonus = 0.6; phase(b, e, 'BULWARK FORM'); }
        else {
          e.speedMul = 0.9; phase(b, e, 'SPLIT FORM');
          for (let i = 0; i < 2; i++) b.spawnEnemy('mahitoClone', { lane: e.lane, dist: Math.max(0, e.dist - 30 - i * 40), wave: b.wave, owner: e.id });
        }
        e.form = f;
        b.fx('transfigure', { x: e.x, y: e.y });
      }
      a.touchT -= dt;
      if (a.touchT <= 0 && b.units.length) {
        a.touchT = 12;
        const u = topUnit(b);
        if (u) { say(b, e, 'Soul Touch', '#9ab0c8'); circle(b, e, u.x, u.y, TILE * 0.7, 1.5, 'SOUL TOUCH', '#9ab0c8', 6); }
      }
      if (!a.done && r <= 0.25) {
        a.done = true;
        phase(b, e, 'Self-Embodiment of Perfection');
        say(b, e, 'Self-Embodiment of Perfection', '#c8a0ff');
        b.hazard({
          shape: 'all', dur: 4, label: 'SELF-EMBODIMENT OF PERFECTION', hint: 'Activate a Domain to clash!', color: '#c8a0ff', owner: e.id, cancelOnOwnerDeath: true,
          onResolve: (bb) => {
            if (!e.alive) return;
            if (bb.domain) { e.stunT = Math.max(e.stunT, 2.5); bb.fx('clash', { x: e.x, y: e.y }); phase(bb, e, 'Domain Clash!'); return; }
            const pool = bb.units.slice();
            for (let i = 0; i < 3 && pool.length; i++) { const k = bb.rng.int(0, pool.length - 1); bb.disableUnit(pool[k], 5); pool.splice(k, 1); }
            bb.fx('impact', { x: 640, y: 360, r: 400, color: '#c8a0ff' });
          },
        });
      }
    },
  };

  AI.sukuna = {
    init(b, e) { const a = e.ai; a.phase = 1; a.cleaveT = 6; a.dismT = 9; a.addT = 14; a.shrineT = 0; },
    update(b, e, dt) {
      const a = e.ai, r = e.hp / e.maxHp;
      const ph = r > 0.65 ? 1 : r > 0.3 ? 2 : 3;
      if (ph !== a.phase) {
        a.phase = ph;
        phase(b, e, ph === 2 ? 'Dismantle' : 'Malevolent Shrine');
        e.speedMul = ph === 2 ? 1.15 : 1.3;
        if (ph === 3) a.shrineT = 1.5;
      }
      if (e.stunT > 0) return;
      a.cleaveT -= dt;
      if (a.cleaveT <= 0 && b.units.length) {
        a.cleaveT = a.phase === 1 ? 10 : a.phase === 2 ? 12 : 9;
        const u = randUnit(b);
        say(b, e, 'Cleave', '#ff4a5a');
        const row = b.rng.next() < 0.5;
        const rect = row ? { x: 0, y: u.y - TILE / 2, w: W, h: TILE } : { x: u.x - TILE / 2, y: FY, w: TILE, h: ROWS * TILE };
        b.hazard(Object.assign({
          shape: 'rect', dur: 1.6, label: 'CLEAVE', color: '#ff4a5a', owner: e.id, cancelOnOwnerDeath: true,
          onResolve: (bb, h) => { disableIn(bb, h, 6); bb.fx('impact', { x: h.x + h.w / 2, y: h.y + h.h / 2, r: 80, color: '#ff4a5a' }); },
        }, rect));
      }
      if (a.phase >= 2) {
        a.dismT -= dt;
        if (a.dismT <= 0 && b.units.length) {
          a.dismT = a.phase === 2 ? 7 : 5.5;
          say(b, e, 'Dismantle', '#ff6a7a');
          const pool = b.units.slice();
          for (let i = 0; i < 5 && pool.length; i++) {
            const k = b.rng.int(0, pool.length - 1);
            const u = pool[k]; pool.splice(k, 1);
            b.schedule(0.25 * i, () => { if (e.alive && !u.removed) circle(b, e, u.x, u.y, TILE * 0.9, 1.0, 'DISMANTLE', '#ff6a7a', 4); });
          }
        }
      }
      if (a.phase === 2) {
        a.addT -= dt;
        if (a.addT <= 0) {
          a.addT = 15;
          say(b, e, 'Summon Curses', '#c8a0ff');
          circle(b, e, e.x, e.y, TILE * 1.4, 1.0, 'CURSES', '#c8a0ff', 0, {
            onResolve: (bb) => {
              if (!e.alive) return;
              ['shell', 'shell', 'hexer', 'wisp'].forEach((t, i) => bb.spawnEnemy(t, { lane: e.lane, dist: Math.max(0, e.dist - i * 22), wave: Math.max(1, bb.wave - 6) }));
            },
          });
        }
      }
      if (a.phase === 3) {
        a.shrineT -= dt;
        if (a.shrineT <= 0) {
          a.shrineT = 28;
          say(b, e, 'Malevolent Shrine', '#ff2a3a');
          b.hazard({
            shape: 'all', dur: 5, label: 'MALEVOLENT SHRINE', hint: 'Activate a Domain to clash!', color: '#ff2a3a', owner: e.id, cancelOnOwnerDeath: true,
            onResolve: (bb) => {
              if (!e.alive) return;
              if (bb.domain) { e.stunT = Math.max(e.stunT, 3); bb.fx('clash', { x: e.x, y: e.y }); phase(bb, e, 'Domain Clash!'); return; }
              for (const u of bb.units.slice()) bb.disableUnit(u, 5);
              bb.fx('impact', { x: 640, y: 360, r: 500, color: '#ff2a3a' });
            },
          });
        }
      }
    },
  };

  // ===================================================================== Culling Game bosses
  /** The unit with the most allies inside `r` px (clustered teams are punished). */
  function densest(b, r) {
    let best = null, bn = -1;
    for (const u of b.units) { let n = 0; for (const o of b.units) if (Util.dist(u.x, u.y, o.x, o.y) <= r) n++; if (n > bn) { best = u; bn = n; } }
    return best;
  }
  /** Domain clash only counts when the player's Domain was started during the warning (tight timing). */
  const clashed = (bb, h, strict) => !!bb.domain && (!strict || bb.domain.t <= h.dur + 0.1);
  const countDisabled = (bb) => { let n = 0; for (const u of bb.units) if (u.disabledT > 0) n++; return n; };

  AI.hanami = {
    init(b, e) {
      const a = e.ai; a.rootT = 6; a.budT = 9; a.domT = 0; a.p2 = false;
    },
    update(b, e, dt) {
      const a = e.ai, r = e.hp / e.maxHp;
      if (r <= 0.5 && !a.p2) { a.p2 = true; a.domT = 4; phase(b, e, 'Flower Field Domain'); }
      // Cursed Buds fuse down beside him.
      for (const o of b.enemies) {
        if (!o.alive || o.type !== 'bud' || o.owner !== e.id) continue;
        o.fuse = (o.fuse === undefined ? 9 : o.fuse) - dt;
        if (o.fuse > 0) continue;
        o.alive = false; o.hp = 0;
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04);
        b.fx('impact', { x: o.x, y: o.y, r: TILE * 2.2, color: '#ff9ad0' });
        const c = [];
        for (const u of b.units) if (Util.dist(u.x, u.y, o.x, o.y) <= TILE * 2.2) c.push(u);
        for (const u of c) b.disableUnit(u, 3);
        say(b, e, 'Bud bloomed', '#ff9ad0');
      }
      if (e.stunT > 0) return;
      a.rootT -= dt;
      if (a.rootT <= 0 && b.units.length) {
        a.rootT = a.p2 ? 6 : 9;
        const u = densest(b, TILE * 2);
        say(b, e, 'Flower Field', '#ff9ad0');
        circle(b, e, u.x, u.y, TILE * 1.7, 1.8, 'FLOWER FIELD', '#ff9ad0', 5);
      }
      a.budT -= dt;
      if (a.budT <= 0) {
        a.budT = a.p2 ? 14 : 18;
        say(b, e, 'Cursed Buds', '#ffb0d8');
        for (let i = 0; i < 3; i++) {
          const bud = b.spawnEnemy('bud', { lane: e.lane, dist: Math.max(0, e.dist - 22 - i * 26), wave: Math.max(b.wave, 12), owner: e.id });
          bud.fuse = 9; bud.knockImmune = true;
        }
      }
      if (a.p2) {
        a.domT -= dt;
        if (a.domT <= 0) {
          a.domT = 30;
          say(b, e, 'Flower Field Domain', '#ff7ab8');
          b.hazard({
            shape: 'all', dur: 4.5, label: 'FLOWER FIELD DOMAIN', hint: 'Activate a Domain to clash!', color: '#ff7ab8', owner: e.id, cancelOnOwnerDeath: true,
            onResolve: (bb) => {
              if (!e.alive) return;
              if (clashed(bb, { dur: 4.5 }, false)) { e.stunT = Math.max(e.stunT, 2.5); bb.fx('clash', { x: e.x, y: e.y }); phase(bb, e, 'Domain Clash!'); return; }
              for (const u of bb.units.slice()) bb.disableUnit(u, 4.5);
              bb.fx('impact', { x: 640, y: 360, r: 420, color: '#ff7ab8' });
            },
          });
        }
      }
    },
  };

  AI.dagon = {
    init(b, e) { const a = e.ai; a.subT = 12; a.swarmT = 8; a.skiffT = 15; a.exposed = 0; a.p2 = false; a.under = 0; },
    update(b, e, dt) {
      const a = e.ai, r = e.hp / e.maxHp;
      if (r <= 0.5 && !a.p2) { a.p2 = true; phase(b, e, 'Tide Rising'); a.skiffT = Math.min(a.skiffT, 5); }
      if (a.under > 0) {
        a.under -= dt;
        e.invulnT = Math.max(e.invulnT, 0.2);
        if (a.under <= 0) { e.invulnT = 0; a.exposed = 4; b.vulnerable(e, 0.35, 4); e.speedMul = 1; phase(b, e, 'EXPOSED'); b.fx('impact', { x: e.x, y: e.y, r: 90, color: '#8ac8ff' }); }
      } else if (a.exposed > 0) a.exposed -= dt;
      if (e.stunT > 0) return;
      a.subT -= dt;
      if (a.subT <= 0 && a.under <= 0) {
        a.subT = 17; a.under = 3; e.speedMul = 2.2; e.invulnT = Math.max(e.invulnT, 0.2);
        say(b, e, 'Submerge', '#8ac8ff'); phase(b, e, 'SUBMERGED: invulnerable');
        b.fx('water', { x: e.x, y: e.y, r: 90 });
      }
      a.swarmT -= dt;
      if (a.swarmT <= 0) {
        a.swarmT = 12;
        say(b, e, 'Death Swarm', '#4a7ac8');
        const dist = e.dist, lane = e.lane;
        circle(b, e, e.x, e.y, TILE * 1.3, 1.0, 'DEATH SWARM', '#4a7ac8', 0, {
          onResolve: (bb) => { if (!e.alive) return; for (let i = 0; i < 6; i++) bb.spawnEnemy(i % 3 === 0 ? 'wraith' : 'skitter', { lane, dist: Math.max(0, e.dist - i * 16), wave: Math.max(bb.wave, 14) }); },
        });
      }
      a.skiffT -= dt;
      if (a.skiffT <= 0) {
        a.skiffT = a.p2 ? 14 : 26;
        say(b, e, 'Horizon of the Captivating Skiff', '#3a6ae8');
        b.hazard({
          shape: 'all', dur: 4, label: 'HORIZON OF THE CAPTIVATING SKIFF', hint: 'Activate a Domain to clash!', color: '#3a6ae8', owner: e.id, cancelOnOwnerDeath: true,
          onResolve: (bb, h) => {
            if (!e.alive) return;
            if (clashed(bb, h, false)) { e.stunT = Math.max(e.stunT, 3); bb.vulnerable(e, 0.3, 5); bb.fx('clash', { x: e.x, y: e.y }); phase(bb, e, 'Domain Clash!'); return; }
            for (const u of bb.units.slice()) bb.disableUnit(u, 5);
            bb.fx('impact', { x: 640, y: 360, r: 480, color: '#3a6ae8' });
          },
        });
      }
    },
  };

  AI.mahoraga = {
    init(b, e) {
      const a = e.ai; a.acc = {}; a.adapted = {}; a.n = 0; a.slashT = 10; a.p = 0;
      const cap = e.maxHp * 0.045;
      a.mod = null;
      a.onHit = (bb, ee, dealt, o) => {
        const src = o && o.src ? o.src.id : null;
        if (!src || a.adapted[src]) return;
        a.acc[src] = (a.acc[src] || 0) + dealt;
        if (a.acc[src] >= cap) {
          a.adapted[src] = true; a.n++;
          const nm = JJK.Characters[src] ? JJK.Characters[src].short : src;
          phase(bb, ee, 'ADAPTED: ' + nm + ' (' + a.n + ')');
          bb.fx('copy', { x: ee.x, y: ee.y });
        }
      };
      // damage modifier: adapted attackers are cut by 75% unless Mahoraga is nullified
      a.mod = (bb, ee, o) => (o && o.src && a.adapted[o.src.id] && ee.nullT <= 0 ? 0.25 : 1);
      e.ai.onHit = a.onHit; e.ai.mod = a.mod;
    },
    update(b, e, dt) {
      const a = e.ai;
      if (a.n >= 4 && a.p < 1) { a.p = 1; e.speedMul = 1.25; phase(b, e, 'The wheel quickens'); }
      if (a.n >= 6 && a.p < 2) { a.p = 2; e.armorBonus = 0.2; phase(b, e, 'Wheel complete'); }
      if (e.stunT > 0) return;
      a.slashT -= dt;
      if (a.slashT <= 0 && b.units.length) {
        a.slashT = a.p ? 11 : 14;
        const u = randUnit(b), u2 = randUnit(b);
        say(b, e, 'Divine Slash', '#e8e4d0');
        b.hazard({ shape: 'rect', x: 0, y: u.y - TILE / 2, w: W, h: TILE, dur: 1.7, label: 'DIVINE SLASH', color: '#e8e4d0', owner: e.id, cancelOnOwnerDeath: true, onResolve: (bb, h) => { disableIn(bb, h, 6); bb.fx('impact', { x: h.x + h.w / 2, y: h.y + h.h / 2, r: 80, color: '#e8e4d0' }); } });
        b.hazard({ shape: 'rect', x: u2.x - TILE / 2, y: FY, w: TILE, h: ROWS * TILE, dur: 1.7, label: 'DIVINE SLASH', color: '#e8e4d0', owner: e.id, cancelOnOwnerDeath: true, onResolve: (bb, h) => { disableIn(bb, h, 6); bb.fx('impact', { x: h.x + h.w / 2, y: h.y + h.h / 2, r: 80, color: '#e8e4d0' }); } });
      }
    },
  };

  AI.sukunaH = {
    init(b, e) { const a = e.ai; a.phase = 1; a.cleaveT = 5; a.dismT = 8; a.fugaT = 10; a.shrineT = 0; a.addT = 12; },
    update(b, e, dt) {
      const a = e.ai, r = e.hp / e.maxHp;
      const ph = r > 0.7 ? 1 : r > 0.4 ? 2 : r > 0.15 ? 3 : 4;
      if (ph !== a.phase) {
        a.phase = ph;
        phase(b, e, ph === 2 ? 'Dismantle & Fuga' : ph === 3 ? 'Malevolent Shrine' : 'WORLD CUTTING SLASH');
        e.speedMul = [1, 1.1, 1.2, 1.35][ph - 1];
        if (ph === 3) a.shrineT = 1.5;
      }
      if (e.stunT > 0) return;
      a.cleaveT -= dt;
      if (a.cleaveT <= 0 && b.units.length) {
        a.cleaveT = [7, 6.5, 6, 4.5][a.phase - 1];
        say(b, e, 'Cleave', '#ff4a5a');
        const lines = a.phase >= 3 ? 2 : 1;
        for (let i = 0; i < lines; i++) {
          const u = randUnit(b);
          const rect = (i + (b.rng.next() < 0.5 ? 0 : 1)) % 2 === 0 ? { x: 0, y: u.y - TILE / 2, w: W, h: TILE } : { x: u.x - TILE / 2, y: FY, w: TILE, h: ROWS * TILE };
          b.hazard(Object.assign({ shape: 'rect', dur: 1.5, label: 'CLEAVE', color: '#ff4a5a', owner: e.id, cancelOnOwnerDeath: true, onResolve: (bb, h) => { disableIn(bb, h, 6); bb.fx('impact', { x: h.x + h.w / 2, y: h.y + h.h / 2, r: 80, color: '#ff4a5a' }); } }, rect));
        }
      }
      if (a.phase >= 2) {
        a.dismT -= dt;
        if (a.dismT <= 0 && b.units.length) {
          a.dismT = a.phase === 2 ? 7 : 5;
          say(b, e, 'Dismantle', '#ff6a7a');
          const pool = b.units.slice();
          for (let i = 0; i < 7 && pool.length; i++) {
            const k = b.rng.int(0, pool.length - 1);
            const u = pool[k]; pool.splice(k, 1);
            b.schedule(0.2 * i, () => { if (e.alive && !u.removed) circle(b, e, u.x, u.y, TILE * 0.9, 1.0, 'DISMANTLE', '#ff6a7a', 4); });
          }
        }
        a.fugaT -= dt;
        if (a.fugaT <= 0 && b.units.length) {
          a.fugaT = [0, 14, 12, 9][a.phase - 1];
          const u = densest(b, TILE * 2.4);
          say(b, e, 'Fuga', '#ff8a2a');
          circle(b, e, u.x, u.y, TILE * 2.3, 2.4, 'FUGA', '#ff8a2a', 7);
        }
      }
      if (a.phase === 2) {
        a.addT -= dt;
        if (a.addT <= 0) {
          a.addT = 16;
          say(b, e, 'Summon Curses', '#c8a0ff');
          circle(b, e, e.x, e.y, TILE * 1.4, 1.0, 'CURSES', '#c8a0ff', 0, {
            onResolve: (bb) => { if (!e.alive) return; ['brute', 'shell', 'hexer', 'hexer', 'aegis'].forEach((t, i) => bb.spawnEnemy(t, { lane: e.lane, dist: Math.max(0, e.dist - i * 22), wave: Math.max(1, bb.wave - 8) })); },
          });
        }
      }
      if (a.phase >= 3) {
        a.shrineT -= dt;
        if (a.shrineT <= 0) {
          a.shrineT = a.phase === 3 ? 22 : 17;
          say(b, e, 'Malevolent Shrine', '#ff2a3a');
          b.hazard({
            shape: 'all', dur: 3.8, label: 'MALEVOLENT SHRINE', hint: 'Activate a Domain NOW to clash (too early or too late fails)', color: '#ff2a3a', owner: e.id, cancelOnOwnerDeath: true,
            onResolve: (bb, h) => {
              if (!e.alive) return;
              if (clashed(bb, h, true)) { e.stunT = Math.max(e.stunT, 4); bb.vulnerable(e, 0.4, 6); bb.fx('clash', { x: e.x, y: e.y }); phase(bb, e, 'Domain Clash!'); return; }
              for (const u of bb.units.slice()) bb.disableUnit(u, 6);
              const n = countDisabled(bb);
              e.hp = Math.min(e.maxHp, e.hp + e.maxHp * Math.min(0.15, 0.03 * n));
              bb.fx('impact', { x: 640, y: 360, r: 520, color: '#ff2a3a' });
              if (n) phase(bb, e, 'Shrine feeds: +' + Math.round(Math.min(15, 3 * n)) + '% HP');
            },
          });
        }
      }
    },
  };

  JJK.BossAI = AI;
})(typeof window !== 'undefined' ? window : globalThis);
