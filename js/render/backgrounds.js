/* Procedural map backgrounds. Pre-rendered once per map into an offscreen 1280x720 canvas. Replaceable via assets/manifest.json (backgrounds). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;
  const TILE = Balance.TILE, FY = Balance.FIELD_Y, W = Balance.W, H = Balance.H, COLS = Balance.COLS, ROWS = Balance.ROWS;
  const Art = JJK.Art;

  const THEMES = {
    tokyo: { grass: ['#2c4a34', '#264030'], path: ['#b9a98a', '#8f7f64'], edge: '#5a4d38', block: '#1a2a24', elev: ['#6a5a78', '#4e4060'], sky: '#12202a', accent: '#8bd0a0' },
    detention: { grass: ['#2a2d3a', '#252835'], path: ['#6f7488', '#4f5468'], edge: '#2c2f40', block: '#161826', elev: ['#5a5068', '#3e3650'], sky: '#12141e', accent: '#7aa0ff' },
    shibuya: { grass: ['#1c1a2c', '#181626'], path: ['#3a3a4a', '#2a2a38'], edge: '#ff4aa8', block: '#0e0c1a', elev: ['#34304c', '#26223a'], sky: '#0a0818', accent: '#4ad0ff' },
    shinjuku: { grass: ['#1a1620', '#16121c'], path: ['#4a2e3a', '#33202a'], edge: '#d02a3a', block: '#0c0a12', elev: ['#3a2a3e', '#2a1c30'], sky: '#0c0610', accent: '#ff3a4a' },
    temple: { grass: ['#3a1c24', '#321820'], path: ['#6a3a3a', '#4a2428'], edge: '#ffb23f', block: '#1a0a10', elev: ['#5a2a3a', '#431c2c'], sky: '#1a0810', accent: '#ff5a3a' },
  };

  function strokePath(ctx, pts, w, color) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = color;
    ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
  }

  function render(mapId) {
    const map = JJK.Maps[mapId], th = THEMES[mapId] || THEMES.tokyo;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const rng = Util.makeRng(Util.hashString('bg:' + mapId));
    // base
    ctx.fillStyle = th.sky; ctx.fillRect(0, 0, W, H);
    for (let col = 0; col < COLS; col++) for (let r = 0; r < ROWS; r++) {
      ctx.fillStyle = th.grass[(col + r) & 1]; ctx.fillRect(col * TILE, FY + r * TILE, TILE, TILE);
    }
    // texture noise
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 900; i++) { ctx.fillStyle = rng.chance(0.5) ? '#fff' : '#000'; ctx.fillRect(rng.range(0, W), rng.range(FY, FY + ROWS * TILE), rng.range(1, 3), rng.range(1, 3)); }
    ctx.globalAlpha = 1;
    // themed decoration in free tiles
    decorate(ctx, mapId, map, th, rng);
    // elevated platforms
    for (const e of map.elevated) {
      const x = e.c * TILE, y = FY + e.r * TILE, w = e.w * TILE, h = e.h * TILE;
      ctx.fillStyle = '#00000066'; ctx.fillRect(x + 6, y + 10, w, h);
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, th.elev[0]); g.addColorStop(1, th.elev[1]);
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = th.accent; ctx.globalAlpha = 0.6; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1;
      for (let i = 1; i < e.w; i++) { ctx.beginPath(); ctx.moveTo(x + i * TILE, y); ctx.lineTo(x + i * TILE, y + h); ctx.stroke(); }
      for (let j = 1; j < e.h; j++) { ctx.beginPath(); ctx.moveTo(x, y + j * TILE); ctx.lineTo(x + w, y + j * TILE); ctx.stroke(); }
    }
    // blocked structures
    for (const b of map.blocked) {
      const x = b.c * TILE, y = FY + b.r * TILE, w = b.w * TILE, h = b.h * TILE;
      ctx.fillStyle = '#00000088'; ctx.fillRect(x + 4, y + 8, w, h);
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shadeC(th.block, 0.25)); g.addColorStop(1, th.block);
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 32) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); ctx.stroke(); }
      // windows
      ctx.fillStyle = th.accent;
      for (let wx = x + 10; wx < x + w - 14; wx += 26) for (let wy = y + 10; wy < y + h - 14; wy += 24) { ctx.globalAlpha = rng.chance(0.4) ? 0.55 : 0.1; ctx.fillRect(wx, wy, 10, 12); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#000a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    }
    // path
    const pathPts = map.paths.map((wp) => wp.map((p) => ({ x: (p[0] + 0.5) * TILE, y: FY + (p[1] + 0.5) * TILE })));
    for (const pts of pathPts) {
      strokePath(ctx, pts, TILE * 0.98, '#00000066');
      strokePath(ctx, pts, TILE * 0.94, th.edge);
      strokePath(ctx, pts, TILE * 0.8, th.path[1]);
      strokePath(ctx, pts, TILE * 0.7, th.path[0]);
      ctx.save(); ctx.setLineDash([10, 18]); strokePath(ctx, pts, 2, 'rgba(255,255,255,.16)'); ctx.restore();
    }
    // base marker + spawn marker
    const last = pathPts[0][pathPts[0].length - 1], first = pathPts[0][0];
    for (const pts of pathPts) { const l = pts[pts.length - 1]; base(ctx, Math.min(l.x, W - 34), l.y, th); }
    ctx.fillStyle = '#ff3b5c'; ctx.globalAlpha = 0.8;
    for (const pts of pathPts) { const s = pts[0]; ctx.beginPath(); ctx.moveTo(Math.max(s.x, 20) + 10, s.y); ctx.lineTo(Math.max(s.x, 20) - 8, s.y - 12); ctx.lineTo(Math.max(s.x, 20) - 8, s.y + 12); ctx.fill(); }
    ctx.globalAlpha = 1;
    // vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 800); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    return c;
  }

  function shadeC(c, a) { return Art.shade(c, a); }

  function base(ctx, x, y, th) {
    ctx.save(); ctx.translate(x - 4, y);
    ctx.fillStyle = '#00000066'; ctx.beginPath(); ctx.ellipse(2, 24, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 30); g.addColorStop(0, '#fff'); g.addColorStop(0.4, th.accent); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(9, 0); ctx.lineTo(0, 10); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function freeTiles(map) {
    const geo = JJK.Geometry.get(map.id); const out = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const k = c + ',' + r;
      if (geo.pathTiles.has(k)) continue;
      if (map.blocked.some((b) => c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h)) continue;
      if (map.elevated.some((b) => c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h)) continue;
      out.push([c, r]);
    }
    return out;
  }

  function decorate(ctx, id, map, th, rng) {
    const tiles = freeTiles(map);
    for (const [c, r] of tiles) {
      const x = c * TILE + rng.range(8, 56), y = FY + r * TILE + rng.range(8, 56);
      if (id === 'tokyo') {
        if (rng.chance(0.28)) { ctx.fillStyle = '#3a6a44'; ctx.beginPath(); ctx.ellipse(x, y, rng.range(4, 9), rng.range(3, 6), 0, 0, 7); ctx.fill(); }
        if (rng.chance(0.07)) { ctx.fillStyle = '#ffd0e4'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.26) * 4, y + Math.sin(k * 1.26) * 4, 2.4, 0, 7); ctx.fill(); } ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); }
        if (rng.chance(0.03)) { ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x - 2, y, 4, 14); ctx.fillStyle = '#2f6a3c'; ctx.beginPath(); ctx.arc(x, y - 4, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#3f8a4c'; ctx.beginPath(); ctx.arc(x - 3, y - 7, 8, 0, 7); ctx.fill(); }
      } else if (id === 'detention') {
        if (rng.chance(0.2)) { ctx.strokeStyle = '#ffffff12'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.range(-20, 20), y + rng.range(-20, 20)); ctx.stroke(); }
        if (rng.chance(0.05)) { ctx.fillStyle = '#c8a03a55'; ctx.fillRect(x - 10, y - 2, 20, 4); }
      } else if (id === 'shibuya') {
        if (rng.chance(0.15)) { ctx.fillStyle = rng.chance(0.5) ? '#4ad0ff22' : '#ff4aa822'; ctx.fillRect(c * TILE + 6, FY + r * TILE + 6, TILE - 12, 3); }
        if (rng.chance(0.04)) { ctx.fillStyle = '#ffffff33'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
      } else if (id === 'shinjuku') {
        if (rng.chance(0.12)) { ctx.fillStyle = '#ff3a4a22'; ctx.beginPath(); ctx.arc(x, y, rng.range(2, 6), 0, 7); ctx.fill(); }
        if (rng.chance(0.05)) { ctx.fillStyle = '#ffffff12'; ctx.fillRect(c * TILE + 8, FY + r * TILE + 30, TILE - 16, 3); }
      } else if (id === 'temple') {
        if (rng.chance(0.2)) { ctx.fillStyle = '#ffb23f18'; ctx.beginPath(); ctx.arc(x, y, rng.range(3, 8), 0, 7); ctx.fill(); }
        if (rng.chance(0.04)) { ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x - 3, y - 12, 6, 24); ctx.fillStyle = '#c8302a'; ctx.fillRect(x - 3, y - 12, 6, 6); }
      }
    }
    if (id === 'shinjuku') { // cracked red slashes across the ground
      ctx.strokeStyle = '#d02a3a44'; ctx.lineWidth = 2;
      for (let i = 0; i < 18; i++) { const x = rng.range(40, W - 40), y = rng.range(FY + 20, FY + ROWS * TILE - 20), a = rng.range(-0.5, 0.5) + (i % 2 ? 0.8 : -0.8), l = rng.range(60, 190); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
    }
    if (id === 'shibuya') { // crosswalk stripes near path
      ctx.fillStyle = '#ffffff10';
      for (let i = 0; i < 24; i++) ctx.fillRect(160 + i * 12, FY + 4 * TILE + 8, 6, 48);
    }
  }

  const Backgrounds = {
    _cache: {},
    /** Full-size background for a map (replacement image from the manifest takes priority). */
    get(mapId) {
      const ov = Art.overrides.backgrounds[mapId];
      if (ov) return ov;
      if (!this._cache[mapId]) this._cache[mapId] = render(mapId);
      return this._cache[mapId];
    },
    theme(mapId) { return THEMES[mapId] || THEMES.tokyo; },
    /** Thumbnail with the path outline for map cards. */
    draw(ctx, mapId, w, h) { ctx.drawImage(this.get(mapId), 0, FY, W, ROWS * TILE, 0, 0, w, h); },
  };
  JJK.Backgrounds = Backgrounds;
})(typeof window !== 'undefined' ? window : globalThis);
