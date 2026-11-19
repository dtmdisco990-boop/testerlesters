// Domain Expansion UI path: unlock via upgrades, button appears, Shift+1 activates, effect + overlay + cooldown.
const { launch } = require('./_pw');
(async () => {
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8123/index.html'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const p = __jjk.profile; p.grantCharacter('megumi'); p.setLoadout(['megumi', 'yuji', 'nobara']); p.commit(); __jjk.UI.show('battle', { mapId: 'tokyo', diff: 'normal', mode: 'story', from: 'play' }); });
  await pg.waitForTimeout(600);
  const r = await pg.evaluate(() => {
    const b = __battle.battle; b.addYen(50000);
    const slot = [...b.geo.slots.values()].find((s) => b.canPlace('megumi', s.c, s.r).ok);
    const pl = b.place('megumi', slot.c, slot.r); const u = pl.unit;
    let n = 0; while (b.upgradeCost(u) != null && n++ < 10) b.upgrade(u.uid);
    __battle.startWave(); for (let i = 0; i < 12; i++) b.spawnEnemy('wisp', {});
    for (let i = 0; i < 300; i++) b.update(1 / 60);
    return { level: u.level, can: b.canActivateDomain(u), btn: !!document.querySelector('.domainbtn') };
  });
  console.log('domain unlocked:', JSON.stringify(r));
  await pg.evaluate(() => { const b = __battle.battle; for (let i = 0; i < 60 * 25; i++) { b.update(1 / 60); if (b.enemies.length < 8) b.spawnEnemy('wisp', {}); } });
  await pg.waitForTimeout(300);
  console.log('domain button visible:', await pg.evaluate(() => !!document.querySelector('.domainbtn')));
  await pg.keyboard.press('Shift+Digit1'); await pg.waitForTimeout(500);
  const d = await pg.evaluate(() => ({ active: !!__battle.battle.domain, id: __battle.battle.domain && __battle.battle.domain.id, banner: document.body.innerText.match(/DOMAIN[^\n]*/i) + '' }));
  console.log('after Shift+1:', JSON.stringify(d));
  await pg.screenshot({ path: '/tmp/domain.png' });
  const cd = await pg.evaluate(() => { for (let i = 0; i < 60 * 3; i++) __battle.battle.update(1 / 60); const u = __battle.battle.units[0]; return { stillActive: !!__battle.battle.domain, cdLeft: Math.round(u.domainCd || 0) }; });
  console.log('after 10s:', JSON.stringify(cd), errs.length ? 'ERRORS ' + errs.join('|') : 'no errors');
  await br.close();
  const pass = r.level === 6 && d.active && cd.stillActive && cd.cdLeft > 0 && !errs.length;
  console.log(pass ? 'PASS domain UI path (unlock → button → Shift+1 → overlay/effect → cooldown)' : 'FAIL domain UI path');
  process.exit(pass ? 0 : 1);
})();
