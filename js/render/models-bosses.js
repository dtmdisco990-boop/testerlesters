/* Boss models. Design space is ~150x150 (origin at centre); ph loops over 0..TAU. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const Models = JJK.Models;
  const K = Models.kit;
  const { TAU, shade, rgba, ell, poly, glow, blobPath, volume, spec, stroke, wisps, eye, mouth, spike, stitches, veins, speckles, groundShadow, rng } = K;
  const sin = Math.sin, cos = Math.cos;
  const B = Models.bosses;

  function embers(ctx, cx, cy, r, col, ph, n, seed) {
    const R = rng(seed); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, d = r * (0.5 + R() * 0.6), t = ((ph / TAU) + R()) % 1;
      const x = cx + cos(a) * d + sin(ph * 2 + i) * 3, y = cy + sin(a) * d * 0.6 - t * 34;
      ctx.fillStyle = rgba(col, (1 - t) * 0.9); ell(ctx, x, y, 1.4 + R() * 1.4, 1.4 + R() * 1.4); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- Finger Bearer: vessel of a Sukuna finger
  B.finger = function (ctx, d, ph) {
    const pulse = 0.5 + 0.5 * sin(ph);
    glow(ctx, 0, 0, 78, '#a02828', 0.28 + pulse * 0.15);
    // cursed shell ring
    ctx.save(); ctx.strokeStyle = rgba('#ff3a3a', 0.55); ctx.lineWidth = 2.4; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -ph * 12; ctx.beginPath(); ctx.arc(0, 2, 62 + sin(ph) * 2, 0, TAU); ctx.stroke(); ctx.restore();
    groundShadow(ctx, 0, 54, 50, 9, 0.3);
    // orbiting finger fragments
    for (let i = 0; i < 6; i++) {
      const a = ph + i * TAU / 6, x = cos(a) * 64, y = sin(a) * 42 + 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(-5, -12); ctx.quadraticCurveTo(-7, 0, -5, 12); ctx.lineTo(5, 12); ctx.quadraticCurveTo(7, 0, 5, -12); ctx.quadraticCurveTo(0, -16, -5, -12); ctx.closePath();
      volume(ctx, '#7a5240', 0, 0, 12, { lw: 1.6, hi: 0.3 });
      ctx.strokeStyle = '#2a1410'; ctx.lineWidth = 1; for (const yy of [-4, 3, 8]) { ctx.beginPath(); ctx.moveTo(-5, yy); ctx.lineTo(5, yy); ctx.stroke(); }
      ctx.fillStyle = '#c8b090'; ctx.beginPath(); ctx.ellipse(0, -11, 3.2, 2.2, 0, 0, TAU); ctx.fill();
      ctx.restore(); glow(ctx, x, y, 14, '#ff3030', 0.35);
    }
    // arms
    for (const s of [-1, 1]) {
      const sw = sin(ph + (s > 0 ? 0 : Math.PI)) * 3;
      ctx.beginPath(); ctx.moveTo(s * 26, -14); ctx.quadraticCurveTo(s * 56, -6 + sw, s * 54, 30 + sw); ctx.lineTo(s * 38, 32 + sw); ctx.quadraticCurveTo(s * 36, 6, s * 22, 0); ctx.closePath();
      volume(ctx, '#bfae8e', s * 44, 10, 30, { lw: 3 });
      for (const k of [-1, 0, 1]) spike(ctx, s * 46 + k * 7, 34 + sw, Math.PI / 2 + k * 0.25, 12, 6, '#3a2418');
    }
    // body
    blobPath(ctx, 0, 4, 42, 44, { ph, amp: 0.03, n: 28 }); volume(ctx, '#d8c8a8', 0, 4, 44, { hi: 0.4 });
    ctx.save(); blobPath(ctx, 0, 4, 42, 44, { ph, amp: 0.03, n: 28 }); ctx.clip();
    veins(ctx, 0, 6, 46, '#8a1818', 3, 12, 0.6);
    speckles(ctx, 0, 10, 40, rgba('#6a4a30', 0.3), 9, 36, 2);
    // ribs
    ctx.strokeStyle = rgba('#7a5a40', 0.55); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const y = 18 + i * 8; ctx.beginPath(); ctx.moveTo(-26 + i * 2, y); ctx.quadraticCurveTo(0, y + 6, 26 - i * 2, y); ctx.stroke(); }
    // cracks leaking cursed energy
    ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 1.8; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(-22, -2); ctx.lineTo(-24, 8); ctx.lineTo(-16, 14); ctx.moveTo(30, -4); ctx.lineTo(22, 4); ctx.lineTo(26, 14); ctx.stroke();
    ctx.restore();
    spec(ctx, -18, -24, 18, 9, 0.38, -0.5);
    // mummified finger crowning the head
    ctx.save(); ctx.translate(0, -42);
    glow(ctx, 0, -6, 26, '#ff2a2a', 0.5 + pulse * 0.3);
    ctx.beginPath(); ctx.moveTo(-8, 6); ctx.quadraticCurveTo(-10, -14, -6, -24); ctx.quadraticCurveTo(0, -30, 6, -24); ctx.quadraticCurveTo(10, -14, 8, 6); ctx.closePath();
    volume(ctx, '#6a4636', 0, -10, 20, { lw: 2.2, hi: 0.4 });
    ctx.strokeStyle = '#201008'; ctx.lineWidth = 1.4; for (const yy of [-16, -8, -1]) { ctx.beginPath(); ctx.moveTo(-8, yy); ctx.quadraticCurveTo(0, yy + 3, 8, yy); ctx.stroke(); }
    ctx.fillStyle = '#d8c4a0'; ctx.beginPath(); ctx.moveTo(-4.4, -22); ctx.quadraticCurveTo(0, -30, 4.4, -22); ctx.lineTo(3.6, -16); ctx.lineTo(-3.6, -16); ctx.closePath(); ctx.fill(); stroke(ctx, '#201008', 1.2);
    ctx.restore();
    // face
    ctx.strokeStyle = '#3a1410'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-28, -18); ctx.lineTo(-8, -9); ctx.moveTo(28, -18); ctx.lineTo(8, -9); ctx.stroke();
    eye(ctx, -15, -6, 10, '#c01818', { slit: true, lid: 0.35, tilt: 0.35, glow: '#ff2a2a', sclera: '#f6e8d4' });
    eye(ctx, 15, -6, 10, '#c01818', { slit: true, lid: 0.35, tilt: 0.35, glow: '#ff2a2a', sclera: '#f6e8d4' });
    mouth(ctx, 0, 20, 42, 13, 9, { dark: '#1a0608', inner: '#4a0c14', tongueCol: '#a02438', upper: 0.2 });
    // drool
    ctx.strokeStyle = rgba('#e8f0ff', 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 28); ctx.lineTo(-12, 34 + sin(ph) * 3); ctx.moveTo(10, 30); ctx.lineTo(10, 37 + cos(ph) * 3); ctx.stroke();
    // shoulder bone plates
    for (const s of [-1, 1]) { spike(ctx, s * 32, -26, -Math.PI / 2 + s * 0.55, 18, 9, '#efe4cc'); spike(ctx, s * 42, -14, -Math.PI / 2 + s * 0.9, 13, 7, '#e0d4b8'); }
  };

  // ---------------------------------------------------------------- Jogo: volcanic disaster curse
  B.jogo = function (ctx, d, ph) {
    const pulse = 0.5 + 0.5 * sin(ph);
    glow(ctx, 0, 6, 84, '#ff5a1a', 0.28 + pulse * 0.12);
    // heat rings
    ctx.save(); ctx.strokeStyle = rgba('#ff7a2a', 0.5); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 4, 62 + sin(ph) * 3, 0, TAU); ctx.stroke(); ctx.strokeStyle = rgba('#ffd24a', 0.3); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 4, 68 + cos(ph) * 3, 0, TAU); ctx.stroke(); ctx.restore();
    groundShadow(ctx, 0, 58, 44, 8, 0.3);
    // torso
    ctx.beginPath(); ctx.moveTo(-44, 56); ctx.quadraticCurveTo(-52, 2, -30, -10); ctx.quadraticCurveTo(0, -20, 30, -10); ctx.quadraticCurveTo(52, 2, 44, 56); ctx.closePath();
    volume(ctx, '#4a4658', 0, 22, 56, { hi: 0.28, rim: '#ff7a2a', rimA: 0.3 });
    ctx.save(); ctx.clip();
    ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 9;
    const crack = [[[-26, -2], [-18, 8], [-24, 18], [-14, 30], [-20, 44]], [[26, 0], [18, 12], [26, 22], [16, 34]], [[0, 10], [-4, 22], [4, 32], [0, 46]], [[-38, 24], [-30, 32]]];
    for (const c of crack) { ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (let i = 1; i < c.length; i++) ctx.lineTo(c[i][0], c[i][1]); ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 1; for (const c of crack) { ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (let i = 1; i < c.length; i++) ctx.lineTo(c[i][0], c[i][1]); ctx.stroke(); }
    speckles(ctx, 0, 24, 44, rgba('#1a1620', 0.5), 17, 40, 2.4);
    ctx.restore();
    // arms: stone with lava veins, hanging fists
    for (const s of [-1, 1]) {
      const sw = sin(ph + (s > 0 ? Math.PI : 0)) * 3;
      ctx.beginPath(); ctx.moveTo(s * 40, -6); ctx.quadraticCurveTo(s * 66, 2 + sw, s * 62, 40 + sw); ctx.lineTo(s * 46, 42 + sw); ctx.quadraticCurveTo(s * 46, 14, s * 34, 4); ctx.closePath();
      volume(ctx, '#3e3a4c', s * 52, 20, 32, { lw: 2.6 });
      ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s * 52, 4); ctx.lineTo(s * 56, 18 + sw); ctx.lineTo(s * 52, 32 + sw); ctx.stroke();
      ell(ctx, s * 54, 46 + sw, 12, 11); volume(ctx, '#2e2a3a', s * 54, 46 + sw, 12, { lw: 2.2 }); glow(ctx, s * 54, 46 + sw, 16, '#ff6a1a', 0.45);
    }
    // neck + head: tall volcano cone
    ctx.beginPath(); ctx.moveTo(-17, -4); ctx.quadraticCurveTo(-22, -30, -12, -46); ctx.lineTo(-7, -60); ctx.lineTo(7, -60); ctx.lineTo(12, -46); ctx.quadraticCurveTo(22, -30, 17, -4); ctx.quadraticCurveTo(0, 6, -17, -4); ctx.closePath();
    volume(ctx, '#a89888', 0, -30, 36, { hi: 0.35, rim: '#ff8a3a', rimA: 0.3 });
    ctx.save(); ctx.clip();
    // ash shading + lava seams running up the cone
    ctx.strokeStyle = rgba('#2a1e1a', 0.45); ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3.4, -58); ctx.lineTo(i * 8, -8); ctx.stroke(); }
    ctx.restore();
    // stitched face lines
    stitches(ctx, -16, -34, 16, -34, 8, 3.4, '#3a1a10', 1.6); stitches(ctx, -14, -14, -4, -4, 3, 3, '#3a1a10', 1.4);
    // crater + fire
    ctx.fillStyle = '#ff5a1a'; ell(ctx, 0, -60, 9.5, 3.6); ctx.fill(); ctx.fillStyle = '#ffe28a'; ell(ctx, 0, -60, 5.4, 2); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const x = -8 + i * 2.7, h = 16 + sin(ph + i * 1.6) * 6 + (i === 3 ? 9 : 0);
      const g = ctx.createLinearGradient(0, -58, 0, -58 - h); g.addColorStop(0, '#ff3a1a'); g.addColorStop(0.6, '#ff9a2a'); g.addColorStop(1, 'rgba(255,210,74,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 4, -59); ctx.quadraticCurveTo(x + sin(ph + i) * 3, -58 - h * 0.6, x + sin(ph * 2 + i) * 2, -58 - h); ctx.quadraticCurveTo(x + 5, -58 - h * 0.4, x + 4, -59); ctx.fill();
    }
    glow(ctx, 0, -62, 30, '#ff8a2a', 0.6);
    // eyes + brow + jagged mouth
    ctx.strokeStyle = '#1a0e0a'; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-15, -28); ctx.lineTo(-3, -22); ctx.moveTo(15, -28); ctx.lineTo(3, -22); ctx.stroke();
    eye(ctx, -8, -20, 6.6, '#ff7a1a', { slit: true, lid: 0.3, tilt: 0.45, glow: '#ff8a2a', sclera: '#ffe8b0' });
    eye(ctx, 8, -20, 6.6, '#ff7a1a', { slit: true, lid: 0.3, tilt: 0.45, glow: '#ff8a2a', sclera: '#ffe8b0' });
    mouth(ctx, 0, -8, 18, 5, 6, { dark: '#1a0a06', inner: '#6a1a08', tongue: false, tooth: '#f0e2c8' });
    // shoulder rocks
    for (const s of [-1, 1]) { spike(ctx, s * 34, -10, -Math.PI / 2 + s * 0.7, 16, 10, '#5a5468'); spike(ctx, s * 46, 0, -Math.PI / 2 + s * 1.0, 12, 8, '#4a4458'); }
    embers(ctx, 0, -40, 40, '#ffb04a', ph, 14, 5);
  };

  // ---------------------------------------------------------------- Mahito: soul-shaper
  B.mahito = function (ctx, d, ph) {
    const c = '#9ab0c8';
    glow(ctx, 0, 0, 78, '#a880ff', 0.26);
    // soul ripples
    ctx.save(); ctx.strokeStyle = rgba('#c8a0ff', 0.5); ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { const t = ((ph / TAU) + i / 2) % 1; ctx.globalAlpha = 0.6 * (1 - t); ctx.beginPath(); ctx.arc(0, 4, 44 + t * 26, 0, TAU); ctx.stroke(); } ctx.restore();
    groundShadow(ctx, 0, 58, 40, 8, 0.3);
    // torso (hunched, stitched)
    ctx.beginPath(); ctx.moveTo(-36, 58); ctx.quadraticCurveTo(-46, 10, -26, -4); ctx.quadraticCurveTo(0, -12, 26, -4); ctx.quadraticCurveTo(46, 10, 36, 58); ctx.closePath();
    volume(ctx, '#8aa0b8', 0, 24, 50, { hi: 0.4 });
    ctx.save(); ctx.clip();
    stitches(ctx, 0, -2, 2, 50, 10, 5, '#161c2c', 1.8);
    stitches(ctx, -28, 6, -6, 22, 5, 3.6, '#161c2c', 1.5); stitches(ctx, 26, 14, 8, 30, 5, 3.6, '#161c2c', 1.5);
    stitches(ctx, -22, 40, 20, 40, 8, 3.4, '#161c2c', 1.4);
    // patch tints
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#6a7e9c'; ctx.beginPath(); ctx.moveTo(-40, 20); ctx.lineTo(-10, 12); ctx.lineTo(-14, 56); ctx.lineTo(-40, 56); ctx.fill(); ctx.fillStyle = '#b8c8dc'; ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(44, 14); ctx.lineTo(40, 56); ctx.lineTo(14, 50); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
    spec(ctx, -16, 4, 14, 6, 0.3, -0.4);
    // arms: left normal, right transformed into a blade
    { const sw = sin(ph) * 3; ctx.beginPath(); ctx.moveTo(-30, -2); ctx.quadraticCurveTo(-60, 10 + sw, -54, 44 + sw); ctx.lineTo(-40, 44 + sw); ctx.quadraticCurveTo(-42, 18, -24, 8); ctx.closePath(); volume(ctx, '#8aa0b8', -46, 22, 30, { lw: 2.4 }); stitches(ctx, -52, 20 + sw, -46, 40 + sw, 4, 3, '#161c2c', 1.3);
      ctx.fillStyle = '#a8bccf'; ell(ctx, -47, 48 + sw, 8, 9); ctx.fill(); stroke(ctx, '#161c2c', 1.6); for (const k of [-1, 0, 1]) spike(ctx, -47 + k * 4, 54 + sw, Math.PI / 2 + k * 0.2, 9, 3.4, '#6a7e9c'); }
    { const sw = sin(ph + 2) * 3; ctx.beginPath(); ctx.moveTo(30, -2); ctx.quadraticCurveTo(58, 8 + sw, 52, 36 + sw); ctx.lineTo(40, 34 + sw); ctx.quadraticCurveTo(42, 16, 24, 8); ctx.closePath(); volume(ctx, '#8aa0b8', 44, 18, 26, { lw: 2.4 });
      ctx.save(); ctx.translate(47, 36 + sw); ctx.rotate(0.35 + sin(ph) * 0.05); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-5, 40); ctx.lineTo(3, 58); ctx.lineTo(9, 40); ctx.lineTo(7, 0); ctx.closePath();
      const bg = ctx.createLinearGradient(-8, 0, 8, 0); bg.addColorStop(0, '#f0f6ff'); bg.addColorStop(0.5, '#a8bccf'); bg.addColorStop(1, '#5a6e8c'); ctx.fillStyle = bg; ctx.fill(); stroke(ctx, '#161c2c', 1.8);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-1, 44); ctx.stroke(); ctx.restore();
      glow(ctx, 53, 62, 22, '#c8a0ff', 0.45); }
    // head
    blobPath(ctx, 0, -26, 22, 25, { n: 20, amp: 0.02 }); volume(ctx, '#a6bacf', 0, -26, 25, { hi: 0.55 });
    stitches(ctx, 12, -42, 18, -22, 4, 3.4, '#161c2c', 1.5); stitches(ctx, -16, -34, -10, -14, 3, 3, '#161c2c', 1.4); stitches(ctx, -5, -8, 7, -10, 4, 3, '#161c2c', 1.3);
    // long patchwork hair
    ctx.beginPath(); ctx.moveTo(-24, -24); ctx.quadraticCurveTo(-30, -56, 0, -54); ctx.quadraticCurveTo(30, -56, 24, -24); ctx.quadraticCurveTo(16, -42, 2, -40); ctx.quadraticCurveTo(-12, -38, -24, -24); ctx.closePath(); volume(ctx, '#34445e', 0, -46, 24, { lw: 2 });
    stitches(ctx, 0, -54, 0, -40, 4, 3.6, '#c0cce0', 1.2);
    ctx.fillStyle = '#34445e'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 24, -28); ctx.quadraticCurveTo(s * 34, -10 + sin(ph + s) * 2, s * 26, 12); ctx.quadraticCurveTo(s * 22, -4, s * 20, -22); ctx.closePath(); ctx.fill(); stroke(ctx, '#10182a', 1.6); }
    eye(ctx, -9.5, -24, 6.6, '#d8b820', { lid: 0.28, tilt: 0.25, sclera: '#f4f0d8', look: 1, glow: '#e8d040' });
    eye(ctx, 9.5, -24, 6.6, '#d8b820', { lid: 0.28, tilt: 0.25, sclera: '#f4f0d8', look: 1, glow: '#e8d040' });
    mouth(ctx, 0, -12, 24, 6.4, 9, { dark: '#10101c', inner: '#503060', tongueCol: '#a8487a' });
    // floating soul fragments
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const a = ph + i * TAU / 5, x = cos(a) * 58, y = -8 + sin(a) * 30; ctx.fillStyle = rgba('#d8b8ff', 0.8); ell(ctx, x, y, 3, 4.4, a); ctx.fill(); glow(ctx, x, y, 10, '#b890ff', 0.5); }
    ctx.restore();
  };

  // ---------------------------------------------------------------- Ryomen Sukuna: King of Curses (with Malevolent Shrine behind him)
  B.sukuna = function (ctx, d, ph) {
    const pulse = 0.5 + 0.5 * sin(ph);
    glow(ctx, 0, 0, 86, '#ff2a3a', 0.24 + pulse * 0.1);
    // shrine silhouette: tiered roofs + skull piles
    ctx.save(); ctx.globalAlpha = 0.9;
    for (let t = 0; t < 3; t++) {
      const y = -56 + t * 18, w = 50 - t * 8;
      ctx.beginPath(); ctx.moveTo(-w - 10, y + 8); ctx.quadraticCurveTo(-w, y + 2, -w + 12, y - 4); ctx.lineTo(w - 12, y - 4); ctx.quadraticCurveTo(w, y + 2, w + 10, y + 8); ctx.lineTo(w - 6, y + 12); ctx.lineTo(-w + 6, y + 12); ctx.closePath();
      ctx.fillStyle = shade('#3a0a10', t * -0.1); ctx.fill(); ctx.strokeStyle = '#ff2a3a'; ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 6; i++) { const x = -62 + i * 24.8, y = 56 + ((i * 5) % 3) * 2; ctx.fillStyle = '#d8ccb8'; ell(ctx, x, y, 6, 5.4); ctx.fill(); ctx.fillStyle = '#1a0608'; ell(ctx, x - 2, y, 1.6, 1.8); ctx.fill(); ell(ctx, x + 2, y, 1.6, 1.8); ctx.fill(); }
    groundShadow(ctx, 0, 62, 46, 8, 0.35);
    // lower pair of arms (behind robe sleeves)
    for (const s of [-1, 1]) { const sw = sin(ph + (s > 0 ? 1.5 : 0)) * 2.5; ctx.beginPath(); ctx.moveTo(s * 20, 22); ctx.quadraticCurveTo(s * 46, 34 + sw, s * 44, 58 + sw); ctx.lineTo(s * 32, 58 + sw); ctx.quadraticCurveTo(s * 32, 40, s * 16, 36); ctx.closePath(); volume(ctx, '#e8c4a8', s * 34, 44, 22, { lw: 2.2 }); ctx.fillStyle = '#e8c4a8'; ell(ctx, s * 38, 60 + sw, 6.4, 7); ctx.fill(); stroke(ctx, '#2a1410', 1.5); }
    // robe
    ctx.beginPath(); ctx.moveTo(-36, 62); ctx.quadraticCurveTo(-44, 6, -22, -8); ctx.lineTo(22, -8); ctx.quadraticCurveTo(44, 6, 36, 62); ctx.closePath();
    volume(ctx, '#6a1418', 0, 24, 48, { hi: 0.3, rim: '#ff4a5a', rimA: 0.3 });
    ctx.save(); ctx.clip();
    ctx.strokeStyle = '#12080a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(4, 62); ctx.moveTo(12, -6); ctx.lineTo(-4, 62); ctx.stroke();
    ctx.strokeStyle = '#e8d8c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(4, 62); ctx.moveTo(12, -6); ctx.lineTo(-4, 62); ctx.stroke();
    ctx.strokeStyle = rgba('#0e0608', 0.7); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-34, 46); ctx.lineTo(34, 46); ctx.stroke();
    ctx.restore();
    // chest tattoo bands + extra mouth
    ctx.strokeStyle = '#1c0e12'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.quadraticCurveTo(0, 16, 10, 10); ctx.moveTo(-8, 18); ctx.quadraticCurveTo(0, 24, 8, 18); ctx.stroke();
    // white collar
    ctx.beginPath(); ctx.moveTo(-20, -6); ctx.quadraticCurveTo(0, 14, 20, -6); ctx.lineTo(14, -10); ctx.quadraticCurveTo(0, 6, -14, -10); ctx.closePath(); ctx.fillStyle = '#e8e0d8'; ctx.fill(); stroke(ctx, '#2a1410', 1.4);
    // upper arms spread wide, claws curled
    for (const s of [-1, 1]) {
      const sw = sin(ph + (s > 0 ? 0 : 2)) * 3;
      ctx.beginPath(); ctx.moveTo(s * 22, -6); ctx.quadraticCurveTo(s * 62, -6 + sw, s * 62, 24 + sw); ctx.lineTo(s * 50, 26 + sw); ctx.quadraticCurveTo(s * 48, 6, s * 20, 6); ctx.closePath();
      volume(ctx, '#7a1c20', s * 46, 8, 30, { lw: 2.4, hi: 0.3 });
      ctx.fillStyle = '#e8c4a8'; ell(ctx, s * 58, 30 + sw, 7.2, 8.4); ctx.fill(); stroke(ctx, '#2a1410', 1.6);
      for (const k of [-1, 0, 1]) spike(ctx, s * 58 + k * 4.4, 36 + sw, Math.PI / 2 + k * 0.28, 8, 3.2, '#1c0e12');
      ctx.strokeStyle = '#1c0e12'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(s * 56, 24 + sw); ctx.lineTo(s * 60, 34 + sw); ctx.stroke();
    }
    // head with pink hair
    blobPath(ctx, 0, -28, 19, 22, { n: 18, amp: 0.02 }); volume(ctx, '#ecc8ac', 0, -28, 22, { hi: 0.45, lo: -0.4 });
    // spiky hair
    ctx.beginPath(); ctx.moveTo(-22, -26); ctx.lineTo(-26, -42); ctx.lineTo(-17, -38); ctx.lineTo(-20, -56); ctx.lineTo(-9, -46); ctx.lineTo(-7, -64); ctx.lineTo(0, -48); ctx.lineTo(8, -66); ctx.lineTo(10, -46); ctx.lineTo(21, -56); ctx.lineTo(18, -38); ctx.lineTo(27, -42); ctx.lineTo(22, -26); ctx.quadraticCurveTo(14, -42, 0, -42); ctx.quadraticCurveTo(-14, -42, -22, -26); ctx.closePath();
    volume(ctx, '#f08aa8', 0, -48, 26, { lw: 1.8, hi: 0.4 });
    // face markings: forehead band, cheek lines, chin
    ctx.strokeStyle = '#1a0c10'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, -38); ctx.lineTo(12, -38); ctx.moveTo(-17, -28); ctx.lineTo(-11, -20); ctx.moveTo(17, -28); ctx.lineTo(11, -20); ctx.moveTo(-14, -18); ctx.lineTo(-8, -12); ctx.moveTo(14, -18); ctx.lineTo(8, -12); ctx.moveTo(0, -42); ctx.lineTo(0, -38); ctx.stroke();
    ctx.fillStyle = '#1a0c10'; ctx.fillRect(-9, -14.5, 18, 1.4);
    // four eyes
    ctx.strokeStyle = '#1a0c10'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-14, -32); ctx.lineTo(-3, -28); ctx.moveTo(14, -32); ctx.lineTo(3, -28); ctx.stroke();
    eye(ctx, -8, -26, 4.4, '#d01830', { slit: true, lid: 0.35, tilt: 0.3, glow: '#ff2a3a', sclera: '#1a0608', rimCol: '#1a0c10' });
    eye(ctx, 8, -26, 4.4, '#d01830', { slit: true, lid: 0.35, tilt: 0.3, glow: '#ff2a3a', sclera: '#1a0608', rimCol: '#1a0c10' });
    eye(ctx, -9, -17, 3.2, '#d01830', { slit: true, lid: 0.25, glow: '#ff2a3a', sclera: '#1a0608', rimCol: '#1a0c10' });
    eye(ctx, 9, -17, 3.2, '#d01830', { slit: true, lid: 0.25, glow: '#ff2a3a', sclera: '#1a0608', rimCol: '#1a0c10' });
    mouth(ctx, 0, -9, 13, 3.4, 5, { dark: '#1a0608', inner: '#4a0c14', tongue: false, droop: 0.8 });
    // slash arcs
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const t = ((ph / TAU) + i / 3) % 1, a = -0.9 + i * 0.9; ctx.strokeStyle = rgba('#ff4a5a', 0.7 * (1 - t)); ctx.lineWidth = 3 * (1 - t) + 1; ctx.beginPath(); ctx.arc(0, 0, 54 + t * 22, a - 0.5, a + 0.5); ctx.stroke(); }
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
