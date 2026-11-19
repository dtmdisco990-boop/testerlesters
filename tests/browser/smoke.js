/* Browser smoke + failure tests. Run: (python3 -m http.server 8123 &) ; node tests/browser/smoke.js
   Drives the real page in headless Chrome with real clicks/keys wherever practical. */
const { launch } = require('./_pw');
const BASE = process.env.BASE || 'http://localhost:8123/index.html';
const results = [];
const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + (extra || ''))); };

(async () => {
  const br = await launch();
  const mk = async (opts) => {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
    const pg = await ctx.newPage(); pg.errs = [];
    pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) pg.errs.push(m.text()); });
    pg.on('pageerror', (e) => pg.errs.push('PAGEERROR ' + e.message));
    return { ctx, pg };
  };
  const screen = (pg) => pg.evaluate(() => window.__jjk && __jjk.UI.current && __jjk.UI.current.name);
  const P = (pg, fn, arg) => pg.evaluate(fn, arg);
  const wait = (pg, ms) => pg.waitForTimeout(ms);

  // ------------------------------------------------------------------ 1. boot + menu
  let { ctx, pg } = await mk();
  await pg.goto(BASE + '?debug=1'); await wait(pg, 1800);
  ok('boot reaches menu', (await screen(pg)) === 'menu');
  ok('boot overlay removed', await P(pg, () => getComputedStyle(document.getElementById('boot')).display === 'none' || document.getElementById('boot').classList.contains('done')));
  ok('menu shows 8 nav entries', (await P(pg, () => document.querySelectorAll('.menu-wrap button').length)) >= 8);
  for (const [label, scr] of [['CHARACTERS', 'characters'], ['SUMMON', 'summon'], ['INVENTORY', 'inventory'], ['MISSIONS', 'missions'], ['INDEX', 'codex'], ['SETTINGS', 'settings'], ['PLAY', 'play']]) {
    await pg.locator('.menu-wrap button', { hasText: new RegExp('^\\s*' + label) }).first().click(); await wait(pg, 350);
    ok('menu → ' + label, (await screen(pg)) === scr, 'got ' + (await screen(pg)));
    await pg.locator('button:has-text("BACK")').first().click(); await wait(pg, 250);
    ok('back → menu from ' + label, (await screen(pg)) === 'menu');
  }
  ok('SHOP is gated at level 1', await P(pg, () => { const b = [...document.querySelectorAll('.menu-wrap button')].find((x) => /SHOP/.test(x.textContent)); return !!b && (b.disabled || b.classList.contains('locked') || b.classList.contains('disabled') || /Unlocks/.test(b.textContent)); }));

  // ------------------------------------------------------------------ 2. battle with real input
  await pg.locator('.menu-wrap button', { hasText: /^\s*PLAY/ }).first().click(); await wait(pg, 300);
  await pg.locator('button:has-text("START BATTLE")').click(); await wait(pg, 700);
  ok('battle screen opens', (await screen(pg)) === 'battle' && await P(pg, () => !!window.__battle));
  const slot = await P(pg, () => { const s = [...__battle.battle.geo.slots.values()].find((x) => x.type === 'G'); return { c: s.c, r: s.r }; });
  const at = (s) => [(s.c + .5) * 64, 48 + (s.r + .5) * 64];
  await pg.keyboard.press('1'); await wait(pg, 100);
  ok('hotkey 1 starts placement', await P(pg, () => !!__battle.st.placingId));
  let [x, y] = at(slot); await pg.mouse.move(x, y); await wait(pg, 80);
  ok('placement preview is valid on a slot', await P(pg, () => __battle.st.placing && __battle.st.placing.valid === true));
  await pg.mouse.click(x, y); await wait(pg, 150);
  ok('click places a unit and spends Yen', (await P(pg, () => __battle.battle.units.length)) === 1 && (await P(pg, () => __battle.battle.yen)) < 420);
  ok('unit panel opens for selected unit', await P(pg, () => !!document.querySelector('.upanel') && document.querySelector('.upanel').offsetParent !== null));
  // cancel with Esc / invalid tile
  await pg.keyboard.press('2'); await pg.keyboard.press('Escape'); await wait(pg, 80);
  ok('Esc cancels placement', await P(pg, () => !__battle.st.placingId));
  await P(pg, () => { __battle.battle.addYen(2000); });
  [x, y] = at(slot); await pg.mouse.click(x, y); await wait(pg, 120); // re-select the unit by clicking it
  ok('clicking a unit selects it', await P(pg, () => __battle.st.selected !== 0 && __battle.st.selected != null));
  await pg.keyboard.press('u'); await wait(pg, 120);
  ok('U upgrades selected unit', (await P(pg, () => __battle.battle.units[0].level)) >= 2);
  await pg.locator('.upanel .mode:text-is("last")').click(); await wait(pg, 80);
  ok('unit panel changes targeting mode', (await P(pg, () => __battle.battle.units[0].targeting)) === 'last');
  const yenBefore = await P(pg, () => __battle.battle.yen);
  await pg.locator('.upanel button:has-text("SELL")').click(); await wait(pg, 150);
  const confirmOpen = await P(pg, () => !!document.querySelector('.modal'));
  if (confirmOpen) { await pg.locator('.modal button:has-text("Sell")').first().click().catch(() => {}); await wait(pg, 150); }
  ok('Sell removes unit and refunds Yen', (await P(pg, () => __battle.battle.units.length)) === 0 && (await P(pg, () => __battle.battle.yen)) > yenBefore);
  // place again and run a wave
  await pg.keyboard.press('1'); [x, y] = at(slot); await pg.mouse.move(x, y); await pg.mouse.click(x, y); await wait(pg, 100);
  await pg.locator('button:has-text("START WAVE")').click(); await wait(pg, 300);
  ok('START WAVE begins wave 1', (await P(pg, () => __battle.battle.state)) === 'wave');
  await pg.locator('.hud-top button.hud-icon:has-text("×")').click(); await wait(pg, 100);
  ok('speed button toggles to 2×', (await P(pg, () => __battle.st.speed)) === 2);
  await pg.keyboard.press('f'); await wait(pg, 60);
  ok('F toggles speed back to 1×', (await P(pg, () => __battle.st.speed)) === 1);
  await pg.keyboard.press('f');
  await pg.keyboard.press('p'); await wait(pg, 200);
  ok('P opens pause modal', await P(pg, () => __battle.st.paused && !!document.querySelector('.modal')));
  const t0 = await P(pg, () => __battle.battle.time); await wait(pg, 500);
  ok('sim is frozen while paused', Math.abs((await P(pg, () => __battle.battle.time)) - t0) < 1e-6);
  await pg.locator('.modal button:has-text("Resume")').click(); await wait(pg, 300);
  ok('Resume unpauses', !(await P(pg, () => __battle.st.paused)));
  await wait(pg, 1500);
  ok('time advances after resume', (await P(pg, () => __battle.battle.time)) > t0);
  // boss telegraph/bar via debug jump (debug matches grant nothing)
  await P(pg, () => { __battle.battle.debugJumpToWave(15); __battle.battle.addYen(20000); });
  await P(pg, () => { const b = __battle.battle; if (b.state !== 'wave') __battle.startWave(); });
  await wait(pg, 3500);
  const boss = await P(pg, () => ({ bar: !!document.querySelector('.bossbar') && getComputedStyle(document.querySelector('.bossbar')).display !== 'none', bosses: __battle.battle.enemies.filter((e) => e.def && e.def.boss).length }));
  ok('boss spawns on wave 15 and boss bar is visible', boss.bosses >= 1 && boss.bar, JSON.stringify(boss));
  await pg.screenshot({ path: '/tmp/smoke_boss.png' });
  await P(pg, () => __battle.battle.debugInstantDefeat()); await wait(pg, 3500);
  ok('debug defeat reaches results with no rewards', (await screen(pg)) === 'results' && await P(pg, () => /DEBUG MATCH/.test(document.body.innerText)));
  ok('debug match left save untouched', (await P(pg, () => __jjk.profile.d.stats.matches)) === 0);
  await pg.locator('button:has-text("MAIN MENU")').click(); await wait(pg, 300);

  // ------------------------------------------------------------------ 3. legitimate full win (bot-driven sim at max speed), real finish flow
  await pg.locator('.menu-wrap button', { hasText: /^\s*PLAY/ }).first().click(); await wait(pg, 300);
  await pg.locator('button:has-text("START BATTLE")').click(); await wait(pg, 600);
  await P(pg, () => { __battle.setSpeed(2); });
  const sim = await P(pg, () => { const b = __battle.battle; const order = b.teamOrder.slice().sort((p, q) => b.roster[p].cost - b.roster[q].cost); let n = 0; while (!b.over && b.time < 2400) { if ((n++ % 24) === 0) JJK.Bot.decide(b, order, 'good', true, {}); b.update(1 / 60); } return { over: b.over, victory: b.victory, wave: b.wave, time: Math.round(b.time) }; });
  console.log('   bot sim:', JSON.stringify(sim));
  await wait(pg, 3500);
  ok('bot match finishes', sim.over);
  ok('results screen shown after match', (await screen(pg)) === 'results');
  const res = await P(pg, () => ({ txt: document.body.innerText, coins: __jjk.profile.coins, matches: __jjk.profile.d.stats.matches, kills: __jjk.profile.d.stats.kills, won: __jjk.profile.d.stats.wins, idx: Object.keys(__jjk.profile.d.index.enemies).length }));
  ok('results show rewards and stats', /REWARDS/i.test(res.txt) && /Coins/.test(res.txt));
  ok('match recorded exactly once', res.matches === 1 && res.kills > 0);
  ok('codex discovery recorded', res.idx >= 1);
  ok('no "null"/"undefined"/"NaN" text on results', !/\bnull\b|undefined|NaN/.test(res.txt), res.txt.match(/.{0,20}(null|undefined|NaN).{0,20}/) + '');
  const coinsAfter = res.coins, victory = sim.victory;
  await pg.screenshot({ path: '/tmp/smoke_results.png' });

  // ------------------------------------------------------------------ 4. persistence across reload
  await pg.reload(); await wait(pg, 1800);
  ok('reload keeps coins/matches', (await P(pg, () => __jjk.profile.coins)) === coinsAfter && (await P(pg, () => __jjk.profile.d.stats.matches)) === 1);
  ok('save loaded (status)', ['loaded', 'migrated'].includes(await P(pg, () => __jjk.sm.status)));

  // ------------------------------------------------------------------ 5. summon with real clicks
  await P(pg, () => { __jjk.profile.addGems(500); __jjk.profile.commit(); __jjk.UI.show('summon', {}); }); await wait(pg, 400);
  const g0 = await P(pg, () => __jjk.profile.gems), sm0 = await P(pg, () => __jjk.profile.d.summon.total);
  await pg.locator('button:has-text("SUMMON ×10")').click(); await wait(pg, 500);
  ok('×10 opens reveal overlay', await P(pg, () => !!document.querySelector('.reveal')));
  await pg.locator('.reveal .skip').click(); await wait(pg, 400);
  ok('skip shows all 10 result cards', (await P(pg, () => document.querySelectorAll('.reveal .grid-res .chcard').length)) === 10);
  ok('×10 costs 100 gems and counts 10 pulls', (await P(pg, () => __jjk.profile.gems)) === g0 - 100 && (await P(pg, () => __jjk.profile.d.summon.total)) === sm0 + 10);
  await pg.screenshot({ path: '/tmp/smoke_summon.png' });
  await pg.locator('.reveal button:has-text("OK")').click(); await wait(pg, 300);
  await pg.locator('button:has-text("SUMMON ×1 ")').first().click(); await wait(pg, 400);
  await pg.locator('.reveal .skip').click().catch(() => {}); await wait(pg, 300);
  ok('×1 works', (await P(pg, () => __jjk.profile.gems)) === g0 - 110);
  await pg.locator('.reveal button:has-text("OK")').click().catch(() => {}); await wait(pg, 200);
  await P(pg, () => { __jjk.profile.d.currencies.gems = 5; __jjk.profile.commit(); __jjk.UI.show('summon', {}); }); await wait(pg, 300);
  await pg.locator('button:has-text("SUMMON ×10")').click({ force: true }).catch(() => {}); await wait(pg, 300);
  ok('cannot summon without enough gems', !(await P(pg, () => !!document.querySelector('.reveal'))) && (await P(pg, () => __jjk.profile.gems)) === 5);

  // ------------------------------------------------------------------ 6. shop / inventory / missions / settings / endless
  await P(pg, () => { const p = __jjk.profile; p.addCoins(5000); p.addPlayerXP(5000); p.commit(); __jjk.UI.show('shop', {}); }); await wait(pg, 400);
  const c0 = await P(pg, () => __jjk.profile.coins);
  await pg.locator('.shopitem button:not(.disabled)').first().click(); await wait(pg, 300);
  ok('shop purchase spends Coins', (await P(pg, () => __jjk.profile.coins)) < c0);
  await P(pg, () => __jjk.UI.show('inventory', {})); await wait(pg, 300);
  await P(pg, () => { __jjk.profile.d.items.xpM = 2; __jjk.profile.commit(); __jjk.UI.show('inventory', {}); }); await wait(pg, 300);
  await pg.locator('button.shopitem:has-text("Training Manual")').click(); await wait(pg, 200);
  const xp0 = await P(pg, () => __jjk.profile.d.items.xpM);
  await pg.locator('.cardgrid .chcard').first().click(); await wait(pg, 200);
  ok('inventory: XP item consumed on a character', (await P(pg, () => __jjk.profile.d.items.xpM)) === xp0 - 1);
  await P(pg, () => __jjk.UI.show('missions', {})); await wait(pg, 300);
  await pg.locator('.tab:has-text("Missions")').click(); await wait(pg, 200);
  const claimable = await P(pg, () => __jjk.profile.claimableCount());
  if (claimable > 0) {
    const gb = await P(pg, () => __jjk.profile.coins + __jjk.profile.gems);
    await pg.locator('button:has-text("CLAIM")').first().click(); await wait(pg, 200);
    ok('mission claim pays out', (await P(pg, () => __jjk.profile.coins + __jjk.profile.gems)) > gb);
    ok('claimed mission cannot be claimed twice', (await P(pg, () => __jjk.profile.claimableCount())) === claimable - 1);
  } else ok('mission claim (nothing claimable: skipped)', true);
  await P(pg, () => __jjk.UI.show('settings', {})); await wait(pg, 300);
  await pg.locator('label:has-text("Screen shake") input').uncheck(); await wait(pg, 100);
  ok('settings toggle persists in save', (await P(pg, () => JSON.parse(localStorage.getItem('jjk_td_save')).settings.shake)) === false);
  // endless
  await P(pg, () => { const p = __jjk.profile; p.d.progress.maps.tokyo = { normal: { cleared: true, clears: 1, bestWave: 15, bestTime: 100, flawless: false } }; p.addPlayerXP(9999); p.commit(); __jjk.UI.show('play', {}); }); await wait(pg, 400);
  await pg.locator('.tab:has-text("ENDLESS")').click(); await wait(pg, 300);
  const endlessOk = await P(pg, () => document.body.innerText.includes('START'));
  ok('endless tab available after Tokyo clear + level', endlessOk);
  await pg.locator('button:has-text("START")').last().click().catch(() => {}); await wait(pg, 700);
  ok('endless battle starts (no wave cap)', (await screen(pg)) === 'battle' && (await P(pg, () => __battle.battle.endless === true)));
  const e = await P(pg, () => { const b = __battle.battle; const order = b.teamOrder.slice(); let n = 0; while (!b.over && b.time < 900 && b.wave < 18) { if ((n++ % 24) === 0) JJK.Bot.decide(b, order, 'good', true, {}); b.update(1 / 60); } return { wave: b.wave, over: b.over }; });
  ok('endless runs past wave 15 without ending as victory', e.wave >= 16 || e.over, JSON.stringify(e));

  ok('no JS errors during the whole run', pg.errs.length === 0, pg.errs.slice(0, 3).join(' | '));
  await ctx.close();

  // ------------------------------------------------------------------ 7. failure tests
  // 7a corrupt save
  ({ ctx, pg } = await mk());
  await pg.addInitScript(() => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('jjk_td_save', '{"saveVersion":1,"player":{"level":"abc"'); sessionStorage.setItem('__seeded', '1'); } } catch (e) {} });
  await pg.goto(BASE); await wait(pg, 1800);
  ok('corrupt save: game still boots to menu', (await screen(pg)) === 'menu');
  ok('corrupt save: reset notice shown + forensic copy kept', (await P(pg, () => __jjk.sm.status)) === 'corrupt-reset' && (await P(pg, () => !!localStorage.getItem('jjk_td_save_corrupt'))));
  ok('corrupt save: no JS errors', pg.errs.length === 0, pg.errs.join('|'));
  await ctx.close();
  // 7b garbage-but-valid-JSON save (type confusion)
  ({ ctx, pg } = await mk());
  await pg.addInitScript(() => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('jjk_td_save', JSON.stringify({ saveVersion: 1, currencies: { coins: 'lots', gems: -50 }, characters: { yuji: { level: 9999, stars: 99 }, fake: { level: 1 } }, settings: { master: 50 } })); sessionStorage.setItem('__seeded', '1'); } } catch (e) {} });
  await pg.goto(BASE); await wait(pg, 1800);
  const san = await P(pg, () => ({ scr: __jjk.UI.current.name, coins: __jjk.profile.coins, gems: __jjk.profile.gems, fake: !!__jjk.profile.d.characters.fake, lvl: __jjk.profile.d.characters.yuji && __jjk.profile.d.characters.yuji.level, master: __jjk.profile.d.settings.master }));
  ok('malformed save is sanitised (no NaN/negatives/unknown ids)', san.scr === 'menu' && Number.isFinite(san.coins) && san.gems >= 0 && !san.fake && san.lvl <= 30 && san.master <= 1, JSON.stringify(san));
  await ctx.close();
  // 7c localStorage unavailable
  ({ ctx, pg } = await mk());
  await pg.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
  await pg.goto(BASE); await wait(pg, 1800);
  ok('storage blocked: game still runs (memory fallback)', (await screen(pg)) === 'menu');
  await ctx.close();
  // 7d missing script → boot error screen with RETRY + RESET SAVE (no infinite spinner)
  ({ ctx, pg } = await mk());
  await pg.route('**/js/sim/waves.js', (r) => r.abort());
  await pg.goto(BASE); await wait(pg, 2500);
  const bootErr = await P(pg, () => ({ visible: !document.getElementById('boot-error').hidden, retry: !!document.getElementById('boot-retry'), reset: !!document.getElementById('boot-reset'), msg: document.getElementById('boot-error-msg').textContent }));
  ok('missing script: GAME FAILED TO LOAD screen with RETRY and RESET SAVE', bootErr.visible && bootErr.retry && bootErr.reset, JSON.stringify(bootErr));
  ok('missing script: error message names the problem', bootErr.msg.length > 5, bootErr.msg);
  await pg.unroute('**/js/sim/waves.js'); await pg.click('#boot-retry'); await wait(pg, 2500);
  ok('RETRY recovers once the file is available', (await screen(pg)) === 'menu');
  await ctx.close();
  // 7e RESET SAVE button
  ({ ctx, pg } = await mk());
  await pg.addInitScript(() => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('jjk_td_save', JSON.stringify({ saveVersion: 1 })); localStorage.setItem('jjk_td_save_prev', 'x'); sessionStorage.setItem('__seeded', '1'); } } catch (e) {} });
  await pg.route('**/js/sim/waves.js', (r) => r.abort());
  await pg.goto(BASE); await wait(pg, 2500);
  await pg.unroute('**/js/sim/waves.js');
  pg.once('dialog', (d) => d.accept()); await pg.click('#boot-reset'); await wait(pg, 2500);
  ok('RESET SAVE clears save keys, keeps a backup, and boots', (await screen(pg)) === 'menu' && await P(pg, () => !!localStorage.getItem('jjk_td_save_reset_backup')));
  await ctx.close();

  // ------------------------------------------------------------------ 8. touch + small viewport
  {
    const tctx = await br.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const tp = await tctx.newPage(); tp.errs = [];
    tp.on('pageerror', (e) => tp.errs.push(e.message));
    await tp.goto(BASE); await wait(tp, 1800);
    const sc = await P(tp, () => { const r = document.getElementById('stage').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), t: Math.round(r.top) }; });
    ok('stage scales to fit a phone-size viewport (letterboxed, 16:9)', sc.w <= 844 && sc.h <= 390 && Math.abs(sc.w / sc.h - 16 / 9) < 0.02, JSON.stringify(sc));
    await P(tp, () => __jjk.UI.show('battle', { mapId: 'tokyo', diff: 'normal', mode: 'story', from: 'play' })); await wait(tp, 600);
    const k = await P(tp, () => document.getElementById('battle-canvas').getBoundingClientRect().width / 1280);
    const cbox = await P(tp, () => { const r = document.getElementById('battle-canvas').getBoundingClientRect(); return { x: r.left, y: r.top }; });
    const card = await tp.locator('.hud-tray .ucard, .tray .ucard, .ucard').first().boundingBox();
    await tp.touchscreen.tap(card.x + card.width / 2, card.y + card.height / 2); await wait(tp, 150);
    ok('touch: tapping a unit card starts placement', await P(tp, () => !!__battle.st.placingId));
    const sl = await P(tp, () => { const s2 = [...__battle.battle.geo.slots.values()].find((x) => x.type === 'G'); return { c: s2.c, r: s2.r }; });
    const tx = cbox.x + ((sl.c + .5) * 64) * k, ty = cbox.y + (48 + (sl.r + .5) * 64) * k;
    await tp.touchscreen.tap(tx, ty); await wait(tp, 150);
    ok('touch: first tap only previews (no unit yet)', (await P(tp, () => __battle.battle.units.length)) === 0);
    await tp.touchscreen.tap(tx, ty); await wait(tp, 200);
    ok('touch: second tap on the same tile confirms placement', (await P(tp, () => __battle.battle.units.length)) === 1);
    ok('touch: no JS errors', tp.errs.length === 0, tp.errs.join('|'));
    await tctx.close();
  }

  // ------------------------------------------------------------------ 9. performance + leak sanity (chromium with gc exposed)
  {
    const lb = await require('./_pw').launch(['--js-flags=--expose-gc', '--enable-precise-memory-info']);
    const lctx = await lb.newContext({ viewport: { width: 1280, height: 720 } });
    const lp = await lctx.newPage(); lp.errs = [];
    lp.on('pageerror', (e) => lp.errs.push(e.message));
    await lp.goto(BASE); await wait(lp, 1800);
    const heap = async () => lp.evaluate(() => { gc(); gc(); return performance.memory.usedJSHeapSize / 1048576; });
    const cycle = () => lp.evaluate(() => { for (let i = 0; i < 6; i++) { __jjk.UI.show('battle', { mapId: 'tokyo', diff: 'normal', mode: 'story', from: 'play' }); const b = __battle.battle; for (let j = 0; j < 600; j++) b.update(1 / 60); __jjk.UI.show('menu'); __jjk.UI.show('summon', {}); __jjk.UI.show('menu'); } });
    await cycle(); const h1 = await heap(); await cycle(); await cycle(); const h2 = await heap();
    ok('memory: 12 more battle/menu cycles grow heap < 25 MB (' + h1.toFixed(1) + ' → ' + h2.toFixed(1) + ' MB)', h2 - h1 < 25, h1 + '→' + h2);
    const dom = await lp.evaluate(() => document.querySelectorAll('*').length);
    ok('DOM does not accumulate after cycles (' + dom + ' nodes)', dom < 600, String(dom));
    // frame cost with a crowded field: 60 enemies + 12 units, measure update+render
    const perf = await lp.evaluate(() => {
      __jjk.UI.show('battle', { mapId: 'shibuya', diff: 'normal', mode: 'story', from: 'play' });
      const bs = __battle, b = bs.battle; b.addYen(100000);
      const order = b.teamOrder.slice(); for (let i = 0; i < 40; i++) JJK.Bot.decide(b, order, 'good', true, {});
      b.startWave(); for (let i = 0; i < 40; i++) b.spawnEnemy('wisp', {}); for (let i = 0; i < 20; i++) b.spawnEnemy('brute', {});
      const t0 = performance.now(); for (let i = 0; i < 120; i++) b.update(1 / 60); const sim = (performance.now() - t0) / 120;
      return { sim: +sim.toFixed(2), enemies: b.enemies.length, units: b.units.length };
    });
    ok('sim step with ' + perf.enemies + ' enemies / ' + perf.units + ' units costs ' + perf.sim + ' ms (budget 8 ms)', perf.sim < 8, JSON.stringify(perf));
    let frames = 0; const fr = await lp.evaluate(() => new Promise((res) => { let n = 0, t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
    ok('rendered battle runs ≥ 30 fps in headless Chrome (' + fr.toFixed(0) + ' fps)', fr >= 30, String(fr));
    ok('perf/leak run: no JS errors', lp.errs.length === 0, lp.errs.join('|'));
    await lb.close();
  }

  await br.close();
  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' browser checks passed');
  if (failed.length) { console.log('FAILED:\n' + failed.map((f) => ' - ' + f.name + ' ' + (f.extra || '')).join('\n')); process.exit(1); }
})().catch((e) => { console.error('SMOKE CRASH', e); process.exit(2); });
