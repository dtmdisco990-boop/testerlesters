/* Profile: all persistent progression logic (currencies, roster, summons, shop, missions, rewards). UI-agnostic and fully testable. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;
  const TIER_ORDER = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
  const DIFFS = ['normal', 'hard', 'special'];
  /** JOAN: the one character that bypasses banners, tiers and pity entirely. 1 in JOAN_ODDS on every single pull. */
  const JOAN_ID = 'jahjuan', JOAN_ODDS = 200000;
  const tierRank = (t) => (t === 'JOAN' ? 99 : TIER_ORDER.indexOf(t));

  // ---------------------------------------------------------------- pure summon maths (exported for tests/UI)
  const Summon = {
    JOAN_ID, JOAN_ODDS,
    /** Independent JOAN roll via rng.joan() (a uniform [0,1) source). Real play attaches Math.random; callers that pass their own
        seeded rng without .joan (tests) never roll JOAN, so seeded sequences stay deterministic. Never consumes the banner rng. */
    rollJoan(rng) {
      return !!rng && typeof rng.joan === 'function' && rng.joan() < 1 / JOAN_ODDS;
    },
    /** Per-tier rates (percent, sum 100) for the NEXT pull given the pity counter. */
    tierRates(banner, counter) {
      const base = banner.rates;
      const pt = banner.pity.tier;
      const idx = TIER_ORDER.indexOf(pt);
      const hi = TIER_ORDER.slice(idx), lo = TIER_ORDER.slice(0, idx);
      const baseHi = hi.reduce((s, t) => s + (base[t] || 0), 0);
      const baseLo = lo.reduce((s, t) => s + (base[t] || 0), 0);
      let pHi = baseHi;
      const n = counter + 1;
      if (n >= banner.pity.hard) pHi = 100;
      else if (n >= banner.pity.softStart) pHi = Math.min(100, baseHi + (n - banner.pity.softStart + 1) * banner.pity.softStep);
      const out = {};
      for (const t of TIER_ORDER) out[t] = 0;
      for (const t of hi) out[t] = baseHi > 0 ? (base[t] || 0) * (pHi / baseHi) : 0;
      for (const t of lo) out[t] = baseLo > 0 ? (base[t] || 0) * ((100 - pHi) / baseLo) : 0;
      if (baseHi === 0 && pHi === 100) { out[pt] = 100; }
      return out;
    },

    /** Per-character rates for the base state (no pity), for the transparent rates table. */
    charRates(banner) {
      const out = [];
      for (const t of TIER_ORDER) {
        const pool = banner.pool[t] || [];
        const rate = banner.rates[t] || 0;
        if (!pool.length || rate <= 0) continue;
        const f = banner.featured && banner.featured.tier === t ? banner.featured : null;
        for (const id of pool) {
          let r;
          if (f) r = id === f.id ? rate * f.share : (pool.length > 1 ? rate * (1 - f.share) / (pool.length - 1) : 0);
          else r = rate / pool.length;
          out.push({ id, tier: t, rate: r, featured: !!(f && f.id === id) });
        }
      }
      return out;
    },

    rollTier(rng, rates, minTier) {
      const start = minTier ? TIER_ORDER.indexOf(minTier) : 0;
      let total = 0;
      for (let i = start; i < TIER_ORDER.length; i++) total += rates[TIER_ORDER[i]];
      let x = rng.next() * total;
      for (let i = start; i < TIER_ORDER.length; i++) {
        const t = TIER_ORDER[i];
        if (rates[t] <= 0) continue;
        x -= rates[t];
        if (x < 0) return t;
      }
      for (let i = TIER_ORDER.length - 1; i >= start; i--) if (rates[TIER_ORDER[i]] > 0) return TIER_ORDER[i];
      return TIER_ORDER[start];
    },

    pickChar(rng, banner, tier, state) {
      const pool = banner.pool[tier];
      const f = banner.featured && banner.featured.tier === tier ? banner.featured : null;
      if (!f) return pool[Math.floor(rng.next() * pool.length)];
      if (banner.guaranteeAfterLoss && state.lost) { state.lost = false; return f.id; }
      const others = pool.filter((id) => id !== f.id);
      if (!others.length || rng.next() < f.share) { state.lost = false; return f.id; }
      state.lost = true;
      return others[Math.floor(rng.next() * others.length)];
    },
  };

  class Profile {
    constructor(saveManager, opts) {
      opts = opts || {};
      this.sm = saveManager;
      this.now = opts.now || (() => Date.now());
      this.events = new Util.Emitter();
      this.debugUnlockAll = false;
    }
    get d() { return this.sm.data; }
    commit() { this.sm.save(); this.events.emit('changed'); }

    // ---------------------------------------------------------------- currencies
    get coins() { return this.d.currencies.coins; }
    get gems() { return this.d.currencies.gems; }
    addCoins(n) { n = Util.int(n, 0, 0, 1e9); this.d.currencies.coins = Math.min(1e9, this.d.currencies.coins + n); this.d.stats.coinsEarned += n; return n; }
    addGems(n) { n = Util.int(n, 0, 0, 1e7); this.d.currencies.gems = Math.min(1e7, this.d.currencies.gems + n); this.d.stats.gemsEarned += n; return n; }
    spendCoins(n) { n = Util.int(n, 0, 0, 1e9); if (this.d.currencies.coins < n) return false; this.d.currencies.coins -= n; return true; }
    spendGems(n) { n = Util.int(n, 0, 0, 1e7); if (this.d.currencies.gems < n) return false; this.d.currencies.gems -= n; return true; }

    // ---------------------------------------------------------------- player level
    playerLevel() { return this.d.player.level; }
    playerXpNeeded() { return this.d.player.level >= Balance.playerLevelCap ? 0 : Balance.playerXpToNext(this.d.player.level); }
    addPlayerXP(n) {
      n = Util.int(n, 0, 0, 1e7);
      const p = this.d.player;
      let gained = 0, gems = 0;
      if (p.level >= Balance.playerLevelCap) return { levels: 0, gems: 0 };
      p.xp += n;
      while (p.level < Balance.playerLevelCap && p.xp >= Balance.playerXpToNext(p.level)) {
        p.xp -= Balance.playerXpToNext(p.level);
        p.level++;
        gained++;
        gems += p.level % 5 === 0 ? 25 : 5;
      }
      if (p.level >= Balance.playerLevelCap) p.xp = 0;
      if (gems) this.addGems(gems);
      return { levels: gained, gems };
    }

    // ---------------------------------------------------------------- roster
    owns(id) { return !!this.d.characters[id]; }
    ownedIds() { return JJK.CharacterOrder.filter((id) => this.owns(id)); }
    shardsOf(id) { return this.d.shards[id] || 0; }
    addShards(id, n) { if (!JJK.Characters[id]) return 0; n = Util.int(n, 0, 0, 1e6); if (n > 0) this.d.shards[id] = Math.min(1e6, (this.d.shards[id] || 0) + n); return n; }

    /** Grant a character. Duplicates convert to shards. */
    grantCharacter(id) {
      const def = JJK.Characters[id];
      if (!def) return { ok: false };
      if (this.owns(id)) {
        const sh = Balance.rarity[def.rarity].dupShards;
        this.addShards(id, sh);
        return { ok: true, isNew: false, shards: sh, id };
      }
      this.d.characters[id] = { level: 1, xp: 0, stars: 0 };
      return { ok: true, isNew: true, shards: 0, id };
    }

    unlockShardCost(id) { return Balance.rarity[JJK.Characters[id].rarity].unlockShards; }
    canUnlockWithShards(id) { return JJK.Characters[id].rarity !== 'JOAN' && !this.owns(id) && this.shardsOf(id) >= this.unlockShardCost(id); }
    unlockWithShards(id) {
      if (!this.canUnlockWithShards(id)) return { ok: false, reason: 'Not enough shards' };
      this.d.shards[id] -= this.unlockShardCost(id);
      if (this.d.shards[id] <= 0) delete this.d.shards[id];
      this.d.characters[id] = { level: 1, xp: 0, stars: 0 };
      this.commit();
      return { ok: true };
    }

    charXpNeeded(id) { const c = this.d.characters[id]; return !c || c.level >= Balance.charLevelCap ? 0 : Balance.charXpToNext(c.level); }
    addCharXP(id, n) {
      const c = this.d.characters[id];
      if (!c) return { levels: 0 };
      n = Util.int(n, 0, 0, 1e7);
      let levels = 0;
      if (c.level >= Balance.charLevelCap) return { levels: 0 };
      c.xp += n;
      while (c.level < Balance.charLevelCap && c.xp >= Balance.charXpToNext(c.level)) {
        c.xp -= Balance.charXpToNext(c.level);
        c.level++;
        levels++;
      }
      if (c.level >= Balance.charLevelCap) c.xp = 0;
      return { levels };
    }
    useXpItem(charId, itemId) {
      const it = JJK.Items[itemId];
      const c = this.d.characters[charId];
      if (!it || !c) return { ok: false, reason: 'Invalid' };
      if ((this.d.items[itemId] || 0) < 1) return { ok: false, reason: 'None left' };
      if (c.level >= Balance.charLevelCap) return { ok: false, reason: 'Max level' };
      this.d.items[itemId]--;
      const r = this.addCharXP(charId, it.xp);
      this.commit();
      return { ok: true, levels: r.levels };
    }
    starCost(id) {
      const c = this.d.characters[id];
      if (!c || c.stars >= Balance.maxStars) return null;
      return { shards: Balance.starShardCosts[c.stars], coins: Balance.starCoinCosts[c.stars] };
    }
    upgradeStar(id) {
      const cost = this.starCost(id);
      if (!cost) return { ok: false, reason: 'Max stars' };
      if (this.shardsOf(id) < cost.shards) return { ok: false, reason: 'Not enough shards' };
      if (this.coins < cost.coins) return { ok: false, reason: 'Not enough Coins' };
      this.d.shards[id] -= cost.shards;
      if (this.d.shards[id] <= 0) delete this.d.shards[id];
      this.spendCoins(cost.coins);
      this.d.characters[id].stars++;
      this.commit();
      return { ok: true, stars: this.d.characters[id].stars };
    }

    // ---------------------------------------------------------------- loadout
    getLoadout() { return this.d.loadout.filter((id) => this.owns(id)); }
    setLoadout(ids) {
      if (!Array.isArray(ids)) return { ok: false, reason: 'Invalid team' };
      const clean = [];
      for (const id of ids) if (this.owns(id) && !clean.includes(id)) clean.push(id);
      if (clean.length > Balance.teamSize) return { ok: false, reason: 'Team is limited to ' + Balance.teamSize };
      this.d.loadout = clean;
      this.commit();
      return { ok: true };
    }
    toggleLoadout(id) {
      if (!this.owns(id)) return { ok: false, reason: 'Not owned' };
      const lo = this.getLoadout();
      const i = lo.indexOf(id);
      if (i >= 0) lo.splice(i, 1);
      else { if (lo.length >= Balance.teamSize) return { ok: false, reason: 'Team is full (' + Balance.teamSize + ')' }; lo.push(id); }
      return this.setLoadout(lo);
    }
    teamForBattle() {
      return this.getLoadout().map((id) => ({ id, level: this.d.characters[id].level, stars: this.d.characters[id].stars }));
    }

    // ---------------------------------------------------------------- unlock rules
    mapProgress(mapId, diff) { const m = this.d.progress.maps[mapId]; return (m && m[diff]) || null; }
    mapCleared(mapId, diff) {
      if (diff) { const p = this.mapProgress(mapId, diff); return !!(p && p.cleared); }
      return DIFFS.some((df) => this.mapCleared(mapId, df));
    }
    isMapUnlocked(mapId) {
      if (this.debugUnlockAll) return true;
      const m = JJK.Maps[mapId];
      if (!m) return false;
      if (this.d.player.level < m.unlock.level) return false;
      return !m.unlock.map || this.mapCleared(m.unlock.map, m.unlock.diff);
    }
    mapLockReason(mapId) {
      const m = JJK.Maps[mapId];
      if (this.isMapUnlocked(mapId)) return '';
      const parts = [];
      if (this.d.player.level < m.unlock.level) parts.push('Player Lv ' + m.unlock.level);
      if (m.unlock.map && !this.mapCleared(m.unlock.map, m.unlock.diff)) parts.push('Clear ' + JJK.Maps[m.unlock.map].short + (m.unlock.diff ? ' on ' + m.unlock.diff.toUpperCase() : ''));
      return parts.join(' + ');
    }
    isDiffUnlocked(mapId, diff) {
      if (this.debugUnlockAll) return true;
      if (!this.isMapUnlocked(mapId)) return false;
      if (diff === 'normal') return true;
      if (diff === 'hard') return this.mapCleared(mapId, 'normal');
      if (diff === 'special') return this.mapCleared(mapId, 'hard') && this.d.player.level >= JJK.Features.special.level;
      return false;
    }
    diffLockReason(mapId, diff) {
      if (this.isDiffUnlocked(mapId, diff)) return '';
      if (diff === 'hard') return 'Clear NORMAL first';
      if (diff === 'special') return !this.mapCleared(mapId, 'hard') ? 'Clear HARD first' : 'Player Lv ' + JJK.Features.special.level;
      return 'Locked';
    }
    isFeatureUnlocked(key) {
      if (this.debugUnlockAll) return true;
      const f = JJK.Features[key];
      if (!f) return true;
      if (this.d.player.level < f.level) return false;
      return !f.needMap || this.mapCleared(f.needMap);
    }
    featureLockReason(key) {
      const f = JJK.Features[key];
      if (!f || this.isFeatureUnlocked(key)) return '';
      const p = [];
      if (this.d.player.level < f.level) p.push('Player Lv ' + f.level);
      if (f.needMap && !this.mapCleared(f.needMap)) p.push('Clear ' + JJK.Maps[f.needMap].short);
      return p.join(' + ');
    }

    /** Grant characters earned by story completion. Returns newly unlocked ids. */
    checkStoryUnlocks() {
      const out = [];
      for (const id of JJK.CharacterOrder) {
        const def = JJK.Characters[id];
        const ul = def.unlock;
        if (this.owns(id)) continue;
        if ((ul.type === 'map' && this.mapCleared(ul.map)) || (ul.type === 'bossKills' && ((this.d.bossRecords[ul.boss] || {}).kills || 0) >= ul.n)) {
          this.d.characters[id] = { level: 1, xp: 0, stars: 0 };
          out.push(id);
        }
      }
      return out;
    }

    // ---------------------------------------------------------------- rewards
    applyReward(r, into) {
      into = into || {};
      if (r.coins) { this.addCoins(r.coins); into.coins = (into.coins || 0) + r.coins; }
      if (r.gems) { this.addGems(r.gems); into.gems = (into.gems || 0) + r.gems; }
      if (r.xp) { const lv = this.addPlayerXP(r.xp); into.playerXp = (into.playerXp || 0) + r.xp; into.levelUps = (into.levelUps || 0) + lv.levels; }
      if (r.items) for (const k of Object.keys(r.items)) { this.d.items[k] = (this.d.items[k] || 0) + r.items[k]; }
      if (r.shards) for (const k of Object.keys(r.shards)) { this.addShards(k, r.shards[k]); (into.shards = into.shards || {})[k] = ((into.shards || {})[k] || 0) + r.shards[k]; }
      if (r.char) { const g = this.grantCharacter(r.char); (into.chars = into.chars || []).push({ id: r.char, isNew: g.isNew, shards: g.shards }); }
      return into;
    }

    computeMatchRewards(s) {
      const map = JJK.Maps[s.mapId];
      const diff = Balance.difficulty[s.diff];
      const scale = map.rewardScale * diff.rewardMult;
      const R = { coins: 0, gems: 0, playerXp: 0, charXp: 0, bossCoins: 0, drops: [], firstClear: false };
      if (s.mode === 'endless') {
        R.coins = Math.round(s.wavesCleared * 26 * map.rewardScale + Object.keys(s.bossKills).length * 150);
        R.playerXp = Math.round(s.wavesCleared * 5);
        R.charXp = Math.round(s.wavesCleared * 8);
        return R;
      }
      const total = s.totalWaves;
      const full = Math.round((160 + 20 * total) * scale);
      const frac = s.victory ? 1 : Balance.defeatRewardFraction * (s.wavesCleared / total);
      R.coins = Math.round(full * frac);
      for (const id of Object.keys(s.bossKills)) R.bossCoins += Math.round((JJK.Bosses[id].rewardCoins || 0) * diff.rewardMult * (s.bossKills[id] > 0 ? 1 : 0));
      R.coins += R.bossCoins;
      R.playerXp = Math.round((Balance.playerXpPerWave * s.wavesCleared + (s.victory ? Balance.playerXpVictory : 0)) * (0.6 + 0.4 * map.rewardScale) * diff.rewardMult);
      R.charXp = Math.round((Balance.charXpPerWave * s.wavesCleared + (s.victory ? Balance.charXpVictoryBonus : 0)) * (0.7 + 0.3 * map.rewardScale) * diff.rewardMult);
      return R;
    }

    /** Apply a finished match exactly once. Returns the reward record (also persisted for the results screen). */
    applyMatchResult(summary, matchId, rngSeed) {
      const d = this.d;
      matchId = matchId || ('m' + this.now() + ':' + Math.floor(Math.random() * 1e9));
      if (d.lastRewards && d.lastRewards.id === matchId) return d.lastRewards; // idempotent: never double-grant
      const s = summary;
      if (s.debug) { // matches touched by debug tools never award anything or touch the save
        return { id: matchId, debug: true, mapId: s.mapId, diff: s.diff, mode: s.mode, victory: s.victory, wave: s.wave, wavesCleared: s.wavesCleared, totalWaves: s.totalWaves, kills: s.kills, duration: s.duration, score: s.score, rewards: {}, challenges: [], newChars: [], drops: [], newRecord: false };
      }
      const map = JJK.Maps[s.mapId];
      const rng = Util.makeRng(rngSeed != null ? rngSeed : Util.hashString(matchId));
      const R = this.computeMatchRewards(s);
      const result = { id: matchId, mapId: s.mapId, diff: s.diff, mode: s.mode, victory: s.victory, wave: s.wave, wavesCleared: s.wavesCleared, totalWaves: s.totalWaves, kills: s.kills, duration: s.duration, score: s.score, rewards: {}, challenges: [], newChars: [], drops: [], newRecord: false };

      // progress
      if (s.mode === 'story') {
        const m = (d.progress.maps[s.mapId] = d.progress.maps[s.mapId] || {});
        const e = (m[s.diff] = m[s.diff] || { cleared: false, clears: 0, bestWave: 0, bestTime: 0, flawless: false });
        e.bestWave = Math.max(e.bestWave, s.wavesCleared);
        if (s.victory) {
          if (!e.cleared) {
            R.firstClear = true;
            R.gems += Math.round(Balance.difficulty[s.diff].gemsFirst * (0.6 + 0.4 * map.rewardScale));
          } else R.gems += Balance.difficulty[s.diff].gemsRepeat;
          e.cleared = true; e.clears++;
          if (!e.bestTime || s.duration < e.bestTime) e.bestTime = s.duration;
          if (s.baseLost === 0) e.flawless = true;
        }
      } else {
        const em = (d.endless.byMap[s.mapId] = d.endless.byMap[s.mapId] || { bestWave: 0, bestScore: 0 });
        const prevBest = Math.max(em.bestWave, 0);
        const milestones = Math.max(0, Math.floor(s.wavesCleared / 10) - Math.floor(prevBest / 10));
        R.gems += milestones * 8;
        if (s.wavesCleared > em.bestWave) { em.bestWave = s.wavesCleared; result.newRecord = true; }
        if (s.score > em.bestScore) { em.bestScore = s.score; result.newRecord = true; }
        d.endless.bestWave = Math.max(d.endless.bestWave, s.wavesCleared);
        d.endless.bestScore = Math.max(d.endless.bestScore, s.score);
      }

      // boss records + drops
      for (const id of Object.keys(s.bossKills)) {
        const br = (d.bossRecords[id] = d.bossRecords[id] || { kills: 0, bestTime: 0 });
        br.kills += s.bossKills[id];
        const t = Math.round(s.bossTimes[id] || 0);
        if (t && (!br.bestTime || t < br.bestTime)) br.bestTime = t;
        d.stats.bossKills += s.bossKills[id];
        const bdef = JJK.Bosses[id];
        for (const drop of bdef.drops || []) {
          if (rng.next() >= drop.chance) continue;
          if (drop.kind === 'shards') {
            const n = rng.int(drop.n[0], drop.n[1]);
            this.addShards(drop.id, n);
            result.drops.push({ kind: 'shards', id: drop.id, n });
          } else if (drop.kind === 'char') {
            if (this.owns(drop.id)) { this.addShards(drop.id, drop.fallbackShards || 10); result.drops.push({ kind: 'shards', id: drop.id, n: drop.fallbackShards || 10 }); }
            else { this.grantCharacter(drop.id); result.drops.push({ kind: 'char', id: drop.id }); result.newChars.push(drop.id); }
          }
        }
      }
      for (const id of s.enemiesSeen || []) if (JJK.Enemies[id]) d.index.enemies[id] = true;
      for (const id of s.bossesSeen || []) if (JJK.Bosses[id]) d.index.bosses[id] = true;

      // stats
      const st = d.stats;
      st.kills += s.kills; st.matches++; st.upgrades += s.upgrades; st.deploys += s.deploys; st.domains += s.domains; st.yenEarned += s.yenEarned; st.sells += s.sold; st.playSeconds += s.duration;
      if (s.victory) st.wins++; else st.losses++;
      this.ensureDaily();
      const dp = d.daily.progress;
      const bump = (k, n) => { if (n > 0) dp[k] = (dp[k] || 0) + n; };
      bump('kills', s.kills); bump('deploys', s.deploys); bump('upgrades', s.upgrades); bump('yen', s.yenEarned); bump('domains', s.domains);
      bump('bosses', Object.values(s.bossKills).reduce((a, b) => a + b, 0));
      if (s.victory) bump('wins', 1);

      // grant currencies + xp
      const grant = { coins: R.coins, gems: R.gems, xp: R.playerXp };
      this.applyReward(grant, result.rewards);
      result.rewards.charXp = {};
      const deployed = new Set(s.deployedIds || []);
      for (const id of s.loadout || []) {
        if (!this.owns(id)) continue;
        const amt = Math.round(R.charXp * (deployed.has(id) ? 1 : 0.5));
        const before = d.characters[id].level;
        this.addCharXP(id, amt);
        result.rewards.charXp[id] = { xp: amt, levelUps: d.characters[id].level - before, level: d.characters[id].level };
      }
      result.rewards.firstClear = R.firstClear;
      result.rewards.bossCoins = R.bossCoins;

      // story unlocks & challenges
      for (const id of this.checkStoryUnlocks()) result.newChars.push(id);
      for (const ch of JJK.Challenges) {
        if (d.challenges.done[ch.id]) continue;
        let done = false;
        if (ch.progress) done = ch.progress(d) >= ch.target;
        else done = !!ch.check(s);
        if (done) {
          d.challenges.done[ch.id] = true;
          const got = this.applyReward(ch.reward, {});
          result.challenges.push({ id: ch.id, name: ch.hidden ? ch.hiddenName || ch.name : ch.name, reward: ch.reward });
          for (const c of got.chars || []) if (c.isNew) result.newChars.push(c.id);
        }
      }

      d.lastRewards = result;
      this.commit();
      return result;
    }

    // ---------------------------------------------------------------- summon
    currentFeaturedBanner(now) {
      const list = JJK.Banners.featured;
      return list[Util.weekIndex(now == null ? this.now() : now) % list.length];
    }
    bannerById(id) {
      if (id === 'standard') return JJK.Banners.standard;
      if (id === 'culling') return JJK.Banners.culling;
      return JJK.Banners.featured.find((b) => b.id === id) || null;
    }
    isBannerUnlocked(id) {
      const b = this.bannerById(id);
      if (!b) return false;
      if (this.debugUnlockAll || !b.requires) return true;
      return this.d.player.level >= (b.requires.level || 0) && (!b.requires.map || this.mapCleared(b.requires.map));
    }
    bannerLockReason(id) {
      const b = this.bannerById(id);
      if (!b || this.isBannerUnlocked(id)) return '';
      const p = [];
      if (this.d.player.level < (b.requires.level || 0)) p.push('Player Lv ' + b.requires.level);
      if (b.requires.map && !this.mapCleared(b.requires.map)) p.push('Clear ' + JJK.Maps[b.requires.map].short);
      return p.join(' + ');
    }
    bannerCost(bannerId, count) {
      const b = this.bannerById(bannerId);
      return count === 1 ? (b && b.cost1) || Balance.summonCost1 : (b && b.cost10) || Balance.summonCost10;
    }
    pityOf(bannerId) { return this.d.summon.pity[bannerId] || 0; }

    /** Perform a summon. Atomic: gems are only spent if the whole result is committed. */
    summon(bannerId, count, rng) {
      const banner = this.bannerById(bannerId);
      if (!banner) return { ok: false, reason: 'Unknown banner' };
      if (count !== 1 && count !== 10) return { ok: false, reason: 'Invalid count' };
      if (!this.isBannerUnlocked(bannerId)) return { ok: false, reason: 'Banner locked: ' + this.bannerLockReason(bannerId) };
      const cost = this.bannerCost(bannerId, count);
      if (this.gems < cost) return { ok: false, reason: 'Not enough Cursed Gems' };
      if (!rng) { rng = Util.makeRng(((this.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0)); rng.joan = Math.random; }
      const state = { counter: this.pityOf(banner.id), lost: !!this.d.summon.lost[banner.id] };
      const hiIdx = TIER_ORDER.indexOf(banner.pity.tier);
      const results = [];
      for (let i = 0; i < count; i++) {
        let rates = Summon.tierRates(banner, state.counter);
        let tier = Summon.rollTier(rng, rates);
        if (count === 10 && i === 9 && !results.some((r) => tierRank(r.tier) >= TIER_ORDER.indexOf(banner.guarantee10 || 'RARE'))) {
          tier = Summon.rollTier(rng, rates, banner.guarantee10 || 'RARE');
        }
        if (TIER_ORDER.indexOf(tier) >= hiIdx) state.counter = 0; else state.counter++;
        let id = Summon.pickChar(rng, banner, tier, state);
        // The banner roll above is always made (so pity and seeded sequences are unchanged); JOAN simply replaces the slot.
        if (Summon.rollJoan(rng)) { id = JOAN_ID; tier = 'JOAN'; }
        results.push({ id, tier });
      }
      // commit
      this.spendGems(cost);
      const owned = new Set(Object.keys(this.d.characters));
      for (const r of results) {
        const wasOwned = owned.has(r.id) || this.owns(r.id);
        const g = this.grantCharacter(r.id);
        r.isNew = g.isNew && !wasOwned;
        r.shards = g.shards;
        owned.add(r.id);
        this.d.summon.history.push(r.id);
      }
      if (this.d.summon.history.length > 40) this.d.summon.history = this.d.summon.history.slice(-40);
      this.d.summon.pity[banner.id] = state.counter;
      if (state.lost) this.d.summon.lost[banner.id] = true; else delete this.d.summon.lost[banner.id];
      this.d.summon.total += count;
      this.commit();
      return { ok: true, results, cost, pity: state.counter };
    }

    // ---------------------------------------------------------------- shop
    _sellableChars() { return JJK.CharacterOrder.filter((id) => JJK.Characters[id].rarity !== 'JOAN' && JJK.Characters[id].rarity !== 'SPECIAL' && JJK.Characters[id].rarity !== 'MYTHIC' && !JJK.Expansion.includes(id)); }

    shopStock() {
      const now = this.now();
      const day = Util.dayIndex(now), week = Util.weekIndex(now);
      const S = JJK.Shop;
      const purchases = this.d.shop.purchases;
      // prune keys from expired periods so the save stays small
      for (const k of Object.keys(purchases)) {
        const parts = k.split(':');
        if (parts[0] === 'deal' && +parts[1] !== day) delete purchases[k];
        else if ((parts[0] === 'shard' || parts[0] === 'gojo') && +parts[1] !== week) delete purchases[k];
        else if (parts[0] === 'perm' && parts[2] !== undefined && +parts[2] !== day) delete purchases[k];
      }
      const mk = (o, limit) => Object.assign({ limit: limit || 0, bought: purchases[o.key] || 0 }, o);
      const featured = [];
      const rngD = Util.makeRng(Util.hashString('deals:' + day));
      const pool = S.dailyDeals.slice();
      for (let i = 0; i < S.dailySlots && pool.length; i++) {
        const idx = Math.floor(rngD.next() * pool.length);
        const deal = pool.splice(idx, 1)[0];
        const o = { key: 'deal:' + day + ':' + deal.id, kind: deal.kind, label: deal.label, currency: deal.currency, qty: deal.qty };
        if (deal.kind === 'shardsRandom') {
          const ids = this._sellableChars();
          const cid = ids[Math.floor(rngD.next() * ids.length)];
          o.kind = 'shards'; o.charId = cid;
          o.price = Math.round(deal.qty * S.coinPerShard[JJK.Characters[cid].rarity] * deal.priceMult);
        } else { o.item = deal.item; o.price = deal.price; }
        featured.push(mk(o, 1));
      }
      const shards = [];
      const rngW = Util.makeRng(Util.hashString('shards:' + week));
      const ids = this._sellableChars().slice();
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rngW.next() * (i + 1)); const t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
      for (const cid of ids.slice(0, S.weeklyShardSlots)) {
        const r = JJK.Characters[cid].rarity;
        shards.push(mk({ key: 'shard:' + week + ':' + cid, kind: 'shards', charId: cid, qty: S.shardQty[r], price: S.shardQty[r] * S.coinPerShard[r], currency: 'coins' }, 2));
      }
      const g = S.gojoShards;
      shards.push(mk({ key: 'gojo:' + week, kind: 'shards', charId: 'gojo', qty: g.qty, price: g.price, currency: 'coins' }, g.limit));
      const items = S.permanent.map((p) => {
        const key = 'perm:' + p.key + (p.period === 'day' ? ':' + day : '');
        return mk({ key, kind: p.kind, item: p.item, qty: p.qty, price: p.price, currency: p.currency }, p.limit);
      });
      return { featured, shards, items, day, week };
    }

    buy(key) {
      const stock = this.shopStock();
      const all = stock.featured.concat(stock.shards, stock.items);
      const o = all.find((x) => x.key === key);
      if (!o) return { ok: false, reason: 'Offer expired' };
      if (o.limit && o.bought >= o.limit) return { ok: false, reason: 'Sold out' };
      const pay = o.currency === 'gems' ? this.spendGems(o.price) : this.spendCoins(o.price);
      if (!pay) return { ok: false, reason: o.currency === 'gems' ? 'Not enough Cursed Gems' : 'Not enough Coins' };
      if (o.kind === 'item') this.d.items[o.item] = (this.d.items[o.item] || 0) + o.qty;
      else if (o.kind === 'gems') this.addGems(o.qty);
      else if (o.kind === 'shards') this.addShards(o.charId, o.qty);
      this.d.shop.purchases[o.key] = (this.d.shop.purchases[o.key] || 0) + 1;
      this.commit();
      return { ok: true, offer: o };
    }

    // ---------------------------------------------------------------- missions
    missionStatus(m) {
      const raw = m.get(this.d);
      const progress = Math.min(m.target, Math.floor(raw));
      return { progress, target: m.target, done: raw >= m.target, claimed: !!this.d.missions.claimed[m.id] };
    }
    claimMission(id) {
      const m = JJK.Missions.find((x) => x.id === id);
      if (!m) return { ok: false, reason: 'Unknown mission' };
      const st = this.missionStatus(m);
      if (st.claimed) return { ok: false, reason: 'Already claimed' };
      if (!st.done) return { ok: false, reason: 'Not complete' };
      this.d.missions.claimed[id] = true;
      const got = this.applyReward(m.reward, {});
      this.checkStoryUnlocks();
      this.commit();
      return { ok: true, reward: m.reward, got };
    }
    claimableCount() {
      let n = 0;
      for (const m of JJK.Missions) { const s = this.missionStatus(m); if (s.done && !s.claimed) n++; }
      for (const dm of this.dailyMissions()) { if (dm.done && !dm.claimed) n++; }
      return n;
    }
    ensureDaily() {
      const day = Util.dayIndex(this.now());
      if (this.d.daily.day !== day) { this.d.daily = { day, progress: {}, claimed: {} }; }
      return this.d.daily;
    }
    dailyMissions() {
      const dl = this.ensureDaily();
      const rng = Util.makeRng(Util.hashString('daily:' + dl.day));
      const pool = JJK.DailyPool.slice();
      const picks = [];
      for (let i = 0; i < 3 && pool.length; i++) picks.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
      return picks.map((p) => {
        const prog = Math.min(p.target, dl.progress[p.stat] || 0);
        return Object.assign({}, p, { progress: prog, done: prog >= p.target, claimed: !!dl.claimed[p.id] });
      });
    }
    claimDaily(id) {
      const dm = this.dailyMissions().find((x) => x.id === id);
      if (!dm) return { ok: false, reason: 'Not today\'s mission' };
      if (dm.claimed) return { ok: false, reason: 'Already claimed' };
      if (!dm.done) return { ok: false, reason: 'Not complete' };
      this.d.daily.claimed[id] = true;
      this.applyReward(dm.reward, {});
      this.commit();
      return { ok: true, reward: dm.reward };
    }

    // ---------------------------------------------------------------- misc
    charUnlockHint(id) {
      const def = JJK.Characters[id];
      const u = def.unlock;
      if (JJK.Characters[id] && JJK.Characters[id].rarity === 'JOAN') return 'Summoner only: a 1 in 200,000 chance on every single pull, on any banner. Cannot be unlocked with shards or bought.';
      if (u.type === 'summon') return 'Obtainable from the Summon banners, shards or the Shop.';
      if (u.type === 'start') return 'Starter character.';
      if (u.type === 'bossKills') return u.hint || ('Defeat ' + JJK.Bosses[u.boss].name + ' ' + u.n + ' times.');
      return u.hint || '';
    }
    setSetting(k, v) { if (k in this.d.settings) { this.d.settings[k] = v; this.commit(); } }
  }

  Profile.Summon = Summon;
  Profile.TIER_ORDER = TIER_ORDER;
  JJK.Profile = Profile;
  JJK.SummonMath = Summon;
})(typeof window !== 'undefined' ? window : globalThis);
