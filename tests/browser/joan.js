// Forces a JOAN pull through the real Summon UI and checks the rainbow reveal, the card, and the characters screen.
const { launch } = require('./_pw');
(async () => {
  const br = await launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8123/index.html?debug=1'); await pg.waitForTimeout(1500);
  const res = []; const ok = (n, c) => { res.push((c ? 'PASS ' : 'FAIL ') + n); };
  await pg.evaluate(() => {
    const p = __jjk.profile; p.addGems(5000); p.commit();
    const o = p.summon.bind(p);
    p.summon = (b, n) => { const r = JJK.Util.makeRng(5); r.joan = () => 0; return o(b, n, r); }; // force JOAN for the test only
    __jjk.UI.show('summon', {});
  });
  await pg.waitForTimeout(500);
  ok('rates table lists JOAN 1 in 200,000', (await pg.evaluate(() => document.body.innerText)).includes('1 in 200,000'));
  await pg.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /SUMMON ×1\b/.test(x.textContent)); b.click(); });
  await pg.waitForTimeout(600);
  ok('reveal overlay is in JOAN mode', await pg.evaluate(() => !!document.querySelector('.reveal.joan')));
  await pg.screenshot({ path: '/tmp/joan_charge.png' });
  await pg.waitForTimeout(3300);
  await pg.screenshot({ path: '/tmp/joan_burst.png' });
  await pg.waitForTimeout(1800);
  ok('J O A N title shown', await pg.evaluate(() => !!document.querySelector('.joan-title')));
  ok('JOAN card shown with its animation class', await pg.evaluate(() => !!document.querySelector('.rescard.joan-card')));
  const colours = await pg.evaluate(() => { const cv = document.querySelector('.reveal canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; const hs = new Set(); for (let i = 0; i < d.length; i += 4 * 97) { const r = d[i], g = d[i + 1], b = d[i + 2]; if (r + g + b > 150) hs.add((r > g && r > b ? 'r' : g > b ? 'g' : 'b')); } return hs.size; });
  ok('canvas shows several hues (rainbow)', colours >= 3);
  await pg.screenshot({ path: '/tmp/joan_reveal.png' });
  await pg.evaluate(() => { const s = document.querySelector('.reveal .skip'); if (s) s.click(); });
  await pg.waitForTimeout(500);
  ok('Jahjuan now owned', await pg.evaluate(() => __jjk.profile.owns('jahjuan')));
  await pg.evaluate(() => { [...document.querySelectorAll('.reveal button')].find((b) => b.textContent === 'OK').click(); __jjk.UI.show('characters', {}); });
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: '/tmp/joan_cards.png' });
  ok('character card has the JOAN rarity class', await pg.evaluate(() => !!document.querySelector('.chcard.r-JOAN')));
  // deploy him on a real map: one placement only
  const dep = await pg.evaluate(() => { const J = JJK; const b = new J.Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'jahjuan', level: 1, stars: 0 }], seed: 3, startYen: 1000 }); const sl = [...b.geo.slots.values()].filter((s) => s.type === 'G'); const a = b.place('jahjuan', sl[0].c, sl[0].r), c = b.place('jahjuan', sl[1].c, sl[1].r); return [a.ok, c.ok, b.yen]; });
  ok('1 placement, 300 yen', dep[0] === true && dep[1] === false && dep[2] === 700);
  ok('no page errors', !errs.length);
  console.log(res.join('\n'), errs.join(';'));
  await br.close(); process.exit(res.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
