/* Canvas renderer for the battle simulation. Read-only view of the Battle object; owns VFX. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Balance, Util } = JJK;
  const TILE = Balance.TILE, FY = Balance.FIELD_Y, W = Balance.W, H = Balance.H;
  const TAU = Math.PI * 2;
  const MOD_COLOR = { swift: '#5ae8ff', bulwark: '#ffcf5a', warded: '#6a8aff' };

  class BattleRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.vfx = new JJK.VFX();
      this.battle = null;
      this.view = { selectedUid: 0, placing: null, hoverUid: 0, showSlots: true, settings: { showRanges: true, dmgNumbers: true, shake: true } };
      this.t = 0;
      this._off = { x: 0, y: 0 };
      this.domainBanner = 0;
      this.stats = { frames: 0 };
    }

    setBattle(b, settings) {
      this.battle = b;
      this.vfx.clear();
      this.vfx.attach(b, settings);
      this.view.selectedUid = 0; this.view.placing = null;
      this.bg = JJK.Backgrounds.get(b.mapId);
      this.domainBanner = 0;
      this._unsub = b.events.on('domain', () => { this.domainBanner = 2.2; });
    }
    dispose() { this.vfx.detach(); if (this._unsub) this._unsub(); this.battle = null; }

    /** Convert a pointer event to stage coordinates (1280x720). */
    toStage(ev) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) };
    }
    toTile(x, y) { return { c: Math.floor(x / TILE), r: Math.floor((y - FY) / TILE) }; }

    unitAtPoint(x, y) {
      const b = this.battle; if (!b) return null;
      let best = null, bd = 34 * 34;
      for (const u of b.units) { const d = Util.dist2(x, y, u.x, u.y); if (d < bd) { bd = d; best = u; } }
      return best;
    }

    frame(dt) {
      const b = this.battle; if (!b) return;
      this.t += dt;
      this.vfx.update(dt);
      if (this.domainBanner > 0) this.domainBanner -= dt;
      this.draw();
    }

    // ------------------------------------------------------------------ main draw
    draw() {
      const ctx = this.ctx, b = this.battle;
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      this.vfx.shakeOffset(this._off);
      ctx.translate(this._off.x, this._off.y);
      ctx.drawImage(this.bg, 0, 0, W, H);
      this.drawSlots(ctx, b);
      this.drawZones(ctx, b);
      this.drawHazards(ctx, b);
      this.drawRanges(ctx, b);
      this.drawSummons(ctx, b, true);
      this.drawUnits(ctx, b);
      this.drawSummons(ctx, b, false);
      this.drawEnemies(ctx, b);
      this.drawProjectiles(ctx, b);
      this.vfx.draw(ctx);
      this.drawPlacing(ctx, b);
      ctx.restore();
      this.drawDomain(ctx, b);
      this.drawMutator(ctx, b);
      this.vfx.drawFlash(ctx, W, H);
    }

    drawSlots(ctx, b) {
      const pl = this.view.placing;
      const want = pl ? JJK.Characters[pl.id].place : null;
      for (const s of b.geo.slots.values()) {
        const occ = b.grid.has(s.c + ',' + s.r);
        const x = s.c * TILE, y = FY + s.r * TILE;
        if (!pl) {
          if (occ) continue;
          if (!this.view.showSlots) continue;
          ctx.globalAlpha = 0.16; ctx.strokeStyle = s.type === 'E' ? '#ffcf5a' : '#8ad8ff'; ctx.lineWidth = 1.5;
          const m = 20, l = 8;
          ctx.beginPath();
          for (const [cx, cy, dx, dy] of [[x + m, y + m, 1, 1], [x + TILE - m, y + m, -1, 1], [x + m, y + TILE - m, 1, -1], [x + TILE - m, y + TILE - m, -1, -1]]) { ctx.moveTo(cx, cy + dy * l); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * l, cy); }
          ctx.stroke(); ctx.globalAlpha = 1;
          continue;
        }
        const ok = !occ && (want === 'any' || (want === 'ground' && s.type === 'G') || (want === 'elevated' && s.type === 'E'));
        ctx.globalAlpha = ok ? 0.28 + 0.1 * Math.sin(this.t * 5) : 0.08;
        ctx.fillStyle = ok ? (s.type === 'E' ? '#ffcf5a' : '#5ac8ff') : '#ff3b5c';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.globalAlpha = ok ? 0.8 : 0.15; ctx.strokeStyle = ok ? '#fff' : '#ff3b5c'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 4.5, y + 4.5, TILE - 9, TILE - 9);
        ctx.globalAlpha = 1;
      }
    }

    drawZones(ctx, b) {
      for (const z of b.zones) {
        const a = Math.min(1, z.t / 1.5);
        ctx.globalAlpha = 0.28 * a; ctx.fillStyle = '#2a6aff'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.7 * a; ctx.strokeStyle = '#8ad0ff'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -this.t * 20; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    drawHazards(ctx, b) {
      for (const h of b.hazards) {
        const k = Util.clamp(h.t / h.dur, 0, 1), pulse = 0.5 + 0.5 * Math.sin(this.t * 10), col = h.color || '#ff3b5c';
        ctx.save();
        if (h.shape === 'circle') {
          ctx.globalAlpha = 0.12 + 0.08 * pulse; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * k, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -this.t * 40; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
          this.label(ctx, h.label, h.x, h.y - h.r - 12, col);
        } else if (h.shape === 'rect') {
          ctx.globalAlpha = 0.12 + 0.08 * pulse; ctx.fillStyle = col; ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.globalAlpha = 0.35; ctx.fillRect(h.x, h.y, h.w * k, h.h);
          ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -this.t * 40; ctx.strokeRect(h.x, h.y, h.w, h.h);
          this.label(ctx, h.label, h.x + h.w / 2, h.y - 12, col);
        } else {
          ctx.globalAlpha = 0.14 + 0.1 * pulse; ctx.fillStyle = col; ctx.fillRect(0, FY, W, H - FY);
          ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.strokeRect(4, FY + 4, W - 8, 8 * TILE * 1 + 1 * TILE - 8);
          this.label(ctx, h.label, W / 2, 205, col, 26);
          if (h.hint) this.label(ctx, h.hint + '  (' + Math.max(0, h.dur - h.t).toFixed(1) + 's)', W / 2, 236, '#ffffff', 16);
        }
        ctx.restore();
      }
    }
    label(ctx, str, x, y, col, size) {
      if (!str) return;
      ctx.save(); ctx.globalAlpha = 1; ctx.font = '800 ' + (size || 14) + 'px "Arial Narrow","Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = '#000d'; ctx.strokeText(str, x, y); ctx.fillStyle = col; ctx.fillText(str, x, y); ctx.restore();
    }

    drawRanges(ctx, b) {
      const u = b.getUnit(this.view.selectedUid) || b.getUnit(this.view.hoverUid);
      if (!u) return;
      const sel = u.uid === this.view.selectedUid;
      ctx.save();
      ctx.globalAlpha = sel ? 0.16 : 0.1; ctx.fillStyle = u.def.color; ctx.beginPath(); ctx.arc(u.x, u.y, u.rangePx, 0, TAU); ctx.fill();
      ctx.globalAlpha = sel ? 0.9 : 0.5; ctx.strokeStyle = sel ? '#fff' : u.def.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(u.x, u.y, u.rangePx, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    drawUnits(ctx, b) {
      const px = 54;
      for (const u of b.units) {
        const spr = JJK.Art.unitSprite(u.id, px);
        const sel = u.uid === this.view.selectedUid;
        const rc = Balance.rarity[u.def.rarity].color;
        // attack pop
        let pop = 1;
        if (u.cdT > 0 && u.baseSpa > 0.05) pop = 1 + 0.12 * Math.max(0, u.cdT / u.baseSpa - 0.72) / 0.28;
        const bob = Math.sin(this.t * 2.2 + u.uid) * 1.4;
        // Rika looms behind Yuta while her power-up is active
        if (u.k && u.k.rikaT > 0) {
          const fr = JJK.Art.summonFrames('rika');
          if (fr.length) {
            const a = Util.clamp(Math.min(u.k.rikaT / 0.5, 1), 0, 1), sz = 210;
            ctx.save(); ctx.globalAlpha = 0.82 * a; ctx.translate(u.x, u.y - 26 + bob * 1.5 - (1 - a) * 14);
            ctx.drawImage(fr[Math.floor(this.t * 9) % fr.length], -sz / 2, -sz / 2, sz, sz); ctx.restore();
          }
        }
        ctx.save();
        ctx.translate(u.x, u.y);
        if (u.onElevated) { ctx.strokeStyle = '#ffcf5a88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 18, 34, 12, 0, 0, TAU); ctx.stroke(); }
        if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 8); ctx.beginPath(); ctx.ellipse(0, 18, 38, 14, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
        if (u.disabledT > 0) ctx.globalAlpha = 0.5;
        if (spr) {
          // sprite platter centre sits 18px below the unit's position; only the figure bobs/pops, the platter stays planted
          ctx.translate(0, 18); ctx.scale(pop, pop);
          ctx.drawImage(spr.canvas, -spr.ax, -spr.ay + bob, spr.canvas.width, spr.canvas.height);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        // level pips
        const maxL = u.def.maxLevel;
        for (let i = 0; i < maxL; i++) {
          const x = u.x - (maxL - 1) * 4.5 + i * 9, y = u.y + 36 + bob * 0.5;
          ctx.fillStyle = i < u.level ? (u.level >= maxL ? '#ffcf5a' : rc) : '#000a';
          ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill(); ctx.stroke();
        }
        // domain ready / disabled indicators
        if (u.flags.domain && u.domainCd <= 0 && !b.domain) {
          ctx.strokeStyle = JJK.Domains[u.flags.domain].color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 6);
          ctx.beginPath(); ctx.arc(u.x, u.y + bob, 29 + Math.sin(this.t * 6) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (u.disabledT > 0) this.label(ctx, 'DISABLED ' + u.disabledT.toFixed(1), u.x, u.y - 38, '#ff6ad0', 12);
        else if (u.buffSpdT > 0) { ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.moveTo(u.x + 24, u.y - 22); ctx.lineTo(u.x + 30, u.y - 12); ctx.lineTo(u.x + 18, u.y - 12); ctx.fill(); }
      }
    }

    drawSummons(ctx, b, back) {
      const A = JJK.Art, cnt = new Map(), SZ = { dog: 76, nue: 88, max: 96, dragon: 104, garuda: 112 };
      for (const s of b.summons) {
        const id = s.kind === 'chaser' ? 'dog' : s.kind === 'striker' ? 'nue' : s.kind === 'orbiter' ? 'dragon' : s.kind === 'diver' ? 'garuda' : 'max';
        if ((id === 'max') !== !!back) { if (id === 'dog') cnt.set(s.owner, (cnt.get(s.owner) || 0) + 1); continue; }
        let variant;
        if (id === 'dog') { const n = cnt.get(s.owner) || 0; cnt.set(s.owner, n + 1); variant = n % 2 ? 'black' : 'white'; }
        const frames = A.summonFrames(id, variant);
        if (!frames.length) continue;
        let moving = false;
        if (s._px !== undefined) { const dx = s.x - s._px; if (Math.abs(dx) > 0.04) { s._face = dx < 0 ? -1 : 1; moving = true; } else if (Math.abs(s.y - s._py) > 0.04) moving = true; }
        s._px = s.x; s._py = s.y;
        const face = s._face || (id === 'max' ? -1 : 1);
        const flying = id === 'nue' || id === 'dragon' || id === 'garuda', sz = SZ[id];
        const lift = flying ? (id === 'nue' ? -20 : -8) + Math.sin(this.t * 5 + s.uid) * 3 : 0;
        const fi = Math.floor(this.t * (id === 'dog' ? (moving ? 16 : 5) : id === 'nue' ? 14 : id === 'dragon' ? 10 : id === 'garuda' ? 12 : 5) + s.uid) % frames.length;
        ctx.save(); ctx.translate(s.x, s.y);
        if (flying) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 14, 16, 5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.translate(0, lift - sz * (id === 'dog' ? 0.1 : id === 'max' ? 0.14 : 0.0));
        ctx.scale(face, 1);
        ctx.drawImage(frames[fi], -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
    }

    drawEnemies(ctx, b) {
      const list = b.enemies.slice().sort((a, c) => a.y - c.y);
      const nowT = b.time;
      for (const e of list) {
        if (!e.alive) continue;
        const frames = JJK.Art.enemyFrames(e.type);
        if (!frames.length) continue;
        const frame = frames[Math.floor(this.t * (frames.length > 4 ? 11 : 7) + e.id) % frames.length];
        const k = e.size * (e.boss ? 3.25 : 2.3) * (e.elite ? 1.0 : 1) / frame.width;
        const dw = frame.width * k;
        if (e._px !== undefined) { const dx = e.x - e._px; if (Math.abs(dx) > 0.05) e._face = dx < 0 ? -1 : 1; }
        e._px = e.x;
        const face = e._face || 1;
        const flying = e.air;
        const lift = flying ? -18 + Math.sin(this.t * 4 + e.id) * 3 : 0;
        ctx.save();
        ctx.translate(e.x, e.y + lift);
        ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(0, e.size * 0.55 - lift, e.size * 0.55, e.size * 0.18, 0, 0, TAU); ctx.fill();
        // aura rings
        if (e.elite) { ctx.strokeStyle = MOD_COLOR[e.mod] || '#ffcf5a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 6); ctx.beginPath(); ctx.ellipse(0, e.size * 0.15, e.size * 0.8, e.size * 0.62, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
        if (e.ward > 0 && e.def.id === 'hexer') { ctx.strokeStyle = '#ff5ad055'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(0, 0, Balance.hexerWardRadius ? Balance.hexerWardRadius * TILE : TILE * 1.6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (e.invulnT > 0) { ctx.globalAlpha = 0.5; }
        ctx.scale(face, 1);
        if (e.stunT > 0) ctx.rotate(Math.sin(this.t * 30) * 0.06);
        ctx.drawImage(frame, -dw / 2, -dw / 2, dw, dw);
        // status tints
        if (e.slowT > 0) { ctx.globalCompositeOperation = 'source-atop'; }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
        if (e.slowT > 0) { ctx.globalAlpha = 0.28; ctx.fillStyle = '#4aa8ff'; ctx.beginPath(); ctx.arc(e.x, e.y + lift, e.size * 0.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        if (nowT - e.lastHit < 0.08) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, e.y + lift, e.size * 0.55, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        // status icons
        let iy = e.y + lift - e.size * 0.75;
        if (e.stunT > 0) { this.stars(ctx, e.x, iy - 4); }
        if (e.heldBy) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(e.x, e.y + lift, e.size * 0.7, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (e.rootT > 0) { ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x - 12, e.y + e.size * 0.5); ctx.lineTo(e.x + 12, e.y + e.size * 0.5); ctx.stroke(); }
        if (e.markStacks > 0) { for (let i = 0; i < Math.min(5, e.markStacks); i++) { ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.arc(e.x - 8 + i * 4, iy - 10, 2.2, 0, TAU); ctx.fill(); } }
        if (e.wardUntil > nowT) { ctx.strokeStyle = '#9ad8ff'; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y + lift, e.size * 0.75, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
        if (e.abStacks > 0) { ctx.fillStyle = '#ffa04a'; ctx.fillRect(e.x + e.size * 0.45, iy, 4, 4); }
        if (e.nullT > 0) { ctx.strokeStyle = '#38f3d0'; ctx.globalAlpha = 0.7; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x - 9, e.y + lift - 9); ctx.lineTo(e.x + 9, e.y + lift + 9); ctx.moveTo(e.x + 9, e.y + lift - 9); ctx.lineTo(e.x - 9, e.y + lift + 9); ctx.stroke(); ctx.globalAlpha = 1; }
        // hp bar
        if (!e.boss && (e.hp < e.maxHp || e.shield > 0 || e.elite)) {
          const bw = Math.max(26, e.size * 1.05), bx = e.x - bw / 2, by = e.y + lift - e.size * 0.62 - 6;
          ctx.fillStyle = '#000b'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
          ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#4ade80' : e.hp / e.maxHp > 0.25 ? '#ffcf5a' : '#ff5a5a'; ctx.fillRect(bx, by, bw * Util.clamp(e.hp / e.maxHp, 0, 1), 4);
          if (e.shield > 0 && e.shieldMax > 0) { ctx.fillStyle = '#8ad8ff'; ctx.fillRect(bx, by - 3, bw * Util.clamp(e.shield / e.shieldMax, 0, 1), 2); }
        }
      }
    }
    stars(ctx, x, y) {
      ctx.fillStyle = '#ffe36a';
      for (let i = 0; i < 3; i++) { const a = this.t * 6 + i * 2.09; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 11, y + Math.sin(a) * 3, 2.6, 0, TAU); ctx.fill(); }
    }

    drawProjectiles(ctx, b) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const p of b.projectiles) {
        const c = p.color || '#fff';
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.globalAlpha = 0.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (dx / d) * 16, p.y - (dy / d) * 16); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, p.kind === 'crow' ? 5 : 4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    drawPlacing(ctx, b) {
      const pl = this.view.placing;
      if (!pl || pl.c == null) return;
      const def = JJK.Characters[pl.id];
      const x = (pl.c + 0.5) * TILE, y = FY + (pl.r + 0.5) * TILE;
      const slot = b.geo.slots.get(pl.c + ',' + pl.r);
      const ro = b.roster[pl.id];
      const range = (def.base.range + (slot && slot.type === 'E' ? Balance.elevatedRange : 0) + (ro.stars >= 3 ? Balance.starRangeAt3 : 0)) * b.rules.rangeMul;
      const col = pl.valid ? '#4ade80' : '#ff5a6a';
      ctx.save();
      ctx.globalAlpha = 0.14; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, range * TILE, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, range * TILE, 0, TAU); ctx.stroke();
      ctx.globalAlpha = pl.valid ? 0.85 : 0.5;
      const gs = JJK.Art.unitSprite(pl.id, 54);
      if (gs) ctx.drawImage(gs.canvas, x - gs.ax, y + 18 - gs.ay); else ctx.drawImage(JJK.Art.token(pl.id, 54), x - 27, y - 27, 54, 54);
      ctx.globalAlpha = 1;
      ctx.restore();
      this.label(ctx, '¥' + ro.cost, x, y - 40, pl.valid ? '#6ee7a0' : '#ff7a8a', 15);
      if (!pl.valid && pl.reason) this.label(ctx, pl.reason, x, y + 44, '#ff9aa8', 13);
    }

    drawDomain(ctx, b) {
      const d = b.domain;
      if (!d) { return; }
      const col = d.def.color, k = d.t / d.dur;
      ctx.save();
      const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 760);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
      ctx.globalAlpha = 0.35 * (k < 0.08 ? k / 0.08 : k > 0.9 ? (1 - k) / 0.1 : 1);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha *= 0.6; ctx.strokeStyle = col; ctx.lineWidth = 2;
      const n = 28;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + this.t * 0.25; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 140, H / 2 + Math.sin(a) * 140); ctx.lineTo(W / 2 + Math.cos(a) * 900, H / 2 + Math.sin(a) * 900); ctx.stroke(); }
      ctx.restore();
      // time-left bar under the top HUD
      ctx.fillStyle = '#000a'; ctx.fillRect(W / 2 - 160, FY + 6, 320, 8); ctx.fillStyle = col; ctx.fillRect(W / 2 - 160, FY + 6, 320 * (1 - k), 8);
      if (this.domainBanner > 0) {
        const a = Math.min(1, this.domainBanner / 0.5);
        ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
        ctx.font = '700 22px "Arial Narrow",sans-serif'; ctx.fillStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText('DOMAIN EXPANSION', W / 2, 270); ctx.fillText('DOMAIN EXPANSION', W / 2, 270);
        ctx.font = '800 56px "Arial Narrow",sans-serif'; ctx.strokeText(d.def.name.toUpperCase(), W / 2, 330); ctx.fillStyle = col; ctx.fillText(d.def.name.toUpperCase(), W / 2, 330);
        ctx.restore();
      }
    }

    drawMutator(ctx, b) {
      if (b.mutator && b.state === 'wave') {
        ctx.save(); ctx.font = '700 13px "Segoe UI",sans-serif'; ctx.textAlign = 'right';
        ctx.fillStyle = '#ffcf5acc'; ctx.fillText('MUTATOR: ' + (b.mutator.label || '').toUpperCase(), W - 10, FY + 18);
        ctx.restore();
      }
    }
  }

  function shade(c, a) { return JJK.Art.shade(c, a); }
  function path(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }

  JJK.BattleRenderer = BattleRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
