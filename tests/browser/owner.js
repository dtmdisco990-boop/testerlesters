// Owner Lab end to end: access gate (wrong code, lockout, correct code, session persistence, new session), unconfigured build,
// "the save never stores owner status", and the existing Lab tools (self-test, sandbox, LAB panel). Uses a throwaway random code that is
// injected by rewriting balance.js in flight, so no readable code is ever in the repository.
const crypto = require('crypto');
const tool = require('../../tools/owner-access.js');
const { launch } = require('./_pw');
const URL_ = 'http://localhost:8123/index.html';
(async () => {
  const code = 'T' + crypto.randomBytes(12).toString('base64url'), block = tool.makeBlock(code);
  const br = await launch();
  const res = []; const ok = (n, c) => res.push((c ? 'PASS ' : 'FAIL ') + n);
  const errs = [], logs = [];
  const configure = async (ctx, on) => ctx.route('**/js/data/balance.js', async (r) => { const resp = await r.fetch(); let body = await resp.text(); if (on) body = body.replace(/OWNER_ACCESS: \{[^}]*\},/, tool.render(block)); await r.fulfill({ response: resp, body }); });
  const open = async (ctx) => { const pg = await ctx.newPage(); await pg.setViewportSize({ width: 1280, height: 720 }); pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => logs.push(m.text())); await pg.goto(URL_); await pg.waitForTimeout(1500); return pg; };
  const prompt = async (pg) => { await pg.keyboard.press('Control+Shift+O'); await pg.waitForTimeout(250); };
  const type = async (pg, v) => { await pg.fill('.oa-input', v); await pg.keyboard.press('Enter'); await pg.waitForTimeout(700); };
  const msg = (pg) => pg.evaluate(() => (document.querySelector('.oa-msg') || {}).textContent || '');
  const labOpen = (pg) => pg.evaluate(() => !!document.querySelector('[data-screen=owner]'));

  // ---- A. as shipped (no hash installed): public players, Lab stays locked, game works
  { const ctx = await br.newContext(); await configure(ctx, false); const pg = await open(ctx);
    ok('shipped build: nothing configured', await pg.evaluate(() => JJK.Owner.enabled() && !JJK.Owner.configured() && !JJK.Owner.unlocked()));
    await prompt(pg); ok('prompt appears', !!(await pg.$('.oa-input')));
    await type(pg, 'anything at all'); ok('unconfigured build refuses every code', /NOT SET UP/.test(await msg(pg)) && !(await labOpen(pg)));
    await pg.keyboard.press('Escape'); await pg.evaluate(() => document.querySelector('.modal-back') && document.querySelector('.modal-back').remove());
    ok('menu and normal play unaffected', await pg.evaluate(() => !!document.querySelector('.menu-logo')));
    await ctx.close(); }

  // ---- B. configured build
  const ctx = await br.newContext(); await configure(ctx, true);
  let pg = await open(ctx);
  ok('configured but locked at load', await pg.evaluate(() => JJK.Owner.configured() && !JJK.Owner.unlocked()));
  await prompt(pg); ok('polished OWNER ACCESS prompt shown', /OWNER ACCESS/.test(await pg.evaluate(() => document.querySelector('.oa-card').textContent)));
  await type(pg, 'wrong-code-1'); ok('wrong code: ACCESS DENIED and Lab stays locked', (await msg(pg)) === 'ACCESS DENIED' && !(await labOpen(pg)) && await pg.evaluate(() => !JJK.Owner.unlocked()));
  await type(pg, code.slice(0, -1)); ok('near-miss gives the identical answer', (await msg(pg)) === 'ACCESS DENIED');
  for (let i = 0; i < 3; i++) await type(pg, 'wrong-' + i);
  ok('5 wrong attempts trigger a temporary lockout', /TOO MANY ATTEMPTS/.test(await msg(pg)) && await pg.evaluate(() => document.querySelector('.oa-input').disabled));
  ok('lockout blocks even the right code', await pg.evaluate(async (c) => (await JJK.Owner.check(c)).reason === 'locked', code) && !(await labOpen(pg)));
  await pg.reload(); await pg.waitForTimeout(1200); await prompt(pg);
  ok('lockout survives a page refresh', /TOO MANY ATTEMPTS/.test(await msg(pg)));
  await ctx.close();

  // ---- C. fresh browser: the right code
  const ctx2 = await br.newContext(); await configure(ctx2, true);
  pg = await open(ctx2);
  const saveKey = await pg.evaluate(() => JJK.Config.SAVE_KEY);
  const saveBefore = await pg.evaluate((k) => localStorage.getItem(k), saveKey);
  await prompt(pg); await type(pg, code); await pg.waitForTimeout(500);
  ok('correct code opens the Lab', await labOpen(pg) && await pg.evaluate(() => JJK.Owner.unlocked()));
  ok('save has no owner status', await pg.evaluate((k) => !/owner/i.test(localStorage.getItem(k) || ''), saveKey));
  ok('flag lives in sessionStorage only', await pg.evaluate(() => sessionStorage.getItem('jjk_owner_session') === '1' && !Object.keys(localStorage).some((k) => /owner_session/.test(k))));
  ok('no code or hash in session storage', await pg.evaluate(([c, h]) => !JSON.stringify(Object.entries(sessionStorage)).includes(c) && !JSON.stringify(Object.entries(sessionStorage)).includes(h), [code, block.hash]));
  // existing tools still work
  await pg.evaluate(() => [...document.querySelectorAll('.tab')].find((t) => t.textContent === 'SELF-TEST').click()); await pg.waitForTimeout(200);
  await pg.evaluate(() => [...document.querySelectorAll('button')].find((b) => /RUN SELF-TEST/.test(b.textContent)).click());
  await pg.waitForFunction(() => window.__selftest, null, { timeout: 120000 });
  const st = await pg.evaluate(() => ({ total: __selftest.total, failed: __selftest.failed, bad: __selftest.results.filter((r) => !r.ok).map((r) => r.name + ' ' + r.detail) }));
  ok('Lab self-test: ' + st.total + ' checks, 0 failed ' + st.bad.slice(0, 3).join(';'), st.failed === 0 && st.total > 100);
  await pg.evaluate(() => [...document.querySelectorAll('.tab')].find((t) => t.textContent === 'SANDBOX').click()); await pg.waitForTimeout(300);
  await pg.evaluate(() => [...document.querySelectorAll('button')].find((b) => /START SANDBOX BATTLE/.test(b.textContent)).click()); await pg.waitForTimeout(1200);
  ok('sandbox battle (all characters, god mode, debug flag)', await pg.evaluate(() => __battle && __battle.battle.teamOrder.length === JJK.CharacterOrder.length && __battle.battle.godMode && __battle.battle.debugUsed));
  await pg.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'LAB').click()); await pg.waitForTimeout(250);
  await pg.evaluate(() => [...document.querySelectorAll('.lab-panel button')].find((b) => /Spawn ALL bosses/.test(b.textContent)).click());
  ok('LAB panel spawns every boss', await pg.evaluate(() => __battle.battle.enemies.filter((e) => e.alive && JJK.Bosses[e.type]).length === Object.keys(JJK.Bosses).length));
  await pg.evaluate(() => [...document.querySelectorAll('.lab-panel button')].find((b) => /Kill all/.test(b.textContent)).click()); await pg.waitForTimeout(200);
  ok('Kill all works', await pg.evaluate(() => __battle.battle.enemies.filter((e) => e.alive).length === 0));
  ok('sandbox left the real save byte-for-byte untouched', (await pg.evaluate((k) => localStorage.getItem(k), saveKey)) === saveBefore);

  // ---- D. refresh keeps the session; a new tab/session or LOCK asks again
  await pg.reload(); await pg.waitForTimeout(1500);
  ok('refresh: still authenticated', await pg.evaluate(() => JJK.Owner.unlocked()));
  await prompt(pg); await pg.waitForTimeout(500);
  ok('refresh: Ctrl+Shift+O goes straight to the Lab (no prompt)', await labOpen(pg) && !(await pg.$('.oa-input')));
  const tab2 = await open(ctx2);   // new tab = new browser session storage
  ok('new session (fresh tab): code required again', await tab2.evaluate(() => !JJK.Owner.unlocked()));
  await prompt(tab2); ok('new session shows the prompt, not the Lab', !!(await tab2.$('.oa-input')) && !(await labOpen(tab2)));
  await pg.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'LOCK').click()); await pg.waitForTimeout(500);
  ok('LOCK ends the session', await pg.evaluate(() => !JJK.Owner.unlocked() && !sessionStorage.getItem('jjk_owner_session')));
  // ---- E. normal player on the configured build: the whole game works without the Lab
  const ctx3 = await br.newContext(); await configure(ctx3, true); const pp = await open(ctx3);
  const played = await pp.evaluate(() => { const b = new JJK.Battle({ mapId: 'tokyo', diff: 'normal', team: JJK.Profile ? __jjk.profile.teamForBattle() : [], seed: 3 }); b.startWave(); for (let i = 0; i < 600; i++) b.update(JJK.Balance.STEP); return b.wave === 1; });
  ok('player can battle without ever authenticating', played && await pp.evaluate(() => !JJK.Owner.unlocked()));
  ok('lab-only params are ignored without authentication', await pp.evaluate(() => { __jjk.UI.show('battle', { mapId: 'tokyo', diff: 'normal', mode: 'story', lab: { team: [{ id: 'jahjuan', level: 1, stars: 0 }], yen: 99999, god: true } }); return !(__battle && __battle.battle.godMode) && !(__battle && __battle.battle.roster.jahjuan); }));
  // ---- F. nothing sensitive leaked
  const html = await pp.content();
  ok('no code or hash in console output', !logs.some((l) => l.includes(code) || l.includes(block.hash)));
  ok('no code in the served page', !html.includes(code));
  ok('no page errors', !errs.length);
  console.log(res.join('\n'), errs.join(';'));
  await br.close(); process.exit(res.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
