/* Procedural art. Everything here is generated at runtime (no ripped assets). Each public function checks for a replacement
   image listed in assets/manifest.json first, so real art can be dropped in without touching game code. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util } = JJK;
  const TAU = Math.PI * 2;

  const Art = { overrides: { characters: {}, enemies: {}, backgrounds: {}, ui: {} }, _cache: {} };

  function mkCanvas(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function shade(hex, amt) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; } else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  Art.shade = shade;

  // ------------------------------------------------------------------ replacement-asset loader
  Art.loadManifest = function (url) {
    if (typeof fetch === 'undefined') return Promise.resolve(false);
    return fetch(url || 'assets/manifest.json').then((r) => (r.ok ? r.json() : null)).then((m) => {
      if (!m || typeof m !== 'object') return false;
      const jobs = [];
      for (const kind of ['characters', 'enemies', 'backgrounds', 'ui']) {
        const src = m[kind];
        if (!src || typeof src !== 'object') continue;
        for (const id of Object.keys(src)) {
          jobs.push(new Promise((res) => {
            const img = new Image();
            img.onload = () => { Art.overrides[kind][id] = img; Art._cache = {}; res(); };
            img.onerror = () => res(); // a missing replacement file silently falls back to procedural art
            img.src = 'assets/' + String(src[id]).replace(/^\/+/, '');
          }));
        }
      }
      return Promise.all(jobs).then(() => true);
    }).catch(() => false);
  };

  // ------------------------------------------------------------------ chibi portraits
  function path(ctx, pts, close) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close !== false) ctx.closePath(); }
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }

  function hairBack(ctx, a) {
    const hc = a.hair, st = a.hairStyle;
    ctx.fillStyle = shade(hc, -0.25);
    if (st === 'long') { ctx.beginPath(); ctx.moveTo(24, 52); ctx.quadraticCurveTo(12, 100, 26, 118); ctx.lineTo(74, 118); ctx.quadraticCurveTo(88, 100, 76, 52); ctx.closePath(); ctx.fill(); }
    else if (st === 'ponytail') { ctx.beginPath(); ctx.moveTo(70, 36); ctx.quadraticCurveTo(100, 40, 92, 92); ctx.quadraticCurveTo(82, 62, 66, 52); ctx.closePath(); ctx.fill(); }
    else if (st === 'topknot') { ell(ctx, 50, 12, 12, 11); ctx.fill(); }
    else if (st === 'halfup') { ctx.beginPath(); ctx.moveTo(22, 50); ctx.quadraticCurveTo(10, 96, 24, 112); ctx.lineTo(76, 112); ctx.quadraticCurveTo(90, 96, 78, 50); ctx.closePath(); ctx.fill(); ell(ctx, 50, 8, 13, 12); ctx.fill(); }
    else if (st === 'bob') { ctx.beginPath(); ctx.moveTo(22, 40); ctx.quadraticCurveTo(14, 78, 30, 82); ctx.lineTo(70, 82); ctx.quadraticCurveTo(86, 78, 78, 40); ctx.closePath(); ctx.fill(); }
    else if (st === 'panda') { ell(ctx, 26, 20, 11, 11); ctx.fillStyle = '#1a1a1a'; ctx.fill(); ell(ctx, 74, 20, 11, 11); ctx.fill(); }
  }
  function hairFront(ctx, a) {
    const hc = a.hair, st = a.hairStyle;
    ctx.fillStyle = hc;
    const cap = () => { ctx.beginPath(); ctx.moveTo(20, 56); ctx.bezierCurveTo(16, 18, 40, 8, 50, 8); ctx.bezierCurveTo(60, 8, 84, 18, 80, 56); ctx.lineTo(74, 44); ctx.quadraticCurveTo(50, 26, 26, 44); ctx.closePath(); ctx.fill(); };
    if (st === 'spiky') {
      path(ctx, [[18, 58], [14, 34], [24, 38], [22, 14], [36, 28], [42, 4], [52, 24], [64, 6], [66, 28], [80, 14], [78, 38], [88, 32], [82, 58], [74, 44], [64, 34], [50, 38], [36, 34], [26, 44]]); ctx.fill();
    } else if (st === 'bob') { cap(); ctx.beginPath(); ctx.moveTo(20, 50); ctx.quadraticCurveTo(14, 70, 24, 78); ctx.lineTo(30, 56); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(80, 50); ctx.quadraticCurveTo(86, 70, 76, 78); ctx.lineTo(70, 56); ctx.closePath(); ctx.fill(); }
    else if (st === 'ponytail') { cap(); path(ctx, [[30, 40], [40, 30], [50, 44], [36, 50]]); ctx.fill(); }
    else if (st === 'slick') { ctx.beginPath(); ctx.moveTo(19, 56); ctx.bezierCurveTo(14, 14, 44, 2, 56, 6); ctx.bezierCurveTo(78, 10, 88, 28, 81, 56); ctx.lineTo(74, 40); ctx.quadraticCurveTo(52, 22, 28, 38); ctx.closePath(); ctx.fill(); }
    else if (st === 'long') { cap(); ctx.beginPath(); ctx.moveTo(20, 46); ctx.quadraticCurveTo(10, 90, 20, 112); ctx.lineTo(30, 100); ctx.lineTo(27, 52); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(80, 46); ctx.quadraticCurveTo(90, 90, 80, 112); ctx.lineTo(70, 100); ctx.lineTo(73, 52); ctx.closePath(); ctx.fill(); }
    else if (st === 'topknot') { cap(); }
    else if (st === 'halfup') { cap(); ctx.beginPath(); ctx.moveTo(20, 46); ctx.quadraticCurveTo(12, 80, 22, 96); ctx.lineTo(30, 86); ctx.lineTo(27, 52); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(80, 46); ctx.quadraticCurveTo(88, 80, 78, 96); ctx.lineTo(70, 86); ctx.lineTo(73, 52); ctx.closePath(); ctx.fill(); ctx.fillStyle = shade(hc, 0.2); ell(ctx, 50, 8, 13, 12); ctx.fill(); ctx.strokeStyle = shade(hc, -0.5); ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = hc; }
    else if (st === 'pompadour') { ctx.beginPath(); ctx.moveTo(19, 56); ctx.bezierCurveTo(10, 4, 44, -6, 60, 2); ctx.bezierCurveTo(88, 6, 90, 34, 81, 56); ctx.lineTo(74, 42); ctx.quadraticCurveTo(52, 20, 28, 42); ctx.closePath(); ctx.fill(); }
    else if (st === 'short') { cap(); }
    else if (st === 'panda') { /* bald: ears drawn behind */ }
    else cap();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    if (st !== 'panda') { ctx.beginPath(); ctx.ellipse(40, 20, 12, 4, -0.5, 0, TAU); ctx.fill(); }
  }
  function eyes(ctx, a, def) {
    const blind = a.acc === 'blindfold', shades = a.acc === 'shades';
    for (const sx of [-1, 1]) {
      const cx = 50 + sx * 15, cy = 62;
      if (blind || shades) continue;
      ctx.fillStyle = '#fff'; ell(ctx, cx, cy, 8.5, 10); ctx.fill();
      const g = ctx.createLinearGradient(0, cy - 9, 0, cy + 10); g.addColorStop(0, shade(a.eye, -0.4)); g.addColorStop(0.55, a.eye); g.addColorStop(1, shade(a.eye, 0.35));
      ctx.fillStyle = g; ell(ctx, cx + sx * -0.5, cy + 1, 6.4, 8.6); ctx.fill();
      ctx.fillStyle = '#10101c'; ell(ctx, cx - sx * 0.5, cy + 1.5, 3.2, 4.6); ctx.fill();
      ctx.fillStyle = '#fff'; ell(ctx, cx + 2, cy - 3, 2.2, 2.6); ctx.fill(); ell(ctx, cx - 2.5, cy + 4, 1.1, 1.2); ctx.fill();
      ctx.strokeStyle = '#1a1220'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 9, cy - 8); ctx.quadraticCurveTo(cx, cy - 13, cx + 9, cy - 8); ctx.stroke();
    }
    // brows
    ctx.strokeStyle = shade(a.hair, -0.2); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    if (!blind) for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(50 + sx * 8, 50); ctx.lineTo(50 + sx * 22, 49 + sx * 1.5); ctx.stroke(); }
  }
  function accessoriesFront(ctx, a, def) {
    const acc = a.acc;
    if (acc === 'glasses') { ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 2; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(50 + sx * 15 - 11, 51, 22, 20, 5) : ctx.rect(50 + sx * 15 - 11, 51, 22, 20); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(46, 60); ctx.lineTo(54, 60); ctx.stroke(); ctx.fillStyle = 'rgba(180,220,255,.15)'; ctx.fillRect(25, 52, 20, 18); ctx.fillRect(55, 52, 20, 18); }
    else if (acc === 'mask') { ctx.fillStyle = '#2a2740'; ctx.beginPath(); ctx.moveTo(30, 74); ctx.quadraticCurveTo(50, 70, 70, 74); ctx.lineTo(68, 94); ctx.quadraticCurveTo(50, 104, 32, 94); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5cd0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(40, 80); ctx.lineTo(42, 90); ctx.moveTo(50, 80); ctx.lineTo(50, 92); ctx.moveTo(60, 80); ctx.lineTo(58, 90); ctx.stroke(); }
    else if (acc === 'blindfold') { ctx.fillStyle = '#12121c'; ctx.beginPath(); ctx.moveTo(18, 50); ctx.lineTo(82, 50); ctx.lineTo(82, 70); ctx.lineTo(18, 70); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(111,200,255,.25)'; ctx.fillRect(18, 50, 64, 3); }
    else if (acc === 'shades') { ctx.fillStyle = '#12101c'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(50 + sx * 15, 61, 11, 8, 0, 0, TAU); ctx.fill(); } ctx.fillRect(40, 58, 20, 3); ctx.fillStyle = 'rgba(255,120,220,.5)'; ctx.fillRect(29, 56, 8, 2); ctx.fillRect(59, 56, 8, 2); }
    else if (acc === 'scar') { ctx.strokeStyle = '#a05a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(32, 66); ctx.lineTo(46, 80); ctx.moveTo(34, 78); ctx.lineTo(44, 68); ctx.stroke(); }
    else if (acc === 'scarlip') { ctx.strokeStyle = '#a05a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(62, 86); ctx.lineTo(70, 94); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(60, 88); ctx.lineTo(68, 96); ctx.stroke(); }
    else if (acc === 'cheek') { ctx.strokeStyle = '#6a2020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, 72); ctx.quadraticCurveTo(40, 76, 48, 72); ctx.moveTo(52, 72); ctx.quadraticCurveTo(60, 76, 70, 72); ctx.stroke(); }
    else if (acc === 'hairpin') { ctx.fillStyle = '#ffd24a'; ell(ctx, 28, 28, 4, 2.5); ctx.fill(); ctx.fillRect(22, 26, 12, 2); }
    else if (acc === 'hood') { ctx.fillStyle = shade(a.trim, -0.1); ctx.beginPath(); ctx.moveTo(26, 112); ctx.quadraticCurveTo(50, 94, 74, 112); ctx.lineTo(70, 120); ctx.lineTo(30, 120); ctx.closePath(); ctx.fill(); }
    else if (acc === 'crow') { ctx.fillStyle = '#10141f'; ell(ctx, 86, 78, 7, 5); ctx.fill(); ell(ctx, 91, 74, 3.5, 3); ctx.fill(); ctx.fillStyle = '#ffb23f'; ctx.beginPath(); ctx.moveTo(94, 74); ctx.lineTo(99, 75); ctx.lineTo(94, 77); ctx.fill(); }
    else if (acc === 'earring') { ctx.fillStyle = '#ffd24a'; ell(ctx, 19, 74, 2.6, 2.6); ctx.fill(); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(19, 76); ctx.lineTo(19, 84); ctx.stroke(); ctx.fillStyle = '#c63a46'; ell(ctx, 19, 86, 2.6, 3.4); ctx.fill(); }
    else if (acc === 'star') { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(70 + Math.cos(a) * r, 30 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 1; ctx.stroke(); }
    else if (acc === 'frost') { ctx.strokeStyle = '#8ad8ff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(30, 74); ctx.lineTo(38, 80); ctx.moveTo(30, 80); ctx.lineTo(38, 74); ctx.moveTo(34, 72); ctx.lineTo(34, 82); ctx.moveTo(62, 74); ctx.lineTo(70, 80); ctx.moveTo(62, 80); ctx.lineTo(70, 74); ctx.moveTo(66, 72); ctx.lineTo(66, 82); ctx.stroke(); ctx.fillStyle = '#d8f4ff'; ctx.beginPath(); ctx.moveTo(78, 24); ctx.lineTo(82, 14); ctx.lineTo(86, 24); ctx.lineTo(82, 34); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#5ab0e0'; ctx.stroke(); }
    else if (acc === 'sword') { ctx.strokeStyle = '#d9dff0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(86, 120); ctx.lineTo(96, 84); ctx.stroke(); ctx.strokeStyle = '#c63a46'; ctx.beginPath(); ctx.moveTo(84, 108); ctx.lineTo(92, 112); ctx.stroke(); }
  }

  function drawPortrait(ctx, def, W, H) {
    const a = def.art;
    const rc = JJK.Balance.rarity[def.rarity].color;
    // background
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.42, 4, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    bg.addColorStop(0, shade(def.color, 0.15)); bg.addColorStop(0.5, shade(def.color, -0.55)); bg.addColorStop(1, '#07060f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.16; ctx.strokeStyle = def.color; ctx.lineWidth = 2;
    const rng = Util.makeRng(Util.hashString(def.id));
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(rng.range(0, W), rng.range(0, H * 0.7), rng.range(14, 50), rng.range(0, TAU), rng.range(0, TAU) + 2.5); ctx.stroke(); }
    ctx.restore();
    // figure in a 100x120 box, centred
    const s = Math.min(W / 100, H / 118);
    ctx.save();
    ctx.translate((W - 100 * s) / 2, H - 120 * s + 4 * s); ctx.scale(s, s);
    // body
    ctx.fillStyle = a.outfit; ctx.beginPath(); ctx.moveTo(8, 124); ctx.quadraticCurveTo(10, 98, 32, 94); ctx.lineTo(68, 94); ctx.quadraticCurveTo(90, 98, 92, 124); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(a.outfit, 0.12); ctx.beginPath(); ctx.moveTo(30, 94); ctx.lineTo(50, 112); ctx.lineTo(70, 94); ctx.lineTo(64, 94); ctx.lineTo(50, 106); ctx.lineTo(36, 94); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = a.trim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(32, 94); ctx.lineTo(50, 114); ctx.lineTo(68, 94); ctx.stroke();
    ctx.fillStyle = a.trim; for (const y of [102, 110]) { ell(ctx, 50, y, 2, 2); ctx.fill(); }
    // neck
    ctx.fillStyle = shade(a.skin, -0.12); ctx.fillRect(43, 84, 14, 14);
    hairBack(ctx, a);
    // ears
    ctx.fillStyle = a.skin; ell(ctx, 19, 64, 4.5, 7); ctx.fill(); ell(ctx, 81, 64, 4.5, 7); ctx.fill();
    // head
    const hg = ctx.createLinearGradient(0, 28, 0, 96); hg.addColorStop(0, a.skin); hg.addColorStop(1, shade(a.skin, -0.1));
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(20, 56); ctx.bezierCurveTo(20, 30, 80, 30, 80, 56); ctx.bezierCurveTo(82, 82, 66, 98, 50, 98); ctx.bezierCurveTo(34, 98, 18, 82, 20, 56); ctx.fill();
    if (a.hairStyle === 'panda') { ctx.fillStyle = '#1a1a1a'; ctx.save(); ctx.translate(0, 0); ell(ctx, 35, 62, 9, 12); ctx.fill(); ell(ctx, 65, 62, 9, 12); ctx.fill(); ctx.restore(); ctx.fillStyle = '#1a1a1a'; ell(ctx, 50, 78, 5, 3.5); ctx.fill(); }
    // blush + mouth
    ctx.fillStyle = 'rgba(255,120,120,.18)'; ell(ctx, 32, 78, 6, 3.5); ctx.fill(); ell(ctx, 68, 78, 6, 3.5); ctx.fill();
    if (a.acc !== 'mask') { ctx.strokeStyle = '#6a3a3a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(44, 86); ctx.quadraticCurveTo(50, 90, 56, 86); ctx.stroke(); }
    eyes(ctx, a, def);
    hairFront(ctx, a);
    accessoriesFront(ctx, a, def);
    ctx.restore();
    // frame glow by rarity
    const vg = ctx.createLinearGradient(0, H * 0.6, 0, H); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = rc; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2); ctx.globalAlpha = 1;
  }

  /** Canvas (or replacement Image) for a character portrait. */
  Art.portrait = function (id, w, h) {
    const ov = Art.overrides.characters[id];
    if (ov) return ov;
    if (Art.cutoutPortrait) { const cp = Art.cutoutPortrait(id, w || 200, h || 200); if (cp) return cp; }
    const key = 'p:' + id + ':' + (w || 200) + 'x' + (h || 200);
    if (Art._cache[key]) return Art._cache[key];
    const def = JJK.Characters[id];
    const c = mkCanvas(w || 200, h || 200);
    if (!c || !def) return c;
    drawPortrait(c.getContext('2d'), def, c.width, c.height);
    Art._cache[key] = c;
    return c;
  };
  Art.portraitURL = function (id, w, h) {
    const key = 'pu:' + id + ':' + (w || 200) + 'x' + (h || 200);
    if (Art._cache[key]) return Art._cache[key];
    const src = Art.portrait(id, w, h);
    let url = '';
    try { url = src instanceof HTMLImageElement ? src.src : src.toDataURL('image/png'); } catch (e) { url = ''; }
    Art._cache[key] = url;
    return url;
  };
  /** A ready-to-insert <img>. */
  Art.portraitImg = function (id, cls, w, h) {
    const img = new Image(); img.className = 'port' + (cls ? ' ' + cls : ''); img.alt = (JJK.Characters[id] || {}).name || id; img.draggable = false;
    img.src = Art.portraitURL(id, w, h); return img;
  };
  /** Round battlefield token for a unit. */
  Art.token = function (id, px) {
    const key = 'tk:' + id + ':' + px;
    if (Art._cache[key]) return Art._cache[key];
    const c = mkCanvas(px, px), ctx = c.getContext('2d'), def = JJK.Characters[id];
    const rc = JJK.Balance.rarity[def.rarity].color;
    ctx.save(); ctx.beginPath(); ctx.arc(px / 2, px / 2, px / 2 - 3, 0, TAU); ctx.clip();
    const p = Art.portrait(id, 200, 200);
    if (p instanceof HTMLImageElement) { const iw = p.naturalWidth || p.width, ih = p.naturalHeight || p.height; ctx.fillStyle = shade(def.color || '#555', -0.55); ctx.fillRect(0, 0, px, px); ctx.drawImage(p, iw * 0.06, ih * 0.02, iw * 0.88, ih * 0.88, 0, 0, px, px); } // replacement art: slight zoom on the face
    else ctx.drawImage(p, 0, 0, 200, 200, 0, 0, px, px);
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = rc; ctx.beginPath(); ctx.arc(px / 2, px / 2, px / 2 - 2, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#000a'; ctx.beginPath(); ctx.arc(px / 2, px / 2, px / 2 - 4.5, 0, TAU); ctx.stroke();
    Art._cache[key] = c;
    return c;
  };

  // ------------------------------------------------------------------ enemy sprites (4-frame cache)
  function eye(ctx, x, y, r, col) {
    ctx.fillStyle = '#fff'; ell(ctx, x, y, r, r * 1.15); ctx.fill();
    ctx.fillStyle = col || '#1a0a28'; ell(ctx, x + r * 0.15, y + r * 0.1, r * 0.55, r * 0.75); ctx.fill();
    ctx.fillStyle = '#fff'; ell(ctx, x + r * 0.35, y - r * 0.2, r * 0.18, r * 0.2); ctx.fill();
  }
  function blob(ctx, cx, cy, rx, ry, col, wob) {
    const g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, 2, cx, cy, Math.max(rx, ry) * 1.1);
    g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.45));
    ctx.fillStyle = g; ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU, w = 1 + Math.sin(a * 3 + wob) * 0.07;
      const x = cx + Math.cos(a) * rx * w, y = cy + Math.sin(a) * ry * w;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(col, -0.6); ctx.lineWidth = 2; ctx.stroke();
  }
  function teeth(ctx, x, y, w, n) { ctx.fillStyle = '#fff'; for (let i = 0; i < n; i++) { const tx = x - w / 2 + (i + 0.5) * (w / n); ctx.beginPath(); ctx.moveTo(tx - w / n / 2, y); ctx.lineTo(tx, y + 6); ctx.lineTo(tx + w / n / 2, y); ctx.fill(); } }

  const SPR = {
    wisp(ctx, d, f, ph) { const c = d.color; blob(ctx, 0, -4 + Math.sin(ph) * 2, 22, 20 + Math.sin(ph) * 1.5, c, ph); ctx.fillStyle = shade(c, -0.2); ctx.beginPath(); ctx.moveTo(-10, 12); ctx.quadraticCurveTo(-4, 30, 0, 22 + Math.sin(ph) * 4); ctx.quadraticCurveTo(6, 30, 12, 12); ctx.fill(); eye(ctx, -8, -8, 6.5); eye(ctx, 8, -8, 6.5); ctx.strokeStyle = '#1a0a28'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 4, 6, 0.2, Math.PI - 0.2); ctx.stroke(); },
    skitter(ctx, d, f, ph) { const c = d.color; ctx.strokeStyle = shade(c, -0.5); ctx.lineWidth = 3; for (let i = -1; i <= 1; i += 1) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, i * 6); ctx.lineTo(s * (18 + Math.sin(ph + i) * 3), i * 9 + Math.cos(ph + i) * 3); ctx.stroke(); } blob(ctx, 0, 0, 14, 17, c, ph); path(ctx, [[-8, -12], [-14, -26], [-3, -16]]); ctx.fillStyle = shade(c, -0.3); ctx.fill(); path(ctx, [[8, -12], [14, -26], [3, -16]]); ctx.fill(); eye(ctx, -5, -4, 4.5, '#400'); eye(ctx, 5, -4, 4.5, '#400'); },
    brute(ctx, d, f, ph) { const c = d.color; const b = Math.sin(ph) * 2; ctx.fillStyle = shade(c, -0.35); ell(ctx, -34, 4 + b, 11, 18); ctx.fill(); ell(ctx, 34, 4 - b, 11, 18); ctx.fill(); blob(ctx, 0, 0 + b * 0.5, 34, 36, c, ph); ctx.fillStyle = '#10201a'; ctx.beginPath(); ctx.ellipse(0, 12, 22, 13, 0, 0, Math.PI); ctx.fill(); teeth(ctx, 0, 12, 36, 6); eye(ctx, -12, -12, 8, '#300'); eye(ctx, 12, -12, 8, '#300'); ctx.strokeStyle = '#0a1a10'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, -24); ctx.lineTo(-4, -18); ctx.moveTo(22, -24); ctx.lineTo(4, -18); ctx.stroke(); },
    wraith(ctx, d, f, ph) { const c = d.color; const fl = Math.sin(ph * 2); ctx.fillStyle = shade(c, -0.1); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, -2); ctx.quadraticCurveTo(s * 38, -22 - fl * 10, s * 40, 4 + fl * 6); ctx.quadraticCurveTo(s * 26, 0, s * 8, 10); ctx.closePath(); ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1; } blob(ctx, 0, 0, 14, 18, c, ph); ctx.fillStyle = shade(c, -0.25); ctx.beginPath(); ctx.moveTo(-9, 12); ctx.lineTo(0, 30 + fl * 3); ctx.lineTo(9, 12); ctx.fill(); eye(ctx, -5, -4, 5, '#033'); eye(ctx, 5, -4, 5, '#033'); },
    shell(ctx, d, f, ph) { const c = d.color; blob(ctx, 0, 0, 28, 26, shade(c, -0.25), ph); ctx.fillStyle = c; for (let i = 0; i < 5; i++) { const a = -2.4 + i * 0.95; const x = Math.cos(a) * 18, y = Math.sin(a) * 14 - 2; ctx.beginPath(); for (let k = 0; k < 6; k++) { const aa = k * TAU / 6; ctx.lineTo(x + Math.cos(aa) * 9, y + Math.sin(aa) * 8); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.stroke(); } ctx.fillStyle = '#dde'; ell(ctx, 0, 6, 15, 10); ctx.fill(); eye(ctx, -6, 3, 4.5, '#200'); eye(ctx, 6, 3, 4.5, '#200'); },
    leech(ctx, d, f, ph) { const c = d.color; for (let i = 4; i >= 0; i--) { const x = -24 + i * 12, y = Math.sin(ph + i * 0.9) * 5, r = 10 + (i === 4 ? 4 : 0) - i * 0.4; blob(ctx, x, y, r, r * 0.95, shade(c, i % 2 ? 0 : -0.12), ph + i); } eye(ctx, 24, -4, 4, '#400'); eye(ctx, 24, 6, 4, '#400'); ctx.strokeStyle = '#ffd0e4'; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 28 + Math.sin(ph * 2) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    aegis(ctx, d, f, ph) { const c = d.color; blob(ctx, 0, 0, 20, 20, c, ph); eye(ctx, -7, -3, 5.5); eye(ctx, 7, -3, 5.5); ctx.strokeStyle = '#8ad8ff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.55 + Math.sin(ph * 2) * 0.2; ctx.beginPath(); ctx.arc(0, 0, 31, 0, TAU); ctx.stroke(); ctx.fillStyle = '#8ad8ff22'; ctx.fill(); ctx.globalAlpha = 1; },
    twin(ctx, d, f, ph) { const c = d.color; blob(ctx, -11, Math.sin(ph) * 2, 16, 17, c, ph); blob(ctx, 11, Math.cos(ph) * 2, 16, 17, shade(c, 0.1), ph + 1); eye(ctx, -14, -3, 4.5); eye(ctx, -5, -3, 4.5); eye(ctx, 8, -3, 4.5); eye(ctx, 17, -3, 4.5); },
    mite(ctx, d, f, ph) { blob(ctx, 0, Math.sin(ph) * 1.5, 11, 10, d.color || '#b88', ph); eye(ctx, -3.5, -2, 3.2); eye(ctx, 3.5, -2, 3.2); },
    hexer(ctx, d, f, ph) { const c = d.color; ctx.fillStyle = shade(c, -0.55); ctx.beginPath(); ctx.moveTo(-22, 26); ctx.quadraticCurveTo(-26, -6, 0, -24); ctx.quadraticCurveTo(26, -6, 22, 26); ctx.quadraticCurveTo(0, 34 + Math.sin(ph) * 3, -22, 26); ctx.fill(); ctx.fillStyle = '#05040a'; ell(ctx, 0, -6, 12, 14); ctx.fill(); ctx.fillStyle = '#ff5ad0'; ell(ctx, -5, -8, 2.6, 3.6); ctx.fill(); ell(ctx, 5, -8, 2.6, 3.6); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.globalAlpha = 0.8; const sy = -34 + Math.sin(ph) * 3; ctx.beginPath(); ctx.arc(0, sy, 7, 0, TAU); ctx.moveTo(-7, sy); ctx.lineTo(7, sy); ctx.moveTo(0, sy - 7); ctx.lineTo(0, sy + 7); ctx.stroke(); ctx.globalAlpha = 1; },
    mahitoClone(ctx, d, f, ph) { blob(ctx, 0, 0, 18, 20, '#8aa0b8', ph); ctx.strokeStyle = '#334'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(10, 0); ctx.moveTo(10, -10); ctx.lineTo(-6, 6); ctx.stroke(); eye(ctx, -6, -3, 4.5); eye(ctx, 6, -3, 4.5); },
    // ---- bosses (drawn in a 1x1 = 70px design space)
    finger(ctx, d, f, ph) { blob(ctx, 0, 0, 36, 38, '#d8c8a8', ph); ctx.fillStyle = '#6a4a3a'; for (let i = 0; i < 5; i++) { const a = ph + i * 1.256; ctx.save(); ctx.translate(Math.cos(a) * 52, Math.sin(a) * 40); ctx.rotate(a); ctx.fillRect(-9, -3, 18, 6); ctx.restore(); } eye(ctx, -12, -8, 8, '#800'); eye(ctx, 12, -8, 8, '#800'); ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.ellipse(0, 16, 16, 9, 0, 0, Math.PI); ctx.fill(); teeth(ctx, 0, 16, 28, 5); ctx.strokeStyle = '#a02828'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(0, 0, 44 + Math.sin(ph * 2) * 3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    jogo(ctx, d, f, ph) { ctx.fillStyle = '#3a2220'; ctx.beginPath(); ctx.moveTo(-26, 34); ctx.quadraticCurveTo(-30, -6, -14, -30); ctx.lineTo(14, -30); ctx.quadraticCurveTo(30, -6, 26, 34); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d9b99a'; ell(ctx, 0, -2, 20, 22); ctx.fill(); for (let i = 0; i < 7; i++) { const x = -18 + i * 6, h = 20 + Math.sin(ph * 2 + i * 1.7) * 9; const g = ctx.createLinearGradient(0, -22, 0, -22 - h); g.addColorStop(0, '#ff3a1a'); g.addColorStop(1, '#ffd24a00'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 4, -18); ctx.quadraticCurveTo(x, -22 - h, x + 4, -18); ctx.fill(); } ctx.fillStyle = '#2a1a14'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 4, -4); ctx.lineTo(s * 16, -10); ctx.lineTo(s * 14, 0); ctx.closePath(); ctx.fill(); } ctx.fillStyle = '#ff7a1a'; ell(ctx, -8, -6, 3, 3); ctx.fill(); ell(ctx, 8, -6, 3, 3); ctx.fill(); ctx.strokeStyle = '#3a2220'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.quadraticCurveTo(0, 16, 10, 10); ctx.stroke(); ctx.strokeStyle = '#ff5a1a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, 42 + Math.sin(ph * 2) * 3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    mahito(ctx, d, f, ph) { blob(ctx, 0, 6, 26, 30, '#9ab0c8', ph); ctx.fillStyle = '#7a8ea8'; ell(ctx, 0, -20, 20, 18); ctx.fill(); ctx.fillStyle = '#4a5a78'; ctx.beginPath(); ctx.moveTo(-20, -26); ctx.quadraticCurveTo(0, -46, 20, -26); ctx.lineTo(18, -18); ctx.quadraticCurveTo(0, -34, -18, -18); ctx.fill(); ctx.strokeStyle = '#223'; ctx.lineWidth = 2; for (const [a, b, c2, dd] of [[-16, -30, -6, -22], [14, -28, 6, -20], [-12, 6, 14, 16], [-14, 18, 10, 2]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, dd); ctx.stroke(); for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3, x = a + (c2 - a) * t, y = b + (dd - b) * t; ctx.beginPath(); ctx.moveTo(x - 2, y - 3); ctx.lineTo(x + 2, y + 3); ctx.stroke(); } } eye(ctx, -8, -20, 5.5, '#103'); eye(ctx, 8, -20, 5.5, '#103'); ctx.strokeStyle = '#223'; ctx.beginPath(); ctx.arc(0, -12, 7, 0.1, Math.PI - 0.1); ctx.stroke(); ctx.strokeStyle = '#c8a0ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(0, 0, 44 + Math.sin(ph * 2) * 3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
    sukuna(ctx, d, f, ph) { ctx.fillStyle = '#5a1418'; ctx.beginPath(); ctx.moveTo(-32, 36); ctx.quadraticCurveTo(-34, 0, -14, -6); ctx.lineTo(14, -6); ctx.quadraticCurveTo(34, 0, 32, 36); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e8c4a8'; ell(ctx, 0, -20, 17, 20); ctx.fill(); ctx.fillStyle = '#e88aa8'; ctx.beginPath(); ctx.moveTo(-18, -28); ctx.lineTo(-14, -48); ctx.lineTo(-4, -34); ctx.lineTo(0, -52); ctx.lineTo(6, -34); ctx.lineTo(16, -48); ctx.lineTo(18, -28); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#12080a'; for (const [x, y] of [[-8, -22], [8, -22], [-9, -12], [9, -12]]) { ell(ctx, x, y, 3.4, 2.4); ctx.fill(); } ctx.fillStyle = '#ff2a3a'; for (const [x, y] of [[-8, -22], [8, -22], [-9, -12], [9, -12]]) { ell(ctx, x, y, 1.4, 1.4); ctx.fill(); } ctx.strokeStyle = '#201015'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -34); ctx.lineTo(-4, -28); ctx.moveTo(14, -34); ctx.lineTo(4, -28); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(0, 0, 6, -4); ctx.stroke(); ctx.fillStyle = '#e8c4a8'; for (const s of [-1, 1]) { ell(ctx, s * 38, 12 + Math.sin(ph + s) * 3, 7, 9); ctx.fill(); } ctx.strokeStyle = '#ff2a3a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.65; ctx.beginPath(); ctx.arc(0, 0, 48 + Math.sin(ph * 2) * 3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; },
  };

  Art.enemyFrames = function (type) {
    const key = 'en:' + type;
    if (Art._cache[key]) return Art._cache[key];
    const def = JJK.Enemies[type] || JJK.Bosses[type] || { color: '#8a5cd0' };
    const ov = Art.overrides.enemies[type];
    const S = def.boss ? 320 : 192;
    const MS = JJK.Models, fn = MS && (MS.bosses[type] || MS.enemies[type]);
    const N = fn ? 8 : 4, frames = [];
    for (let f = 0; f < N; f++) {
      const c = mkCanvas(S, S); if (!c) return [];
      const ctx = c.getContext('2d');
      if (ov) { ctx.drawImage(ov, 0, 0, S, S); frames.push(c); continue; }
      ctx.translate(S / 2, S / 2);
      if (fn) { ctx.scale(S / (def.boss ? 170 : 100), S / (def.boss ? 170 : 100)); fn(ctx, def, (f / N) * TAU); }
      else { const k = def.boss ? 1.18 : 1; ctx.scale(k * S / (def.boss ? 192 : 112), k * S / (def.boss ? 192 : 112)); (SPR[type] || SPR.wisp)(ctx, def, f, (f / N) * TAU); }
      frames.push(c);
    }
    Art._cache[key] = frames;
    return frames;
  };
  Art.enemyThumb = function (type, px) {
    const key = 'et:' + type + ':' + px;
    if (Art._cache[key]) return Art._cache[key];
    const f = Art.enemyFrames(type)[0];
    const c = mkCanvas(px, px); if (!c || !f) return c;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(px / 2, px / 2, 2, px / 2, px / 2, px * 0.7); g.addColorStop(0, '#2a2454'); g.addColorStop(1, '#0a0918'); ctx.fillStyle = g; ctx.fillRect(0, 0, px, px);
    ctx.drawImage(f, 0, 0, f.width, f.height, 0, 0, px, px);
    Art._cache[key] = c; return c;
  };
  Art.enemyThumbURL = function (type, px) {
    const key = 'etu:' + type + ':' + px;
    if (!Art._cache[key]) { try { Art._cache[key] = Art.enemyThumb(type, px).toDataURL(); } catch (e) { Art._cache[key] = ''; } }
    return Art._cache[key];
  };

  // ------------------------------------------------------------------ icons (currency etc.)
  Art.icon = function (name, px) {
    px = px || 18;
    const key = 'ic:' + name + ':' + px;
    if (Art._cache[key]) return Art._cache[key];
    const c = mkCanvas(px * 2, px * 2); if (!c) return '';
    const ctx = c.getContext('2d'); ctx.scale(2, 2);
    const m = px / 2;
    if (name === 'coins') { const g = ctx.createRadialGradient(m - 2, m - 2, 1, m, m, m); g.addColorStop(0, '#fff2a0'); g.addColorStop(1, '#d98e0a'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m, m, m - 1, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.strokeStyle = '#b87a0a'; ctx.beginPath(); ctx.arc(m, m, m - 4, 0, TAU); ctx.stroke(); }
    else if (name === 'gems') { ctx.fillStyle = '#b46bff'; path(ctx, [[m, 1], [px - 2, m - 2], [px - 5, px - 2], [5, px - 2], [2, m - 2]]); ctx.fill(); ctx.fillStyle = '#e7caff'; path(ctx, [[m, 1], [px - 2, m - 2], [m, m]]); ctx.fill(); ctx.fillStyle = '#7a3fd0'; path(ctx, [[2, m - 2], [m, m], [5, px - 2]]); ctx.fill(); ctx.strokeStyle = '#2a1050'; ctx.lineWidth = 1; path(ctx, [[m, 1], [px - 2, m - 2], [px - 5, px - 2], [5, px - 2], [2, m - 2]]); ctx.stroke(); }
    else if (name === 'yen') { ctx.fillStyle = '#10361f'; ctx.beginPath(); ctx.arc(m, m, m - 1, 0, TAU); ctx.fill(); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#4ade80'; ctx.font = 'bold ' + Math.round(px * 0.7) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¥', m, m + 1); }
    else if (name === 'base') { ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.moveTo(m, px - 2); ctx.bezierCurveTo(-3, m + 1, 2, 0, m, m - 3); ctx.bezierCurveTo(px - 2, 0, px + 3, m + 1, m, px - 2); ctx.fill(); }
    else if (name === 'shard') { ctx.fillStyle = '#5ac8ff'; path(ctx, [[m, 1], [px - 4, m + 2], [m, px - 1], [4, m + 2]]); ctx.fill(); ctx.fillStyle = '#c8efff'; path(ctx, [[m, 1], [px - 4, m + 2], [m, m]]); ctx.fill(); }
    else if (name === 'xp') { ctx.fillStyle = '#4aa8ff'; ctx.fillRect(3, 2, px - 6, px - 4); ctx.fillStyle = '#fff'; ctx.fillRect(5, 5, px - 10, 2); ctx.fillRect(5, 9, px - 10, 2); }
    let url = '';
    try { url = c.toDataURL(); } catch (e) { /* ignore */ }
    Art._cache[key] = url;
    return url;
  };

  Art._head = { hairBack, hairFront, eyes, accessoriesFront };
  JJK.Art = Art;
})(typeof window !== 'undefined' ? window : globalThis);
