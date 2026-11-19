const { launch } = require('../browser/_pw');
(async () => {
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await pg.goto('http://localhost:8123/index.html?debug=1'); await pg.waitForTimeout(2500);
  console.log('ready:', await pg.evaluate(() => !!(window.__jjk && window.__jjk.ready)), 'screen:', await pg.evaluate(() => window.__jjk && window.__jjk.UI.current && window.__jjk.UI.current.name));
  console.log('boot hidden:', await pg.evaluate(() => getComputedStyle(document.getElementById('boot')).display));
  await pg.screenshot({ path: '/tmp/menu.png' });
  console.log(errs.join('\n') || 'no errors');
  await br.close();
})();
