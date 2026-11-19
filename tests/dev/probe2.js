const { loadGame } = require('../load');
const J = loadGame();
// print wave table for tokyo: threat, entries, hp scale, total enemy HP, yen from kills
const map = J.Maps.tokyo, diff = J.Balance.difficulty.normal;
const waves = J.Waves.generate(map, diff);
for (const w of waves) {
  let hp = 0, yen = 0;
  for (const e of w.entries) {
    const d = J.Enemies[e.type] || J.Bosses[e.type];
    const sc = J.Balance.hpScale(w.n) * (map.waveCfg.hpMult || 1);
    const h = d.boss ? d.hp * (e.hpMult || 1) : d.hp * sc * (e.elite ? 3.4 : 1);
    hp += h; yen += d.yen * (1 + 0.025 * (w.n - 1)) * (e.elite ? 4 : 1);
  }
  const types = {}; w.entries.forEach((e) => { const k = e.type + (e.elite ? '*' : ''); types[k] = (types[k] || 0) + 1; });
  console.log(String(w.n).padStart(2), w.label.padEnd(18), 'n=' + String(w.entries.length).padStart(3), 'hp=' + String(Math.round(hp)).padStart(6), 'yen=' + String(Math.round(yen + w.bonus)).padStart(5), JSON.stringify(types));
}
