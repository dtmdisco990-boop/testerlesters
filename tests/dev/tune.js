// Dev tool: finds the wave-budget multiplier at which a reference team (played by the bot) just barely wins each map.
const { loadGame } = require('../load');
const scenarios = [
  { map: 'tokyo', team: 'yuji,panda,nobara', lvl: 1 },
  { map: 'detention', team: 'yuji,panda,nobara,megumi,maki', lvl: 5 },
  { map: 'shibuya', team: 'yuji,panda,nobara,megumi,maki,nanami', lvl: 10 },
  { map: 'temple', team: 'nanami,maki,megumi,nobara,panda,choso', lvl: 15 },
];
function run(sc, mult, diff = 'normal') {
  const J = loadGame();
  const cfg = J.Maps[sc.map].waveCfg;
  cfg.base *= mult; cfg.per *= mult; cfg.accel *= mult;
  const team = sc.team.split(',').map((id) => ({ id, level: sc.lvl, stars: 0 }));
  const b = new J.Battle({ mapId: sc.map, diff, team, seed: 7 });
  const s = J.Bot.run(b, { skill: 'good', maxSeconds: 5000 });
  return { w: s.victory, wave: s.wave, lost: s.baseLost, of: b.baseMax };
}
for (const sc of scenarios) {
  const out = [];
  for (const m of [0.7, 0.9, 1.0, 1.15, 1.3, 1.5]) { const r = run(sc, m); out.push(m + ':' + (r.w ? 'W(-' + r.lost + ')' : 'L@' + r.wave)); }
  console.log(sc.map.padEnd(10), out.join('  '));
}
