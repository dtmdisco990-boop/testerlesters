/* Visual effects: pooled particles, rings, beams, floating numbers. Subscribes to battle events; purely cosmetic. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Balance, Util } = JJK;
  const TAU = Math.PI * 2;
  const MAX = { parts: 700, texts: 70, rings: 60, beams: 50 };

  class VFX {
    constructor() {
      this.parts = []; this.texts = []; this.rings = []; this.beams = [];
      this._pp = []; this._pt = []; this._pr = []; this._pb = [];
      this.shakeT = 0; this.shakeAmp = 0; this.flashT = 0; this.flashMax = 1; this.flashColor = '#fff';
      this.settings = { dmgNumbers: true, shake: true, reduced: false };
      this.rng = Util.makeRng(777);
      this._unsub = [];
      this._hitBudget = 0;
    }
    get(pool) { return pool.length ? pool.pop() : {}; }
    release(list, pool, i) { const o = list[i]; list[i] = list[list.length - 1]; list.pop(); if (pool.length < 200) pool.push(o); }

    clear() { this.parts.length = 0; this.texts.length = 0; this.rings.length = 0; this.beams.length = 0; this.shakeT = 0; this.flashT = 0; }

    // ------------------------------------------------------------------ emitters
    particle(x, y, vx, vy, life, size, color, o) {
      if (this.parts.length >= MAX.parts) return;
      const p = this.get(this._pp);
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size; p.color = color;
      p.g = (o && o.g) || 0; p.shrink = !(o && o.noShrink); p.add = !(o && o.solid); p.drag = (o && o.drag) || 0.98;
      this.parts.push(p);
    }
    burst(x, y, n, color, speed, life, size, o) {
      if (this.settings.reduced) n = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) {
        const a = this.rng.range(0, TAU), s = this.rng.range(0.3, 1) * speed;
        this.particle(x, y, Math.cos(a) * s, Math.sin(a) * s, life * this.rng.range(0.6, 1.2), size * this.rng.range(0.6, 1.3), color, o);
      }
    }
    ring(x, y, r, color, dur, width, o) {
      if (this.rings.length >= MAX.rings) return;
      const g = this.get(this._pr);
      g.x = x; g.y = y; g.r = r; g.color = color; g.t = 0; g.dur = dur || 0.4; g.w = width || 4; g.fill = !!(o && o.fill); g.from = (o && o.from) != null ? o.from : 0.15;
      this.rings.push(g);
    }
    beam(x1, y1, x2, y2, color, width, dur) {
      if (this.beams.length >= MAX.beams) return;
      const b = this.get(this._pb);
      b.x1 = x1; b.y1 = y1; b.x2 = x2; b.y2 = y2; b.color = color || '#fff'; b.w = width || 4; b.t = 0; b.dur = dur || 0.18;
      this.beams.push(b);
    }
    text(x, y, str, color, size, o) {
      if (this.texts.length >= MAX.texts) { this.release(this.texts, this._pt, 0); }
      const t = this.get(this._pt);
      t.x = x; t.y = y; t.str = str; t.color = color || '#fff'; t.size = size || 16; t.t = 0; t.dur = (o && o.dur) || 0.8; t.vy = (o && o.vy) != null ? o.vy : -38; t.vx = (o && o.vx) || 0; t.bold = !!(o && o.bold);
      this.texts.push(t);
    }
    shake(amp, dur) { if (!this.settings.shake || this.settings.reduced) return; if (amp >= this.shakeAmp || this.shakeT <= 0) { this.shakeAmp = amp; this.shakeT = dur; } }
    flash(color, dur, max) { if (this.settings.reduced) return; this.flashColor = color; this.flashT = dur; this.flashMax = max || 0.35; this._flashDur = dur; }

    // ------------------------------------------------------------------ battle hookup
    attach(battle, settings) {
      this.detach();
      Object.assign(this.settings, settings || {});
      const on = (ev, fn) => { this._unsub.push(battle.events.on(ev, fn)); };
      on('hit', (e) => this.onHit(e));
      on('kill', (e) => this.onKill(e));
      on('yen', (e) => { if (e.amount >= 12 && e.x != null) this.text(e.x, e.y - 14, '+¥' + e.amount, '#6ee7a0', 13, { dur: 0.9 }); });
      on('leak', (e) => { this.flash('#ff2a4a', 0.35, 0.3); this.shake(7, 0.3); this.text(e.enemy.x - 20, e.enemy.y - 10, '-' + e.enemy.leak + ' BASE', '#ff6a82', 18, { bold: true, dur: 1.1 }); });
      on('bossSpawn', () => { this.shake(5, 0.6); this.flash('#ff2a4a', 0.5, 0.18); });
      on('bossDeath', (e) => { this.shake(10, 0.9); this.flash('#fff', 0.6, 0.5); this.burst(e.enemy.x, e.enemy.y, 60, '#ffd45a', 260, 1.0, 5); this.ring(e.enemy.x, e.enemy.y, 220, '#ffd45a', 0.8, 6); });
      on('unitPlaced', (e) => { this.ring(e.unit.x, e.unit.y, 38, e.unit.def.color, 0.35, 3); this.burst(e.unit.x, e.unit.y + 10, 10, e.unit.def.color, 90, 0.4, 3); });
      on('unitUpgraded', (e) => { this.ring(e.unit.x, e.unit.y, 52, '#ffe36a', 0.5, 4); this.burst(e.unit.x, e.unit.y, 16, '#ffe36a', 120, 0.6, 3, { g: -60 }); this.text(e.unit.x, e.unit.y - 36, 'LEVEL UP', '#ffe36a', 15, { bold: true }); });
      on('unitSold', (e) => { this.burst(e.unit.x, e.unit.y, 12, '#9aa7bd', 80, 0.4, 3); this.text(e.unit.x, e.unit.y - 20, '+¥' + e.value, '#6ee7a0', 14); });
      on('unitDisabled', (e) => { if (e.unit) this.text(e.unit.x, e.unit.y - 30, 'DISABLED', '#ff6ad0', 13, { bold: true }); });
      on('waveClear', () => { this.flash('#9ad8ff', 0.4, 0.12); });
      on('domain', (e) => { this.flash(e.domain.def.color, 0.6, 0.45); this.shake(6, 0.5); });
      on('victory', () => { this.flash('#ffd45a', 0.8, 0.4); });
      on('defeat', () => { this.flash('#ff2a4a', 1.0, 0.5); this.shake(12, 0.8); });
      on('fx', (e) => this.onFx(e));
    }
    detach() { for (const u of this._unsub) { try { if (typeof u === 'function') u(); } catch (e) { /* ignore */ } } this._unsub.length = 0; }

    onHit(e) {
      const en = e.enemy;
      if (!en) return;
      if (e.type === 'cursed') this.burst(e.x, e.y, 2, '#c8a0ff', 70, 0.25, 2.4);
      else this.burst(e.x, e.y, 2, '#ffe0b0', 70, 0.22, 2.2);
      if (!this.settings.dmgNumbers) return;
      // throttle: never more than ~14 numbers/sec/enemy-cluster; crits and big hits always show
      const big = e.dmg >= en.maxHp * 0.05 || e.crit || en.boss;
      this._hitBudget -= 1;
      if (!big && this.texts.length > 40) return;
      if (!big && this.rng.next() > 0.55) return;
      const col = e.crit ? '#ffd45a' : e.type === 'cursed' ? '#d0a8ff' : e.type === 'true' ? '#8ae8ff' : '#ffffff';
      this.text(e.x + this.rng.range(-12, 12), e.y - en.size * 0.45, String(Math.max(1, Math.round(e.dmg))), col, e.crit ? 20 : big ? 16 : 12, { dur: e.crit ? 1 : 0.7, vx: this.rng.range(-14, 14), bold: !!e.crit });
    }
    onKill(e) {
      const en = e.enemy;
      const col = (en.def && en.def.color) || '#8a5cd0';
      this.burst(en.x, en.y, en.boss ? 40 : en.elite ? 16 : 8, col, en.boss ? 220 : 110, 0.5, en.boss ? 5 : 3.2);
      this.ring(en.x, en.y, en.size * 0.8, col, 0.3, 2);
    }
    onFx(e) {
      const c = e.color || '#fff';
      switch (e.type) {
        case 'slash': this.beam(e.x1, e.y1, e.x2, e.y2, c, e.bf ? 7 : 4, e.bf ? 0.28 : 0.16); if (e.bf) { this.burst(e.x2, e.y2, 10, '#ff3b5c', 160, 0.35, 3); this.ring(e.x2, e.y2, 34, '#ff3b5c', 0.25, 3); this.shake(2.5, 0.12); } break;
        case 'beam': this.beam(e.x1, e.y1, e.x2, e.y2, c, e.width || 6, 0.3); break;
        case 'purple': this.beam(e.x1, e.y1, e.x2, e.y2, '#c8a0ff', e.width || 40, 0.6); this.beam(e.x1, e.y1, e.x2, e.y2, '#ffffff', (e.width || 40) * 0.4, 0.45); this.shake(6, 0.4); this.flash('#c8a0ff', 0.4, 0.3); break;
        case 'purpleCharge': this.ring(e.x, e.y, 70, '#c8a0ff', 0.6, 4, { from: 1 }); this.burst(e.x, e.y, 16, '#c8a0ff', 120, 0.6, 3); break;
        case 'blue': this.ring(e.x, e.y, e.r || 80, '#4aa8ff', 0.5, 5, { from: 1 }); this.burst(e.x, e.y, 20, '#4aa8ff', 150, 0.5, 3.4); break;
        case 'red': this.ring(e.x, e.y, e.r || 80, '#ff3a3a', 0.4, 6); this.burst(e.x, e.y, 24, '#ff5a3a', 220, 0.5, 3.6); this.shake(3, 0.2); break;
        case 'shock': this.ring(e.x, e.y, e.r || 50, c, 0.3, 4); this.burst(e.x, e.y, e.bolt ? 14 : 7, c, 130, 0.3, 3); break;
        case 'slam': this.ring(e.x, e.y, e.r || 50, '#fff', 0.3, 5); this.burst(e.x, e.y, 10, '#c8b890', 120, 0.4, 3.4, { solid: true, g: 120 }); this.shake(2.5, 0.14); break;
        case 'impact': this.ring(e.x, e.y, e.r || 60, c, 0.45, 6); this.burst(e.x, e.y, 22, c, 200, 0.55, 4); this.shake(Math.min(9, (e.r || 60) / 40), 0.3); break;
        case 'sweep': this.ring(e.x, e.y, e.r || 90, c, 0.3, 6); break;
        case 'water': this.ring(e.x, e.y, e.r || 90, '#4aa8ff', 0.6, 5); this.burst(e.x, e.y, 14, '#8ad0ff', 90, 0.6, 3.4); break;
        case 'speech': this.ring(e.x, e.y, e.r || 120, c, 0.5, 4); if (e.word) this.text(e.x, e.y - 40, String(e.word).toUpperCase() + '!', c, 22, { bold: true, dur: 0.9 }); break;
        case 'boogie': this.beam(e.x1, e.y1, e.x2, e.y2, '#ffe36a', 3, 0.25); this.burst(e.x2, e.y2, 8, '#ffe36a', 100, 0.3, 2.6); this.burst(e.x1, e.y1, 8, '#ffe36a', 100, 0.3, 2.6); break;
        case 'summon': case 'buff': this.ring(e.x, e.y, 48, c, 0.5, 3); this.burst(e.x, e.y + 8, 12, c, 60, 0.7, 3, { g: -90 }); break;
        case 'jackpot': this.burst(e.x, e.y, 40, '#ffe36a', 260, 1.0, 4, { g: 200 }); this.text(e.x, e.y - 40, 'JACKPOT!!', '#ffe36a', 30, { bold: true, dur: 1.5 }); this.flash('#ffe36a', 0.5, 0.35); break;
        case 'slotsRoll': break;
        case 'rika': case 'rikaBarrage': this.ring(e.x, e.y, 90, '#ff7ab8', 0.6, 5); this.burst(e.x, e.y, 24, '#ff7ab8', 180, 0.7, 4); break;
        case 'clash': this.ring(e.x, e.y, 120, '#fff', 0.7, 8); this.burst(e.x, e.y, 30, '#fff', 260, 0.6, 4); this.shake(8, 0.5); this.text(e.x, e.y - 50, 'DOMAIN CLASH', '#fff', 24, { bold: true, dur: 1.4 }); break;
        case 'shieldBreak': this.ring(e.x, e.y, 36, '#8ad8ff', 0.3, 4); this.burst(e.x, e.y, 10, '#8ad8ff', 130, 0.4, 3); break;
        case 'hold': this.ring(e.x, e.y, 26, '#fff', 0.35, 3); break;
        case 'resist': this.text(e.x, e.y - 24, 'WARDED', '#9ad8ff', 14, { bold: true }); this.ring(e.x, e.y, 30, '#9ad8ff', 0.4, 3); break;
        case 'resonance': this.ring(e.x, e.y, e.r || 40, '#ff9ac0', 0.35, 4); this.burst(e.x, e.y, 10, '#ff9ac0', 120, 0.4, 3); break;
        case 'spark': this.burst(e.x, e.y, 6, c, 100, 0.3, 2.6); break;
        case 'poof': case 'poof2': this.burst(e.x, e.y, 10, '#aaa', 80, 0.4, 3.5, { solid: true }); break;
        case 'copy': case 'transfigure': this.ring(e.x, e.y, 40, '#c8a0ff', 0.5, 4); this.burst(e.x, e.y, 14, '#c8a0ff', 100, 0.5, 3); break;
        case 'shell': this.ring(e.x, e.y, 60, '#d8c8a8', 0.5, 5); break;
        case 'bite': this.burst(e.x, e.y, 5, '#fff', 90, 0.25, 2.4); break;
        case 'clap': this.ring(e.x, e.y, 70, '#ffe36a', 0.35, 5); this.shake(2, 0.1); break;
        default: this.ring(e.x != null ? e.x : 640, e.y != null ? e.y : 360, e.r || 40, c, 0.35, 3);
      }
    }

    // ------------------------------------------------------------------ update / draw
    update(dt) {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) { this.release(this.parts, this._pp, i); continue; }
        p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.t += dt; t.y += t.vy * dt; t.x += t.vx * dt; t.vy *= 0.97; if (t.t >= t.dur) this.release(this.texts, this._pt, i); }
      for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.t += dt; if (r.t >= r.dur) this.release(this.rings, this._pr, i); }
      for (let i = this.beams.length - 1; i >= 0; i--) { const b = this.beams[i]; b.t += dt; if (b.t >= b.dur) this.release(this.beams, this._pb, i); }
      if (this.shakeT > 0) this.shakeT -= dt;
      if (this.flashT > 0) this.flashT -= dt;
    }

    shakeOffset(out) {
      if (this.shakeT > 0) { const k = this.shakeAmp * Math.min(1, this.shakeT * 3); out.x = (Math.random() - 0.5) * 2 * k; out.y = (Math.random() - 0.5) * 2 * k; } else { out.x = 0; out.y = 0; }
      return out;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.beams) {
        const a = 1 - b.t / b.dur;
        ctx.globalAlpha = a; ctx.strokeStyle = b.color; ctx.lineWidth = b.w * (0.6 + 0.4 * a); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, b.w * 0.3); ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      }
      for (const r of this.rings) {
        const k = r.t / r.dur, rad = r.r * (r.from + (1 - r.from) * (1 - (1 - k) * (1 - k)));
        ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = r.color; ctx.lineWidth = Math.max(1, r.w * (1 - k * 0.6));
        ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(1, rad), 0, TAU); ctx.stroke();
        if (r.fill) { ctx.globalAlpha = (1 - k) * 0.25; ctx.fillStyle = r.color; ctx.fill(); }
      }
      for (const p of this.parts) {
        if (!p.add) continue;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.4); ctx.fillStyle = p.color;
        const s = p.shrink ? p.size * k : p.size;
        ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      }
      ctx.restore();
      ctx.save();
      for (const p of this.parts) {
        if (p.add) continue;
        const k = p.life / p.max; ctx.globalAlpha = Math.min(1, k * 1.4); ctx.fillStyle = p.color;
        const s = p.shrink ? p.size * k : p.size; ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      }
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (const t of this.texts) {
        const k = t.t / t.dur;
        ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const pop = k < 0.12 ? 1 + (0.12 - k) * 5 : 1;
        ctx.font = (t.bold ? '800 ' : '700 ') + Math.round(t.size * pop) + 'px "Arial Narrow","Segoe UI",sans-serif';
        ctx.lineWidth = 3.5; ctx.strokeStyle = '#000c'; ctx.strokeText(t.str, t.x, t.y);
        ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
      }
      ctx.restore();
    }
    drawFlash(ctx, W, H) {
      if (this.flashT > 0) {
        const k = this.flashT / (this._flashDur || 0.4);
        ctx.save(); ctx.globalAlpha = Math.max(0, k) * this.flashMax; ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
    }
  }

  JJK.VFX = VFX;
})(typeof window !== 'undefined' ? window : globalThis);
