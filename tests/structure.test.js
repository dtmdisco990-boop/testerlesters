// Static checks: the HTML loads exactly the logic files the headless tests load, in the same order; nothing is missing.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LOGIC_FILES } = require('./load');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);

test('index.html loads the same logic files as the headless loader, in the same order', () => {
  const logic = scripts.filter((s) => LOGIC_FILES.includes(s));
  assert.deepEqual(logic, LOGIC_FILES);
});
test('every script referenced by index.html exists and there are no duplicates', () => {
  for (const s of scripts) assert.ok(fs.existsSync(path.join(root, s)), 'missing ' + s);
  assert.equal(new Set(scripts).size, scripts.length, 'duplicate script tag');
});
test('logic files never touch the DOM at load time (headless-safe)', () => {
  for (const f of LOGIC_FILES) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/document\.(getElementById|createElement|querySelector)/.test(src), f + ' touches the DOM');
  }
});
test('presentation files come after logic files and main.js is last', () => {
  assert.equal(scripts[scripts.length - 1], 'js/main.js');
  const lastLogic = Math.max(...LOGIC_FILES.map((f) => scripts.indexOf(f)));
  for (const s of scripts.filter((x) => !LOGIC_FILES.includes(x) && x !== 'js/main.js')) assert.ok(scripts.indexOf(s) > lastLogic, s + ' loads before logic finished');
});
test('stylesheet and asset manifest exist and are valid', () => {
  assert.ok(fs.existsSync(path.join(root, 'style.css')));
  const m = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));
  assert.equal(typeof m, 'object');
});
test('no external network resources are referenced (static, offline-capable)', () => {
  const all = html + fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.ok(!/(src|href)="https?:\/\//.test(html), 'external script/link in html');
  assert.ok(!/url\(\s*['"]?https?:/.test(all), 'external url() in css');
});
test('release switch: debug is gated behind Config.ALLOW_DEBUG and ?debug=1', () => {
  const dbg = fs.readFileSync(path.join(root, 'js/ui/debug.js'), 'utf8');
  assert.ok(/ALLOW_DEBUG/.test(dbg) && /debug=1/.test(dbg));
});
