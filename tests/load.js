/* Loads the headless (non-rendering) game logic into the current Node realm for testing. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Keep in sync with index.html (tests/structure.test.js verifies this).
const LOGIC_FILES = [
  'js/core/util.js',
  'js/data/balance.js',
  'js/data/characters.js',
  'js/data/characters2.js',
  'js/data/enemies.js',
  'js/data/maps.js',
  'js/data/meta.js',
  'js/core/save-manager.js',
  'js/core/progression.js',
  'js/sim/waves.js',
  'js/sim/battle.js',
  'js/sim/kits.js',
  'js/sim/kits2.js',
  'js/sim/bosses.js',
  'js/sim/bot.js',
  'js/sim/selftest.js',
];

function loadGame(files) {
  delete globalThis.JJK;
  for (const f of files || LOGIC_FILES) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInThisContext(code, { filename: f });
  }
  return globalThis.JJK;
}
module.exports = { loadGame, LOGIC_FILES, ROOT };
