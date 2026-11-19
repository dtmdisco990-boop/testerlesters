// Dev tool: node tests/balance-probe.js [map] [diff] [teamCSV] [skill]
const { loadGame } = require('../load');
const J = loadGame();
const [map = 'tokyo', diff = 'normal', teamCsv = 'yuji,panda,nobara', skill = 'good'] = process.argv.slice(2);
const team = teamCsv.split(',').map((id) => ({ id, level: 1, stars: 0 }));
const t0 = Date.now();
const b = new J.Battle({ mapId: map, diff, team, seed: 7 });
const s = J.Bot.run(b, { skill, maxSeconds: 3000 });
console.log(JSON.stringify({ map, diff, team: teamCsv, skill, victory: s.victory, wave: s.wave + '/' + s.totalWaves, cleared: s.wavesCleared, baseLost: s.baseLost, kills: s.kills, yen: s.yenEarned, sim_sec: s.duration, units: b.units.length, real_ms: Date.now() - t0 }));
console.log(s.unitStats.map((u) => u.id + ':' + u.kills + 'k/' + u.damage + 'd').join('  '));
