/* Dev tool: the generic Bot plus the counters a knowledgeable player would use against the Culling Game bosses.
   Usage: node tests/dev/smartbot.js <diff> <team> <level> <stars> [seed] [bossHpOverride]
   It exists to prove the Gauntlet is winnable with correct play while the plain Bot (no counters) loses. */
const { loadGame } = require('../load.js');
const J = loadGame();
const { Battle, Balance } = J;
const TEAMS = {
  starter: ['yuji', 'panda', 'nobara', 'megumi', 'nanami', 'gojo'],
  mid: ['yuji', 'nobara', 'nanami', 'choso', 'meimei', 'todo'],
  ward: ['yuji', 'miwa', 'nanami', 'choso', 'todo', 'nobara'],
  nullify: ['toji', 'higuruma', 'yuta', 'nanami', 'choso', 'miwa'],
};

function counters(b) {
  const buds = b.enemies.some((e) => e.alive && e.type === 'bud');
  for (const u of b.units) {
    if (!u.def.targeting.includes('weakest')) continue;
    if (buds && u.targeting !== 'weakest') b.setTargeting(u, 'weakest');
    if (!buds && u.targeting === 'weakest' && u.def.defaultTargeting !== 'weakest') b.setTargeting(u, u.def.defaultTargeting);
  }
  // clash: activate a Domain while a "clash" hazard is in its warning window
  const h = b.hazards.find((x) => x.hint && /Domain/i.test(x.hint));
  if (h && !b.domain) for (const u of b.units) if (b.canActivateDomain(u)) { b.activateDomain(u); break; }
}

function play(opts) {
  const team = TEAMS[opts.team] || opts.team;
  if (opts.bossHp != null) for (const k of Object.keys(J.Maps.shinjuku.waveCfg.bosses)) J.Maps.shinjuku.waveCfg.bosses[k].hp = opts.bossHp;
  const b = new Battle({ mapId: opts.map || 'shinjuku', diff: opts.diff, team: team.map((id) => ({ id, level: opts.level, stars: opts.stars })), seed: opts.seed || 3 });
  const order = b.teamOrder.slice().sort((x, y) => b.roster[x].cost - b.roster[y].cost);
  const step = Balance.STEP;
  let dT = 0, cT = 0;
  const log = [];
  b.events.on('bossDeath', (e) => log.push(e.enemy.type + '@' + Math.round(b.time)));
  while (!b.over && b.time < (opts.maxSeconds || 9000)) {
    dT -= step; cT -= step;
    if (dT <= 0) { dT = 0.4; J.Bot.decide(b, order, 'good', true, { useDomains: !opts.smart }); }
    if (opts.smart && cT <= 0) { cT = 0.15; counters(b); if (!b.hazards.some((h) => h.hint) && !b.domain && b.enemies.length > 12) for (const u of b.units) if (b.canActivateDomain(u)) { b.activateDomain(u); break; } }
    b.update(step);
  }
  return { b, log };
}
module.exports = { play, TEAMS };

if (require.main === module) {
  const [diff, team, level, stars, seed, bossHp] = process.argv.slice(2);
  for (const smart of [false, true]) {
    const { b, log } = play({ diff, team, level: +level, stars: +stars, seed: +seed || 3, bossHp: bossHp != null ? +bossHp : undefined, smart });
    console.log((smart ? 'SMART ' : 'PLAIN ') + diff + ' ' + team + ': ' + (b.victory ? 'WIN' : 'lose') + ' wave ' + b.wave + '/' + b.totalWaves + ' t=' + Math.round(b.time) + 's bosses[' + log.join(' ') + ']');
  }
}
