const { launch } = require('../browser/_pw');
(async () => {
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await pg.goto('http://localhost:8123/index.html?debug=1'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => __jjk.UI.show('play', {})); await pg.waitForTimeout(300);
  await pg.click('text=START BATTLE'); await pg.waitForTimeout(800);
  console.log('screen', await pg.evaluate(() => __jjk.UI.current.name), 'battle?', await pg.evaluate(() => !!window.__battle));
  await pg.screenshot({ path: '/tmp/b0.png' });
  // place via real clicks: select card 1, click a slot
  const slot = await pg.evaluate(() => { const b = __battle.battle; const s = [...b.geo.slots.values()].find((x) => x.type === 'G'); return { c: s.c, r: s.r }; });
  await pg.keyboard.press('1'); await pg.waitForTimeout(150);
  const box = await pg.evaluate(() => { const r = document.getElementById('battle-canvas').getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / 1280 }; });
  const px = box.x + ((slot.c + 0.5) * 64) * box.k, py = box.y + (48 + (slot.r + 0.5) * 64) * box.k;
  await pg.mouse.move(px, py); await pg.waitForTimeout(100); await pg.screenshot({ path: '/tmp/b1.png' });
  await pg.mouse.click(px, py); await pg.waitForTimeout(200);
  console.log('units after click', await pg.evaluate(() => __battle.battle.units.length));
  await pg.keyboard.press('Space'); await pg.waitForTimeout(100);
  // bot places more
  await pg.evaluate(() => { const b = __battle.battle; const order = b.teamOrder.slice(); window.__botI = setInterval(() => { if (b.over) return clearInterval(window.__botI); JJK.Bot.decide(b, order, 'good', true, {}); }, 300); __battle.setSpeed(2); });
  await pg.waitForTimeout(9000);
  await pg.screenshot({ path: '/tmp/b2.png' });
  console.log(JSON.stringify(await pg.evaluate(() => { const b = __battle.battle; return { wave: b.wave, state: b.state, units: b.units.length, enemies: b.enemies.length, yen: Math.floor(b.yen), base: b.baseHp }; })));
  // Debug panel: instant win
  await pg.evaluate(() => { JJK.Debug.toggle(); }); await pg.waitForTimeout(200);
  await pg.evaluate(() => __battle.battle.debugInstantVictory()); await pg.waitForTimeout(3500);
  console.log('screen after win', await pg.evaluate(() => __jjk.UI.current.name));
  await pg.screenshot({ path: '/tmp/b3.png' });
  console.log(errs.join('\n') || 'no errors');
  await br.close();
})();
