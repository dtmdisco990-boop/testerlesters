/* Dev tool: staged boss duel. A fully-funded team (all units placed + upgraded by the Bot) faces ONE boss at the wave it appears.
   Usage: node tests/dev/bossduel.js <boss> <diff> <team> [wave] [smart:0|1] [level] [stars] */
const { loadGame } = require('../load.js');
const J = loadGame();
const { Battle, Balance } = J;
const { TEAMS } = require('./smartbot.js');
const TEAMX = Object.assign({}, TEAMS, {
  burst: ['yuki', 'higuruma', 'geto', 'kashimo', 'miwa', 'nanami'],
  all: ['gojo', 'yuta', 'higuruma', 'geto', 'miwa', 'toji'],
});
function duel(boss, diff, teamKey, wave, smart, level, stars, seed) {
  const team = TEAMX[teamKey] || teamKey.split(',');
  const b = new Battle({ mapId: 'shinjuku', diff, team: team.map((id) => ({ id, level, stars })), seed: seed || 5, startYen: 5e6 });
  b.wave = wave; b.canStartWave = () => false; // setup only: the Bot must not start a real wave
  const order = b.teamOrder.slice().sort((x, y) => b.roster[x].cost - b.roster[y].cost);
  for (let i = 0; i < 400; i++) J.Bot.decide(b, order, 'good', true, { useDomains: false });
  const hpMult = J.Maps.shinjuku.waveCfg.bosses[{ hanami: 10, dagon: 20, mahito: 30, mahoraga: 38, sukunaH: 45 }[boss]].hp;
  b.yen = 0; b.state = 'wave'; b.waveSpec = null;
  const e = b.spawnEnemy(boss, { wave, hpMult });
  b.wave = wave; b.state = 'wave';
  const step = Balance.STEP; let cT = 0, nullT = 0;
  const log = [];
  b.events.on('bossPhase', (x) => log.push(Math.round(b.time) + ':' + x.name));
  while (e.alive && !b.over && b.time < 400) {
    cT -= step;
    if (cT <= 0) {
      cT = 0.15;
      if (smart) {
        const buds = b.enemies.some((x) => x.alive && x.type === 'bud');
        for (const u of b.units) { if (!u.def.targeting.includes('weakest')) continue; if (buds) b.setTargeting(u, 'weakest'); else b.setTargeting(u, u.def.defaultTargeting); }
        const h = b.hazards.find((x) => x.hint && /Domain/i.test(x.hint));
        if (h && !b.domain) for (const u of b.units) if (b.canActivateDomain(u)) { b.activateDomain(u); break; }
        // hold domains for Dagon's exposed window / otherwise use them freely on this boss
        if (!h && !b.domain && boss !== 'sukunaH' && boss !== 'dagon') for (const u of b.units) if (b.canActivateDomain(u)) { b.activateDomain(u); break; }
        if (boss === 'dagon' && e.ai.exposed > 0 && !b.domain) for (const u of b.units) if (b.canActivateDomain(u) && !b.hazards.some((x) => x.hint)) { b.activateDomain(u); break; }
      } else if (!b.domain) for (const u of b.units) if (b.canActivateDomain(u)) { b.activateDomain(u); break; }
    }
    b.update(step);
  }
  return { killed: !e.alive && !e.reached, t: Math.round(b.time), hpLeft: Math.round(e.hp), max: e.maxHp, units: b.units.length, base: b.baseHp, log, adapt: e.ai && e.ai.n };
}
module.exports = { duel };
if (require.main === module) {
  const [boss, diff, team, wave, smart, level, stars] = process.argv.slice(2);
  const r = duel(boss, diff, team, +wave || 20, smart === '1', +level || 30, +stars || 5);
  console.log(boss, diff, team, 'smart=' + smart, r.killed ? 'KILLED' : 'ESCAPED/LOST', 'hp left ' + r.hpLeft + '/' + r.max, 't=' + r.t, 'units', r.units, 'baseHp', r.base, 'adapted', r.adapt);
  console.log('  ' + r.log.join(' | '));
}
