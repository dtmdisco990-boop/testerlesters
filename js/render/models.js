/* Detailed procedural models: drawing toolkit + curse enemies. Bosses live in models-bosses.js, allies/summons in models-allies.js.
   All draw functions take (ctx, def, ph) with the origin at the sprite centre, a ~112x112 design space and ph = animation phase 0..TAU
   (frames loop seamlessly because every motion is a whole-number multiple of ph). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const TAU = Math.PI * 2;
  const Models = (JJK.Models = JJK.Models || { enemies: {}, bosses: {}, summons: {} });

  // ------------------------------------------------------------------ colour helpers
  function parse(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return [128, 128, 128];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, amt) {
    const c = parse(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
    return 'rgb(' + f(c[0]) + ',' + f(c[1]) + ',' + f(c[2]) + ')';
  }
  function rgba(hex, a) { const c = parse(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(h1, h2, t) { const a = parse(h1), b = parse(h2); return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')'; }

  // tiny deterministic rng so every frame of a sprite uses the same speckles
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ------------------------------------------------------------------ primitives
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  function glow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.4, rgba(col, 0.35)); g.addColorStop(1, rgba(col, 0));
    ctx.save(); ctx.globalAlpha = a == null ? 0.6 : a; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  /** Wobbly organic outline. Returns nothing; leaves the path open for fill/stroke. */
  function blobPath(ctx, cx, cy, rx, ry, o) {
    o = o || {}; const n = o.n || 22, amp = o.amp == null ? 0.07 : o.amp, k = o.k || 3, ph = o.ph || 0;
    ctx.beginPath();
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, w = 1 + Math.sin(a * k + ph) * amp + Math.sin(a * (k + 2) - ph * 2) * amp * 0.5; pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]); }
    ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  }
  /** Fill the current path with a lit-from-upper-left volume gradient, an inner rim light and a dark outline. */
  function volume(ctx, col, cx, cy, r, o) {
    o = o || {};
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.08, cx, cy, r * 1.15);
    g.addColorStop(0, shade(col, o.hi == null ? 0.5 : o.hi)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, o.lo == null ? -0.62 : o.lo));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    // rim light from below-right (bounce light) so shapes read against dark floors
    const rim = ctx.createRadialGradient(cx + r * 0.5, cy + r * 0.7, r * 0.2, cx + r * 0.5, cy + r * 0.7, r * 1.2);
    rim.addColorStop(0, rgba(o.rim || shade(col, 0.55), 0)); rim.addColorStop(0.78, rgba(o.rim || '#ffffff', 0)); rim.addColorStop(1, rgba(o.rim || '#ffffff', o.rimA == null ? 0.22 : o.rimA));
    ctx.fillStyle = rim; ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
    ctx.restore();
    if (o.line !== false) { ctx.lineWidth = o.lw || 2.4; ctx.strokeStyle = o.stroke || shade(col, -0.82); ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function spec(ctx, x, y, rx, ry, a, rot) { ctx.save(); ctx.globalAlpha = a == null ? 0.4 : a; const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ell(ctx, x, y, rx, ry, rot || 0); ctx.fill(); ctx.restore(); }
  function stroke(ctx, col, w, alpha) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (alpha != null) { ctx.save(); ctx.globalAlpha = alpha; ctx.stroke(); ctx.restore(); } else ctx.stroke(); }
  /** Rising wisps of cursed energy. */
  function wisps(ctx, cx, cy, r, col, ph, n, h) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.4, bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r * 0.6;
      const sw = Math.sin(ph + i * 1.7) * 5, up = (h || 22) + Math.sin(ph * 2 + i) * 5;
      ctx.strokeStyle = rgba(col, 0.38); ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sw, by - up * 0.55, bx + sw * 1.6, by - up); ctx.stroke();
      ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.restore();
  }
  /** A cursed eye: glowing sclera, vertical-slit pupil, specular dot, heavy lid. */
  function eye(ctx, x, y, r, iris, o) {
    o = o || {};
    const lid = o.lid == null ? 0.25 : o.lid;
    ctx.save();
    ell(ctx, x, y, r, r * 1.08); ctx.clip();
    const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, 0.5, x, y, r * 1.2); g.addColorStop(0, o.sclera || '#fffbe8'); g.addColorStop(1, shade(o.sclera || '#fffbe8', -0.35)); ctx.fillStyle = g; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    const ix = x + (o.look || 0) * r * 0.3;
    const ig = ctx.createRadialGradient(ix, y, 0, ix, y, r * 0.78); ig.addColorStop(0, shade(iris, 0.45)); ig.addColorStop(0.55, iris); ig.addColorStop(1, shade(iris, -0.5));
    ctx.fillStyle = ig; ell(ctx, ix, y, r * 0.72, r * 0.82); ctx.fill();
    ctx.fillStyle = '#0a0612'; ell(ctx, ix, y, r * (o.slit ? 0.16 : 0.34), r * (o.slit ? 0.78 : 0.5)); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ell(ctx, ix + r * 0.22, y - r * 0.3, r * 0.17, r * 0.2); ctx.fill();
    // lid (optionally slanted for an angry brow)
    const yb = y - r * 1.08 + r * 2.16 * lid, tl = (o.tilt || 0) * r;
    ctx.fillStyle = o.lidCol || 'rgba(10,6,18,.86)';
    ctx.beginPath(); ctx.moveTo(x - r * 1.6, y - r * 2.2); ctx.lineTo(x + r * 1.6, y - r * 2.2); ctx.lineTo(x + r * 1.6, yb + tl); ctx.lineTo(x - r * 1.6, yb - tl); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = o.rimCol || 'rgba(10,6,18,.9)'; ctx.lineWidth = Math.max(1, r * 0.22); ell(ctx, x, y, r, r * 1.08); ctx.stroke();
    if (o.glow) glow(ctx, x, y, r * 2.6, o.glow, 0.5);
  }
  /** Toothy mouth. (x,y) is the centre of the opening. */
  function mouth(ctx, x, y, w, h, n, o) {
    o = o || {};
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y + h * 1.7 * (o.droop == null ? 1 : o.droop), x + w / 2, y);
    ctx.quadraticCurveTo(x, y - h * (o.upper == null ? 0.35 : o.upper), x - w / 2, y); ctx.closePath();
    const g = ctx.createLinearGradient(0, y - h * 0.3, 0, y + h); g.addColorStop(0, o.dark || '#1a0610'); g.addColorStop(1, o.inner || '#5a1030');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    if (o.tongue !== false) { ctx.fillStyle = o.tongueCol || '#c8305a'; ell(ctx, x, y + h * 0.95, w * 0.28, h * 0.5); ctx.fill(); }
    ctx.fillStyle = o.tooth || '#fff4e0';
    const tn = n || 6, tw = w / tn;
    for (let i = 0; i < tn; i++) { const tx = x - w / 2 + (i + 0.5) * tw; const th = h * (0.55 + 0.35 * ((i * 7) % 3) / 2); ctx.beginPath(); ctx.moveTo(tx - tw * 0.5, y - h * 0.1); ctx.lineTo(tx, y + th); ctx.lineTo(tx + tw * 0.5, y - h * 0.1); ctx.fill(); }
    for (let i = 0; i < tn - 1; i++) { const tx = x - w / 2 + (i + 1) * tw; const th = h * 0.5; ctx.beginPath(); ctx.moveTo(tx - tw * 0.4, y + h * 1.3 * 0.62 + (o.lowerOff || 0)); ctx.lineTo(tx, y + h * 1.3 * 0.62 - th + (o.lowerOff || 0)); ctx.lineTo(tx + tw * 0.4, y + h * 1.3 * 0.62 + (o.lowerOff || 0)); ctx.fill(); }
    ctx.restore();
    ctx.lineWidth = 1.8; ctx.strokeStyle = o.line || 'rgba(10,4,12,.9)';
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y + h * 1.7 * (o.droop == null ? 1 : o.droop), x + w / 2, y); ctx.stroke();
  }
  /** Spiky claw / horn / spine helper: triangle from base to tip with a slight curve. */
  function spike(ctx, x, y, ang, len, w, col, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, -w / 2); ctx.quadraticCurveTo(len * 0.55, -w * 0.32 + (o.curve || 0), len, 0); ctx.quadraticCurveTo(len * 0.55, w * 0.32 + (o.curve || 0), 0, w / 2); ctx.closePath();
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, shade(col, 0.4)); g.addColorStop(1, shade(col, -0.45)); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = o.lw || 1.4; ctx.strokeStyle = o.stroke || shade(col, -0.8); ctx.stroke();
    ctx.restore();
  }
  /** Stitch marks along a straight line. */
  function stitches(ctx, x1, y1, x2, y2, n, len, col, lw) {
    ctx.save(); ctx.strokeStyle = col || '#1a1424'; ctx.lineWidth = lw || 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x1 + dx * t, y = y1 + dy * t; ctx.moveTo(x - nx * len, y - ny * len); ctx.lineTo(x + nx * len, y + ny * len); }
    ctx.stroke(); ctx.restore();
  }
  function veins(ctx, cx, cy, r, col, seed, n, a) {
    const R = rng(seed); ctx.save(); ctx.strokeStyle = rgba(col, a == null ? 0.5 : a); ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let ang = R() * TAU, x = cx + Math.cos(ang) * r * 0.25, y = cy + Math.sin(ang) * r * 0.25;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) { ang += (R() - 0.5) * 1.1; x += Math.cos(ang) * r * 0.2; y += Math.sin(ang) * r * 0.2; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  function speckles(ctx, cx, cy, r, col, seed, n, size) {
    const R = rng(seed); ctx.fillStyle = col;
    for (let i = 0; i < n; i++) { const a = R() * TAU, d = Math.sqrt(R()) * r; ell(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, (size || 1.6) * (0.5 + R()), (size || 1.6) * (0.5 + R())); ctx.fill(); }
  }
  function groundShadow(ctx, x, y, rx, ry, a) { ctx.save(); ctx.globalAlpha = a == null ? 0.35 : a; ctx.fillStyle = '#000'; ell(ctx, x, y, rx, ry); ctx.fill(); ctx.restore(); }

  Models.kit = { TAU, shade, rgba, mix, rng, ell, poly, glow, blobPath, volume, spec, stroke, wisps, eye, mouth, spike, stitches, veins, speckles, groundShadow, parse };

  // ====================================================================== CURSE ENEMIES
  const S = Models.enemies;
  const sin = Math.sin, cos = Math.cos;

  // --- Basic Curse: gelatinous grade-4 spirit
  S.wisp = function (ctx, d, ph) {
    const c = d.color, b = sin(ph) * 2;
    glow(ctx, 0, 2, 40, c, 0.35);
    wisps(ctx, 0, 6, 20, '#c8a0ff', ph, 5, 26);
    // dangling tails
    for (let i = 0; i < 3; i++) {
      const x = -10 + i * 10, w = sin(ph + i * 2.1) * 4, len = 22 + (i === 1 ? 8 : 0) + sin(ph + i) * 3;
      ctx.beginPath(); ctx.moveTo(x - 6, 10); ctx.quadraticCurveTo(x - 4 + w, 10 + len * 0.6, x + w * 1.4, 10 + len); ctx.quadraticCurveTo(x + 4 + w, 10 + len * 0.6, x + 6, 10); ctx.closePath();
      volume(ctx, shade(c, -0.15), x, 16, 14, { lw: 1.8 });
    }
    blobPath(ctx, 0, -4 + b, 23, 21 + sin(ph) * 1.2, { ph, amp: 0.06 }); volume(ctx, c, 0, -4 + b, 23);
    ctx.save(); blobPath(ctx, 0, -4 + b, 23, 21, { ph, amp: 0.06 }); ctx.clip();
    veins(ctx, 0, -4 + b, 24, '#2a0a50', 11, 6, 0.55);
    speckles(ctx, 0, -4 + b, 22, rgba('#2a0a50', 0.4), 7, 14, 1.7);
    ctx.restore();
    spec(ctx, -9, -16 + b, 9, 5, 0.5, -0.5);
    eye(ctx, -9, -8 + b, 7, '#ffd24a', { slit: true, lid: 0.35, glow: '#ffd24a' });
    eye(ctx, 9, -8 + b, 7, '#ffd24a', { slit: true, lid: 0.35, glow: '#ffd24a' });
    eye(ctx, 0, -19 + b, 3.4, '#ff5a8a', { slit: true, lid: 0.1 });
    mouth(ctx, 0, 5 + b, 20, 5 + sin(ph * 2) * 0.8, 7, { dark: '#12031c', inner: '#400a50', tongueCol: '#9a2a7a' });
  };

  // --- Fast Curse: spiked, multi-legged skitterer
  S.skitter = function (ctx, d, ph) {
    const c = d.color, dark = shade(c, -0.55);
    glow(ctx, 0, 0, 36, c, 0.25);
    // speed streaks
    ctx.save(); ctx.strokeStyle = rgba(c, 0.35); ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const y = -14 + i * 9; ctx.beginPath(); ctx.moveTo(-30 - i * 2, y); ctx.lineTo(-48, y + 1); ctx.stroke(); }
    ctx.restore();
    // legs: three per side, two jointed segments
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const step = sin(ph * 2 + i * 2.1 + (s > 0 ? 0 : Math.PI)), by = -6 + i * 10;
      const kx = s * (20 + 4 * step), ky = by - 7 - step * 3, fx = s * (31 + 3 * step), fy = by + 6 + step * 4;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = shade(c, -0.8); ctx.lineWidth = 5.2; ctx.beginPath(); ctx.moveTo(s * 8, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = shade(c, -0.25); ctx.lineWidth = 3.4; ctx.stroke();
      ctx.strokeStyle = shade(c, 0.3); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = shade(c, 0.2); ell(ctx, kx, ky, 2.4, 2.4); ctx.fill();
      spike(ctx, fx, fy, s > 0 ? 0.9 : Math.PI - 0.9, 7, 3.4, '#f4eee0');
    }
    // abdomen carapace with plates
    blobPath(ctx, 0, 6, 15, 22, { n: 18, amp: 0.04 }); volume(ctx, dark, 0, 6, 22, { hi: 0.7 });
    for (let i = 0; i < 4; i++) {
      const y = -2 + i * 8, w = 13 - i * 1.5;
      ctx.beginPath(); ctx.ellipse(0, y, w, 4.2, 0, Math.PI, TAU); ctx.fillStyle = shade(c, -0.15 - i * 0.08); ctx.fill(); stroke(ctx, shade(c, -0.8), 1.3);
      spike(ctx, -w * 0.7, y - 2, -Math.PI / 2 - 0.35, 6, 3.4, '#f4eee0'); spike(ctx, w * 0.7, y - 2, -Math.PI / 2 + 0.35, 6, 3.4, '#f4eee0');
    }
    // head
    blobPath(ctx, 0, -14, 14, 12, { n: 16, amp: 0.03 }); volume(ctx, c, 0, -14, 14);
    spike(ctx, -7, -22, -Math.PI / 2 - 0.5, 16, 4.5, '#2a1018'); spike(ctx, 7, -22, -Math.PI / 2 + 0.5, 16, 4.5, '#2a1018');
    eye(ctx, -6.5, -15, 4.6, '#ff2a2a', { slit: true, lid: 0.3, glow: '#ff3030', sclera: '#ffd8d0' });
    eye(ctx, 6.5, -15, 4.6, '#ff2a2a', { slit: true, lid: 0.3, glow: '#ff3030', sclera: '#ffd8d0' });
    eye(ctx, 0, -22, 2.4, '#ffd24a', { slit: true, lid: 0 });
    // mandibles
    const m = sin(ph * 2) * 1.5;
    spike(ctx, -4, -6, Math.PI / 2 + 0.7 + m * 0.05, 11, 3.8, '#f4eee0', { curve: 1 }); spike(ctx, 4, -6, Math.PI / 2 - 0.7 - m * 0.05, 11, 3.8, '#f4eee0', { curve: -1 });
    spec(ctx, -4, 0, 4, 9, 0.35, 0.1);
  };

  // --- Tank Curse: bloated brute with bone tusks and a stitched belly
  S.brute = function (ctx, d, ph) {
    const c = d.color, b = sin(ph) * 1.8;
    glow(ctx, 0, 0, 56, shade(c, 0.2), 0.2);
    groundShadow(ctx, 0, 40, 40, 8, 0.2);
    // arms
    for (const s of [-1, 1]) {
      const sw = sin(ph + (s > 0 ? Math.PI : 0)) * 3;
      ctx.beginPath(); ctx.moveTo(s * 22, -16); ctx.quadraticCurveTo(s * 46, -6 + sw, s * 42, 22 + sw); ctx.lineTo(s * 28, 26 + sw); ctx.quadraticCurveTo(s * 26, 4, s * 18, -4); ctx.closePath();
      volume(ctx, shade(c, -0.12), s * 36, 6, 24, { lw: 2.6 });
      ell(ctx, s * 38, 29 + sw, 12, 11); volume(ctx, shade(c, -0.08), s * 38, 29 + sw, 12);
      for (const k of [-1, 0, 1]) spike(ctx, s * 38 + k * 6, 36 + sw, Math.PI / 2 + k * 0.25, 7, 4, '#e8e0c8');
      spike(ctx, s * 38, -12, -Math.PI / 2 + s * 0.4, 13, 8, '#e8e0c8'); // shoulder spike
    }
    // body
    blobPath(ctx, 0, 2 + b * 0.5, 31, 34, { ph, amp: 0.035, n: 24 }); volume(ctx, c, 0, 2, 34);
    ctx.save(); blobPath(ctx, 0, 2 + b * 0.5, 31, 34, { ph, amp: 0.035, n: 24 }); ctx.clip();
    veins(ctx, 0, 4, 34, '#0a2a14', 21, 8, 0.5);
    speckles(ctx, 0, 4, 30, rgba('#0a2a14', 0.45), 4, 24, 2.2);
    speckles(ctx, -8, -14, 14, rgba('#a8e8b0', 0.2), 9, 10, 1.4);
    // belly seam
    stitches(ctx, -2, 12, 2, 34, 5, 4, '#10180f', 1.8);
    // moss/boil bumps
    for (const [x, y, r] of [[-18, -2, 4], [20, 8, 5], [-12, 20, 4.4], [14, -6, 3.2]]) { ell(ctx, x, y, r, r * 0.85); ctx.fillStyle = shade(c, 0.15); ctx.fill(); stroke(ctx, shade(c, -0.7), 1.2); spec(ctx, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.4, 0.5); }
    ctx.restore();
    spec(ctx, -14, -22, 14, 7, 0.4, -0.5);
    // face
    ctx.strokeStyle = '#0a1a10'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-23, -22); ctx.lineTo(-5, -15); ctx.moveTo(23, -22); ctx.lineTo(5, -15); ctx.stroke();
    eye(ctx, -12, -11, 7.2, '#ff4a2a', { slit: true, lid: 0.45, glow: '#ff5a2a', sclera: '#f0e8c0' });
    eye(ctx, 12, -11, 7.2, '#ff4a2a', { slit: true, lid: 0.45, glow: '#ff5a2a', sclera: '#f0e8c0' });
    mouth(ctx, 0, 8 + b * 0.4, 32, 8, 7, { dark: '#08120a', inner: '#3a1020', tongueCol: '#8a2a40', upper: 0.15 });
    spike(ctx, -12, 16, -Math.PI / 2 + 0.15, 11, 5.5, '#efe8d0'); spike(ctx, 12, 16, -Math.PI / 2 - 0.15, 11, 5.5, '#efe8d0'); // tusks
  };

  // --- Flying Curse: bat-winged wraith
  S.wraith = function (ctx, d, ph) {
    const c = d.color, fl = sin(ph), fl2 = sin(ph - 0.7);
    glow(ctx, 0, 0, 48, c, 0.3);
    wisps(ctx, 0, 14, 12, c, ph, 4, 28);
    // wings: bone fingers + scalloped membrane
    for (const s of [-1, 1]) {
      const tip = [s * 44, -20 - fl * 14], mid = [s * 36, -2 - fl * 9];
      ctx.beginPath(); ctx.moveTo(s * 8, -6);
      ctx.lineTo(tip[0], tip[1]);
      ctx.quadraticCurveTo(s * 34, tip[1] + 18, s * 38, 6 + fl2 * 7);
      ctx.quadraticCurveTo(s * 28, -2 + fl2 * 4, s * 24, 12 + fl2 * 4);
      ctx.quadraticCurveTo(s * 16, 2, s * 12, 14);
      ctx.quadraticCurveTo(s * 9, 6, s * 8, 8); ctx.closePath();
      const g = ctx.createLinearGradient(0, -20, s * 44, 10); g.addColorStop(0, shade(c, 0.3)); g.addColorStop(1, rgba(shade(c, -0.4), 0.55));
      ctx.fillStyle = g; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; stroke(ctx, shade(c, -0.8), 1.8);
      ctx.strokeStyle = shade(c, -0.6); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(s * 8, -6); ctx.lineTo(tip[0], tip[1]); ctx.moveTo(s * 8, -4); ctx.lineTo(mid[0], mid[1] + 6); ctx.moveTo(s * 8, -2); ctx.lineTo(s * 26, 10 + fl2 * 4); ctx.stroke();
      ctx.strokeStyle = shade(c, 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(s * 10, -7); ctx.lineTo(tip[0] - s * 2, tip[1] + 1); ctx.stroke();
      spike(ctx, tip[0], tip[1], s > 0 ? -1.0 - fl * 0.3 : Math.PI + 1.0 + fl * 0.3, 8, 3.4, '#e8f8f4');
    }
    // tail
    ctx.beginPath(); ctx.moveTo(-5, 14); ctx.quadraticCurveTo(-4 + sin(ph) * 5, 30, sin(ph) * 8, 40); ctx.quadraticCurveTo(5 + sin(ph) * 5, 30, 5, 14); ctx.closePath(); volume(ctx, shade(c, -0.15), 0, 24, 14, { lw: 1.8 });
    // body + skull face
    blobPath(ctx, 0, 0, 14, 19, { amp: 0.04, n: 18 }); volume(ctx, c, 0, 0, 19);
    ctx.fillStyle = '#e8faf6'; ell(ctx, 0, -5, 10.5, 11.5); ctx.fill(); stroke(ctx, shade(c, -0.8), 1.6);
    ctx.fillStyle = '#052420'; ell(ctx, -4.6, -6, 3.6, 4.6); ctx.fill(); ell(ctx, 4.6, -6, 3.6, 4.6); ctx.fill();
    glow(ctx, -4.6, -6, 8, '#5affea', 0.8); glow(ctx, 4.6, -6, 8, '#5affea', 0.8);
    ctx.fillStyle = '#052420'; poly(ctx, [[0, -1], [-1.8, 2.5], [1.8, 2.5]]); ctx.fill();
    ctx.strokeStyle = '#052420'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(i * 2.4, 5.5); ctx.lineTo(i * 2.4, 8.6); } ctx.stroke();
    spike(ctx, -8, -12, -Math.PI / 2 - 0.55, 9, 3.8, '#e8faf6'); spike(ctx, 8, -12, -Math.PI / 2 + 0.55, 9, 3.8, '#e8faf6');
  };

  // --- Armored Curse: bone-plated crustacean
  S.shell = function (ctx, d, ph) {
    const c = d.color, br = sin(ph) * 1;
    glow(ctx, 0, 0, 46, '#ffffff', 0.12);
    groundShadow(ctx, 0, 30, 32, 6, 0.2);
    // pincers
    for (const s of [-1, 1]) {
      const o = sin(ph * 1 + (s > 0 ? 1.5 : 0)) * 3;
      ctx.beginPath(); ctx.moveTo(s * 20, 4); ctx.quadraticCurveTo(s * 36, 0 + o, s * 40, 14 + o); ctx.lineTo(s * 34, 16 + o); ctx.quadraticCurveTo(s * 32, 8, s * 20, 12); ctx.closePath(); volume(ctx, shade(c, -0.25), s * 32, 10, 14, { lw: 2.2 });
      spike(ctx, s * 38, 14 + o, s > 0 ? 1.35 : Math.PI - 1.35, 13, 7, '#e8e8f0'); spike(ctx, s * 33, 14 + o, s > 0 ? 1.8 : Math.PI - 1.8, 10, 6, '#c8c8d4');
    }
    // carapace
    blobPath(ctx, 0, 0, 30, 27, { n: 22, amp: 0.02 }); volume(ctx, shade(c, -0.25), 0, 0, 30, { hi: 0.35, rim: '#cfe0ff', rimA: 0.3 });
    // scutes
    for (const [x, y, r, rot] of [[-14, -10, 9.5, 0.2], [0, -14, 10.5, 0], [14, -10, 9.5, -0.2], [-19, 5, 8.5, 0.4], [19, 5, 8.5, -0.4], [-9, 13, 8, 0.1], [9, 13, 8, -0.1]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; ctx.lineTo(cos(a) * r, sin(a) * r * 0.88); } ctx.closePath();
      const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, shade(c, 0.6)); g.addColorStop(0.5, c); g.addColorStop(1, shade(c, -0.5)); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = shade(c, -0.85); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(-r * 0.1, -r * 0.7); ctx.stroke();
      ctx.restore();
    }
    // spikes along the rim
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; spike(ctx, cos(a) * 28, sin(a) * 25, a, 8, 5, '#e6e6ee'); }
    // cracked gap with glowing core
    ctx.save(); ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-2, 6); ctx.lineTo(3, 10); ctx.lineTo(9, 5); ctx.lineTo(8, 22); ctx.lineTo(-7, 23); ctx.closePath(); ctx.fillStyle = '#1a0a2a'; ctx.fill(); ctx.clip();
    glow(ctx, 0, 14, 12, '#ff6aa8', 0.9);
    eye(ctx, -3.2, 14 + br, 3.6, '#ff5a8a', { slit: true, lid: 0.2 }); eye(ctx, 3.8, 14 + br, 3.6, '#ff5a8a', { slit: true, lid: 0.2 });
    ctx.restore();
    ctx.strokeStyle = '#10101c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-2, 6); ctx.lineTo(3, 10); ctx.lineTo(9, 5); ctx.stroke();
  };

  // --- Regenerating Curse: segmented lamprey-worm
  S.leech = function (ctx, d, ph) {
    const c = d.color;
    glow(ctx, 0, 0, 46, c, 0.25);
    // regen ring + plus signs
    ctx.save(); ctx.strokeStyle = rgba('#ffd0e4', 0.4); ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -ph * 6; ell(ctx, 0, 2, 40, 28); ctx.stroke(); ctx.restore();
    ctx.fillStyle = rgba('#ffe0ee', 0.8);
    for (let i = 0; i < 3; i++) { const y = 18 - ((ph / TAU + i / 3) % 1) * 40, x = -20 + i * 18; ctx.fillRect(x - 3, y - 0.8, 6, 1.6); ctx.fillRect(x - 0.8, y - 3, 1.6, 6); }
    // body segments (tail first)
    const N = 8, seg = [];
    for (let i = 0; i < N; i++) { const t = i / (N - 1); seg.push([-30 + t * 52, sin(ph - i * 0.7) * 6 + 2, 8.5 + t * 6.5]); }
    for (let i = 0; i < N; i++) {
      const [x, y, r] = seg[i];
      blobPath(ctx, x, y, r * 0.95, r, { n: 14, amp: 0.02 }); volume(ctx, shade(c, i % 2 ? 0 : -0.14), x, y, r);
      ctx.strokeStyle = rgba('#ffd0e4', 0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 1, y, r * 0.7, -1.2, 1.2); ctx.stroke();
      spec(ctx, x - r * 0.3, y - r * 0.5, r * 0.5, r * 0.25, 0.55, -0.4);
    }
    // sucker mouth at the head
    const [hx, hy, hr] = seg[N - 1];
    ctx.save(); ctx.translate(hx + hr * 0.6, hy);
    ell(ctx, 0, 0, hr * 0.62, hr * 0.8); ctx.fillStyle = '#2a0614'; ctx.fill(); stroke(ctx, '#12020a', 1.6);
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU + ring * 0.35, rr = hr * (0.5 - ring * 0.22); ctx.fillStyle = '#fff4e8'; ctx.beginPath(); ctx.moveTo(cos(a) * rr * 0.6, sin(a) * rr * 0.8); ctx.lineTo(cos(a) * rr * 0.1, sin(a) * rr * 0.1); ctx.lineTo(cos(a + 0.35) * rr * 0.6, sin(a + 0.35) * rr * 0.8); ctx.fill(); }
    ctx.restore();
    eye(ctx, hx - hr * 0.25, hy - hr * 0.78, 3.6, '#ff3a6a', { slit: true, lid: 0.2, glow: '#ff3a6a' });
    eye(ctx, hx - hr * 0.25, hy + hr * 0.78, 3.6, '#ff3a6a', { slit: true, lid: 0.2, glow: '#ff3a6a' });
  };

  // --- Shielded Curse: small spirit inside a hexagonal barrier
  S.aegis = function (ctx, d, ph) {
    const c = d.color;
    glow(ctx, 0, 0, 48, '#8ad8ff', 0.3);
    // jelly core with tentacles
    for (let i = 0; i < 4; i++) { const x = -9 + i * 6; ctx.beginPath(); ctx.moveTo(x - 2, 8); ctx.quadraticCurveTo(x + sin(ph + i * 1.4) * 5, 18, x + sin(ph + i) * 6, 26); ctx.lineWidth = 3; ctx.strokeStyle = shade(c, -0.1); ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = shade(c, 0.6); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-18, 6); ctx.bezierCurveTo(-20, -20, 20, -20, 18, 6); ctx.quadraticCurveTo(0, 12 + sin(ph * 2), -18, 6); ctx.closePath(); volume(ctx, c, 0, -4, 20, { hi: 0.65 });
    spec(ctx, -7, -12, 8, 4, 0.55, -0.4);
    eye(ctx, -6.5, -3, 5.4, '#2a7aff', { lid: 0.2, glow: '#6ab8ff' }); eye(ctx, 6.5, -3, 5.4, '#2a7aff', { lid: 0.2, glow: '#6ab8ff' });
    // hex barrier
    ctx.save(); ctx.rotate(ph * 0 + sin(ph) * 0.06);
    const R = 31;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; ctx.lineTo(cos(a) * R, sin(a) * R); } ctx.closePath();
    const bg = ctx.createRadialGradient(-8, -10, 4, 0, 0, R * 1.1); bg.addColorStop(0, 'rgba(180,230,255,.28)'); bg.addColorStop(1, 'rgba(60,140,255,.1)'); ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = '#a8e4ff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; ctx.lineTo(cos(a) * (R - 5), sin(a) * (R - 5)); } ctx.closePath(); ctx.stroke();
    // inner hex lattice
    ctx.strokeStyle = 'rgba(160,220,255,.22)'; ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cos(a) * R, sin(a) * R); ctx.stroke(); }
    // rotating node lights
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; glow(ctx, cos(a) * R, sin(a) * R, 7, '#c8f0ff', 0.5 + 0.4 * sin(ph + k)); ctx.fillStyle = '#eafaff'; ell(ctx, cos(a) * R, sin(a) * R, 2.2, 2.2); ctx.fill(); }
    // sweeping glint
    ctx.save(); ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; ctx.lineTo(cos(a) * R, sin(a) * R); } ctx.closePath(); ctx.clip();
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.translate(-R * 1.5 + ((ph / TAU) % 1) * R * 3, 0); ctx.rotate(0.6); ctx.fillRect(-4, -R * 2, 7, R * 4); ctx.restore();
    ctx.restore();
  };

  // --- Split Curse: two fused bodies about to separate
  S.twin = function (ctx, d, ph) {
    const c = d.color;
    glow(ctx, 0, 0, 46, c, 0.25);
    const y1 = sin(ph) * 2.2, y2 = cos(ph) * 2.2;
    // bridge of flesh
    ctx.beginPath(); ctx.moveTo(-8, -8 + y1); ctx.quadraticCurveTo(0, -2, 8, -8 + y2); ctx.lineTo(8, 12 + y2); ctx.quadraticCurveTo(0, 6, -8, 12 + y1); ctx.closePath(); volume(ctx, shade(c, -0.25), 0, 2, 14, { lw: 2 });
    blobPath(ctx, -12, y1, 17, 18, { ph, amp: 0.05 }); volume(ctx, c, -12, y1, 18);
    blobPath(ctx, 12, y2, 17, 18, { ph: ph + 1, amp: 0.05 }); volume(ctx, shade(c, 0.1), 12, y2, 18);
    // glowing seam
    ctx.save(); ctx.strokeStyle = rgba('#fff2a0', 0.8); ctx.lineWidth = 1.8; ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(1.5, -4); ctx.lineTo(-1.5, 4); ctx.lineTo(0.5, 12); ctx.stroke(); ctx.restore();
    // ridges / spots
    for (const [cx, cy] of [[-12, y1], [12, y2]]) { speckles(ctx, cx, cy, 15, rgba('#5a2a00', 0.35), cx + 9, 10, 1.6); }
    for (let i = -1; i <= 1; i++) { spike(ctx, -12 + i * 8, -15 + y1, -Math.PI / 2 + i * 0.35, 8, 4.5, '#ffe6a8'); spike(ctx, 12 + i * 8, -15 + y2, -Math.PI / 2 + i * 0.35, 8, 4.5, '#ffe6a8'); }
    eye(ctx, -17, -4 + y1, 4.4, '#7a1a00', { slit: true, lid: 0.3, glow: '#ff8a2a' }); eye(ctx, -7, -4 + y1, 4.4, '#7a1a00', { slit: true, lid: 0.3, glow: '#ff8a2a' });
    eye(ctx, 7, -4 + y2, 4.4, '#7a1a00', { slit: true, lid: 0.3, glow: '#ff8a2a' }); eye(ctx, 17, -4 + y2, 4.4, '#7a1a00', { slit: true, lid: 0.3, glow: '#ff8a2a' });
    mouth(ctx, -12, 6 + y1, 13, 3.4, 5, { dark: '#240a00', inner: '#5a2000', tongue: false });
    mouth(ctx, 12, 6 + y2, 13, 3.4, 5, { dark: '#240a00', inner: '#5a2000', tongue: false });
  };

  // --- Mite: tiny fragment
  S.mite = function (ctx, d, ph) {
    const c = d.color || '#e0c070';
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const st = sin(ph * 2 + i * 2 + (s > 0 ? 0 : 3)); ctx.strokeStyle = shade(c, -0.7); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 5, -2 + i * 7); ctx.lineTo(s * (11 + st * 2), -4 + i * 7 + st * 2); ctx.stroke(); }
    blobPath(ctx, 0, sin(ph) * 1.2, 12, 11, { ph, amp: 0.05, n: 14 }); volume(ctx, c, 0, 0, 12, { lw: 2 });
    spec(ctx, -4, -5, 4.5, 2.5, 0.55, -0.4);
    spike(ctx, -5, -8, -Math.PI / 2 - 0.4, 6, 3.2, '#fff0c0'); spike(ctx, 5, -8, -Math.PI / 2 + 0.4, 6, 3.2, '#fff0c0');
    eye(ctx, -4, -1, 3.4, '#6a2a00', { slit: true, lid: 0.2 }); eye(ctx, 4, -1, 3.4, '#6a2a00', { slit: true, lid: 0.2 });
    mouth(ctx, 0, 5, 7, 2, 4, { tongue: false, dark: '#200a00', inner: '#4a1a00' });
  };

  // --- Curse User: robed hexer with a spinning sigil
  S.hexer = function (ctx, d, ph) {
    const c = d.color, fl = sin(ph);
    glow(ctx, 0, 0, 50, c, 0.3);
    // sigil above
    ctx.save(); ctx.translate(0, -36 + fl * 2); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#ff6ad8', 0.85); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
    ctx.save(); ctx.rotate(ph); ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = k * TAU / 3 - Math.PI / 2; ctx.lineTo(cos(a) * 9, sin(a) * 9); } ctx.closePath(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.rotate(-ph); ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + Math.PI / 2; ctx.lineTo(cos(a) * 9, sin(a) * 9); } ctx.closePath(); ctx.stroke(); ctx.restore();
    ctx.restore(); glow(ctx, 0, -36 + fl * 2, 16, '#ff5ad0', 0.5);
    // tattered robe
    ctx.beginPath(); ctx.moveTo(-14, -22); ctx.quadraticCurveTo(-30, 0, -26, 26);
    for (let i = 0; i <= 6; i++) { const x = -26 + i * (52 / 6), y = 28 + (i % 2 ? 7 : 0) + sin(ph + i * 1.2) * 3; ctx.lineTo(x, y); }
    ctx.quadraticCurveTo(30, 0, 14, -22); ctx.quadraticCurveTo(0, -30, -14, -22); ctx.closePath();
    volume(ctx, shade(c, -0.55), 0, 4, 34, { hi: 0.35, rim: c, rimA: 0.3 });
    ctx.save(); ctx.clip(); ctx.strokeStyle = rgba(c, 0.35); ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 8, -10); ctx.quadraticCurveTo(i * 11, 10, i * 9 + sin(ph + i) * 2, 30); ctx.stroke(); }
    ctx.restore();
    // collar + trim
    ctx.strokeStyle = '#ff6ad8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, -20); ctx.quadraticCurveTo(0, -6, 15, -20); ctx.stroke();
    // hands holding hex orbs
    for (const s of [-1, 1]) { const hy = 6 + sin(ph + s) * 3; ctx.fillStyle = '#d8c0c8'; ell(ctx, s * 27, hy, 4.5, 3.6); ctx.fill(); stroke(ctx, '#2a1020', 1.3); glow(ctx, s * 31, hy - 7, 12, '#ff5ad0', 0.7); ctx.fillStyle = '#ffd0f4'; ell(ctx, s * 31, hy - 7, 3.2, 3.2); ctx.fill(); }
    // hood + mask
    ctx.beginPath(); ctx.moveTo(-17, -4); ctx.quadraticCurveTo(-20, -30, 0, -32); ctx.quadraticCurveTo(20, -30, 17, -4); ctx.quadraticCurveTo(0, 4, -17, -4); ctx.closePath(); volume(ctx, shade(c, -0.45), 0, -16, 20, { hi: 0.4 });
    ctx.fillStyle = '#05030a'; ell(ctx, 0, -14, 11.5, 13.5); ctx.fill();
    ctx.fillStyle = '#f0e8f0'; ctx.beginPath(); ctx.moveTo(-9, -24); ctx.quadraticCurveTo(0, -30, 9, -24); ctx.quadraticCurveTo(10, -10, 0, -3); ctx.quadraticCurveTo(-10, -10, -9, -24); ctx.fill(); stroke(ctx, '#2a1020', 1.4);
    ctx.fillStyle = '#05030a'; ell(ctx, -4.2, -15, 2.6, 4); ctx.fill(); ell(ctx, 4.2, -15, 2.6, 4); ctx.fill();
    glow(ctx, -4.2, -15, 8, '#ff3ac8', 0.9); glow(ctx, 4.2, -15, 8, '#ff3ac8', 0.9);
    ctx.strokeStyle = '#c8203a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-6, -23); ctx.lineTo(-3, -17); ctx.moveTo(6, -23); ctx.lineTo(3, -17); ctx.moveTo(0, -21); ctx.lineTo(0, -8); ctx.stroke();
  };

  // --- Mahito's stitched clone (Split form)
  S.mahitoClone = function (ctx, d, ph) {
    const c = '#8aa0b8';
    glow(ctx, 0, 0, 40, '#c8a0ff', 0.25);
    wisps(ctx, 0, 14, 18, '#c8a0ff', ph, 4, 24);
    ctx.beginPath(); ctx.moveTo(-14, 26); ctx.quadraticCurveTo(-18, 2, -10, -2); ctx.lineTo(10, -2); ctx.quadraticCurveTo(18, 2, 14, 26); ctx.closePath(); volume(ctx, c, 0, 10, 20, { lw: 2.2 });
    stitches(ctx, -10, 6, 8, 18, 5, 3.4, '#1c2434', 1.4);
    for (const s of [-1, 1]) { const sw = sin(ph + s) * 3; ctx.beginPath(); ctx.moveTo(s * 12, 0); ctx.quadraticCurveTo(s * 26, 8 + sw, s * 24, 22 + sw); ctx.lineWidth = 6; ctx.strokeStyle = shade(c, -0.55); ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 3.8; ctx.strokeStyle = c; ctx.stroke(); }
    spike(ctx, 24, 22 + sin(ph - 1) * 3, 0.35, 16, 5, '#d8e4f0');
    blobPath(ctx, 0, -14, 15, 16, { n: 16, amp: 0.02 }); volume(ctx, '#9cb2c8', 0, -14, 16);
    // patchwork hair
    ctx.beginPath(); ctx.moveTo(-16, -14); ctx.quadraticCurveTo(-18, -34, 0, -33); ctx.quadraticCurveTo(18, -34, 16, -14); ctx.quadraticCurveTo(8, -24, 0, -22); ctx.quadraticCurveTo(-8, -24, -16, -14); ctx.closePath(); volume(ctx, '#3a4a68', 0, -26, 14, { lw: 1.8 });
    stitches(ctx, -3, -33, -1, -23, 3, 3, '#aab8d0', 1.1);
    stitches(ctx, 12, -20, 12, -8, 3, 3, '#1c2434', 1.2);
    eye(ctx, -6, -14, 4.2, '#c8a020', { lid: 0.2, sclera: '#e8e4d0', look: 1 }); eye(ctx, 6, -14, 4.2, '#c8a020', { lid: 0.2, sclera: '#e8e4d0', look: 1 });
    mouth(ctx, 0, -5, 14, 4.4, 6, { dark: '#10101c', inner: '#403050', tongueCol: '#9a4070' });
  };
})(typeof window !== 'undefined' ? window : globalThis);
