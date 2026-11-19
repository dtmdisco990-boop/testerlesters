const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./load.js');

const J = loadGame();
const root = path.join(__dirname, '..');

const crypto = require('crypto');
const vm = require('vm');
const tool = require(path.join(root, 'tools/owner-access.js'));
const OWNER_SRC = fs.readFileSync(path.join(root, 'js/ui/owner.js'), 'utf8');

// A throwaway code made fresh for every test run (never written anywhere): the real owner code is unknown to the repo.
const randomCode = () => 'T' + crypto.randomBytes(12).toString('base64url');

function makeOwner(block, opts) {
  opts = opts || {};
  const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
  const session = opts.session || mem(), local = opts.local || mem();
  const logs = [];
  const sandbox = {
    JJK: { Config: { OWNER_ACCESS: block }, Util: J.Util, Balance: J.Balance, UI: { register() {}, toast() {}, modal() { return { close() {} }; }, el: () => ({}), btn: () => ({}) } },
    sessionStorage: session, localStorage: local, crypto: crypto.webcrypto, TextEncoder, atob: (s) => Buffer.from(s, 'base64').toString('binary'), Date, Math, JSON, Uint8Array, Array, String, Number,
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')) },
  };
  sandbox.window = sandbox; vm.createContext(sandbox);
  vm.runInContext(OWNER_SRC, sandbox);
  return { O: sandbox.JJK.Owner, session, local, logs, sandbox };
}

test('the browser derivation (Web Crypto) equals the generator tool, and the hash is not reversible text', async () => {
  const code = randomCode(), blk = tool.makeBlock(code);
  const { O } = makeOwner(blk);
  assert.equal(await O.derive(code, blk.salt, blk.iterations), blk.hash);
  assert.notEqual(await O.derive(code + 'x', blk.salt, blk.iterations), blk.hash);
  assert.match(blk.hash, /^[0-9a-f]{64}$/);
  assert.ok(blk.iterations >= 200000, 'meaningful work factor');
  assert.notEqual(tool.makeBlock(code).salt, blk.salt, 'fresh random salt each time');
});

test('the repository ships no readable code: shipped config is an empty/locked block or hex only; no code in logs, errors or messages', () => {
  const bal = fs.readFileSync(path.join(root, 'js/data/balance.js'), 'utf8');
  const m = bal.match(/OWNER-ACCESS-BEGIN\n([\s\S]*?)\n\s*\/\/ OWNER-ACCESS-END/);
  assert.ok(m, 'markers present');
  const blk = m[1];
  assert.ok(/salt: '([A-Za-z0-9+\/=]*)'/.test(blk) && /hash: '([0-9a-f]*)'/.test(blk), 'only salt + hash fields');
  assert.ok(!/(code|pass(word|code)?|secret)\s*:/i.test(blk), 'no code-like field');
  assert.ok(!/console\./.test(OWNER_SRC), 'owner.js never logs');
  assert.ok(!OWNER_SRC.split('\n').some((l) => /textContent|toast|Error\(/.test(l) && /hash|salt/i.test(l)), 'hash/salt never reach a message or error');
  for (const f of ['README.md', 'tools/owner-access.js', 'tools/owner-access.html']) assert.ok(!/jahjuan-[a-z0-9]{8}/i.test(fs.readFileSync(path.join(root, f), 'utf8')), f);
  assert.ok(!fs.existsSync(path.join(root, 'tools/owner-passcode.js')), 'old tool removed');
});

test('wrong code: ACCESS DENIED, stays locked, reveals nothing; correct code unlocks', async () => {
  const code = randomCode(), blk = tool.makeBlock(code);
  const { O, session, logs } = makeOwner(blk);
  assert.equal(O.enabled(), true); assert.equal(O.configured(), true); assert.equal(O.unlocked(), false);
  for (const wrong of ['', 'x', code.slice(0, -1), code + '!', code.toUpperCase()]) {
    if (!wrong) continue;
    const r = await O.check(wrong); assert.equal(r.ok, false); assert.equal(r.reason, 'denied', 'identical answer for near-misses'); assert.deepEqual(Object.keys(r).sort(), ['ok', 'reason'], 'no extra detail');
    assert.equal(O.unlocked(), false);
  }
  const ok = await O.check(code);
  assert.equal(ok.ok, true); assert.equal(O.unlocked(), true);
  assert.ok(logs.length === 0, 'nothing logged');
  assert.equal(session.getItem('jjk_owner_session'), '1');
  assert.ok(![...session._m.values()].some((v) => v.includes(code) || v.includes(blk.hash)), 'session storage holds neither the code nor the hash');
});

test('lockout: 5 wrong attempts lock (even for the right code), doubling, persisting across a reload; success resets', async () => {
  const code = randomCode(), blk = tool.makeBlock(code);
  const local = { _m: new Map(), getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }, setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); } };
  let { O } = makeOwner(blk, { local });
  for (let i = 0; i < 4; i++) assert.equal((await O.check('nope' + i)).reason, 'denied');
  assert.equal((await O.check('nope5')).reason, 'locked');
  assert.ok(O.lockedFor() > 25000 && O.lockedFor() <= 30000, 'first lock about 30s: ' + O.lockedFor());
  assert.equal((await O.check(code)).reason, 'locked', 'right code refused while locked');
  assert.equal(O.unlocked(), false);
  // a page reload (new module instance, same localStorage) is still locked
  ({ O } = makeOwner(blk, { local }));
  assert.ok(O.lockedFor() > 0, 'lock survives reload');
  assert.equal((await O.check(code)).reason, 'locked');
  // after the lock expires the right code works and the penalty level resets
  const g = JSON.parse(local.getItem('jjk_owner_guard')); g.until = Date.now() - 1; local.setItem('jjk_owner_guard', JSON.stringify(g));
  assert.equal((await O.check(code)).ok, true);
  assert.deepEqual(JSON.parse(local.getItem('jjk_owner_guard')), { f: 0, lvl: 0, until: 0 });
  // escalation: a second lock (without a success in between) is twice as long
  const loc2 = { _m: new Map(), getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }, setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); } };
  const { O: O2 } = makeOwner(blk, { local: loc2 });
  for (let i = 0; i < 5; i++) await O2.check('bad');
  const first = O2.lockedFor();
  const g2 = JSON.parse(loc2.getItem('jjk_owner_guard')); g2.until = Date.now() - 1; loc2.setItem('jjk_owner_guard', JSON.stringify(g2));
  for (let i = 0; i < 5; i++) await O2.check('bad');
  assert.ok(O2.lockedFor() > first * 1.8, 'second lock longer: ' + O2.lockedFor() + ' vs ' + first);
});

test('session semantics: persists for the browser session (refresh), a new session needs the code again, and it never enters the game save', async () => {
  const code = randomCode(), blk = tool.makeBlock(code);
  const a = makeOwner(blk);
  assert.equal((await a.O.check(code)).ok, true);
  // "refresh": fresh module instance, same sessionStorage
  const refreshed = makeOwner(blk, { session: a.session, local: a.local });
  assert.equal(refreshed.O.unlocked(), true, 'still unlocked after refresh');
  // "closed and reopened browser": new sessionStorage
  const reopened = makeOwner(blk, { local: a.local });
  assert.equal(reopened.O.unlocked(), false, 'new session requires the code');
  // lock() ends the session
  refreshed.O.lock(); assert.equal(refreshed.O.unlocked(), false);
  // the game save never mentions owner status
  const sm = new J.SaveManager(new J.Util.MemoryStorage()); sm.load();
  const p = new J.Profile(sm, { now: () => 1 }); p.commit();
  assert.ok(!/owner/i.test(JSON.stringify(sm.data)), 'owner status is not in the save');
  assert.ok(!/owner/i.test(fs.readFileSync(path.join(root, 'js/core/progression.js'), 'utf8') + fs.readFileSync(path.join(root, 'js/core/save-manager.js'), 'utf8')), 'save code knows nothing about owner');
});

test('fails closed: not configured / disabled / no Web Crypto => locked for everyone, game unaffected', async () => {
  const code = randomCode();
  const unset = makeOwner({ enabled: true, iterations: 210000, salt: '', hash: '' });
  assert.equal(unset.O.configured(), false);
  assert.equal((await unset.O.check(code)).reason, 'unconfigured'); assert.equal(unset.O.unlocked(), false);
  const blk = tool.makeBlock(code);
  const off = makeOwner(Object.assign({}, blk, { enabled: false }));
  assert.equal(off.O.enabled(), false); assert.equal((await off.O.check(code)).ok, false); assert.equal(off.O.unlocked(), false);
  const nocrypto = makeOwner(blk); nocrypto.sandbox.crypto = undefined;
  assert.equal((await nocrypto.O.check(code)).reason, 'unavailable'); assert.equal(nocrypto.O.unlocked(), false);
  // a forged session flag does nothing when the Lab is not configured
  const forged = makeOwner({ enabled: true, iterations: 1, salt: '', hash: '' }); forged.session.setItem('jjk_owner_session', '1');
  assert.equal(forged.O.unlocked(), false);
});

test('generator tool: hidden-prompt/stdin flow writes only salt+hash into balance.js and never echoes the code', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jjk-'));
  fs.mkdirSync(path.join(tmp, 'js/data'), { recursive: true }); fs.mkdirSync(path.join(tmp, 'tools'), { recursive: true });
  fs.copyFileSync(path.join(root, 'js/data/balance.js'), path.join(tmp, 'js/data/balance.js'));
  fs.copyFileSync(path.join(root, 'tools/owner-access.js'), path.join(tmp, 'tools/owner-access.js'));
  const code = randomCode();
  const out = require('child_process').execFileSync('node', [path.join(tmp, 'tools/owner-access.js'), '--write'], { input: code, encoding: 'utf8' });
  assert.ok(!out.includes(code), 'code not echoed');
  const bal = fs.readFileSync(path.join(tmp, 'js/data/balance.js'), 'utf8');
  assert.ok(!bal.includes(code), 'code not written');
  const m = bal.match(/salt: '([^']+)'/), h = bal.match(/hash: '([0-9a-f]{64})'/);
  assert.ok(m && h);
  assert.equal(tool.derive(code, m[1], 210000), h[1]);
  assert.throws(() => require('child_process').execFileSync('node', [path.join(tmp, 'tools/owner-access.js')], { input: 'short', stdio: 'pipe' }), /./, 'weak codes refused');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('SelfTest covers every character, enemy, boss, map x difficulty and banner, and all of it passes', async () => {
  const S = J.SelfTest;
  const need = { characters: J.CharacterOrder.length, enemies: Object.keys(J.Enemies).length, bosses: Object.keys(J.Bosses).length, maps: Object.keys(J.Maps).length * 4 };
  for (const g of Object.keys(need)) assert.equal(S.tasks.filter((t) => t.group === g).length, need[g], g + ' coverage');
  const r = await S.run({ groups: S.groups });
  const bad = r.results.filter((x) => !x.ok).map((x) => x.group + ':' + x.name + ' ' + x.detail);
  assert.deepEqual(bad, []);
  assert.ok(r.total >= 70);
});

test('SelfTest actually fails when something is broken (it is not a rubber stamp)', async () => {
  const S = J.SelfTest, d = J.Characters.mai, k = J.Kits.mai.attack;
  J.Kits.mai.attack = () => false; // a unit that never does anything
  try {
    const r = await S.run({ groups: ['characters'], filter: 'mai' });
    assert.ok(r.failed >= 1, 'broken Mai must be caught');
  } finally { J.Kits.mai.attack = k; }
  const old = d.cost; d.cost = 0;
  try { const r = await S.run({ groups: ['characters'], filter: 'mai' }); assert.ok(r.results.length >= 1); } finally { d.cost = old; }
});

test('god mode keeps the base alive; debug matches are flagged', () => {
  const b = new J.Battle({ mapId: 'tokyo', diff: 'normal', team: [{ id: 'yuji', level: 1, stars: 0 }], seed: 1 });
  b.godMode = true; b.state = 'wave'; b.debugUsed = true;
  for (let i = 0; i < 30; i++) b.spawnEnemy('brute', { wave: 40 });
  for (let i = 0; i < 4000 && !b.over; i++) b.update(J.Balance.STEP);
  assert.equal(b.baseHp, b.baseMax);
  assert.equal(b.getSummary().debug, true);
});
