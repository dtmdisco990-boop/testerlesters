/* Meta-game data: items, banners, shop, missions, challenges, daily pool, feature unlocks. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});

  const Items = {
    xpS: { id: 'xpS', name: 'Cursed Notes', xp: 120, color: '#9aa7bd', desc: 'Grants 120 character XP.' },
    xpM: { id: 'xpM', name: 'Training Manual', xp: 400, color: '#4aa8ff', desc: 'Grants 400 character XP.' },
    xpL: { id: 'xpL', name: 'Sorcerer\'s Treatise', xp: 1200, color: '#ffb23f', desc: 'Grants 1200 character XP.' },
  };

  // ---------------- Summon banners ----------------
  const Banners = {
    standard: {
      id: 'standard', name: 'Cursed Tide', subtitle: 'Standard Banner', kind: 'standard', color: '#5a7bff',
      rates: { COMMON: 45, RARE: 33, EPIC: 16, LEGENDARY: 6, MYTHIC: 0 },
      pool: { COMMON: ['yuji', 'panda'], RARE: ['nobara', 'megumi', 'maki', 'inumaki'], EPIC: ['nanami', 'meimei', 'todo', 'choso'], LEGENDARY: ['hakari', 'yuta'], MYTHIC: [] },
      pity: { tier: 'LEGENDARY', hard: 50, softStart: 35, softStep: 3 },
      featured: null, guaranteeAfterLoss: false, guarantee10: 'RARE',
      blurb: 'Every sorcerer in the roster except Mythic and Special units. Guaranteed Legendary or better by pull 50.',
    },
    // Permanent, deliberately stingy banner for the Culling Game roster. Locked behind Cursed Temple + player level.
    culling: {
      id: 'culling', name: 'Culling Game', subtitle: 'Permanent \u00b7 Hardest Banner', kind: 'culling', color: '#d94a3a',
      rates: { COMMON: 0, RARE: 62, EPIC: 35.5, LEGENDARY: 2.5, MYTHIC: 0 },
      pool: { COMMON: [], RARE: ['mai', 'momo', 'miwa'], EPIC: ['utahime', 'uraume', 'naoya'], LEGENDARY: ['higuruma', 'geto', 'yuki'], MYTHIC: [] },
      pity: { tier: 'LEGENDARY', hard: 120, softStart: 95, softStep: 4 },
      featured: null, guaranteeAfterLoss: false, guarantee10: 'RARE',
      requires: { level: 12, map: 'temple' }, cost1: 25, cost10: 250, showcase: ['higuruma', 'geto', 'yuki'],
      blurb: 'The Culling Game roster. Legendary rate is only 2.5% and hard pity is 120 pulls. Kashimo, Jogo, Mahito and Sukuna cannot be summoned at all.',
    },
    featured: [
      {
        id: 'sixeyes', name: 'The Honored One', subtitle: 'Featured Banner', kind: 'featured', color: '#7fd0ff',
        rates: { COMMON: 36, RARE: 30, EPIC: 21.5, LEGENDARY: 10, MYTHIC: 2.5 },
        pool: { COMMON: ['yuji', 'panda'], RARE: ['nobara', 'megumi', 'maki', 'inumaki'], EPIC: ['nanami', 'meimei', 'todo', 'choso'], LEGENDARY: ['hakari', 'yuta'], MYTHIC: ['gojo'] },
        pity: { tier: 'MYTHIC', hard: 60, softStart: 40, softStep: 4 },
        featured: { id: 'gojo', tier: 'MYTHIC', share: 1 }, guaranteeAfterLoss: false, guarantee10: 'RARE',
        blurb: 'Satoru Gojo is the only Mythic. Guaranteed by pull 60.',
      },
      {
        id: 'rika', name: 'Cursed Queen\'s Vow', subtitle: 'Featured Banner', kind: 'featured', color: '#ff7ab8',
        rates: { COMMON: 40, RARE: 30, EPIC: 20, LEGENDARY: 10, MYTHIC: 0 },
        pool: { COMMON: ['yuji', 'panda'], RARE: ['nobara', 'megumi', 'maki', 'inumaki'], EPIC: ['nanami', 'meimei', 'todo', 'choso'], LEGENDARY: ['hakari', 'yuta'], MYTHIC: [] },
        pity: { tier: 'LEGENDARY', hard: 40, softStart: 28, softStep: 4 },
        featured: { id: 'yuta', tier: 'LEGENDARY', share: 0.6 }, guaranteeAfterLoss: true, guarantee10: 'RARE',
        blurb: 'Yuta Okkotsu gets 60% of Legendary pulls. If a Legendary is not Yuta, your next Legendary is guaranteed to be.',
      },
    ],
  };

  // ---------------- Shop ----------------
  const Shop = {
    coinPerShard: { COMMON: 20, RARE: 35, EPIC: 60, LEGENDARY: 110, MYTHIC: 250 },
    shardQty: { COMMON: 10, RARE: 10, EPIC: 8, LEGENDARY: 6, MYTHIC: 5 },
    weeklyShardSlots: 4,
    permanent: [
      { key: 'xpS', kind: 'item', item: 'xpS', qty: 1, price: 150, currency: 'coins', limit: 0 },
      { key: 'xpM', kind: 'item', item: 'xpM', qty: 1, price: 480, currency: 'coins', limit: 0 },
      { key: 'xpL', kind: 'item', item: 'xpL', qty: 1, price: 1400, currency: 'coins', limit: 0 },
      { key: 'gems10', kind: 'gems', qty: 10, price: 1500, currency: 'coins', limit: 3, period: 'day' },
    ],
    dailyDeals: [
      { id: 'dealXpL', kind: 'item', item: 'xpL', qty: 1, price: 980, currency: 'coins', label: 'Treatise Sale (-30%)' },
      { id: 'dealXpM', kind: 'item', item: 'xpM', qty: 3, price: 1080, currency: 'coins', label: 'Manual Bundle (-25%)' },
      { id: 'dealGems', kind: 'gems', qty: 15, price: 1950, currency: 'coins', label: 'Gem Cache' },
      { id: 'dealShard', kind: 'shardsRandom', qty: 10, priceMult: 0.8, currency: 'coins', label: 'Shard Special (-20%)' },
      { id: 'dealXpS', kind: 'item', item: 'xpS', qty: 5, price: 560, currency: 'coins', label: 'Notes Bundle (-25%)' },
    ],
    dailySlots: 3,
    gojoShards: { qty: 5, price: 1250, limit: 3, period: 'week' },
  };

  // ---------------- Player feature unlocks ----------------
  const Features = {
    shop: { level: 2, label: 'Shop' },
    endless: { level: 5, label: 'Endless Mode', needMap: 'tokyo' },
    challenges: { level: 4, label: 'Challenges' },
    special: { level: 8, label: 'SPECIAL difficulty' },
  };

  // ---------------- Missions ----------------
  const stat = (path) => (d) => { let v = d; for (const k of path.split('.')) { v = v == null ? undefined : v[k]; } return typeof v === 'number' ? v : 0; };
  const cleared = (map, diff) => (d) => (d.progress.maps[map] && d.progress.maps[map][diff] && d.progress.maps[map][diff].cleared ? 1 : 0);
  const anyClear = (map) => (d) => ['normal', 'hard', 'special'].some((df) => cleared(map, df)(d)) ? 1 : 0;
  const boss = (id) => (d) => (d.bossRecords[id] ? d.bossRecords[id].kills : 0);
  const M = [];
  const m = (id, name, desc, group, target, get, reward) => M.push({ id, name, desc, group, target, get, reward });

  m('kills_100', 'Novice Exorcist', 'Defeat 100 curses.', 'Milestone', 100, stat('stats.kills'), { coins: 300 });
  m('kills_150', 'Cursed Speech', 'Defeat 150 curses. Unlocks Toge Inumaki.', 'Milestone', 150, stat('stats.kills'), { coins: 200, char: 'inumaki' });
  m('kills_500', 'Seasoned Exorcist', 'Defeat 500 curses. Unlocks Mai Zenin.', 'Milestone', 500, stat('stats.kills'), { gems: 40, coins: 800, char: 'mai' });
  m('kills_2000', 'Exorcism Veteran', 'Defeat 2,000 curses.', 'Milestone', 2000, stat('stats.kills'), { gems: 100, coins: 3000 });
  m('kills_10000', 'Plague Ender', 'Defeat 10,000 curses.', 'Milestone', 10000, stat('stats.kills'), { gems: 200, coins: 10000 });
  m('clear_tokyo', 'Welcome to Jujutsu High', 'Complete Tokyo High.', 'Story', 1, anyClear('tokyo'), { gems: 30, coins: 400 });
  m('clear_detention', 'Lockdown Lifted', 'Complete Detention Center. Unlocks Momo Nishimiya.', 'Story', 1, anyClear('detention'), { gems: 40, coins: 700, char: 'momo' });
  m('clear_shibuya', 'Incident Resolved', 'Complete Shibuya Incident.', 'Story', 1, anyClear('shibuya'), { gems: 60, coins: 1200 });
  m('clear_temple', 'The King Falls', 'Complete Cursed Temple.', 'Story', 1, anyClear('temple'), { gems: 150, coins: 3000 });
  m('hard_tokyo', 'Hard Mode: Tokyo', 'Complete Tokyo High on HARD.', 'Story', 1, cleared('tokyo', 'hard'), { gems: 40, coins: 800 });
  m('boss_finger', 'Vessel Slayer', 'Defeat the Finger Bearer.', 'Bosses', 1, boss('finger'), { coins: 400, shards: { todo: 6 } });
  m('boss_jogo', 'Fire Fighter', 'Defeat Jogo.', 'Bosses', 1, boss('jogo'), { gems: 30, coins: 600 });
  m('boss_mahito', 'Soul Surgeon', 'Defeat Mahito.', 'Bosses', 1, boss('mahito'), { gems: 50, coins: 1000 });
  m('boss_sukuna', 'Regicide', 'Defeat Ryomen Sukuna.', 'Bosses', 1, boss('sukuna'), { gems: 120, coins: 2500 });
  m('domain_1', 'Domain Expansion', 'Use a Domain Expansion in battle.', 'Techniques', 1, stat('stats.domains'), { gems: 20 });
  m('domain_10', 'Barrier Master', 'Use Domain Expansions 10 times. Unlocks Utahime Iori.', 'Techniques', 10, stat('stats.domains'), { gems: 50, coins: 1000, char: 'utahime' });
  m('upgrades_25', 'Training Arc', 'Upgrade units 25 times.', 'Techniques', 25, stat('stats.upgrades'), { coins: 400 });
  m('upgrades_100', 'Power Scaling', 'Upgrade units 100 times.', 'Techniques', 100, stat('stats.upgrades'), { gems: 30, coins: 1200 });
  m('deploy_100', 'Frontline Commander', 'Deploy 100 units.', 'Techniques', 100, stat('stats.deploys'), { coins: 500 });
  m('wins_10', 'Winning Streak', 'Win 10 matches.', 'Milestone', 10, stat('stats.wins'), { gems: 30, coins: 600 });
  m('wins_25', 'Veteran Sorcerer', 'Win 25 matches.', 'Milestone', 25, stat('stats.wins'), { gems: 60, coins: 1500 });
  m('coins_10000', 'Coin Collector', 'Earn 10,000 Coins in total.', 'Milestone', 10000, stat('stats.coinsEarned'), { gems: 40 });
  m('summons_10', 'Gamble Starter', 'Perform 10 summons.', 'Collection', 10, stat('summon.total'), { coins: 300 });
  m('summons_50', 'Summon Regular', 'Perform 50 summons.', 'Collection', 50, stat('summon.total'), { gems: 20, coins: 800 });
  m('chars_8', 'Growing Roster', 'Own 8 characters.', 'Collection', 8, (d) => Object.keys(d.characters).filter((id) => id !== 'jahjuan').length, { gems: 30, coins: 600 });
  m('chars_14', 'Complete Roster', 'Own all 14 original characters.', 'Collection', 14, (d) => Object.keys(d.characters).filter((id) => !JJK.Expansion.includes(id)).length, { gems: 100 });
  m('chars_27', 'Culling Game Complete', 'Own all 27 characters, including every Culling Game sorcerer and Sukuna.', 'Collection', 27, (d) => Object.keys(d.characters).filter((id) => id !== 'jahjuan').length, { gems: 400, coins: 20000 });
  m('gauntlet_w20', 'Into Shinjuku', 'Reach wave 20 in the Shinjuku Gauntlet on any difficulty.', 'Gauntlet', 20, (d) => Math.max(0, ...Object.values(d.progress.maps.shinjuku || {}).map((x) => x.bestWave || 0)), { gems: 80, coins: 3000 });
  m('boss_hanami', 'Bloom Cutter', 'Defeat Hanami.', 'Bosses', 1, boss('hanami'), { gems: 60, coins: 2000 });
  m('boss_dagon', 'Tidebreaker', 'Defeat Dagon.', 'Bosses', 1, boss('dagon'), { gems: 60, coins: 2000 });
  m('boss_mahoraga', 'Eighth Handle', 'Defeat the Divine General Mahoraga.', 'Bosses', 1, boss('mahoraga'), { gems: 120, coins: 5000 });
  m('boss_sukunaH', 'Heian King Falls', 'Defeat Ryomen Sukuna (Heian Era).', 'Bosses', 1, boss('sukunaH'), { gems: 250, coins: 10000 });
  m('endless_10', 'Endless I', 'Reach wave 10 in Endless Mode.', 'Endless', 10, (d) => d.endless.bestWave, { gems: 20, coins: 500 });
  m('endless_30', 'Endless II', 'Reach wave 30 in Endless Mode.', 'Endless', 30, (d) => d.endless.bestWave, { gems: 60, coins: 2000 });
  m('endless_50', 'Endless III', 'Reach wave 50 in Endless Mode.', 'Endless', 50, (d) => d.endless.bestWave, { gems: 120, coins: 5000, shards: { gojo: 10 } });
  m('player_10', 'Rising Star', 'Reach player level 10.', 'Milestone', 10, stat('player.level'), { gems: 40, coins: 1000 });
  m('char_10', 'Dedicated Training', 'Raise any character to level 10.', 'Collection', 10, (d) => Math.max(0, ...Object.values(d.characters).map((c) => c.level)), { coins: 800 });

  // ---------------- Daily missions (reset every UTC day, no login streaks) ----------------
  const DailyPool = [
    { id: 'd_kills', name: 'Exorcise 60 curses', stat: 'kills', target: 60, reward: { coins: 180 } },
    { id: 'd_deploy', name: 'Deploy 12 units', stat: 'deploys', target: 12, reward: { coins: 150 } },
    { id: 'd_upgrade', name: 'Upgrade units 10 times', stat: 'upgrades', target: 10, reward: { coins: 180 } },
    { id: 'd_win', name: 'Win a match', stat: 'wins', target: 1, reward: { gems: 10, coins: 150 } },
    { id: 'd_yen', name: 'Earn 3,000 Yen in matches', stat: 'yen', target: 3000, reward: { coins: 200 } },
    { id: 'd_boss', name: 'Defeat a boss', stat: 'bosses', target: 1, reward: { gems: 12 } },
    { id: 'd_domain', name: 'Use a Domain Expansion', stat: 'domains', target: 1, reward: { gems: 12 } },
  ];

  // ---------------- Challenges: special objectives that unlock characters/rewards ----------------
  const Challenges = [
    { id: 'endless_20', name: 'Endless Trial', desc: 'Reach wave 20 in Endless Mode.', reward: { char: 'todo', coins: 500 },
      progress: (d) => d.endless.bestWave, target: 20, check: () => false },
    { id: 'tokyo_flawless', name: 'Untouched', desc: 'Complete Tokyo High without losing any base HP.', reward: { gems: 60, coins: 600 },
      target: 1, check: (s) => s.victory && s.mapId === 'tokyo' && s.mode === 'story' && s.baseLost === 0 },
    { id: 'jogo_swift', name: 'Swift Exorcism', desc: 'Defeat Jogo within 100 seconds of his arrival.', reward: { shards: { choso: 25 }, coins: 600 },
      target: 1, check: (s) => s.bossTimes && s.bossTimes.jogo !== undefined && s.bossTimes.jogo <= 100 },
    { id: 'mahito_nosell', name: 'Soul Stays Intact', desc: 'Defeat Mahito without selling any unit.', reward: { shards: { yuta: 15 }, coins: 800 },
      target: 1, check: (s) => s.bossTimes && s.bossTimes.mahito !== undefined && s.sold === 0 },
    { id: 'temple_hard', name: 'King of Hard Mode', desc: 'Complete Cursed Temple on HARD.', reward: { shards: { gojo: 20 }, gems: 100 },
      target: 1, check: (s) => s.victory && s.mapId === 'temple' && s.diff !== 'normal' && s.mode === 'story' },
    { id: 'secret_toji', name: '???', hiddenName: 'Heavenly Restriction', desc: 'A man with no cursed energy... Win on HARD or SPECIAL with 3+ units deployed, all of them Physical Specialists.', hidden: true,
      reward: { char: 'toji' }, target: 1,
      check: (s) => {
        if (!s.victory || s.mode !== 'story' || s.diff === 'normal') return false;
        const ids = s.deployedIds || [];
        if (ids.length < 3) return false;
        return ids.every((id) => JJK.Characters[id] && JJK.Characters[id].traits.includes('Physical Specialist'));
      } },
    { id: 'miwa_untouched', name: 'Unbroken Ring', desc: 'Clear Detention Center on HARD or SPECIAL without a single unit being disabled. Unlocks Kasumi Miwa.', reward: { char: 'miwa', coins: 1500 },
      target: 1, check: (s) => s.victory && s.mapId === 'detention' && s.mode === 'story' && s.diff !== 'normal' && s.disabled === 0 },
    { id: 'naoya_blitz', name: '24 Frames', desc: 'Defeat Mahito within 55 seconds of his arrival, or Sukuna within 90. Unlocks Naoya Zenin.', reward: { char: 'naoya', coins: 2000 },
      target: 1, check: (s) => !!s.bossTimes && ((s.bossTimes.mahito !== undefined && s.bossTimes.mahito <= 55) || (s.bossTimes.sukuna !== undefined && s.bossTimes.sukuna <= 90)) },
    { id: 'gauntlet_special', name: 'Culling Game Champion', desc: 'Clear the Shinjuku Gauntlet on SPECIAL: 45 waves and five bosses ending with Heian-era Sukuna. Unlocks Ryomen Sukuna.', reward: { char: 'sukunaC', gems: 500, coins: 25000 },
      target: 1, check: (s) => s.victory && s.mapId === 'shinjuku' && s.mode === 'story' && s.diff === 'special' && !s.debug },
    { id: 'gauntlet_hard', name: 'Shinjuku Survivor', desc: 'Clear the Shinjuku Gauntlet on HARD.', reward: { gems: 200, coins: 8000, shards: { kashimo: 15 } },
      target: 1, check: (s) => s.victory && s.mapId === 'shinjuku' && s.mode === 'story' && s.diff === 'hard' },
  ];

  JJK.Items = Items;
  JJK.Banners = Banners;
  JJK.Shop = Shop;
  JJK.Features = Features;
  JJK.Missions = M;
  JJK.DailyPool = DailyPool;
  JJK.Challenges = Challenges;
})(typeof window !== 'undefined' ? window : globalThis);
