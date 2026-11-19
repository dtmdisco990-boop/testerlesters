// Dev helper: renders full-size cut-outs + card portraits for the expansion roster. Usage: node tests/dev/cutouts.js [out.png]
const { launch } = require('../browser/_pw');
(async () => {
  const out = process.argv[2] || '/tmp/cutouts.png';
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  pg.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await pg.goto('http://localhost:8123/index.html?debug=1'); await pg.waitForTimeout(800);
  const url = await pg.evaluate(() => {
    const J = window.JJK, ids = ['mai', 'momo', 'miwa', 'utahime', 'uraume', 'naoya', 'higuruma', 'geto', 'kashimo', 'yuki'];
    const c = document.createElement('canvas'), ctx = c.getContext('2d'); c.width = 300 * 5; c.height = 375 * 2 + 200 * 2;
    ctx.fillStyle = '#26224a'; ctx.fillRect(0, 0, c.width, c.height);
    ids.forEach((id, i) => { const x = (i % 5) * 300, y = Math.floor(i / 5) * 375; ctx.drawImage(J.Art.cutout(id), x, y); ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.fillText(id, x + 4, y + 14); });
    ids.forEach((id, i) => { const p = J.Art.portrait(id, 200, 200); ctx.drawImage(p, (i % 5) * 300 + 50, 750 + Math.floor(i / 5) * 200 * 1, 200, 200); });
    return c.toDataURL('image/png');
  });
  require('fs').writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  await br.close(); console.log('wrote', out);
})();
