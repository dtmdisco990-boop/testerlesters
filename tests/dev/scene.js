// Dev helper: stages a battle with a chosen team + enemies/boss and screenshots it. Usage: node tests/dev/scene.js out.png [boss]
const { launch } = require('../browser/_pw');
(async () => {
  const out = process.argv[2] || '/tmp/scene.png', boss = process.argv[3] || '';
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  pg.on('pageerror', (e) => console.log('PAGEERR', e.message)); pg.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await pg.goto('http://localhost:8123/index.html?debug=1'); await pg.waitForTimeout(1500);
  const info = await pg.evaluate(`(` + String(async () => {
    const J = window.JJK, P = __jjk.profile || __jjk.Profile || J.Profile;
    const ids = __TEAM__;
    P.teamForBattle = () => ids.map((id) => ({ id, level: 20, stars: 3 }));
    __jjk.UI.show('battle', { mapId: '__MAP__' || Object.keys(J.Maps)[0], diff: 'normal', mode: 'standard' });
    await new Promise((r) => setTimeout(r, 600));
    const b = __battle.battle; b.yen = 99999;
    const slots = [...b.geo.slots.values()].filter((s) => s.type === 'G' || s.type === 'E');
    const row = (n) => slots.filter((s) => s.r === n).sort((a, c) => a.c - c.c);
    const picks = [slots[2], slots[9], slots[16], slots[23], slots[30], slots[37]];
    ids.forEach((id, i) => { const s = picks[i]; if (s) b.place(id, s.c, s.r); });
    const types = ['wisp', 'skitter', 'brute', 'wraith', 'shell', 'leech', 'aegis', 'twin', 'hexer'];
    types.forEach((t, i) => b.spawnEnemy(t, { lane: 0, dist: 60 + i * 55, wave: 1 }));
    const bossId = '__BOSS__'; if (bossId && J.Bosses[bossId]) b.spawnEnemy(bossId, { lane: 0, dist: 520, wave: 1 });
    for (const u of b.units) { for (let i = 0; i < 4; i++) { b.yen = 99999; b.upgrade(u.uid); } }
    b.startWave(); __battle.setSpeed(1);
    return { units: b.units.length, enemies: b.enemies.length, summons: b.summons.length };
  }).replace('__BOSS__', boss).replace('__TEAM__', JSON.stringify((process.env.TEAM || 'yuji,megumi,nobara,maki,yuta,gojo').split(','))).replace('__MAP__', process.env.MAP || '') + `)()`);
  console.log(JSON.stringify(info));
  await pg.waitForTimeout(+process.env.WAIT || 4000);
  await pg.screenshot({ path: out, clip: process.env.CLIP ? (([x, y, w, h]) => ({ x, y, width: w, height: h }))(process.env.CLIP.split(',').map(Number)) : undefined }); await br.close(); console.log('wrote', out);
})();
