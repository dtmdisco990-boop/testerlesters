// Dev helper: renders a contact sheet of all enemy/boss/summon models. Usage: node tests/dev/sheet.js [out.png] [group]
const { launch } = require('../browser/_pw');
(async () => {
  const out = process.argv[2] || '/tmp/sheet.png', group = process.argv[3] || 'enemies';
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  pg.on('pageerror', (e) => console.log('PAGEERR', e.message)); pg.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await pg.goto('http://localhost:8123/index.html?debug=1'); await pg.waitForTimeout(800);
  const url = await pg.evaluate((group) => {
    const J = window.JJK, c = document.createElement('canvas'), ctx = c.getContext('2d');
    let items = [];
    if (group === 'enemies') items = J.EnemyOrder.concat(['mite', 'mahitoClone']).map((id) => ({ id, frames: J.Art.enemyFrames(id) }));
    else if (group === 'bosses') items = J.BossOrder.map((id) => ({ id, frames: J.Art.enemyFrames(id) }));
    else if (group === 'summons' && J.Art.summonSheet) items = J.Art.summonSheet();
    else if (group === 'units') items = J.CharacterOrder.map((id) => ({ id, frames: [J.Art.unitSprite(id, 120).canvas] }));
    const cell = group === 'bosses' ? 320 : group === 'units' ? 240 : 192, per = group === 'bosses' ? 4 : 6, rows = Math.ceil(items.length / per);
    c.width = cell * per; c.height = cell * rows * (group === 'bosses' || group === 'units' ? 1 : 2);
    ctx.fillStyle = '#1a1830'; ctx.fillRect(0, 0, c.width, c.height);
    items.forEach((it, i) => { const x = (i % per) * cell, y = Math.floor(i / per) * cell * (group === 'bosses' || group === 'units' ? 1 : 2);
      const f = it.frames; ctx.drawImage(f[0], x, y, cell, cell); if (f.length > 3 && group !== 'bosses' && group !== 'units') ctx.drawImage(f[Math.floor(f.length / 2)], x, y + cell, cell, cell);
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText(it.id, x + 4, y + 12); });
    return c.toDataURL('image/png');
  }, group);
  require('fs').writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  await br.close(); console.log('wrote', out);
})();
