/* Ally-side models: shikigami (Divine Dogs, Nue, Max Elephant), Rika, and the standing battlefield sprites for playable characters.
   Summon models face RIGHT; the renderer mirrors them. Design space is ~100x100 (Rika ~220x220). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const Models = JJK.Models;
  const K = Models.kit;
  const { TAU, shade, rgba, ell, poly, glow, blobPath, volume, spec, stroke, wisps, eye, mouth, spike, veins, speckles, groundShadow, rng } = K;
  const sin = Math.sin, cos = Math.cos;
  const SM = Models.summons;

  /** Wispy shadow trail that the shikigami emerge from. */
  function shadowTrail(ctx, x, y, w, ph, col) {
    ctx.save(); ctx.globalAlpha = 0.85;
    const g = ctx.createRadialGradient(x, y, 1, x, y, w); g.addColorStop(0, rgba(col || '#05030c', 0.95)); g.addColorStop(0.7, rgba(col || '#05030c', 0.55)); g.addColorStop(1, rgba(col || '#05030c', 0));
    ctx.fillStyle = g; ell(ctx, x, y, w, w * 0.34); ctx.fill();
    ctx.strokeStyle = rgba('#7a5cff', 0.5); ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const t = ((ph / TAU) + i / 3) % 1; ctx.globalAlpha = 0.6 * (1 - t); ell(ctx, x, y, w * (0.4 + t * 0.7), w * (0.4 + t * 0.7) * 0.34); ctx.stroke(); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- Divine Dogs (variant 'white' | 'black')
  SM.dog = function (ctx, ph, v) {
    const white = v !== 'black';
    const fur = white ? '#f2f4ff' : '#26242e', mark = white ? '#1c1a26' : '#e8eaf4', eyeCol = white ? '#7a5cff' : '#ffd24a', belly = white ? '#c4c8e0' : '#14121a';
    groundShadow(ctx, 0, 30, 36, 6, 0.3);
    shadowTrail(ctx, -2, 28, 40, ph, '#06040f');
    const run = (i) => sin(ph + i * Math.PI);          // gallop: front pair and back pair out of phase
    // tail
    ctx.beginPath(); ctx.moveTo(-30, -4); ctx.quadraticCurveTo(-46, -12 + sin(ph) * 5, -50, -26 + sin(ph) * 6); ctx.quadraticCurveTo(-40, -14, -26, 4); ctx.closePath(); volume(ctx, fur, -38, -10, 14, { lw: 1.8 });
    // far legs (darker)
    const leg = (x, i, far) => {
      const s = run(i), kx = x + s * 11, fx = x + s * 15, c = far ? shade(fur, -0.3) : fur;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = shade(fur, -0.85); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(kx, 16 - Math.max(0, -s) * 4); ctx.lineTo(fx, 27 - Math.max(0, s) * 5); ctx.stroke();
      ctx.strokeStyle = c; ctx.lineWidth = 7.2; ctx.stroke();
      ctx.fillStyle = shade(mark, 0); ell(ctx, fx + 1.5, 27 - Math.max(0, s) * 5, 4.4, 2.8); ctx.fill(); // paw
    };
    leg(-18, 0, true); leg(16, 1, true);
    // body with haunch + chest
    ctx.beginPath(); ctx.moveTo(-32, -2); ctx.quadraticCurveTo(-34, -22, -14, -22); ctx.quadraticCurveTo(8, -24, 24, -18); ctx.quadraticCurveTo(38, -10, 32, 8); ctx.quadraticCurveTo(14, 16, -8, 14); ctx.quadraticCurveTo(-28, 14, -32, -2); ctx.closePath();
    volume(ctx, fur, 0, -4, 36, { hi: 0.15, lo: -0.45, rim: '#9a8cff', rimA: 0.3 });
    ctx.save(); ctx.clip();
    ctx.fillStyle = belly; ell(ctx, 2, 14, 30, 8); ctx.fill();
    ctx.fillStyle = rgba(white ? '#2a2640' : '#dfe2f2', 0.85); ctx.beginPath(); ctx.moveTo(-22, -22); ctx.quadraticCurveTo(-8, -10, -4, -22); ctx.closePath(); ctx.fill();
    ctx.restore();
    // back ridge tufts
    for (let i = 0; i < 6; i++) spike(ctx, -26 + i * 8, -21 + (i % 2), -Math.PI / 2 - 0.1, 7, 4, fur);
    // near legs
    leg(-12, 1, false); leg(22, 0, false);
    // neck ruff + head
    ctx.beginPath(); ctx.moveTo(18, -18); ctx.lineTo(24, -30); ctx.lineTo(28, -22); ctx.lineTo(36, -28); ctx.lineTo(36, -10); ctx.lineTo(28, -4); ctx.closePath(); volume(ctx, fur, 30, -16, 14, { lw: 1.6 });
    const hb = sin(ph * 2) * 1;
    ctx.beginPath(); ctx.moveTo(26, -28 + hb); ctx.quadraticCurveTo(34, -38 + hb, 44, -32 + hb); ctx.quadraticCurveTo(58, -30 + hb, 62, -22 + hb); ctx.quadraticCurveTo(60, -14 + hb, 48, -14 + hb); ctx.quadraticCurveTo(36, -10 + hb, 28, -16 + hb); ctx.closePath();
    volume(ctx, fur, 44, -24 + hb, 20, { lw: 2.2, hi: 0.3, rim: '#9a8cff', rimA: 0.3 });
    // markings: eye patch + snout tip
    ctx.fillStyle = mark; ell(ctx, 43, -27 + hb, 6.4, 5, -0.3); ctx.fill(); ell(ctx, 61, -22 + hb, 2.6, 2.4); ctx.fill();
    // ears
    spike(ctx, 30, -32 + hb, -Math.PI / 2 - 0.3, 14, 8, mark); spike(ctx, 38, -34 + hb, -Math.PI / 2 + 0.2, 13, 7.4, fur);
    // eye, nose, mouth
    glow(ctx, 44, -27 + hb, 9, eyeCol, 0.7); ctx.fillStyle = eyeCol; ell(ctx, 44.4, -27 + hb, 2.8, 2.2, -0.3); ctx.fill(); ctx.fillStyle = '#fff'; ell(ctx, 45.2, -27.8 + hb, 0.9, 0.9); ctx.fill();
    ctx.fillStyle = '#0a0812'; ell(ctx, 61.5, -22.6 + hb, 2.2, 1.8); ctx.fill();
    ctx.strokeStyle = '#0a0812'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(60, -15 + hb); ctx.quadraticCurveTo(50, -12 + hb, 44, -14 + hb); ctx.stroke();
    ctx.fillStyle = '#fff'; for (const x of [56, 52]) { ctx.beginPath(); ctx.moveTo(x, -15 + hb); ctx.lineTo(x - 1.4, -11.5 + hb); ctx.lineTo(x - 2.8, -15 + hb); ctx.fill(); }
    // wispy shadow aura rising off the fur
    };

  // ---------------------------------------------------------------- Nue: lightning-winged owl chimera (front view)
  SM.nue = function (ctx, ph) {
    const fl = sin(ph), c = '#2a2a58', gold = '#ffe36a';
    glow(ctx, 0, 0, 62, '#ffe36a', 0.22);
    // wings: layered feathers that sweep up and down
    for (const s of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        const n = 5 - row, base = row * 7;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1 || 1), ang = (-1.15 + t * 1.5) + fl * 0.35 - row * 0.08, len = 40 - row * 8 + t * 6 - 4;
          ctx.save(); ctx.translate(s * (8 + row * 1.5), -4 + row * 3); ctx.scale(s, 1); ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(0, -3.4); ctx.quadraticCurveTo(len * 0.6, -6.6, len, 0); ctx.quadraticCurveTo(len * 0.6, 6.6, 0, 3.4); ctx.closePath();
          const g = ctx.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, shade(c, 0.45 - row * 0.1)); g.addColorStop(1, shade(c, -0.5)); ctx.fillStyle = g; ctx.fill();
          ctx.lineWidth = 1.2; ctx.strokeStyle = '#0c0c20'; ctx.stroke();
          ctx.strokeStyle = rgba(gold, 0.85); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(len * 0.1, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
          ctx.restore();
        }
      }
    }
    // tail feathers
    for (let i = -1; i <= 1; i++) { ctx.save(); ctx.translate(0, 18); ctx.rotate(Math.PI / 2 + i * 0.35 + sin(ph + i) * 0.06); ctx.beginPath(); ctx.moveTo(0, -3.2); ctx.quadraticCurveTo(14, -5, 26, 0); ctx.quadraticCurveTo(14, 5, 0, 3.2); ctx.closePath(); volume(ctx, c, 12, 0, 14, { lw: 1.4, hi: 0.3 }); ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(22, 0); ctx.stroke(); ctx.restore(); }
    // body
    blobPath(ctx, 0, 4, 15, 22, { n: 18, amp: 0.02 }); volume(ctx, c, 0, 4, 22, { hi: 0.4, rim: '#8ab0ff', rimA: 0.35 });
    ctx.save(); ctx.clip();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = rgba(gold, 0.55); ctx.beginPath(); ctx.arc(-8 + i * 4, 10 + (i % 2) * 5, 4.4, Math.PI, TAU); ctx.fill(); }
    // chest lightning mark
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.shadowColor = gold; ctx.shadowBlur = 6; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(3, 2); ctx.lineTo(-2, 6); ctx.lineTo(3, 14); ctx.stroke();
    ctx.restore();
    // talons
    for (const s of [-1, 1]) { ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 5, 22); ctx.lineTo(s * 6, 28); ctx.moveTo(s * 5, 26); ctx.lineTo(s * 10, 30); ctx.moveTo(s * 5, 26); ctx.lineTo(s * 1, 31); ctx.stroke(); }
    // head: owl disc, ear tufts, hooked beak, glowing eyes
    blobPath(ctx, 0, -20, 15, 13, { n: 18, amp: 0.02 }); volume(ctx, '#3a3a76', 0, -20, 15, { hi: 0.5 });
    spike(ctx, -9, -28, -Math.PI / 2 - 0.5, 14, 6.4, c); spike(ctx, 9, -28, -Math.PI / 2 + 0.5, 14, 6.4, c);
    ctx.fillStyle = '#d8dcff'; ell(ctx, -6, -20, 7, 7.6); ctx.fill(); ell(ctx, 6, -20, 7, 7.6); ctx.fill(); ctx.strokeStyle = '#10102a'; ctx.lineWidth = 1.4; ctx.stroke();
    for (const s of [-1, 1]) { glow(ctx, s * 6, -20, 12, gold, 0.8); ctx.fillStyle = gold; ell(ctx, s * 6, -20, 3.6, 3.8); ctx.fill(); ctx.fillStyle = '#10102a'; ell(ctx, s * 6, -20, 1.2, 3); ctx.fill(); ctx.fillStyle = '#fff'; ell(ctx, s * 6 + 1, -21.4, 0.9, 0.9); ctx.fill(); }
    ctx.fillStyle = '#e8c860'; ctx.beginPath(); ctx.moveTo(-3, -17); ctx.quadraticCurveTo(0, -10, 0, -8); ctx.quadraticCurveTo(0, -10, 3, -17); ctx.closePath(); ctx.fill(); stroke(ctx, '#6a4a10', 1.2);
    // electricity
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const R = rng(7 + Math.round(ph * 10));
    for (let i = 0; i < 4; i++) { const a = R() * TAU, r0 = 22 + R() * 6; let x = cos(a) * r0, y = sin(a) * r0 * 0.9; ctx.strokeStyle = rgba('#fff6a0', 0.9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += cos(a + (R() - 0.5) * 1.6) * 7; y += sin(a + (R() - 0.5) * 1.6) * 7; ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.restore();
  };

  // ---------------------------------------------------------------- Max Elephant: a mountain of cursed water (faces right)
  SM.max = function (ctx, ph) {
    const c = '#4a8ae0', bob = sin(ph) * 1.2;
    glow(ctx, 0, 0, 70, '#4aa8ff', 0.22);
    groundShadow(ctx, 0, 38, 50, 8, 0.3);
    // ripples around feet
    ctx.save(); ctx.strokeStyle = rgba('#a8e0ff', 0.55); ctx.lineWidth = 1.6; for (let i = 0; i < 2; i++) { const t = ((ph / TAU) + i / 2) % 1; ctx.globalAlpha = 0.7 * (1 - t); ell(ctx, 0, 36, 30 + t * 30, (30 + t * 30) * 0.22); ctx.stroke(); } ctx.restore();
    const leg = (x, i, far) => { const s = sin(ph + i * Math.PI) * 2.5; ctx.beginPath(); ctx.moveTo(x - 8, 6); ctx.lineTo(x + 8, 6); ctx.lineTo(x + 7 + s, 34); ctx.lineTo(x - 7 + s, 34); ctx.closePath(); volume(ctx, shade(c, far ? -0.3 : -0.05), x, 20, 16, { lw: 2 }); ctx.fillStyle = '#d8ecff'; ell(ctx, x + s, 34, 8, 3); ctx.fill(); stroke(ctx, '#10305a', 1.4); };
    leg(-30, 0, true); leg(20, 1, true);
    // body
    blobPath(ctx, -4, -4 + bob, 42, 30, { n: 20, amp: 0.02, k: 2 }); volume(ctx, c, -4, -4, 42, { hi: 0.55, rim: '#a8e8ff', rimA: 0.35 });
    ctx.save(); blobPath(ctx, -4, -4 + bob, 42, 30, { n: 20, amp: 0.02, k: 2 }); ctx.clip();
    // water caustics + wrinkles
    ctx.strokeStyle = rgba('#c8f0ff', 0.4); ctx.lineWidth = 1.4; for (let i = 0; i < 5; i++) { const y = -18 + i * 9; ctx.beginPath(); for (let x = -44; x <= 40; x += 6) ctx.lineTo(x, y + sin(x * 0.2 + ph + i) * 2.4); ctx.stroke(); }
    ctx.strokeStyle = rgba('#10305a', 0.35); ctx.lineWidth = 1.6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-30 + i * 14, -10); ctx.quadraticCurveTo(-26 + i * 14, 4, -30 + i * 14, 18); ctx.stroke(); }
    ctx.restore();
    spec(ctx, -14, -22, 20, 7, 0.45, -0.1);
    leg(-22, 1, false); leg(30, 0, false);
    // tail
    ctx.strokeStyle = shade(c, -0.3); ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-44, -4); ctx.quadraticCurveTo(-52, 4 + sin(ph) * 3, -50, 18); ctx.stroke(); ctx.fillStyle = shade(c, -0.4); ell(ctx, -50, 20, 3.6, 4.6); ctx.fill();
    // head + big ear + trunk spraying water + tusks
    ctx.beginPath(); ctx.ellipse(34, -14 + bob, 18, 17, 0, 0, TAU); volume(ctx, c, 34, -14, 18, { hi: 0.5, lw: 2.4 });
    ctx.beginPath(); ctx.moveTo(24, -26); ctx.quadraticCurveTo(0, -42 + sin(ph * 2) * 2, 6, -4); ctx.quadraticCurveTo(20, 4, 28, -8); ctx.closePath(); volume(ctx, shade(c, 0.1), 14, -18, 24, { lw: 2.2, hi: 0.35 });
    ctx.strokeStyle = rgba('#10305a', 0.4); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(16, -24); ctx.quadraticCurveTo(10, -14, 16, -6); ctx.stroke();
    // trunk: raised, curving up
    ctx.lineCap = 'round'; ctx.strokeStyle = shade(c, -0.7); ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(46, -10); ctx.quadraticCurveTo(66, -6 + sin(ph) * 2, 66, -30 + sin(ph) * 2); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = rgba('#d8f4ff', 0.6); ctx.lineWidth = 2; ctx.stroke();
    // water jet from trunk tip
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#aee4ff', 0.8);
    for (let i = 0; i < 9; i++) { const t = ((ph / TAU) + i / 9) % 1, x = 66 + t * 14, y = -32 - Math.sin(t * Math.PI) * 18 + t * 26; ctx.globalAlpha = 1 - t * 0.7; ell(ctx, x, y, 2.4 * (1 - t * 0.4), 2.4 * (1 - t * 0.4)); ctx.fill(); }
    ctx.restore();
    spike(ctx, 50, -2, 0.7, 14, 6, '#f6f0e0', { curve: -1 }); spike(ctx, 46, 0, 0.35, 12, 5.4, '#e8e0cc', { curve: -1 });
    eye(ctx, 40, -20 + bob, 3.8, '#102a5a', { lid: 0.3, sclera: '#eaf6ff', look: 1, glow: '#8ad0ff' });
    ctx.strokeStyle = '#10305a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(34, -28 + bob); ctx.lineTo(46, -25 + bob); ctx.stroke();
  };

  // ---------------------------------------------------------------- Rika: Queen of Curses, looming behind Yuta (front view, ~220 design space)
  SM.rika = function (ctx, ph) {
    const pulse = 0.5 + 0.5 * sin(ph), pk = '#ff7ab8';
    glow(ctx, 0, 0, 120, pk, 0.28 + pulse * 0.1);
    // swirling cursed energy
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = ph + i * TAU / 8, r = 70 + sin(ph * 2 + i) * 8; ctx.strokeStyle = rgba(pk, 0.4); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 4, r, a, a + 0.5); ctx.stroke(); ctx.strokeStyle = rgba('#ffd0e8', 0.6); ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.restore();
    // long hair, billowing
    for (let i = 0; i < 9; i++) {
      const s = i < 5 ? -1 : 1, k = i < 5 ? i : i - 5, x0 = s * (14 + k * 4), sw = sin(ph + i * 0.9) * 8;
      ctx.beginPath(); ctx.moveTo(x0 - 5, -50); ctx.quadraticCurveTo(s * (42 + k * 10) + sw, -20, s * (38 + k * 12) + sw, 36 + k * 8); ctx.quadraticCurveTo(s * (30 + k * 6), -10, x0 + 5, -50); ctx.closePath();
      volume(ctx, '#0c0814', s * 36, -4, 60, { hi: 0.12, lo: -0.1, lw: 1.4, rim: '#ff7ab8', rimA: 0.28 });
    }
    // arms: long, clawed, reaching forward
    for (const s of [-1, 1]) {
      const sw = sin(ph + (s > 0 ? 0 : 1.7)) * 6;
      ctx.beginPath(); ctx.moveTo(s * 26, -22); ctx.quadraticCurveTo(s * 70, -26 + sw, s * 78, 20 + sw); ctx.lineTo(s * 64, 26 + sw); ctx.quadraticCurveTo(s * 60, -2, s * 22, -6); ctx.closePath();
      volume(ctx, '#17102a', s * 54, 0, 56, { lw: 2.4, hi: 0.18, rim: '#ff7ab8', rimA: 0.3 });
      for (let k = -2; k <= 2; k++) spike(ctx, s * 72 + k * 4, 24 + sw, Math.PI / 2 + k * 0.22 + (s > 0 ? 0.1 : -0.1), 18, 5.6, '#efe6f4');
    }
    // torso: black gown flaring down
    ctx.beginPath(); ctx.moveTo(-28, -30); ctx.quadraticCurveTo(-40, 30, -56, 70); ctx.lineTo(56, 70); ctx.quadraticCurveTo(40, 30, 28, -30); ctx.closePath();
    volume(ctx, '#140e24', 0, 20, 70, { hi: 0.12, rim: '#ff7ab8', rimA: 0.3 });
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgba(pk, 0.25); ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 8, -20); ctx.quadraticCurveTo(i * 16, 24, i * 22 + sin(ph + i) * 3, 70); ctx.stroke(); } ctx.restore();
    // pale face with a huge fixed grin and ringed eyes
    blobPath(ctx, 0, -44, 26, 28, { n: 18, amp: 0.02 }); volume(ctx, '#e8e0f0', 0, -44, 28, { hi: 0.4, lo: -0.4 });
    ctx.fillStyle = '#0c0814'; ctx.beginPath(); ctx.moveTo(-26, -56); ctx.quadraticCurveTo(0, -86, 26, -56); ctx.quadraticCurveTo(14, -66, 0, -64); ctx.quadraticCurveTo(-14, -66, -26, -56); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#05030a'; ell(ctx, s * 11, -48, 8.4, 10.4); ctx.fill();
      glow(ctx, s * 11, -48, 16, '#ff5aa8', 0.8);
      ctx.fillStyle = '#fff'; ell(ctx, s * 11, -48, 4.6, 5.6); ctx.fill(); ctx.fillStyle = '#05030a'; ell(ctx, s * 11, -48, 1.8, 2.4); ctx.fill();
    }
    mouth(ctx, 0, -30, 38, 9, 11, { dark: '#0c0410', inner: '#5a0c28', tongueCol: '#c02060', tooth: '#fffaf0', droop: 1.0 });
    // forehead mark
    ctx.strokeStyle = '#c02060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(0, -58); ctx.stroke();
    wisps(ctx, 0, 40, 40, pk, ph, 6, 30);
  };


  // ---------------------------------------------------------------- playable characters: cut-out standee on a rune platter
  const SIGIL = {
    yuji(c, r, col) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8, rr = i % 2 ? r * 0.38 : r * 0.9; c.lineTo(cos(a) * rr, sin(a) * rr); } c.closePath(); c.fill(); },
    panda(c, r) { ell(c, 0, r * 0.18, r * 0.42, r * 0.34); c.fill(); for (const [x, y] of [[-0.55, -0.32], [-0.2, -0.62], [0.2, -0.62], [0.55, -0.32]]) { ell(c, x * r, y * r, r * 0.17, r * 0.2); c.fill(); } },
    nobara(c, r) { c.lineWidth = r * 0.16; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.7, -r * 0.7); c.lineTo(r * 0.7, r * 0.7); c.moveTo(r * 0.7, -r * 0.7); c.lineTo(-r * 0.7, r * 0.7); c.stroke(); ell(c, 0, 0, r * 0.2, r * 0.2); c.fill(); },
    megumi(c, r, col) { for (let i = 0; i < 3; i++) { c.lineWidth = r * 0.12; ell(c, 0, 0, r * (0.32 + i * 0.3), r * (0.32 + i * 0.3)); c.stroke(); } c.beginPath(); c.moveTo(-r * 0.5, -r * 0.1); c.lineTo(-r * 0.42, -r * 0.55); c.lineTo(-r * 0.16, -r * 0.2); c.moveTo(r * 0.5, -r * 0.1); c.lineTo(r * 0.42, -r * 0.55); c.lineTo(r * 0.16, -r * 0.2); c.fill(); },
    maki(c, r) { c.lineWidth = r * 0.14; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.9, r * 0.5); c.lineTo(r * 0.9, -r * 0.5); c.stroke(); c.beginPath(); c.moveTo(r * 0.9, -r * 0.5); c.lineTo(r * 0.5, -r * 0.42); c.lineTo(r * 0.7, -r * 0.14); c.closePath(); c.fill(); ell(c, 0, 0, r * 0.2, r * 0.2); c.stroke(); },
    inumaki(c, r) { for (let i = 0; i < 2; i++) { c.lineWidth = r * 0.12; ell(c, 0, 0, r * (0.45 + i * 0.4), r * (0.45 + i * 0.4)); c.stroke(); } for (const s of [-1, 1]) { ell(c, s * r * 0.18, 0, r * 0.1, r * 0.1); c.fill(); } },
    nanami(c, r) { c.lineWidth = r * 0.16; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.9, 0); c.lineTo(r * 0.9, 0); c.stroke(); c.beginPath(); c.moveTo(-r * 0.4, -r * 0.7); c.lineTo(-r * 0.4, r * 0.7); c.stroke(); c.lineWidth = r * 0.1; c.beginPath(); c.moveTo(r * 0.5, -r * 0.5); c.lineTo(r * 0.5, r * 0.5); c.stroke(); },
    meimei(c, r) { c.beginPath(); c.arc(0, 0, r * 0.8, 0.5, TAU - 0.5); c.arc(r * 0.28, 0, r * 0.62, TAU - 0.8, 0.8, true); c.closePath(); c.fill(); },
    todo(c, r) { c.lineWidth = r * 0.14; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * 0.75, 0, r * 0.55, s > 0 ? Math.PI * 0.6 : -Math.PI * 0.6, s > 0 ? Math.PI * 1.4 : Math.PI * 0.6 + Math.PI * 0, s < 0); c.stroke(); } ell(c, 0, 0, r * 0.14, r * 0.14); c.fill(); },
    choso(c, r) { for (const [x, y, k] of [[0, -0.1, 1], [-0.55, 0.35, 0.75], [0.55, 0.35, 0.75]]) { c.beginPath(); c.moveTo(x * r, (y - 0.6 * k) * r); c.quadraticCurveTo((x + 0.4 * k) * r, (y + 0.1 * k) * r, x * r, (y + 0.4 * k) * r); c.quadraticCurveTo((x - 0.4 * k) * r, (y + 0.1 * k) * r, x * r, (y - 0.6 * k) * r); c.fill(); } },
    hakari(c, r) { c.lineWidth = r * 0.12; for (let i = 0; i < 3; i++) { c.strokeRect(-r * 0.9 + i * r * 0.62, -r * 0.4, r * 0.5, r * 0.8); } c.fillRect(-r * 0.62, -r * 0.1, r * 0.2, r * 0.2); c.fillRect(-r * 0.0 + -r * 0.1, -r * 0.1, r * 0.2, r * 0.2); c.fillRect(r * 0.62, -r * 0.1, r * 0.2, r * 0.2); },
    yuta(c, r) { for (let i = 0; i < 2; i++) { c.lineWidth = r * 0.14; ell(c, 0, 0, r * (0.9 - i * 0.4), r * (0.9 - i * 0.4)); c.stroke(); } ell(c, 0, 0, r * 0.12, r * 0.12); c.fill(); },
    toji(c, r) { c.lineWidth = r * 0.12; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.9, -r * 0.9); c.lineTo(r * 0.9, r * 0.9); c.moveTo(-r * 0.9, r * 0.2); c.lineTo(r * 0.2, -r * 0.9); c.stroke(); c.beginPath(); c.moveTo(r * 0.9, r * 0.9); c.lineTo(r * 0.55, r * 0.78); c.lineTo(r * 0.78, r * 0.55); c.closePath(); c.fill(); },
    mai(c, r) { c.lineWidth = r * 0.12; ell(c, 0, 0, r * 0.7, r * 0.7); c.stroke(); c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.98, 0); c.lineTo(-r * 0.4, 0); c.moveTo(r * 0.4, 0); c.lineTo(r * 0.98, 0); c.moveTo(0, -r * 0.98); c.lineTo(0, -r * 0.4); c.moveTo(0, r * 0.4); c.lineTo(0, r * 0.98); c.stroke(); ell(c, 0, 0, r * 0.12, r * 0.12); c.fill(); },
    momo(c, r) { c.beginPath(); c.moveTo(-r * 0.2, -r * 0.95); c.lineTo(r * 0.55, r * 0.35); c.lineTo(-r * 0.6, r * 0.35); c.closePath(); c.fill(); c.lineWidth = r * 0.12; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.95, r * 0.5); c.lineTo(r * 0.95, r * 0.5); c.stroke(); },
    miwa(c, r) { c.lineWidth = r * 0.12; c.beginPath(); c.arc(0, r * 0.3, r * 0.85, Math.PI, 0); c.stroke(); c.beginPath(); c.arc(0, r * 0.3, r * 0.5, Math.PI, 0); c.stroke(); c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.95, r * 0.3); c.lineTo(r * 0.95, r * 0.3); c.stroke(); ell(c, 0, r * 0.3, r * 0.12, r * 0.12); c.fill(); },
    utahime(c, r) { c.beginPath(); c.moveTo(-r * 0.5, r * 0.4); c.quadraticCurveTo(-r * 0.5, -r * 0.5, 0, -r * 0.6); c.quadraticCurveTo(r * 0.5, -r * 0.5, r * 0.5, r * 0.4); c.closePath(); c.fill(); ell(c, 0, r * 0.55, r * 0.14, r * 0.14); c.fill(); c.lineWidth = r * 0.09; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(0, -r * 0.1, r * (0.8 + i * 0.22), -2.5, -0.64); c.stroke(); } },
    uraume(c, r) { c.lineWidth = r * 0.1; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3, dx = cos(a) * r * 0.92, dy = sin(a) * r * 0.92; c.beginPath(); c.moveTo(-dx, -dy); c.lineTo(dx, dy); c.stroke(); for (const s of [-1, 1]) { const bx = dx * 0.6 * s, by = dy * 0.6 * s; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + cos(a + 0.9 * s) * r * 0.3, by + sin(a + 0.9 * s) * r * 0.3); c.moveTo(bx, by); c.lineTo(bx + cos(a - 0.9 * s) * r * 0.3, by + sin(a - 0.9 * s) * r * 0.3); c.stroke(); } } },
    naoya(c, r) { c.lineWidth = r * 0.1; c.strokeRect(-r * 0.9, -r * 0.5, r * 1.8, r * 1.0); for (let i = 0; i < 5; i++) { c.fillRect(-r * 0.8 + i * r * 0.36, -r * 0.82, r * 0.18, r * 0.2); c.fillRect(-r * 0.8 + i * r * 0.36, r * 0.62, r * 0.18, r * 0.2); } c.beginPath(); c.moveTo(-r * 0.2, -r * 0.28); c.lineTo(r * 0.38, 0); c.lineTo(-r * 0.2, r * 0.28); c.closePath(); c.fill(); },
    higuruma(c, r) { c.lineWidth = r * 0.14; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.7, r * 0.8); c.lineTo(r * 0.5, -r * 0.2); c.stroke(); c.save(); c.translate(r * 0.4, -r * 0.3); c.rotate(-0.8); c.fillRect(-r * 0.2, -r * 0.55, r * 0.4, r * 1.1); c.restore(); c.fillRect(-r * 0.9, r * 0.82, r * 1.0, r * 0.12); },
    geto(c, r) { c.lineWidth = r * 0.12; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i < 60; i++) { const t = i / 59, a = t * Math.PI * 4.4, rr = r * (0.1 + t * 0.85); c.lineTo(cos(a) * rr, sin(a) * rr); } c.stroke(); ell(c, 0, 0, r * 0.1, r * 0.1); c.fill(); },
    kashimo(c, r) { c.beginPath(); c.moveTo(r * 0.3, -r); c.lineTo(-r * 0.45, r * 0.1); c.lineTo(-r * 0.02, r * 0.1); c.lineTo(-r * 0.3, r); c.lineTo(r * 0.5, -r * 0.2); c.lineTo(r * 0.08, -r * 0.2); c.closePath(); c.fill(); },
    yuki(c, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.38 : r * 0.9; c.lineTo(cos(a) * rr, sin(a) * rr); } c.closePath(); c.fill(); c.lineWidth = r * 0.08; ell(c, 0, 0, r * 0.98, r * 0.98); c.stroke(); },
    jogoC(c, r) { for (const [x, y, k] of [[0, 0.1, 1], [-0.55, 0.4, 0.7], [0.55, 0.4, 0.7]]) { c.beginPath(); c.moveTo(x * r, (y + 0.55 * k) * r); c.bezierCurveTo((x - 0.55 * k) * r, (y + 0.1 * k) * r, (x - 0.1 * k) * r, (y - 0.3 * k) * r, x * r, (y - 0.85 * k) * r); c.bezierCurveTo((x + 0.1 * k) * r, (y - 0.3 * k) * r, (x + 0.55 * k) * r, (y + 0.1 * k) * r, x * r, (y + 0.55 * k) * r); c.fill(); } },
    mahitoC(c, r) { c.lineWidth = r * 0.12; ell(c, 0, 0, r * 0.8, r * 0.8); c.stroke(); c.lineCap = 'round'; c.lineWidth = r * 0.09; c.beginPath(); c.moveTo(-r * 0.8, -r * 0.1); c.lineTo(r * 0.8, r * 0.1); c.stroke(); for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * r * 0.2, i * r * 0.025 - r * 0.2); c.lineTo(i * r * 0.2, i * r * 0.025 + r * 0.2); c.stroke(); } },
    sukunaC(c, r) { for (const [x, y] of [[-0.35, -0.3], [0.35, -0.3], [-0.45, 0.2], [0.45, 0.2]]) { c.save(); c.translate(x * r, y * r); c.rotate(x * 0.5); ell(c, 0, 0, r * 0.26, r * 0.12); c.fill(); c.restore(); } c.lineWidth = r * 0.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.8, r * 0.7); c.lineTo(0, r * 0.45); c.lineTo(r * 0.8, r * 0.7); c.stroke(); },
    gojo(c, r) { c.lineWidth = r * 0.12; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.lineTo(cos(a) * r * 0.9, sin(a) * r * 0.9); } c.closePath(); c.stroke(); ell(c, 0, 0, r * 0.42, r * 0.26); c.stroke(); ell(c, 0, 0, r * 0.13, r * 0.13); c.fill(); },
  };

  /** Standing battlefield sprite for a playable character. Platter centre sits at (W/2, H*0.78); returns { canvas, ax, ay } with ax/ay = platter centre. */
  JJK.Art.unitSprite = function (id, px) {
    const A = JJK.Art, key = 'us:' + id + ':' + px;
    if (A._cache[key]) return A._cache[key];
    const def = JJK.Characters[id]; if (!def || typeof document === 'undefined') return null;
    const rar = JJK.Balance.rarity[def.rarity], col = def.color || '#8a5cd0', rc = rar.color;
    const hi = def.rarity === 'LEGENDARY' || def.rarity === 'MYTHIC' || def.rarity === 'SPECIAL' || def.rarity === 'JOAN', epic = hi || def.rarity === 'EPIC';
    const fig = px * 1.32, W = Math.round(fig * 1.5), H = Math.round(fig * 1.62), cx = W / 2, cy = Math.round(H * 0.8), rx = px * 0.56, ry = px * 0.21;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const c = mk(), x = c.getContext('2d');
    // aura behind the figure
    const ag = x.createRadialGradient(cx, cy - fig * 0.45, 2, cx, cy - fig * 0.45, fig * 0.72); ag.addColorStop(0, rgba(col, hi ? 0.5 : 0.32)); ag.addColorStop(1, rgba(col, 0)); x.fillStyle = ag; x.fillRect(0, 0, W, H);
    // platter
    x.save(); x.translate(cx, cy);
    x.fillStyle = 'rgba(0,0,0,.45)'; ell(x, 0, ry * 0.35, rx * 1.12, ry * 1.18); x.fill();
    const pg = x.createRadialGradient(0, -ry * 0.3, 2, 0, 0, rx); pg.addColorStop(0, shade(col, -0.35)); pg.addColorStop(0.7, shade(col, -0.7)); pg.addColorStop(1, '#07050f');
    x.fillStyle = pg; ell(x, 0, 0, rx, ry); x.fill();
    x.lineWidth = 3; x.strokeStyle = rc; ell(x, 0, 0, rx, ry); x.stroke();
    x.lineWidth = 1; x.strokeStyle = rgba('#ffffff', 0.35); ell(x, 0, 0, rx - 3.5, ry - 1.6); x.stroke();
    // rune ring ticks
    x.strokeStyle = rgba(col, 0.8); x.lineWidth = 1.4; for (let i = 0; i < 16; i++) { const a = i * TAU / 16; x.beginPath(); x.moveTo(cos(a) * (rx - 6), sin(a) * (ry - 2.6)); x.lineTo(cos(a) * (rx - 9), sin(a) * (ry - 4)); x.stroke(); }
    // sigil (drawn flat then squashed into the platter plane)
    x.save(); x.scale(1, ry / rx); x.fillStyle = rgba(shade(col, 0.5), 0.8); x.strokeStyle = rgba(shade(col, 0.5), 0.8); const sg = SIGIL[id]; if (sg) sg(x, rx * 0.46, col); x.restore();
    x.restore();
    const cut = !A.overrides.characters[id] && A.cutout ? A.cutout(id) : null;
    const p = cut || A.portrait(id, 200, 200);
    if ((cut || p instanceof HTMLImageElement) && (p.naturalWidth || p.width)) {
      const iw = p.naturalWidth || p.width, ih = p.naturalHeight || p.height;
      const fc = mk(), fx = fc.getContext('2d');
      const w = fig, h = fig * ih / iw, bx = cx - w / 2, by = cy - h + ry * 0.35;
      // sticker outline: tinted silhouette copies
      const tint = mk(), tx = tint.getContext('2d');
      tx.drawImage(p, bx, by, w, h); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = hi ? '#fff3c0' : '#ffffff'; tx.fillRect(0, 0, W, H);
      const o = 2.2;
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; fx.drawImage(tint, cos(a) * o, sin(a) * o); }
      fx.globalCompositeOperation = 'source-atop'; const og = fx.createLinearGradient(0, by, 0, by + h); og.addColorStop(0, rgba(shade(col, 0.55), 1)); og.addColorStop(1, rgba(shade(col, 0.1), 1)); fx.fillStyle = og; fx.fillRect(0, 0, W, H);
      fx.globalCompositeOperation = 'source-over'; fx.shadowColor = 'rgba(0,0,0,.55)'; fx.shadowBlur = 5; fx.shadowOffsetY = 2; fx.drawImage(p, bx, by, w, h); fx.shadowColor = 'transparent';
      // melt the cut bottom into the platter
      fx.globalCompositeOperation = 'destination-out'; const mg = fx.createLinearGradient(0, cy - fig * 0.2, 0, cy + ry * 0.4); mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, 'rgba(0,0,0,1)'); fx.fillStyle = mg; fx.fillRect(0, cy - fig * 0.2, W, fig);
      fx.globalCompositeOperation = 'source-over';
      x.drawImage(fc, 0, 0);
      // front lip of the platter seats the figure
      x.save(); x.translate(cx, cy); x.lineWidth = 3; x.strokeStyle = rc; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0.12, Math.PI - 0.12); x.stroke(); x.restore();
    } else {
      const t = A.token(id, Math.round(fig)); x.drawImage(t, cx - t.width / 2, cy - t.height + ry * 0.2);
    }
    // rarity sparkle on epic+ units
    if (epic) { const R = rng(Util_hash(id)); x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < (hi ? 7 : 4); i++) { const sx = cx + (R() - 0.5) * fig * 1.2, sy = cy - R() * fig * 1.05; x.fillStyle = rgba(hi ? '#ffe9a0' : rc, 0.85); x.beginPath(); x.moveTo(sx, sy - 3); x.lineTo(sx + 1, sy - 1); x.lineTo(sx + 3, sy); x.lineTo(sx + 1, sy + 1); x.lineTo(sx, sy + 3); x.lineTo(sx - 1, sy + 1); x.lineTo(sx - 3, sy); x.lineTo(sx - 1, sy - 1); x.closePath(); x.fill(); } x.restore(); }
    const out = { canvas: c, ax: cx, ay: cy, fig, rx, ry };
    A._cache[key] = out;
    return out;
  };
  function Util_hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // frame caches -------------------------------------------------------
  const FR = { dog: [8, 160, 140], nue: [8, 144, 112], max: [8, 176, 150], rika: [8, 288, 230], dragon: [8, 192, 140], garuda: [8, 192, 140] };
  JJK.Art.summonFrames = function (id, variant) {
    const A = JJK.Art, key = 'sm:' + id + ':' + (variant || '');
    if (A._cache[key]) return A._cache[key];
    const spec_ = FR[id], fn = SM[id];
    if (!spec_ || !fn || typeof document === 'undefined') return [];
    const [N, S, D] = spec_, out = [];
    for (let f = 0; f < N; f++) { const c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d'); ctx.translate(S / 2, S / 2); ctx.scale(S / D, S / D); fn(ctx, (f / N) * TAU, variant); out.push(c); }
    A._cache[key] = out;
    return out;
  };
  JJK.Art.summonSheet = function () {
    return [['dog', 'white'], ['dog', 'black'], ['nue'], ['max'], ['rika'], ['dragon'], ['garuda']].map((a) => ({ id: a[0] + (a[1] ? ':' + a[1] : ''), frames: JJK.Art.summonFrames(a[0], a[1]) }));
  };
})(typeof window !== 'undefined' ? window : globalThis);
