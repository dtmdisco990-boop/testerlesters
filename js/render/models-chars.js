/* Procedural full-body cut-outs for the expansion roster + the Rainbow Dragon / Garuda summon models.
   A cut-out is a transparent 300x375 canvas (design space 200x250, feet near y=238) consumed by Art.unitSprite (standee on the rune platter)
   and Art.cutoutPortrait (bust crop on a gradient card). Dropping a PNG in assets/characters/ + assets/manifest.json still overrides all of it. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const Models = JJK.Models, Art = JJK.Art, K = Models.kit;
  const { TAU, shade, rgba, ell, glow, volume, spec, rng } = K;
  const sin = Math.sin, cos = Math.cos;
  const CW = 300, CH = 375, SC = 1.5;
  const FACE_ACC = ['glasses', 'mask', 'blindfold', 'shades', 'scar', 'scarlip', 'cheek', 'hairpin', 'earring', 'star', 'frost'];
  const SKIN_SH = (c) => shade(c, -0.18);

  // ------------------------------------------------------------------ drawing helpers (design space)
  /** Tapered capsule between two points as the current path. */
  function limb(ctx, x1, y1, x2, y2, w1, w2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, a = Math.atan2(ny, nx);
    ctx.beginPath(); ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
    ctx.arc(x2, y2, w2 / 2, a, a - Math.PI, true); ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); ctx.arc(x1, y1, w1 / 2, a + Math.PI, a, true); ctx.closePath();
  }
  function fillLimb(ctx, col, x1, y1, x2, y2, w1, w2, o) { limb(ctx, x1, y1, x2, y2, w1, w2); volume(ctx, col, (x1 + x2) / 2, (y1 + y2) / 2, Math.max(w1, w2) * 1.1, Object.assign({ lw: 1.8 }, o)); }
  function pts(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
  function bar(ctx, x1, y1, x2, y2, w, col, line) { limb(ctx, x1, y1, x2, y2, w, w); ctx.fillStyle = col; ctx.fill(); if (line) { ctx.lineWidth = 1.3; ctx.strokeStyle = line; ctx.stroke(); } }
  function star(ctx, x, y, r, ri, n, rot) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (rot || -Math.PI / 2) + i * Math.PI / n, rr = i % 2 ? ri : r; ctx.lineTo(x + cos(a) * rr, y + sin(a) * rr); } ctx.closePath(); }
  function bolt(ctx, x1, y1, x2, y2, seed, jag, col, w) {
    const R = rng(seed), n = 6, dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [lw, c] of [[w * 2.6, rgba(col, 0.35)], [w, '#ffffff']]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); const R2 = rng(seed);
      for (let i = 1; i < n; i++) { const t = i / n, o = (R2() - 0.5) * jag; ctx.lineTo(x1 + dx * t + nx * o, y1 + dy * t + ny * o); }
      ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.restore(); return R;
  }
  function hand(ctx, x, y, skin, r) { ctx.beginPath(); ctx.arc(x, y, r || 6.4, 0, TAU); ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = shade(skin, -0.7); ctx.stroke(); spec(ctx, x - 2, y - 2, 3, 3, 0.45); }

  // ------------------------------------------------------------------ outfits
  function legs(ctx, col, shoe, skin, skirt) {
    for (const s of [-1, 1]) {
      const x = 100 + s * 12;
      if (skirt) { fillLimb(ctx, skin, x, 196, x + s * 1, 230, 13, 11, { lw: 1.6 }); ctx.fillStyle = rgba(col, 0.9); ctx.fillRect(x - 6.5 + (s < 0 ? 0 : 0), 216, 13, 14); ctx.fillStyle = '#f4f0f8'; ctx.fillRect(x - 6.5, 220, 13, 4); }
      else fillLimb(ctx, col, x, 176, x + s * 1.5, 230, 17, 13, { lw: 1.8 });
      ctx.beginPath(); ctx.moveTo(x - 8 + s * 1.5, 226); ctx.quadraticCurveTo(x + s * 1.5, 220, x + 8 + s * 1.5, 226); ctx.lineTo(x + 11 + s * 4, 238); ctx.quadraticCurveTo(x + s * 2, 242, x - 11 + s * 1, 238); ctx.closePath();
      volume(ctx, shoe, x + s * 2, 232, 13, { lw: 1.8, hi: 0.35 });
    }
  }
  function uniform(ctx, a, skirt) {
    legs(ctx, shade(a.outfit, -0.25), '#1c1a24', a.skin, skirt);
    if (skirt) { pts(ctx, [[74, 172], [126, 172], [140, 214], [60, 214]]); volume(ctx, shade(a.outfit, -0.12), 100, 196, 52, { lw: 2 }); ctx.save(); ctx.clip(); ctx.strokeStyle = rgba('#000', 0.28); ctx.lineWidth = 1.4; for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(100 + i * 4.2, 172); ctx.lineTo(100 + i * 6.4, 216); ctx.stroke(); } ctx.restore(); ctx.strokeStyle = a.trim; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(61, 212); ctx.lineTo(139, 212); ctx.stroke(); }
    pts(ctx, [[70, 122], [130, 122], [127, 184], [73, 184]]);
    volume(ctx, a.outfit, 100, 152, 54, { lw: 2.2, hi: 0.3, rim: a.trim, rimA: 0.18 });
    ctx.save(); ctx.clip();
    ctx.strokeStyle = shade(a.outfit, -0.6); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(100, 126); ctx.lineTo(100, 186); ctx.stroke();
    ctx.fillStyle = a.trim; for (const y of [140, 154, 168]) { ell(ctx, 95, y, 2, 2); ctx.fill(); }
    ctx.fillStyle = rgba('#000', 0.22); ctx.fillRect(70, 178, 60, 8);
    ctx.restore();
    ctx.fillStyle = a.trim; pts(ctx, [[86, 120], [114, 120], [108, 132], [100, 138], [92, 132]]); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = shade(a.trim, -0.6); ctx.stroke();
    ctx.strokeStyle = a.trim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(71, 182); ctx.lineTo(129, 182); ctx.stroke();
  }
  function robe(ctx, a, wide) {
    // hem skirt + hakama-style fold lines
    pts(ctx, [[72, 122], [128, 122], [146, 230], [54, 230]]);
    volume(ctx, a.outfit, 100, 176, 70, { lw: 2.2, hi: 0.32, rim: a.trim, rimA: 0.2 });
    ctx.save(); ctx.clip();
    ctx.strokeStyle = rgba(shade(a.outfit, -0.7), 0.55); ctx.lineWidth = 1.6;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(100 + i * 5, 176); ctx.quadraticCurveTo(100 + i * 9, 205, 100 + i * 12, 232); ctx.stroke(); }
    ctx.fillStyle = rgba(a.trim, 0.55); ctx.fillRect(40, 222, 120, 4);
    ctx.restore();
    // inner collar V
    pts(ctx, [[86, 120], [114, 120], [100, 152]]); ctx.fillStyle = '#f2eef8'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = shade(a.outfit, -0.7); ctx.stroke();
    ctx.strokeStyle = a.trim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(84, 120); ctx.lineTo(100, 154); ctx.lineTo(116, 120); ctx.stroke();
    // obi
    pts(ctx, [[71, 164], [129, 164], [131, 180], [69, 180]]); volume(ctx, a.trim, 100, 172, 34, { lw: 1.6, hi: 0.3 });
    pts(ctx, [[118, 168], [140, 160], [146, 178], [124, 182]]); volume(ctx, shade(a.trim, -0.12), 134, 171, 14, { lw: 1.4 });
    // feet
    for (const s of [-1, 1]) { ell(ctx, 100 + s * 16, 237, 12, 4.6); ctx.fillStyle = '#1c1624'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#000'; ctx.stroke(); }
  }
  function suit(ctx, a) {
    legs(ctx, shade(a.outfit, -0.3), '#0c0a12', a.skin, false);
    pts(ctx, [[69, 122], [131, 122], [129, 190], [71, 190]]);
    volume(ctx, a.outfit, 100, 156, 56, { lw: 2.2, hi: 0.3, rim: a.trim, rimA: 0.16 });
    ctx.save(); ctx.clip();
    pts(ctx, [[88, 120], [112, 120], [100, 190]]); ctx.fillStyle = '#f4f2f8'; ctx.fill();
    ctx.strokeStyle = shade(a.outfit, -0.75); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = rgba('#000', 0.2); ctx.fillRect(69, 184, 62, 8);
    ctx.restore();
    // lapels
    for (const s of [-1, 1]) { pts(ctx, [[100 + s * 12, 120], [100 + s * 31, 122], [100 + s * 22, 160], [100 + s * 2, 190]]); ctx.fillStyle = shade(a.outfit, 0.14); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = shade(a.outfit, -0.8); ctx.stroke(); }
    // tie
    pts(ctx, [[96, 128], [104, 128], [107, 160], [100, 168], [93, 160]]); volume(ctx, a.trim, 100, 148, 16, { lw: 1.2 });
    ell(ctx, 100, 128, 4.4, 3.2); ctx.fillStyle = shade(a.trim, -0.2); ctx.fill();
    // pocket square
    ctx.fillStyle = a.trim; pts(ctx, [[114, 150], [122, 150], [121, 154], [115, 154]]); ctx.fill();
  }

  // ------------------------------------------------------------------ arms
  function arm(ctx, col, trim, sx, hx, hy, sleeve) {
    const x0 = 100 + sx * 28, y0 = 128, ex = (x0 + hx) / 2 + sx * 7, ey = (y0 + hy) / 2 + 12;
    fillLimb(ctx, col, x0, y0, ex, ey, 17, 14, { lw: 1.8, hi: 0.3 });
    fillLimb(ctx, col, ex, ey, hx, hy, 14, sleeve ? 22 : 12, { lw: 1.8, hi: 0.25 });
    if (sleeve) { ctx.strokeStyle = trim; ctx.lineWidth = 2.4; const dx = hx - ex, dy = hy - ey, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d; ctx.beginPath(); ctx.moveTo(hx + nx * 11, hy + ny * 11); ctx.lineTo(hx - nx * 11, hy - ny * 11); ctx.stroke(); }
  }

  // ------------------------------------------------------------------ props (each draws in design space; (hx,hy) = grip)
  const P = {};
  P.revolver = function (ctx, c, ph) {
    ctx.save(); ctx.translate(152, 148); ctx.rotate(-0.12);
    bar(ctx, -4, 6, 6, 18, 9, '#3a2a22', '#120a08');                   // grip
    pts(ctx, [[-6, -2], [12, -2], [12, 8], [-6, 8]]); volume(ctx, '#8a8f9c', 3, 3, 12, { lw: 1.4 });            // frame
    bar(ctx, 12, 1, 38, 1, 6, '#6a707e', '#14161c');                   // barrel
    ell(ctx, 4, 2, 7, 6.4); volume(ctx, '#aeb4c0', 2, 0, 8, { lw: 1.3 }); ctx.fillStyle = '#2a2c34'; for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; ell(ctx, 4 + cos(a) * 3.4, 2 + sin(a) * 3.2, 1.2, 1.2); ctx.fill(); }
    ctx.restore();
    glow(ctx, 192, 144, 14, '#ffb060', 0.45 + 0.1 * sin(ph));
    // ricochet bullet path
    ctx.save(); ctx.strokeStyle = rgba(c.trim, 0.75); ctx.lineWidth = 1.8; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(192, 144); ctx.quadraticCurveTo(200, 120, 176, 96); ctx.stroke(); ctx.restore();
  };
  P.broom = function (ctx, c) {
    bar(ctx, 150, 240, 137, 88, 6.4, '#9a6a3a', '#2a1608');
    ctx.fillStyle = rgba('#fff', 0.2); ctx.fillRect(136, 100, 2, 130);
    pts(ctx, [[142, 204], [160, 204], [172, 246], [128, 246]]); volume(ctx, '#e8c86a', 150, 226, 24, { lw: 1.6, hi: 0.3 });
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgba('#8a5a14', 0.6); ctx.lineWidth = 1.2; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(151 + i * 1.6, 206); ctx.lineTo(150 + i * 4.4, 248); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = c.trim; pts(ctx, [[141, 200], [161, 200], [160, 208], [142, 208]]); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#2a2008'; ctx.stroke();
    // ribbon
    ctx.strokeStyle = '#ff8ac0'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(138, 96); ctx.quadraticCurveTo(122, 90, 126, 108); ctx.moveTo(138, 96); ctx.quadraticCurveTo(150, 84, 156, 100); ctx.stroke();
  };
  P.katana = function (ctx, c, ph) {
    // drawn blade, raised
    ctx.save(); ctx.translate(140, 168); ctx.rotate(-0.88);
    bar(ctx, -8, 0, 8, 0, 5.6, '#1c1a28', '#000');                    // grip wrap
    ctx.strokeStyle = c.trim; ctx.lineWidth = 1.2; for (let i = -6; i <= 6; i += 4) { ctx.beginPath(); ctx.moveTo(i, -2.8); ctx.lineTo(i + 2, 2.8); ctx.stroke(); }
    ell(ctx, 10, 0, 2.6, 7.6); ctx.fillStyle = '#d4a84a'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#4a3408'; ctx.stroke();   // tsuba
    ctx.beginPath(); ctx.moveTo(12, -3); ctx.lineTo(84, -2.2); ctx.quadraticCurveTo(92, -1, 96, 1.4); ctx.lineTo(12, 3); ctx.closePath();
    const g = ctx.createLinearGradient(0, -3, 0, 3); g.addColorStop(0, '#f4f8ff'); g.addColorStop(0.55, '#aab4c8'); g.addColorStop(1, '#6a7488'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#2a3040'; ctx.stroke();
    ctx.strokeStyle = rgba('#fff', 0.8); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(18, -0.4); ctx.lineTo(86, -0.2); ctx.stroke();
    glow(ctx, 92, 0, 14, '#9ae8d8', 0.45);
    ctx.restore();
    // scabbard on the hip
    ctx.save(); ctx.translate(78, 176); ctx.rotate(2.2);
    bar(ctx, 0, 0, 52, 0, 7, '#1a1826', '#000'); ctx.fillStyle = c.trim; ctx.fillRect(2, -4, 4, 8); ctx.fillRect(48, -4, 4, 8);
    ctx.restore();
    // ward: faint dome (her simple-domain pressure)
    ctx.save(); ctx.strokeStyle = rgba('#9ae8d8', 0.5); ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -ph * 8; ctx.beginPath(); ctx.arc(100, 190, 92, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore();
  };
  P.staff = function (ctx, c, ph) {
    bar(ctx, 148, 242, 148, 78, 4.6, '#7a5030', '#241206');
    ctx.fillStyle = rgba('#fff', 0.22); ctx.fillRect(146.4, 90, 1.6, 150);
    // bell cluster
    for (let i = 0; i < 3; i++) { const a = -0.8 + i * 0.8, bx = 148 + sin(a) * 15, by = 76 + cos(a) * 5 + (i === 1 ? 4 : 0); bar(ctx, 148, 78, bx, by - 3, 1.4, '#d8b050'); ctx.beginPath(); ctx.moveTo(bx - 6, by + 8); ctx.quadraticCurveTo(bx - 6, by - 2, bx, by - 4); ctx.quadraticCurveTo(bx + 6, by - 2, bx + 6, by + 8); ctx.closePath(); volume(ctx, '#f0c860', bx, by + 2, 8, { lw: 1.3, hi: 0.4 }); ell(ctx, bx, by + 9, 1.8, 1.8); ctx.fillStyle = '#6a4a10'; ctx.fill(); }
    // shide (paper streamers) + sound rings
    ctx.strokeStyle = '#f6f2ff'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(148, 96); for (let i = 1; i <= 4; i++) ctx.lineTo(148 + (i % 2 ? 7 : -3) + sin(ph + i) * 2, 96 + i * 7); ctx.stroke();
    ctx.strokeStyle = '#d83a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(148, 96); ctx.quadraticCurveTo(128, 110 + sin(ph) * 3, 120, 136); ctx.stroke();
    ctx.save(); ctx.strokeStyle = rgba('#ffe9a0', 0.55); ctx.lineWidth = 1.6; for (let i = 0; i < 2; i++) { ctx.globalAlpha = 0.7 - i * 0.3; ctx.beginPath(); ctx.arc(148, 78, 22 + i * 12 + sin(ph) * 2, -2.5, -0.6); ctx.stroke(); } ctx.restore();
  };
  P.frost = function (ctx, c, ph) {
    // floating hexagonal ice crystal above the raised hand
    const cy = 100 + sin(ph) * 3;
    glow(ctx, 150, cy, 34, '#8ad8ff', 0.6);
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 - Math.PI / 2, r = i % 2 ? 11 : 17; ctx.lineTo(150 + cos(a) * r, cy + sin(a) * r * 1.15); } ctx.closePath();
    volume(ctx, '#cfeeff', 150, cy, 18, { lw: 1.6, hi: 0.55, lo: -0.4 });
    ctx.strokeStyle = rgba('#fff', 0.85); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(150, cy - 14); ctx.lineTo(150, cy + 14); ctx.moveTo(138, cy - 7); ctx.lineTo(162, cy + 7); ctx.moveTo(162, cy - 7); ctx.lineTo(138, cy + 7); ctx.stroke();
    // icicle shards rising around the feet
    for (let i = 0; i < 9; i++) { const x = 44 + i * 14, h = 18 + ((i * 7) % 5) * 7; K.spike(ctx, x, 238, -Math.PI / 2 + (i - 4) * 0.12, h, 7, i % 2 ? '#bfe6ff' : '#e4f6ff'); }
    // orbiting flakes
    ctx.save(); ctx.fillStyle = rgba('#e8f8ff', 0.9); for (let i = 0; i < 7; i++) { const a = ph + i * TAU / 7, x = 100 + cos(a) * 78, y = 150 + sin(a) * 34 - 20; star(ctx, x, y, 4, 1.6, 4, a); ctx.fill(); } ctx.restore();
  };
  P.film = function (ctx, c, ph) {
    ctx.save(); ctx.translate(152, 138); ctx.rotate(0.14);
    pts(ctx, [[-13, -44], [13, -44], [13, 44], [-13, 44]]); volume(ctx, '#17141f', 0, 0, 52, { lw: 1.6, hi: 0.2 });
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#f2e8c0'; ctx.fillRect(-10.5, -40 + i * 14, 3, 6); ctx.fillRect(7.5, -40 + i * 14, 3, 6); }
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? c.trim : '#3a2f58'; ctx.fillRect(-5.4, -38 + i * 26, 10.8, 22); ctx.strokeStyle = '#d8c8ff'; ctx.lineWidth = 1; ctx.strokeRect(-5.4, -38 + i * 26, 10.8, 22); ctx.fillStyle = rgba('#fff', 0.7); ell(ctx, 0, -27 + i * 26 + (i - 1) * -2, 2.2, 2.2); ctx.fill(); }
    ctx.restore();
    // 24fps speed trail
    ctx.save(); ctx.lineCap = 'round'; for (let i = 0; i < 7; i++) { const y = 120 + i * 17, l = 26 + ((i * 13) % 5) * 9; ctx.strokeStyle = rgba(i % 2 ? '#ffd24a' : '#b89aff', 0.55); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(52 - ((i * 7) % 4) * 6, y); ctx.lineTo(52 - l, y + 1.5); ctx.stroke(); } ctx.restore();
  };
  P.gavel = function (ctx, c, ph) {
    ctx.save(); ctx.translate(150, 132); ctx.rotate(0.42);
    bar(ctx, 0, 24, 0, -34, 6, '#6a4222', '#1c0e04');
    pts(ctx, [[-17, -48], [17, -48], [17, -28], [-17, -28]]); volume(ctx, '#d8b04a', 0, -38, 20, { lw: 1.8, hi: 0.5 });
    ctx.fillStyle = '#6a4222'; ctx.fillRect(-18, -43, 4, 10); ctx.fillRect(14, -43, 4, 10);
    spec(ctx, -6, -44, 8, 3, 0.6);
    ctx.restore();
    // court-room impact ring + scales of judgement
    ctx.save(); ctx.strokeStyle = rgba('#ffd24a', 0.45); ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.ellipse(100, 238, 74, 16, 0, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(58, 146); ctx.strokeStyle = '#e8d8a0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -10); ctx.moveTo(-12, -6); ctx.lineTo(12, -6); ctx.stroke(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 12, -6); ctx.lineTo(s * 8, 4); ctx.lineTo(s * 16, 4); ctx.closePath(); ctx.stroke(); } ctx.restore();
  };
  P.orb = function (ctx, c, ph) {
    // swirling black curse orb in the raised left hand
    const x = 50, y = 126 + sin(ph) * 2;
    glow(ctx, x, y, 38, '#8a4cd0', 0.55);
    ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); volume(ctx, '#0e0a18', x, y, 15, { lw: 1.6, hi: 0.5, lo: -0.2, rim: '#9a6cff', rimA: 0.5 });
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.clip(); ctx.strokeStyle = rgba('#b89aff', 0.7); ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, 5 + i * 4, ph * 2 + i, ph * 2 + i + 2.6); ctx.stroke(); } ctx.restore();
    ell(ctx, x - 4, y - 3, 2.6, 3.4); ctx.fillStyle = '#ff5a8a'; ctx.fill(); ell(ctx, x + 4, y - 3, 2.6, 3.4); ctx.fill();
    // rainbow ribbon coiling at his feet (Rainbow Dragon)
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 6; for (let i = 0; i < 14; i++) { const t = i / 13, a = Math.PI * (1.05 + t * 0.9), x1 = 100 + cos(a) * 82, y1 = 218 + sin(a) * 22; ctx.strokeStyle = 'hsla(' + Math.round(t * 300) + ',90%,66%,0.55)'; ctx.beginPath(); ctx.arc(x1, y1, 3.4, 0, TAU); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); } ctx.restore();
  };
  P.lightning = function (ctx, c, ph) {
    glow(ctx, 100, 140, 96, '#ffd24a', 0.35);
    const R = rng(17);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3, x1 = 100 + cos(a) * 30, y1 = 150 + sin(a) * 40, x2 = 100 + cos(a) * (80 + R() * 14), y2 = 150 + sin(a) * (70 + R() * 14); bolt(ctx, x1, y1, x2, y2, 31 + i * 7, 16, '#ffd24a', 1.5); }
    for (const [x, y] of [[60, 140], [140, 140]]) { glow(ctx, x, y, 24, '#fff2a8', 0.8); for (let i = 0; i < 3; i++) bolt(ctx, x, y, x + (i - 1) * 22 + (x < 100 ? -14 : 14), y - 18 - i * 6, 91 + i * 13, 10, '#ffe36a', 1.3); }
  };
  P.greatsword = function (ctx, c, ph) {
    ctx.save(); ctx.translate(158, 236);
    pts(ctx, [[-9, 0], [9, 0], [8, -86], [0, -96], [-8, -86]]);
    const g = ctx.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, '#12121c'); g.addColorStop(0.5, '#3a3a52'); g.addColorStop(1, '#0a0a12'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#d8e0ff'; ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -86); ctx.stroke();
    // crossguard with star
    pts(ctx, [[-24, -92], [24, -92], [20, -100], [-20, -100]]); volume(ctx, '#d8c070', 0, -96, 24, { lw: 1.6, hi: 0.5 });
    bar(ctx, 0, -100, 0, -128, 6, '#1a1a26', '#000'); ell(ctx, 0, -131, 5.4, 5.4); volume(ctx, '#d8c070', 0, -131, 6, { lw: 1.2 });
    star(ctx, 0, -50, 5, 2.2, 5); ctx.fillStyle = '#ffe9a0'; ctx.fill();
    ctx.restore();
    // mass orb: heavy dark sphere with gravity rings
    const x = 44, y = 132 + sin(ph) * 3;
    glow(ctx, x, y, 34, '#8aa0ff', 0.4);
    ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); volume(ctx, '#0a0a14', x, y, 14, { lw: 1.6, hi: 0.4, lo: -0.1, rim: '#8aa0ff', rimA: 0.5 });
    ctx.save(); ctx.strokeStyle = rgba('#d8e0ff', 0.65); ctx.lineWidth = 1.3; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(x, y, 24 + i * 8, 7 + i * 2.4, -0.4 + i * 0.5, 0, TAU); ctx.stroke(); } ctx.restore();
  };
  P.none = function () { /* nothing */ };
  // hat for Momo, drawn above the head
  function witchHat(ctx, a) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(78, 34); ctx.quadraticCurveTo(90, 16, 108, -2); ctx.quadraticCurveTo(128, -8, 130, 6); ctx.quadraticCurveTo(122, 8, 122, 34); ctx.closePath();
    volume(ctx, shade(a.outfit, -0.3), 104, 18, 32, { lw: 1.8, hi: 0.35 });
    ctx.beginPath(); ctx.ellipse(100, 34, 46, 9, -0.05, 0, TAU); volume(ctx, shade(a.outfit, -0.2), 100, 34, 46, { lw: 1.8, hi: 0.4 });
    ctx.fillStyle = a.trim; pts(ctx, [[78, 30], [122, 30], [123, 36], [77, 36]]); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = shade(a.trim, -0.7); ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ per-character configuration
  // rh/lh = hand positions; style = outfit drawer; back/front = optional extra fx; sleeves = wide robe sleeves
  const CHARS = {
    mai: { style: 'uniform', skirt: true, rh: [150, 150], lh: [132, 164], prop: P.revolver },
    momo: { style: 'uniform', skirt: true, rh: [142, 150], lh: [144, 178], prop: P.broom, hat: witchHat },
    miwa: { style: 'uniform', skirt: true, rh: [140, 168], lh: [66, 160], prop: P.katana },
    utahime: { style: 'robe', sleeves: true, rh: [148, 158], lh: [112, 154], prop: P.staff, aura: '#ffe9a0' },
    uraume: { style: 'robe', sleeves: true, rh: [148, 126], lh: [60, 176], prop: P.frost, aura: '#8ad8ff' },
    naoya: { style: 'suit', rh: [148, 134], lh: [124, 168], prop: P.film, ghost: { n: 3, dx: -17, col: '#b89aff' } },
    higuruma: { style: 'suit', rh: [146, 132], lh: [118, 168], prop: P.gavel, cape: '#14121c' },
    geto: { style: 'robe', sleeves: true, rh: [132, 164], lh: [54, 130], prop: P.orb, kesa: true, aura: '#9a6cff' },
    kashimo: { style: 'suit', rh: [140, 140], lh: [60, 140], prop: P.lightning, aura: '#ffd24a' },
    yuki: { style: 'suit', rh: [158, 150], lh: [158, 162], prop: P.greatsword, aura: '#8aa0ff', sword: true },
  };

  function headPass(ctx, def, part) {
    const a = def.art, H = Art._head, S = 1.05, tx = 100 - 50 * S, ty = 20;
    ctx.save(); ctx.translate(tx, ty); ctx.scale(S, S);
    if (part === 'back') { H.hairBack(ctx, a); }
    else {
      // ears + head + features (same proportions as the bust portraits)
      ctx.fillStyle = a.skin; ell(ctx, 19, 64, 4.5, 7); ctx.fill(); ell(ctx, 81, 64, 4.5, 7); ctx.fill();
      const hg = ctx.createLinearGradient(0, 28, 0, 96); hg.addColorStop(0, a.skin); hg.addColorStop(1, shade(a.skin, -0.12));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(20, 56); ctx.bezierCurveTo(20, 30, 80, 30, 80, 56); ctx.bezierCurveTo(82, 82, 66, 98, 50, 98); ctx.bezierCurveTo(34, 98, 18, 82, 20, 56); ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(shade(a.skin, -0.7), 0.6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,120,.18)'; ell(ctx, 32, 78, 6, 3.5); ctx.fill(); ell(ctx, 68, 78, 6, 3.5); ctx.fill();
      if (a.acc !== 'mask') { ctx.strokeStyle = '#6a3a3a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(44, 86); ctx.quadraticCurveTo(50, 90, 56, 86); ctx.stroke(); }
      H.eyes(ctx, a, def);
      H.hairFront(ctx, a);
      H.accessoriesFront(ctx, Object.assign({}, a, { acc: FACE_ACC.includes(a.acc) ? a.acc : null }), def);
    }
    ctx.restore();
  }

  function drawFigure(ctx, def, cfg, ph) {
    const a = def.art;
    if (cfg.aura) glow(ctx, 100, 140, 104, cfg.aura, 0.4);
    if (cfg.cape) { pts(ctx, [[66, 118], [134, 118], [152, 204], [48, 204]]); volume(ctx, cfg.cape, 100, 160, 64, { lw: 2, hi: 0.15, rim: '#ffd24a', rimA: 0.3 }); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(48, 204); ctx.lineTo(152, 204); ctx.stroke(); }
    headPass(ctx, def, 'back');
    // neck
    ctx.fillStyle = SKIN_SH(a.skin); ctx.fillRect(91, 112, 18, 14);
    if (cfg.style === 'robe') robe(ctx, a, cfg.sleeves); else if (cfg.style === 'suit') suit(ctx, a); else uniform(ctx, a, cfg.skirt);
    if (cfg.kesa) { pts(ctx, [[74, 120], [92, 120], [124, 232], [106, 232]]); volume(ctx, '#c4501a', 100, 176, 58, { lw: 1.6, hi: 0.3 }); ctx.save(); ctx.clip(); ctx.strokeStyle = '#e8c070'; ctx.lineWidth = 1.2; for (let i = 0; i < 8; i++) { const t = i / 7, x = 83 + t * 26, y = 124 + t * 104; ctx.strokeRect(x - 8, y - 6, 16, 12); } ctx.restore(); }
    // arms: far arm first
    const sl = !!cfg.sleeves, ac = a.outfit;
    arm(ctx, ac, a.trim, -1, cfg.lh[0], cfg.lh[1], sl);
    arm(ctx, ac, a.trim, 1, cfg.rh[0], cfg.rh[1], sl);
    headPass(ctx, def, 'front');
    if (cfg.hat) cfg.hat(ctx, a);
    if (cfg.prop) cfg.prop(ctx, a, ph || 0);
    hand(ctx, cfg.lh[0], cfg.lh[1], a.skin); hand(ctx, cfg.rh[0], cfg.rh[1], a.skin);
    if (cfg.sword) { /* second grip overlap on the pommel */ hand(ctx, cfg.rh[0], cfg.rh[1], a.skin, 6.4); }
  }

  function buildCutout(id) {
    const def = JJK.Characters[id]; if (!def || typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = CW; c.height = CH; c._cutout = true;
    const ctx = c.getContext('2d');
    const cfg = CHARS[id];
    if (cfg && def.art) {
      if (cfg.ghost) {
        const t = document.createElement('canvas'); t.width = CW; t.height = CH; const tx = t.getContext('2d'); tx.scale(SC, SC); drawFigure(tx, def, Object.assign({}, cfg, { ghost: null }), 0.6);
        const tint = document.createElement('canvas'); tint.width = CW; tint.height = CH; const nx = tint.getContext('2d'); nx.drawImage(t, 0, 0); nx.globalCompositeOperation = 'source-atop'; nx.fillStyle = cfg.ghost.col; nx.fillRect(0, 0, CW, CH);
        for (let i = cfg.ghost.n; i >= 1; i--) { ctx.globalAlpha = 0.5 / i; ctx.drawImage(tint, cfg.ghost.dx * SC * i, 0); }
        ctx.globalAlpha = 1; ctx.drawImage(t, 0, 0);
      } else { ctx.scale(SC, SC); drawFigure(ctx, def, cfg, 0.6); }
      return c;
    }
    if (def.model && Art.enemyFrames) {
      // boss-model stand: use the boss render as the standee art
      const f = Art.enemyFrames(def.model)[0]; if (!f) return null;
      const w = CW * 1.05, h = w; ctx.drawImage(f, (CW - w) / 2, CH - h - 6, w, h);
      return c;
    }
    return null;
  }

  /** Transparent full-body cut-out for a character, or null when none is defined (then the bust portrait is used). */
  Art.cutout = function (id) {
    const key = 'cut:' + id;
    if (key in Art._cache) return Art._cache[key];
    const def = JJK.Characters[id];
    let c = null;
    if (def && (CHARS[id] || def.model)) c = buildCutout(id);
    Art._cache[key] = c;
    return c;
  };

  /** Card portrait (bust crop of the cut-out over the usual rarity-tinted gradient) for characters that have a cut-out. */
  Art.cutoutPortrait = function (id, w, h) {
    const def = JJK.Characters[id];
    if (!def || !(CHARS[id] || def.model) || typeof document === 'undefined') return null;
    const key = 'cp:' + id + ':' + w + 'x' + h;
    if (Art._cache[key]) return Art._cache[key];
    const cut = Art.cutout(id); if (!cut) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'), rc = JJK.Balance.rarity[def.rarity].color;
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 4, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    bg.addColorStop(0, shade(def.color, 0.15)); bg.addColorStop(0.5, shade(def.color, -0.55)); bg.addColorStop(1, '#07060f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const R = rng(Util_hash(id)); ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = def.color; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(R() * w, R() * h * 0.7, 14 + R() * 36, R() * TAU, R() * TAU + 2.5); ctx.stroke(); } ctx.restore();
    // crop: head + shoulders for humans, upper body for boss-model stands
    const human = !!CHARS[id];
    const cw = (human ? 150 : 190) * SC, chh = cw * h / w, sx = (human ? 100 * SC - cw / 2 : (CW - cw) / 2), sy = human ? 4 * SC : CH * 0.18;
    ctx.drawImage(cut, sx, sy, cw, chh, 0, 0, w, h);
    const vg = ctx.createLinearGradient(0, h * 0.6, 0, h); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rc; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2); ctx.globalAlpha = 1;
    Art._cache[key] = c;
    return c;
  };
  function Util_hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  Models.chars = CHARS;

  // ====================================================================== SUMMONS: Rainbow Dragon, Garuda (face RIGHT, ~100x100 design space)
  const SM = Models.summons;
  SM.dragon = function (ctx, ph) {
    const N = 22, pt = [];
    for (let i = 0; i <= N; i++) { const t = i / N; pt.push([-46 + t * 76, sin(ph + t * 5.2) * (5 + t * 7) * (1 - t * 0.2) - t * 4 + 4]); }
    glow(ctx, 0, 0, 70, '#ff8ad8', 0.3);
    // back-fin ribbon
    ctx.save(); ctx.globalAlpha = 0.7; for (let i = 1; i < N - 2; i += 2) { const [x, y] = pt[i], t = i / N, hh = 11 + sin(t * 3) * 3 + t * 6; ctx.beginPath(); ctx.moveTo(x - 5, y - 8); ctx.quadraticCurveTo(x - 1, y - hh - 6, x + 6, y - 8); ctx.closePath(); ctx.fillStyle = 'hsl(' + Math.round(t * 300) + ',90%,70%)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(30,10,50,.6)'; ctx.stroke(); } ctx.restore();
    // body: overlapping rainbow scale discs, tail to head
    for (let i = 0; i <= N; i++) {
      const t = i / N, [x, y] = pt[i], r = 5 + Math.pow(t, 0.8) * 8;
      const col = 'hsl(' + Math.round(t * 300) + ',88%,62%)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 0.5, x, y, r * 1.1); g.addColorStop(0, 'hsl(' + Math.round(t * 300) + ',95%,84%)'); g.addColorStop(0.55, col); g.addColorStop(1, 'hsl(' + Math.round(t * 300) + ',70%,34%)'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(24,8,40,.7)'; ctx.stroke();
      if (i % 2) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ell(ctx, x + 1, y + r * 0.45, r * 0.5, r * 0.2); ctx.fill(); }
    }
    // tiny forelegs
    for (const i of [8, 15]) { const [x, y] = pt[i]; const sw = sin(ph * 2 + i) * 2; ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + 2 + sw, y + 14); ctx.stroke(); ctx.strokeStyle = '#ffd8f0'; ctx.lineWidth = 1.2; ctx.stroke(); }
    // head
    const [hx, hy] = pt[N];
    ctx.save(); ctx.translate(hx + 3, hy - 1); ctx.scale(1.3, 1.3); ctx.rotate(0.08 * sin(ph));
    for (const s of [-1, 1]) { ctx.strokeStyle = s < 0 ? '#ffe9a0' : '#ffd24a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(8, 3); ctx.quadraticCurveTo(18, 12 + s * 3, 14 + sin(ph) * 5, 22 + s * 2); ctx.stroke(); }
    K.spike(ctx, -2, -8, -2.3, 14, 5, '#ffe9a0'); K.spike(ctx, 3, -9, -1.8, 12, 4.4, '#fff4c0');
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.quadraticCurveTo(6, -12, 20, -3); ctx.quadraticCurveTo(24, 0, 20, 4); ctx.lineTo(4, 9); ctx.quadraticCurveTo(-8, 8, -10, 0); ctx.closePath(); volume(ctx, '#ff9ad8', 6, 0, 16, { lw: 1.8, hi: 0.5 });
    ctx.beginPath(); ctx.moveTo(4, 5); ctx.quadraticCurveTo(14, 9, 21, 4); ctx.lineTo(20, 8); ctx.quadraticCurveTo(10, 12, 3, 9); ctx.closePath(); ctx.fillStyle = '#c85a9a'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#2a1040'; ctx.stroke();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(8 + i * 4.4, 5.6); ctx.lineTo(9.6 + i * 4.4, 9); ctx.lineTo(11 + i * 4.4, 5.6); ctx.fill(); }
    ell(ctx, 4, -3, 3, 3.4); ctx.fillStyle = '#fff'; ctx.fill(); ell(ctx, 4.6, -3, 1.7, 2.6); ctx.fillStyle = '#c0102a'; ctx.fill(); glow(ctx, 4, -3, 8, '#ff5a8a', 0.55);
    ell(ctx, 19, -1, 0.9, 1.2); ctx.fillStyle = '#2a1040'; ctx.fill();
    ctx.restore();
    // sparkles
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const t = (ph / TAU + i / 6) % 1, x = -40 + i * 15, y = -20 + sin(ph + i) * 6 - t * 8; ctx.fillStyle = 'hsla(' + (i * 55) + ',100%,75%,' + (1 - t) + ')'; star(ctx, x, y, 3, 1, 4, t * 3); ctx.fill(); } ctx.restore();
  };
  SM.garuda = function (ctx, ph) {
    const flap = sin(ph) * 0.62;
    glow(ctx, 0, 0, 72, '#aab8ff', 0.3);
    // trailing wisps
    K.wisps(ctx, -10, 12, 30, '#b8c4ff', ph, 5, 22);
    // tail feathers
    for (let i = -2; i <= 2; i++) { ctx.save(); ctx.translate(-26, 8); ctx.rotate(Math.PI + i * 0.2 + sin(ph + i) * 0.06); ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(14, -6, 32, 0); ctx.quadraticCurveTo(14, 6, 0, 3); ctx.closePath(); volume(ctx, i % 2 ? '#e8ecff' : '#9aa6d8', 14, 0, 18, { lw: 1.3, hi: 0.4 }); ctx.restore(); }
    const wing = (side, back) => {
      ctx.save(); ctx.translate(-4, -8); ctx.scale(1, 1);
      const base = -1.55 + (side > 0 ? flap : flap * 0.8) - (back ? 0.2 : 0);
      for (let i = 0; i < 8; i++) { const a = base - i * 0.16 * (side > 0 ? 1 : 1), len = 56 - i * 3.2 + (i === 0 ? 8 : 0); ctx.save(); ctx.rotate(a + 0.9); ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(len * 0.5, -9, len, -1); ctx.quadraticCurveTo(len * 0.5, 5, 0, 3); ctx.closePath(); volume(ctx, back ? '#5a5f94' : (i % 2 ? '#f0f2ff' : '#c4cbf4'), len * 0.45, 0, len * 0.5, { lw: 1.3, hi: 0.45, lo: back ? -0.4 : -0.3 }); ctx.restore(); }
      ctx.restore();
    };
    wing(1, true);
    // body
    ctx.beginPath(); ctx.ellipse(0, 6, 26, 15, -0.1, 0, TAU); volume(ctx, '#2e3052', -4, 2, 28, { lw: 2, hi: 0.5, rim: '#aab8ff', rimA: 0.3 });
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 6, 26, 15, -0.1, 0, TAU); ctx.clip(); ctx.fillStyle = '#d8dcff'; for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 6; c2++) { ell(ctx, -16 + c2 * 8 + (r % 2) * 4, 8 + r * 5, 4, 2.6); ctx.fill(); } ctx.restore();
    wing(1, false);
    // talons
    for (const s of [0, 1]) { const x = -4 + s * 10, y = 20; ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 2, y + 6); ctx.stroke(); for (let k = -1; k <= 1; k++) { ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x + 2, y + 6); ctx.lineTo(x + 2 + k * 4 + 3, y + 12); ctx.stroke(); } }
    // neck + head
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.quadraticCurveTo(26, -8, 30, -22); ctx.lineTo(22, -24); ctx.quadraticCurveTo(14, -10, 6, -4); ctx.closePath(); volume(ctx, '#e8ecff', 20, -12, 16, { lw: 1.6, hi: 0.5 });
    ctx.beginPath(); ctx.ellipse(31, -26, 10, 9, 0.2, 0, TAU); volume(ctx, '#f4f6ff', 30, -29, 11, { lw: 1.8, hi: 0.5 });
    // crest
    for (let i = 0; i < 3; i++) K.spike(ctx, 28 - i * 3, -34, -2.2 - i * 0.25 + sin(ph + i) * 0.1, 11 - i, 3.4, '#ffd24a');
    // beak
    ctx.beginPath(); ctx.moveTo(38, -29); ctx.quadraticCurveTo(52, -27, 51, -16); ctx.quadraticCurveTo(44, -22, 37, -22); ctx.closePath(); volume(ctx, '#ffc83a', 44, -24, 10, { lw: 1.6, hi: 0.5 });
    ctx.strokeStyle = '#6a4a08'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(39, -25); ctx.lineTo(48, -23); ctx.stroke();
    // eye
    ell(ctx, 33, -29, 3.2, 3.2); ctx.fillStyle = '#fff'; ctx.fill(); ell(ctx, 33.6, -29, 1.8, 2.4); ctx.fillStyle = '#d02040'; ctx.fill(); glow(ctx, 33, -29, 9, '#ff7a9a', 0.5);
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(28, -34); ctx.lineTo(37, -31); ctx.stroke();
    wing(-1, false);
  };
})(typeof window !== 'undefined' ? window : globalThis);
