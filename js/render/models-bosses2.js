/* Expansion bosses: Hanami, Dagon, Mahoraga, Ryomen Sukuna (Heian) + the Cursed Bud enemy.
   Boss design space ~170x170 (origin at centre), ph loops 0..TAU. Bud uses the 100x100 enemy space. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const Models = JJK.Models;
  const K = Models.kit;
  const { TAU, shade, rgba, ell, glow, blobPath, volume, spec, stroke, wisps, eye, mouth, spike, veins, speckles, groundShadow, rng } = K;
  const sin = Math.sin, cos = Math.cos;
  const B = Models.bosses;

  function pts(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
  function limb(ctx, x1, y1, x2, y2, w1, w2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, a = Math.atan2(ny, nx);
    ctx.beginPath(); ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
    ctx.arc(x2, y2, w2 / 2, a, a - Math.PI, true); ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); ctx.arc(x1, y1, w1 / 2, a + Math.PI, a, true); ctx.closePath();
  }
  function fillLimb(ctx, col, x1, y1, x2, y2, w1, w2, o) { limb(ctx, x1, y1, x2, y2, w1, w2); volume(ctx, col, (x1 + x2) / 2, (y1 + y2) / 2, Math.max(w1, w2) * 1.1, Object.assign({ lw: 2 }, o)); }
  function flower(ctx, x, y, r, rot, col, core) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i * TAU / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-r * 0.62, -r * 0.3, -r * 0.5, -r * 1.05, -r * 0.1, -r * 0.92); ctx.lineTo(0, -r * 0.78); ctx.lineTo(r * 0.1, -r * 0.92); ctx.bezierCurveTo(r * 0.5, -r * 1.05, r * 0.62, -r * 0.3, 0, 0); ctx.closePath(); const g = ctx.createRadialGradient(0, -r * 0.2, 0.5, 0, -r * 0.5, r); g.addColorStop(0, shade(col, 0.6)); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = shade(col, -0.55); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = core || '#ffe27a'; ell(ctx, 0, 0, r * 0.2, r * 0.2); ctx.fill(); ctx.restore();
  }
  function leaf(ctx, x, y, len, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.34, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.34, 0, 0); ctx.closePath(); volume(ctx, col, len * 0.45, 0, len * 0.5, { lw: 1.2, hi: 0.4 });
    ctx.strokeStyle = rgba(shade(col, -0.6), 0.8); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke(); ctx.restore();
  }
  function petals(ctx, cx, cy, ph, n, col, seed) {
    const R = rng(seed); ctx.save();
    for (let i = 0; i < n; i++) { const t = ((ph / TAU) + R()) % 1, x = cx + (R() - 0.5) * 150 + sin(ph * 2 + i) * 6, y = cy - 70 + t * 150, a = t * 6 + i; ctx.globalAlpha = Math.sin(t * Math.PI) * 0.9; ctx.fillStyle = col; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ell(ctx, 0, 0, 3.4, 1.8); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }

  // ================================================================== HANAMI: Special Grade Forest Curse
  B.hanami = function (ctx, d, ph) {
    const sw = sin(ph) * 2, pulse = 0.5 + 0.5 * sin(ph * 2);
    glow(ctx, 0, 6, 92, '#5ad070', 0.22 + pulse * 0.08);
    groundShadow(ctx, 0, 70, 56, 10, 0.4);
    // roots splaying across the ground
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const s = i < 5 ? -1 : 1, k = i < 5 ? i : i - 5, x = s * (14 + k * 10), len = 40 + k * 7 + (i % 2) * 6; ctx.strokeStyle = '#1c1208'; ctx.lineWidth = 6.4 - k * 0.8; ctx.beginPath(); ctx.moveTo(s * 8, 60); ctx.quadraticCurveTo(x, 72 + k, s * len + s * 22, 74 + (k % 2) * 3); ctx.stroke(); ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 3.4 - k * 0.4; ctx.stroke(); }
    ctx.restore();
    // legs: knotted trunks
    for (const s of [-1, 1]) { fillLimb(ctx, '#5a4028', s * 16, 24, s * 20, 66, 24, 26, { lw: 2.4, hi: 0.3, rim: '#8aff9a', rimA: 0.18 }); ctx.save(); limb(ctx, s * 16, 24, s * 20, 66, 24, 26); ctx.clip(); ctx.strokeStyle = rgba('#1c1208', 0.6); ctx.lineWidth = 1.4; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(s * 16 - 10, 28 + i * 7); ctx.quadraticCurveTo(s * 18, 31 + i * 7, s * 22 + 10, 28 + i * 7); ctx.stroke(); } ctx.restore(); }
    // far arm (behind torso): long branch arm, finger twigs
    const arm = (s, ph0) => {
      const w = sin(ph + ph0) * 4, sx = s * 28, sy = -14, ex = s * 56, ey = 2 + w, hx = s * 64, hy = 38 + w * 1.4;
      fillLimb(ctx, '#6a4a30', sx, sy, ex, ey, 17, 13, { lw: 2.2, hi: 0.3 });
      fillLimb(ctx, '#6a4a30', ex, ey, hx, hy, 13, 9, { lw: 2.2, hi: 0.25 });
      for (let k = -2; k <= 2; k++) { ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + s * 4 + k * 3, hy + 8, hx + k * 7 + s * 3, hy + 18 + Math.abs(k) * -1.5); ctx.stroke(); ctx.strokeStyle = '#a68058'; ctx.lineWidth = 1.2; ctx.stroke(); }
      leaf(ctx, ex, ey - 4, 17, s > 0 ? -0.9 : Math.PI + 0.9, '#58b05a'); leaf(ctx, ex, ey + 2, 14, s > 0 ? 0.5 : Math.PI - 0.5, '#7acc6a'); leaf(ctx, sx + s * 8, sy - 3, 16, s > 0 ? -1.2 : Math.PI + 1.2, '#4a9a50');
    };
    arm(-1, 0); arm(1, 1.7);
    // torso: bark with growth rings, moss and bloom
    ctx.beginPath(); ctx.moveTo(-32, -18); ctx.quadraticCurveTo(-40, 10, -26, 36); ctx.lineTo(26, 36); ctx.quadraticCurveTo(40, 10, 32, -18); ctx.quadraticCurveTo(0, -28, -32, -18); ctx.closePath();
    volume(ctx, '#74502f', 0, 8, 46, { lw: 2.6, hi: 0.36, rim: '#8aff9a', rimA: 0.18 });
    ctx.save(); ctx.clip();
    ctx.strokeStyle = rgba('#1c1208', 0.55); ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-34 + i * 9, -22); ctx.quadraticCurveTo(-30 + i * 9 + sin(i) * 4, 8, -32 + i * 9 + sin(i * 2) * 5, 38); ctx.stroke(); }
    ctx.strokeStyle = rgba('#d8b888', 0.35); for (let r = 6; r < 22; r += 5) { ctx.beginPath(); ctx.ellipse(-8, 10, r, r * 0.8, 0.3, 0, TAU); ctx.stroke(); }
    speckles(ctx, 0, 14, 36, rgba('#4a9a50', 0.55), 5, 26, 2.6);
    ctx.restore();
    // vines wrapped around the body
    ctx.strokeStyle = '#2f7a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-30, -10); ctx.bezierCurveTo(-10, 4, 10, -6, 30, 12); ctx.stroke(); ctx.strokeStyle = '#6ad06a'; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 5; i++) leaf(ctx, -22 + i * 11, -4 + sin(i * 1.7) * 6, 9, -0.9 + i * 0.5, i % 2 ? '#58b05a' : '#8ae07a');
    // shoulder leaf mantle
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) leaf(ctx, s * (22 + i * 3), -20 - i * 1.2, 20 - i * 2, s > 0 ? -0.4 - i * 0.45 + sw * 0.01 : Math.PI + 0.4 + i * 0.45, ['#3f8a46', '#58b05a', '#7acc6a', '#9ae888'][i]);
    // chest bloom
    flower(ctx, 0, 6, 11, ph * 0.1, '#ff9ac8', '#ffe27a');
    // head: lumpy wooden mask, one great socket eye + two small
    const hy = -42 + sw * 0.5;
    ctx.beginPath(); ctx.moveTo(-26, hy + 4); ctx.bezierCurveTo(-34, hy - 22, -12, hy - 36, 4, hy - 34); ctx.bezierCurveTo(26, hy - 34, 34, hy - 12, 26, hy + 10); ctx.bezierCurveTo(20, hy + 26, -14, hy + 28, -26, hy + 4); ctx.closePath();
    volume(ctx, '#ecdcb8', 0, hy - 2, 36, { lw: 2.4, hi: 0.4, lo: -0.5 });
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgba('#7a5a36', 0.55); ctx.lineWidth = 1.2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-28, hy - 22 + i * 8); ctx.quadraticCurveTo(0, hy - 18 + i * 8 + sin(i) * 4, 28, hy - 22 + i * 8); ctx.stroke(); } ctx.restore();
    // great eye socket (right) glowing
    ell(ctx, 10, hy - 6, 11, 12.4); ctx.fillStyle = '#10200c'; ctx.fill(); glow(ctx, 10, hy - 6, 20, '#8aff6a', 0.5 + pulse * 0.25);
    ell(ctx, 10, hy - 6, 6.4, 7.4); ctx.fillStyle = '#d8ff8a'; ctx.fill(); ell(ctx, 10.6, hy - 6, 3, 5.4); ctx.fillStyle = '#10200c'; ctx.fill();
    ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(10, hy - 6, 12, 0, TAU); ctx.stroke();
    // small eyes
    for (const [x, y, r] of [[-14, hy - 4, 4.4], [-8, hy + 10, 3.4]]) { ell(ctx, x, y, r, r * 1.1); ctx.fillStyle = '#10200c'; ctx.fill(); ell(ctx, x + 0.4, y, r * 0.5, r * 0.8); ctx.fillStyle = '#d8ff8a'; ctx.fill(); }
    // stitched mouth
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, hy + 18); ctx.quadraticCurveTo(2, hy + 24, 20, hy + 16); ctx.stroke(); for (let i = 0; i < 6; i++) { const x = -10 + i * 5; ctx.beginPath(); ctx.moveTo(x, hy + 15 + sin(i) * 0.5); ctx.lineTo(x + 1, hy + 24); ctx.stroke(); }
    // antler branches + blossom crown
    for (const [s, a, len] of [[-1, -2.2, 34], [-1, -1.8, 28], [1, -0.9, 34], [1, -1.3, 28], [-1, -2.6, 20], [1, -0.5, 20]]) {
      const bx = s * 10, by = hy - 28, ex = bx + cos(a) * len + sin(ph + a) * 2, ey = by + sin(a) * len;
      ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + ex) / 2 + s * 4, (by + ey) / 2, ex, ey); ctx.stroke(); ctx.strokeStyle = '#7a5836'; ctx.lineWidth = 2.4; ctx.stroke();
      flower(ctx, ex, ey, 7.4 + (len > 30 ? 2 : 0), a + ph * 0.1, len > 30 ? '#ffb0d4' : '#ff8ab8');
      leaf(ctx, (bx + ex) / 2, (by + ey) / 2, 10, a + 1.2, '#6ad06a');
    }
    flower(ctx, 0, hy - 34, 9, 0.3, '#ffc8e0', '#ffe27a');
    petals(ctx, 0, 0, ph, 14, '#ffb0d4', 41);
  };

  // ---- Cursed Bud (small enemy, 100x100 space)
  Models.enemies.bud = function (ctx, d, ph) {
    const c = d.color || '#ff9ad0', b = sin(ph) * 2, open = 0.5 + 0.5 * sin(ph * 1.5);
    glow(ctx, 0, 2, 40, '#ff7ab8', 0.35 + open * 0.15);
    groundShadow(ctx, 0, 30, 18, 4, 0.3);
    for (const s of [-1, 1]) { ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 6, 16); ctx.quadraticCurveTo(s * 12, 26 + b, s * 14 + sin(ph + s) * 3, 32); ctx.stroke(); ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.6; ctx.stroke(); }
    // sepals
    for (let i = 0; i < 5; i++) { const a = Math.PI * 0.12 + i * Math.PI * 0.19 + Math.PI; ctx.save(); ctx.translate(0, 8 + b); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(10, -12, 28, 0); ctx.quadraticCurveTo(10, 6, 0, 3); ctx.closePath(); volume(ctx, '#3f8a46', 14, 0, 16, { lw: 1.4, hi: 0.35 }); ctx.restore(); }
    // bulb
    blobPath(ctx, 0, -2 + b, 19, 21, { ph, amp: 0.05 }); volume(ctx, c, 0, -2 + b, 21, { hi: 0.5 });
    ctx.save(); blobPath(ctx, 0, -2 + b, 19, 21, { ph, amp: 0.05 }); ctx.clip(); ctx.strokeStyle = rgba('#a02868', 0.55); ctx.lineWidth = 1.3; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, -22 + b); ctx.quadraticCurveTo(i * 9, -2, i * 3.4, 20 + b); ctx.stroke(); } ctx.restore();
    // cracked-open petals at the top reveal one huge eye
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -4 + b); ctx.quadraticCurveTo(s * 18, -10 + b - open * 6, s * 15, -26 + b - open * 4); ctx.quadraticCurveTo(s * 6, -18 + b, 0, -4 + b); ctx.closePath(); volume(ctx, '#ffc0e0', s * 9, -14 + b, 14, { lw: 1.4, hi: 0.5 }); }
    eye(ctx, 0, -8 + b, 8.4, '#d8ff6a', { slit: true, lid: 0.2, glow: '#d8ff6a' });
    mouth(ctx, 0, 8 + b, 12, 3 + open * 2, 5, { dark: '#2a0a1c', inner: '#601040', tongueCol: '#a02a6a' });
    spec(ctx, -7, -14 + b, 6, 3.4, 0.5, -0.6);
  };

  // ================================================================== DAGON: Special Grade Ocean Curse
  B.dagon = function (ctx, d, ph) {
    const sw = sin(ph), pulse = 0.5 + 0.5 * sin(ph * 2);
    glow(ctx, 0, 0, 92, '#3a8aff', 0.22 + pulse * 0.08);
    // sea ripples + bubbles
    ctx.save(); ctx.strokeStyle = rgba('#8ad0ff', 0.5); ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const t = ((ph / TAU) + i / 3) % 1; ctx.globalAlpha = 0.7 * (1 - t); ell(ctx, 0, 66, 40 + t * 40, (40 + t * 40) * 0.2); ctx.stroke(); } ctx.restore();
    groundShadow(ctx, 0, 68, 52, 9, 0.32);
    for (let i = 0; i < 7; i++) { const t = ((ph / TAU) * 0.8 + i / 7) % 1, x = -50 + i * 17 + sin(ph + i) * 4, y = 60 - t * 120; ctx.strokeStyle = rgba('#bfe8ff', 0.7 * (1 - t)); ctx.lineWidth = 1.4; ell(ctx, x, y, 2.6 + (i % 3), 2.6 + (i % 3)); ctx.stroke(); }
    // tail fin behind
    ctx.beginPath(); ctx.moveTo(-6, 36); ctx.quadraticCurveTo(-44, 50 + sw * 6, -52, 74); ctx.quadraticCurveTo(-24, 66, -8, 64); ctx.quadraticCurveTo(10, 66, 34, 74); ctx.quadraticCurveTo(26, 50 - sw * 6, 6, 36); ctx.closePath(); volume(ctx, '#2a5aa8', 0, 58, 46, { lw: 2, hi: 0.3, rim: '#8ad0ff', rimA: 0.3 });
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgba('#0a1a40', 0.6); ctx.lineWidth = 1.3; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 2, 40); ctx.lineTo(i * 8, 76); ctx.stroke(); } ctx.restore();
    // dorsal fin (behind torso)
    ctx.beginPath(); ctx.moveTo(-14, -16); ctx.quadraticCurveTo(-34, -64 + sw * 3, -4, -60); ctx.quadraticCurveTo(6, -76, 16, -58); ctx.quadraticCurveTo(40, -62, 18, -14); ctx.closePath(); volume(ctx, '#3f7ad8', 0, -40, 34, { lw: 2, hi: 0.4 });
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgba('#0a1a40', 0.6); ctx.lineWidth = 1.4; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-22 + i * 9, -66); ctx.stroke(); } ctx.restore();
    // torso: wet scaly barrel with pale belly
    ctx.beginPath(); ctx.moveTo(-30, -14); ctx.quadraticCurveTo(-44, 16, -26, 50); ctx.quadraticCurveTo(0, 60, 26, 50); ctx.quadraticCurveTo(44, 16, 30, -14); ctx.quadraticCurveTo(0, -26, -30, -14); ctx.closePath();
    volume(ctx, '#3a74c0', 0, 16, 46, { lw: 2.6, hi: 0.36, rim: '#8ad0ff', rimA: 0.28 });
    ctx.save(); ctx.clip();
    ctx.fillStyle = rgba('#10306a', 0.5); for (let r = 0; r < 7; r++) for (let c2 = 0; c2 < 8; c2++) { const x = -34 + c2 * 9 + (r % 2) * 4.5, y = -14 + r * 9; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI); ctx.fill(); }
    const bg = ctx.createLinearGradient(0, -10, 0, 54); bg.addColorStop(0, rgba('#e8f6ff', 0)); bg.addColorStop(1, rgba('#e8f6ff', 0.55)); ctx.fillStyle = bg; ell(ctx, 0, 24, 18, 32); ctx.fill();
    ctx.strokeStyle = rgba('#0a1a40', 0.55); ctx.lineWidth = 1.4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-18, 26 + i * 6); ctx.quadraticCurveTo(0, 30 + i * 6, 18, 26 + i * 6); ctx.stroke(); }
    ctx.restore();
    spec(ctx, -14, -2, 14, 6, 0.35, -0.5);
    // gill slits
    ctx.strokeStyle = '#0a1a40'; ctx.lineWidth = 1.8; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * 28, -4 + i * 6); ctx.quadraticCurveTo(s * 33, -2 + i * 6, s * 30, 3 + i * 6); ctx.stroke(); }
    // arms: webbed, clawed
    for (const s of [-1, 1]) {
      const w = sin(ph + (s > 0 ? 0 : 1.4)) * 4, sx = s * 32, sy = -8, ex = s * 58, ey = 10 + w, hx = s * 62, hy = 40 + w;
      fillLimb(ctx, '#3a74c0', sx, sy, ex, ey, 18, 14, { lw: 2.2, hi: 0.3, rim: '#8ad0ff', rimA: 0.25 }); fillLimb(ctx, '#3a74c0', ex, ey, hx, hy, 14, 10, { lw: 2.2 });
      // fin spines on forearm
      for (let i = 0; i < 3; i++) spike(ctx, ex + (hx - ex) * (0.2 + i * 0.3) + s * 4, ey + (hy - ey) * (0.2 + i * 0.3), s > 0 ? -0.2 : Math.PI + 0.2, 11, 4, '#bfe8ff');
      // webbed hand
      ctx.beginPath(); ctx.moveTo(hx, hy - 4); for (let k = 0; k < 4; k++) { const a = Math.PI * 0.2 + k * 0.38 - (s < 0 ? 0 : 0); ctx.lineTo(hx + s * (4 + k * 1) + (k - 1.5) * 8 * 0.8, hy + 16 + (k === 1 || k === 2 ? 3 : 0)); ctx.lineTo(hx + (k - 1.5) * 8 * 0.8 + 3, hy + 10); } ctx.closePath(); volume(ctx, '#5a94d8', hx, hy + 8, 14, { lw: 1.6 });
      for (let k = 0; k < 4; k++) spike(ctx, hx + (k - 1.5) * 6.4, hy + 14, Math.PI / 2, 8, 3, '#f4fbff');
    }
    // head: broad fish skull, gaping mouth, side-set eyes, lure
    const hy = -46;
    // lure antenna
    ctx.strokeStyle = '#10306a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, hy - 24); ctx.quadraticCurveTo(10 + sw * 3, hy - 52, 30, hy - 44 + sw * 3); ctx.stroke();
    glow(ctx, 30, hy - 44 + sw * 3, 22, '#aaf0ff', 0.9); ell(ctx, 30, hy - 44 + sw * 3, 4.4, 4.4); ctx.fillStyle = '#e8ffff'; ctx.fill();
    // head crest fins
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 18, hy - 18); ctx.quadraticCurveTo(s * 44, hy - 30, s * 42, hy + 4); ctx.quadraticCurveTo(s * 34, hy - 6, s * 24, hy + 2); ctx.closePath(); volume(ctx, '#4a8ae0', s * 32, hy - 10, 16, { lw: 1.6, hi: 0.4 }); }
    ctx.beginPath(); ctx.moveTo(-26, hy + 6); ctx.bezierCurveTo(-34, hy - 26, 34, hy - 26, 26, hy + 6); ctx.bezierCurveTo(24, hy + 30, -24, hy + 30, -26, hy + 6); ctx.closePath();
    volume(ctx, '#3f7ad8', 0, hy - 4, 34, { lw: 2.6, hi: 0.4, rim: '#8ad0ff', rimA: 0.3 });
    ctx.save(); ctx.clip(); ctx.fillStyle = rgba('#10306a', 0.4); for (let r = 0; r < 4; r++) for (let c2 = 0; c2 < 7; c2++) { ctx.beginPath(); ctx.arc(-24 + c2 * 8 + (r % 2) * 4, hy - 22 + r * 7, 4, 0, Math.PI); ctx.fill(); } ctx.restore();
    // eyes (wide-set, bulbous)
    for (const s of [-1, 1]) { ell(ctx, s * 17, hy - 6, 9.4, 10); ctx.fillStyle = '#e8f4ff'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#10306a'; ctx.stroke(); ell(ctx, s * 17 - s * 1, hy - 5, 5, 6.4); ctx.fillStyle = '#ff5a3a'; ctx.fill(); ell(ctx, s * 17 - s * 1, hy - 5, 1.8, 5.6); ctx.fillStyle = '#10080a'; ctx.fill(); ell(ctx, s * 17 + 2, hy - 9, 1.8, 2); ctx.fillStyle = '#fff'; ctx.fill(); }
    // wide fanged mouth
    ctx.beginPath(); ctx.moveTo(-22, hy + 12); ctx.quadraticCurveTo(0, hy + 24 + sw * 1.5, 22, hy + 12); ctx.quadraticCurveTo(0, hy + 34 + sw * 2, -22, hy + 12); ctx.closePath(); ctx.fillStyle = '#10050c'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#06101e'; ctx.stroke();
    ctx.fillStyle = '#f4fbff'; for (let i = 0; i < 6; i++) { const x = -17 + i * 6.8; ctx.beginPath(); ctx.moveTo(x - 2.6, hy + 14 + Math.abs(i - 2.5) * -0.2 + 2); ctx.lineTo(x, hy + 22 + (i % 2) * 2); ctx.lineTo(x + 2.6, hy + 14 + 2); ctx.fill(); }
    ell(ctx, 0, hy + 26, 7, 2.6); ctx.fillStyle = '#7a1a34'; ctx.fill();
    // barbels dangling from the chin
    ctx.strokeStyle = '#2a5aa8'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5, hy + 28); ctx.quadraticCurveTo(i * 7 + sin(ph + i) * 4, hy + 38, i * 6 + sin(ph * 2 + i) * 5, hy + 46); ctx.stroke(); }
  };

  // ================================================================== MAHORAGA: Divine General
  B.mahoraga = function (ctx, d, ph) {
    const pulse = 0.5 + 0.5 * sin(ph), sw = sin(ph) * 1.5;
    glow(ctx, 0, -6, 96, '#f4f0d0', 0.2 + pulse * 0.1);
    groundShadow(ctx, 0, 70, 58, 10, 0.4);
    // cracked floor
    ctx.strokeStyle = rgba('#e8e4d0', 0.35); ctx.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const a = Math.PI * (0.1 + i * 0.16); ctx.beginPath(); ctx.moveTo(0, 68); ctx.lineTo(cos(a) * 60 * (i % 2 ? 1 : -1) + 0, 68 + sin(a) * 8); ctx.stroke(); }
    // the Wheel (halo) behind the head: eight-spoked dharma wheel that turns as it adapts
    const wy = -62, wr = 33;
    ctx.save(); ctx.translate(0, wy); ctx.rotate(ph * 0.5);
    glow(ctx, 0, 0, 52, '#ffe9a0', 0.4 + pulse * 0.2);
    ctx.lineWidth = 5; ctx.strokeStyle = '#d8b050'; ctx.beginPath(); ctx.arc(0, 0, wr, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#fff2c0'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#b08a30'; ctx.beginPath(); ctx.arc(0, 0, wr - 8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.strokeStyle = '#d8b050'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(cos(a) * 6, sin(a) * 6); ctx.lineTo(cos(a) * (wr - 8), sin(a) * (wr - 8)); ctx.stroke(); K.spike(ctx, cos(a) * wr, sin(a) * wr, a, 11, 5.4, '#f0d070'); }
    ell(ctx, 0, 0, 6, 6); volume(ctx, '#f0d070', 0, 0, 7, { lw: 1.4, hi: 0.5 });
    ctx.restore();
    // wavy blade, Sword of Extermination (left side), held low
    const arm = (s) => {
      const w = sin(ph + (s > 0 ? 1 : 0)) * 2.5, sx = s * 34, sy = -22, ex = s * 56, ey = 8 + w, hx = s * 50, hy = 34 + w;
      fillLimb(ctx, '#e8e2cc', sx, sy, ex, ey, 22, 18, { lw: 2.4, hi: 0.35, lo: -0.4, rim: '#ffffff', rimA: 0.3 });
      fillLimb(ctx, '#e8e2cc', ex, ey, hx, hy, 18, 15, { lw: 2.4, lo: -0.4 });
      // black wrist bands
      for (const t of [0.35, 0.7]) { const bx = ex + (hx - ex) * t, by = ey + (hy - ey) * t; ctx.fillStyle = '#16140e'; ctx.fillRect(bx - 8, by - 2.4, 16, 4.8); }
      ell(ctx, hx, hy + 8, 9, 10); volume(ctx, '#e8e2cc', hx, hy + 8, 10, { lw: 2 });
      return [hx, hy + 8];
    };
    const [rx, ry] = arm(1);
    // blade
    ctx.save(); ctx.translate(rx, ry + 2); ctx.rotate(0.1);
    ctx.fillStyle = '#d8b050'; ctx.fillRect(-9, -6, 18, 5); ctx.lineWidth = 1.2; ctx.strokeStyle = '#4a3408'; ctx.strokeRect(-9, -6, 18, 5);
    const bl = [], br = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, cx = sin(t * TAU * 1.6) * 4.6 * (1 - t * 0.5), hw = 5.2 * (1 - t * 0.78) + 0.7; bl.push([cx - hw, -6 - t * 100]); br.push([cx + hw, -6 - t * 100]); }
    ctx.beginPath(); ctx.moveTo(bl[0][0], bl[0][1]); for (const q of bl) ctx.lineTo(q[0], q[1]); for (let i = br.length - 1; i >= 0; i--) ctx.lineTo(br[i][0], br[i][1]); ctx.closePath();
    const bg = ctx.createLinearGradient(-8, 0, 10, 0); bg.addColorStop(0, '#9aa0b0'); bg.addColorStop(0.5, '#f4f8ff'); bg.addColorStop(1, '#6a7084'); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#1c2030'; ctx.stroke();
    glow(ctx, 0, -60, 40, '#fff4c0', 0.18 + pulse * 0.12);
    ctx.restore();
    const [lx, ly] = arm(-1);
    // lower body: grey wrapped loincloth and legs
    for (const s of [-1, 1]) fillLimb(ctx, '#e0dac4', s * 15, 30, s * 20, 68, 26, 24, { lw: 2.4, hi: 0.3, lo: -0.45 });
    pts(ctx, [[-30, 22], [30, 22], [38, 56], [0, 62], [-38, 56]]); volume(ctx, '#5a5648', 0, 40, 40, { lw: 2.2, hi: 0.25 });
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgba('#14120c', 0.5); ctx.lineWidth = 1.4; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 6, 24); ctx.quadraticCurveTo(i * 8 + sw, 40, i * 7, 62); ctx.stroke(); } ctx.restore();
    for (let i = -3; i <= 3; i++) { ctx.fillStyle = '#16140e'; ell(ctx, i * 10, 58 + (i % 2), 2.4, 4); ctx.fill(); }
    // torso: broad ribbed white chest
    ctx.beginPath(); ctx.moveTo(-34, -26); ctx.quadraticCurveTo(-44, 0, -26, 28); ctx.lineTo(26, 28); ctx.quadraticCurveTo(44, 0, 34, -26); ctx.quadraticCurveTo(0, -36, -34, -26); ctx.closePath();
    volume(ctx, '#ece6d0', 0, 0, 46, { lw: 2.6, hi: 0.45, lo: -0.4, rim: '#ffffff', rimA: 0.3 });
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgba('#6a6450', 0.6); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 26); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, -16 + i * 9); ctx.quadraticCurveTo(-14, -12 + i * 9, -28, -14 + i * 9 + 3); ctx.moveTo(0, -16 + i * 9); ctx.quadraticCurveTo(14, -12 + i * 9, 28, -14 + i * 9 + 3); ctx.stroke(); }
    ctx.restore();
    // black sash over the shoulder with tassels
    ctx.beginPath(); ctx.moveTo(-34, -24); ctx.lineTo(-20, -28); ctx.lineTo(34, 22); ctx.lineTo(20, 28); ctx.closePath(); volume(ctx, '#16140e', 0, 0, 40, { lw: 1.8, hi: 0.25, rim: '#d8b050', rimA: 0.3 }); ctx.strokeStyle = '#d8b050'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-28, -24); ctx.lineTo(28, 24); ctx.stroke();
    // head: pale mask-like face, closed black eyes, third eye, black crown
    const hy = -52 + sw * 0.4;
    for (const s of [-1, 1]) K.spike(ctx, s * 12, hy - 18, s > 0 ? -0.4 : Math.PI + 0.4, 22, 6, '#16140e');
    K.spike(ctx, 0, hy - 20, -Math.PI / 2, 26, 7, '#16140e');
    ctx.beginPath(); ctx.moveTo(-18, hy - 12); ctx.bezierCurveTo(-24, hy + 10, -14, hy + 28, 0, hy + 32); ctx.bezierCurveTo(14, hy + 28, 24, hy + 10, 18, hy - 12); ctx.bezierCurveTo(8, hy - 22, -8, hy - 22, -18, hy - 12); ctx.closePath();
    volume(ctx, '#f2ecd8', 0, hy, 28, { lw: 2.4, hi: 0.5, lo: -0.4 });
    ctx.fillStyle = '#16140e'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 4, hy - 2); ctx.quadraticCurveTo(s * 14, hy - 8, s * 19, hy + 2); ctx.quadraticCurveTo(s * 12, hy + 6, s * 4, hy + 2); ctx.closePath(); ctx.fill(); }
    ell(ctx, 0, hy - 12, 2.6, 3.4); ctx.fillStyle = '#d8b050'; ctx.fill(); glow(ctx, 0, hy - 12, 8, '#ffe9a0', 0.7);
    ctx.strokeStyle = '#16140e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, hy + 18); ctx.quadraticCurveTo(0, hy + 21, 8, hy + 18); ctx.moveTo(0, hy + 5); ctx.lineTo(0, hy + 14); ctx.stroke();
    // adaptation sparks around the Wheel
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 8; i++) { const a = ph * 1.3 + i * TAU / 8, x = cos(a) * 56, y = wy + sin(a) * 46; ctx.fillStyle = rgba('#ffe9a0', 0.5 + 0.4 * sin(ph * 3 + i)); ell(ctx, x, y, 2.2, 2.2); ctx.fill(); } ctx.restore();
  };

  // ================================================================== RYOMEN SUKUNA (Heian): four arms, shrine, slashes
  B.sukunaH = function (ctx, d, ph) {
    const pulse = 0.5 + 0.5 * sin(ph), sw = sin(ph) * 1.4;
    glow(ctx, 0, 0, 100, '#ff2a3a', 0.26 + pulse * 0.1);
    // malevolent shrine silhouette
    ctx.save(); ctx.globalAlpha = 0.85;
    for (let t = 0; t < 3; t++) { const y = -74 + t * 17, w = 62 - t * 10; ctx.beginPath(); ctx.moveTo(-w - 12, y + 9); ctx.quadraticCurveTo(-w, y + 2, -w + 14, y - 5); ctx.lineTo(w - 14, y - 5); ctx.quadraticCurveTo(w, y + 2, w + 12, y + 9); ctx.lineTo(w - 6, y + 13); ctx.lineTo(-w + 6, y + 13); ctx.closePath(); ctx.fillStyle = shade('#3a0a10', t * -0.12); ctx.fill(); ctx.strokeStyle = '#ff2a3a'; ctx.lineWidth = 1.6; ctx.stroke(); }
    ctx.restore();
    // skull heaps
    for (let i = 0; i < 8; i++) { const x = -70 + i * 20, y = 70 + ((i * 5) % 3) * 2; ctx.fillStyle = '#d8ccb8'; ell(ctx, x, y, 6.6, 5.8); ctx.fill(); ctx.fillStyle = '#1a0608'; ell(ctx, x - 2.2, y, 1.7, 2); ctx.fill(); ell(ctx, x + 2.2, y, 1.7, 2); ctx.fill(); }
    groundShadow(ctx, 0, 74, 52, 9, 0.4);
    // rotating dismantle slashes (white arcs)
    ctx.save(); ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = ph * 0.9 + i * TAU / 8, r = 70 + (i % 3) * 6; ctx.strokeStyle = rgba('#ffffff', 0.18 + 0.3 * ((i + Math.floor(ph * 2)) % 2)); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, r, a, a + 0.34); ctx.stroke(); ctx.strokeStyle = rgba('#ff4a5a', 0.35); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r + 1, a, a + 0.34); ctx.stroke(); } ctx.restore();
    // lower arms (behind robe), crossed over the belly
    for (const s of [-1, 1]) { const w = sin(ph + (s > 0 ? 1.5 : 0)) * 2.4; fillLimb(ctx, '#e8c4a8', s * 22, 20, s * 34, 38 + w, 15, 12, { lw: 2 }); fillLimb(ctx, '#e8c4a8', s * 34, 38 + w, s * 12 * -1, 50 + w, 12, 10, { lw: 2 }); for (let k = -1; k <= 1; k++) spike(ctx, -s * 12 + k * 3.6, 54 + w, Math.PI / 2 + k * 0.3, 9, 3.6, '#2a1410'); }
    // robe: black haori open over a crimson kimono with white obi
    ctx.beginPath(); ctx.moveTo(-34, 70); ctx.quadraticCurveTo(-46, 8, -24, -14); ctx.lineTo(24, -14); ctx.quadraticCurveTo(46, 8, 34, 70); ctx.closePath();
    volume(ctx, '#7a1620', 0, 26, 52, { lw: 2.4, hi: 0.3, rim: '#ff4a5a', rimA: 0.3 });
    ctx.save(); ctx.clip();
    ctx.strokeStyle = rgba('#14060a', 0.55); ctx.lineWidth = 1.6; for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 8, 20); ctx.quadraticCurveTo(i * 12 + sw, 46, i * 13, 72); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-34, 70); ctx.quadraticCurveTo(-46, 8, -24, -14); ctx.lineTo(-10, -14); ctx.quadraticCurveTo(-18, 24, -12, 70); ctx.closePath(); volume(ctx, '#1a0c10', -22, 30, 40, { lw: 1.8, hi: 0.2, rim: '#ff2a3a', rimA: 0.3 });
    ctx.beginPath(); ctx.moveTo(34, 70); ctx.quadraticCurveTo(46, 8, 24, -14); ctx.lineTo(10, -14); ctx.quadraticCurveTo(18, 24, 12, 70); ctx.closePath(); volume(ctx, '#1a0c10', 22, 30, 40, { lw: 1.8, hi: 0.2, rim: '#ff2a3a', rimA: 0.3 });
    pts(ctx, [[-30, 20], [30, 20], [28, 34], [-28, 34]]); volume(ctx, '#e8e0d0', 0, 27, 30, { lw: 1.6, hi: 0.4 });
    // belly mouth
    ctx.beginPath(); ctx.moveTo(-9, 8); ctx.quadraticCurveTo(0, 18 + sw, 9, 8); ctx.quadraticCurveTo(0, 6, -9, 8); ctx.closePath(); ctx.fillStyle = '#10050a'; ctx.fill(); ctx.fillStyle = '#f4ecdc'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-7 + i * 3.5, 9); ctx.lineTo(-5.4 + i * 3.5, 13 + sw * 0.4); ctx.lineTo(-3.8 + i * 3.5, 9); ctx.fill(); }
    // bare chest with black tattoo bands
    pts(ctx, [[-20, -14], [20, -14], [14, 8], [0, 12], [-14, 8]]); volume(ctx, '#e8c4a8', 0, -2, 24, { lw: 1.8, hi: 0.5 });
    ctx.strokeStyle = '#1c0e12'; ctx.lineWidth = 2.2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 1.4, -8 + i * 6); ctx.quadraticCurveTo(0, -4 + i * 6, 14 - i * 1.4, -8 + i * 6); ctx.stroke(); }
    // upper arms flung wide, claws open, black bands
    for (const s of [-1, 1]) {
      const w = sin(ph + (s > 0 ? 0 : 1.7)) * 4, sx = s * 24, sy = -10, ex = s * 56, ey = -26 + w, hx = s * 74, hy = -50 + w * 1.4;
      fillLimb(ctx, '#e8c4a8', sx, sy, ex, ey, 17, 14, { lw: 2.2 }); fillLimb(ctx, '#e8c4a8', ex, ey, hx, hy, 14, 11, { lw: 2.2 });
      for (const t of [0.25, 0.6]) { const bx = ex + (hx - ex) * t, by = ey + (hy - ey) * t; ctx.strokeStyle = '#1c0e12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 7, by + 1); ctx.lineTo(bx + 7, by - 1); ctx.stroke(); }
      ell(ctx, hx, hy - 4, 8, 9); volume(ctx, '#e8c4a8', hx, hy - 4, 9, { lw: 2 });
      for (let k = -2; k <= 2; k++) spike(ctx, hx + k * 3.4, hy - 10, -Math.PI / 2 + k * 0.3 + (s > 0 ? 0.2 : -0.2), 17, 4.4, '#2a1410');
      glow(ctx, hx, hy - 16, 20, '#ff3a4a', 0.35 + pulse * 0.2);
    }
    // head: four eyes, pink spiked hair, bone marks
    const hy = -44 + sw * 0.4;
    ctx.fillStyle = '#e88aa8'; ctx.beginPath(); ctx.moveTo(-24, hy); ctx.lineTo(-26, hy - 22); ctx.lineTo(-14, hy - 14); ctx.lineTo(-14, hy - 38); ctx.lineTo(-2, hy - 20); ctx.lineTo(4, hy - 46); ctx.lineTo(10, hy - 20); ctx.lineTo(22, hy - 38); ctx.lineTo(20, hy - 12); ctx.lineTo(30, hy - 20); ctx.lineTo(26, hy + 2); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#4a1a2a'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20, hy - 8); ctx.bezierCurveTo(-24, hy + 18, -10, hy + 32, 0, hy + 34); ctx.bezierCurveTo(10, hy + 32, 24, hy + 18, 20, hy - 8); ctx.bezierCurveTo(10, hy - 16, -10, hy - 16, -20, hy - 8); ctx.closePath();
    volume(ctx, '#ecc8aa', 0, hy + 4, 30, { lw: 2.4, hi: 0.5 });
    ctx.fillStyle = '#e88aa8'; ctx.beginPath(); ctx.moveTo(-20, hy - 6); ctx.lineTo(-8, hy - 12); ctx.lineTo(0, hy - 6); ctx.lineTo(8, hy - 12); ctx.lineTo(20, hy - 6); ctx.lineTo(18, hy - 14); ctx.lineTo(-18, hy - 14); ctx.closePath(); ctx.fill();
    for (const [x, y, r] of [[-9, hy + 2, 4.4], [9, hy + 2, 4.4], [-10, hy + 13, 3.6], [10, hy + 13, 3.6]]) { ell(ctx, x, y, r, r * 0.62); ctx.fillStyle = '#10050a'; ctx.fill(); ell(ctx, x, y, r * 0.55, r * 0.5); ctx.fillStyle = '#ff2a3a'; ctx.fill(); glow(ctx, x, y, 8, '#ff2a3a', 0.5); }
    ctx.strokeStyle = '#1c0e12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, hy - 8); ctx.lineTo(-5, hy - 1); ctx.moveTo(15, hy - 8); ctx.lineTo(5, hy - 1); ctx.moveTo(-17, hy + 6); ctx.lineTo(-17, hy + 20); ctx.moveTo(17, hy + 6); ctx.lineTo(17, hy + 20); ctx.stroke();
    // grin
    ctx.beginPath(); ctx.moveTo(-12, hy + 24); ctx.quadraticCurveTo(0, hy + 34 + sw, 12, hy + 24); ctx.quadraticCurveTo(0, hy + 26, -12, hy + 24); ctx.closePath(); ctx.fillStyle = '#10050a'; ctx.fill(); ctx.fillStyle = '#fffaf0'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 4, hy + 25.4); ctx.lineTo(-8.2 + i * 4, hy + 29.6); ctx.lineTo(-6.4 + i * 4, hy + 25.4); ctx.fill(); }
    // ember motes
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const R = rng(9); for (let i = 0; i < 16; i++) { const a = R() * TAU, dd = 50 + R() * 34, t = ((ph / TAU) + R()) % 1, x = cos(a) * dd, y = sin(a) * dd * 0.7 - t * 30; ctx.fillStyle = rgba('#ff4a3a', (1 - t) * 0.85); ell(ctx, x, y, 1.4 + R() * 1.6, 1.4 + R() * 1.6); ctx.fill(); } ctx.restore();
  };
  // The authoring above runs wide of the 170 box; shrink + nudge each so crowns, halos, lures and claws fit the canvas.
  const fit = (fn, k, dy) => function (ctx, d, ph) { ctx.save(); ctx.translate(0, dy); ctx.scale(k, k); fn(ctx, d, ph); ctx.restore(); };
  B.hanami = fit(B.hanami, 0.78, 10);
  B.dagon = fit(B.dagon, 0.8, 10);
  B.mahoraga = fit(B.mahoraga, 0.78, 10);
  B.sukunaH = fit(B.sukunaH, 0.78, 9);
})(typeof window !== 'undefined' ? window : globalThis);
