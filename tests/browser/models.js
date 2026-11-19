// Every enemy/boss/summon/playable character must have a detailed model (no silent fallback to the old sprites).
const { launch } = require('./_pw');
(async () => {
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8123/index.html?debug=1'); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => {
    const J = window.JJK, bad = [];
    for (const id of J.EnemyOrder.concat(['mite', 'mahitoClone'])) if (!J.Models.enemies[id] || J.Art.enemyFrames(id).length !== 8) bad.push('enemy:' + id);
    for (const id of J.BossOrder) if (!J.Models.bosses[id] || J.Art.enemyFrames(id).length !== 8) bad.push('boss:' + id);
    for (const [id, v] of [['dog', 'white'], ['dog', 'black'], ['nue'], ['max'], ['rika'], ['dragon'], ['garuda']]) if (J.Art.summonFrames(id, v).length !== 8) bad.push('summon:' + id);
    for (const id of J.CharacterOrder) { const s = J.Art.unitSprite(id, 54); if (!s || !s.canvas) bad.push('unit:' + id); }
    // expansion roster: every new character has a cut-out (human figure or boss-model stand) and a card portrait, none blank
    const px = (cv) => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 40) if (d[i] > 20) n++; return n; };
    for (const id of J.Expansion) {
      const cut = J.Art.cutout(id); if (!cut || px(cut) < 300) bad.push('cutout:' + id);
      const p = J.Art.portrait(id, 200, 200); if (!p || !(p.naturalWidth || p.width)) bad.push('portrait:' + id);
      const us = J.Art.unitSprite(id, 54); if (!us || px(us.canvas) < 300) bad.push('sprite:' + id);
    }
    for (const id of ['hanami', 'dagon', 'mahoraga', 'sukunaH']) if (px(J.Art.enemyFrames(id)[0]) < 2000) bad.push('bossblank:' + id);
    if (!J.Models.enemies.bud || J.Art.enemyFrames('bud').length !== 8) bad.push('enemy:bud');
    return bad;
  });
  const ok = !r.length && !errs.length;
  console.log((ok ? 'PASS' : 'FAIL') + ' all models present', r.join(','), errs.join(';'));
  await br.close(); process.exit(ok ? 0 : 1);
})();
