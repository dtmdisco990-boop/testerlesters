const { loadGame } = require('../load');
const J = loadGame();
const team = 'yuji,panda,nobara'.split(',').map((id) => ({ id, level: 1, stars: 0 }));
const b = new J.Battle({ mapId: 'tokyo', diff: 'normal', team, seed: 7 });
b.events.on('leak', ({ enemy }) => { if (b.wave >= 14) console.log('leak', enemy.type, 'wave', b.wave, 'hp', Math.round(enemy.hp), '/', enemy.maxHp, 'shield', Math.round(enemy.shield), 'time', Math.round(b.time)); });
b.events.on('bossSpawn', ({ enemy }) => console.log('boss spawn at', Math.round(b.time), 'units', b.units.map((u) => u.id + u.level).join(',')));
J.Bot.run(b, { skill: 'good', maxSeconds: 4000 });
console.log(b.victory ? 'V' : 'D', b.baseHp);
