const { loadGame } = require('../load');
const J = loadGame();
const [map='shibuya', teamCsv='yuji,panda,nobara,megumi,maki,nanami', lvl='10'] = process.argv.slice(2);
const team = teamCsv.split(',').map((id) => ({ id, level: +lvl, stars: 0 }));
const b = new J.Battle({ mapId: map, diff: 'normal', team, seed: 7 });
b.events.on('wave', ({ n, spec }) => {
  const t = {}; spec.entries.forEach((e) => { const k = e.type + (e.elite ? '*' : ''); t[k] = (t[k] || 0) + 1; });
  console.log('W' + n, spec.label, JSON.stringify(t), 'yen', Math.round(b.yen), 'units', b.units.map((u) => u.id[0] + u.level).join(''));
});
b.events.on('leak', ({ enemy }) => console.log('   LEAK', enemy.type, 'w' + b.wave, 'lane', enemy.lane));
J.Bot.run(b, { skill: 'good', maxSeconds: 4000 });
console.log(b.victory ? 'V' : 'D', b.baseHp);
