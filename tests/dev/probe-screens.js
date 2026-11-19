const { launch } = require('../browser/_pw');
(async () => {
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await pg.goto('http://localhost:8123/index.html?debug=1'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const p = __jjk.profile; p.debugUnlockAll = true; p.addGems(2000); p.addCoins(20000); p.addPlayerXP(100000); for (const k of Object.keys(JJK.Items)) p.d.items[k] = 5; p.commit(); });
  for (const s of ['play', 'characters', 'summon', 'shop', 'inventory', 'missions', 'codex', 'settings']) {
    const before = errs.length;
    await pg.evaluate((s) => __jjk.UI.show(s, {}), s); await pg.waitForTimeout(700);
    const name = await pg.evaluate(() => __jjk.UI.current.name);
    await pg.screenshot({ path: '/tmp/s_' + s + '.png' });
    console.log(s, '->', name, errs.length - before ? 'ERRORS' : 'ok');
  }
  console.log(errs.join('\n') || 'no errors');
  await br.close();
})();
