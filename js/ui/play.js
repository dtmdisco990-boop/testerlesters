/* Play screen: map select, difficulty, mode (story / endless / challenges) and loadout editor. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Balance, Util } = JJK;
  const DIFFS = ['normal', 'hard', 'special'];

  UI.register('play', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio, S = p.d.settings;
      A.music('menu');
      const st = { mode: ['story', 'endless', 'challenges'].includes(S.lastMode) ? S.lastMode : 'story', map: JJK.Maps[S.lastMap] && p.isMapUnlocked(S.lastMap) ? S.lastMap : 'tokyo', diff: DIFFS.includes(S.lastDiff) ? S.lastDiff : 'normal', filter: 'ALL' };
      const root = ctx.root;
      root.appendChild(UI.topbar(ctx, 'Play'));
      const body = UI.el('div', { class: 'body', style: 'flex-direction:column;gap:10px;padding-top:8px' });
      root.appendChild(body);
      const tabsRow = UI.el('div', { class: 'tabs' });
      const mapsRow = UI.el('div', { class: 'row', style: 'gap:10px;flex:none' });
      const main = UI.el('div', { class: 'row', style: 'flex:1;min-height:0;align-items:stretch;gap:12px' });
      body.append(tabsRow, mapsRow, main);

      const render = () => {
        // sanitise selection against current unlocks
        if (!p.isMapUnlocked(st.map)) st.map = 'tokyo';
        if (!p.isDiffUnlocked(st.map, st.diff)) st.diff = 'normal';
        if (st.mode === 'endless' && !p.isFeatureUnlocked('endless')) st.mode = 'story';
        UI.clear(tabsRow); UI.clear(mapsRow); UI.clear(main);
        for (const [id, label, feat] of [['story', 'Story', null], ['endless', 'Endless', 'endless'], ['challenges', 'Challenges', 'challenges']]) {
          const lock = feat ? p.featureLockReason(feat) : '';
          const t = UI.el('button', { class: 'tab' + (st.mode === id ? ' on' : ''), type: 'button', text: label + (lock ? '  🔒' : ''), tip: lock ? 'Unlocks: ' + lock : null });
          t.addEventListener('click', () => { if (lock) { UI.toast('Unlocks: ' + lock, 'bad'); A.sfx('error'); return; } st.mode = id; S.lastMode = id; render(); });
          tabsRow.appendChild(t);
        }
        if (st.mode === 'challenges') { renderChallenges(); return; }
        // maps
        for (const id of Object.keys(JJK.Maps).sort((a, b) => JJK.Maps[a].order - JJK.Maps[b].order)) mapsRow.appendChild(mapCard(id));
        main.append(infoPanel(), teamPanel());
      };

      const mapCard = (id) => {
        const m = JJK.Maps[id], unlocked = p.isMapUnlocked(id);
        const card = UI.el('button', { class: 'mapcard' + (st.map === id ? ' on' : '') + (unlocked ? '' : ' locked'), type: 'button', style: 'width:296px;height:112px', 'aria-label': m.name });
        const cv = UI.el('canvas', { width: 296, height: 112 });
        JJK.Backgrounds.draw(cv.getContext('2d'), id, 296, 112);
        card.appendChild(cv);
        const dots = UI.el('span', { style: 'float:right' });
        for (const df of DIFFS) dots.appendChild(UI.el('span', { style: { color: p.mapCleared(id, df) ? UI.DIFF_COLOR[df] : '#4a4670', marginLeft: '3px' }, text: '●' }));
        card.appendChild(UI.el('div', { class: 'cap' }, [UI.el('b', null, [m.name, st.mode === 'story' ? dots : null]), UI.el('span', { class: 'dim', style: 'font-size:11px', text: (st.mode === 'endless' ? '∞ waves' : m.waves + ' waves') + ' · rec. Lv ' + m.recommendedLevel })]));
        if (!unlocked) card.appendChild(UI.el('div', { class: 'lk', text: '🔒 ' + p.mapLockReason(id) }));
        card.addEventListener('click', () => { if (!unlocked) { UI.toast('Locked: ' + p.mapLockReason(id), 'bad'); A.sfx('error'); return; } st.map = id; S.lastMap = id; render(); });
        return card;
      };

      const infoPanel = () => {
        const m = JJK.Maps[st.map], d = Balance.difficulty[st.diff];
        const pan = UI.el('div', { class: 'panel col', style: 'width:520px;flex:none;gap:8px;overflow:auto' }); pan.classList.add('scroll');
        pan.appendChild(UI.el('div', { class: 'h1', style: 'font-size:26px', text: m.name }));
        pan.appendChild(UI.el('div', { class: 'dim', style: 'font-size:13px', text: m.desc }));
        pan.appendChild(UI.el('div', { style: 'font-size:12.5px' }, [UI.el('b', { class: 'gold', text: 'Twist: ' }), m.twist]));
        // difficulty
        const dr = UI.el('div', { class: 'row', style: 'gap:6px' });
        for (const df of DIFFS) {
          const lock = p.diffLockReason(st.map, df);
          const b = UI.el('button', { class: 'diffbtn' + (st.diff === df ? ' on' : '') + (lock ? ' locked' : ''), type: 'button', style: '--dc:' + UI.DIFF_COLOR[df], text: df.toUpperCase(), tip: lock ? lock : diffTip(df) });
          b.addEventListener('click', () => { if (lock) { UI.toast(lock, 'bad'); A.sfx('error'); return; } st.diff = df; S.lastDiff = df; render(); });
          dr.appendChild(b);
        }
        pan.appendChild(dr);
        const rows = [
          ['Enemy HP', '×' + d.hpMult.toFixed(2)], ['Enemy count', '×' + d.countMult.toFixed(2)], ['Base HP', String(d.baseHp)],
          ['Sell refund', Math.round(d.sellRefund * 100) + '%'], ['Reward', '×' + d.rewardMult.toFixed(1)],
        ];
        pan.appendChild(UI.el('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px 14px;font-size:12px' }, rows.map(([k, v]) => UI.el('span', null, [UI.el('span', { class: 'dim', text: k + ' ' }), UI.el('b', { text: v })]))));
        if (st.diff === 'special' && st.mode === 'story') pan.appendChild(UI.el('div', { class: 'panel', style: 'padding:8px;border-color:' + UI.DIFF_COLOR.special + ';font-size:12.5px' }, [UI.el('b', { style: 'color:' + UI.DIFF_COLOR.special, text: 'SPECIAL RULE · ' + m.special.label + ' — ' }), m.special.desc]));
        // records
        if (st.mode === 'story') {
          const pr = p.mapProgress(st.map, st.diff);
          const fl = ['normal', 'hard', 'special'].some((df) => (p.mapProgress(st.map, df) || {}).flawless);
          pan.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: pr ? 'Best wave ' + pr.bestWave + '/' + m.waves + ' · Clears ' + pr.clears + (pr.bestTime ? ' · Best time ' + Util.fmtTime(pr.bestTime) : '') + (fl ? ' · Flawless ✓' : '') : 'Not attempted on ' + st.diff.toUpperCase() + ' yet.' }));
        } else {
          const em = p.d.endless.byMap[st.map];
          pan.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: em ? 'Best wave ' + em.bestWave + ' · Best score ' + UI.fmt(em.bestScore) : 'Endless: survive as long as you can. Bosses every 10 waves. Score = damage + waves + bosses.' }));
        }
        // enemies
        const er = UI.el('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' });
        for (const id of m.enemies) { const im = UI.el('img', { src: JJK.Art.enemyThumbURL(id, 44), width: 38, height: 38, style: 'border-radius:5px;border:1px solid #3a3566', alt: JJK.Enemies[id].name }); UI.tip(im, () => UI.enemyTipText(id)); er.appendChild(im); }
        const bosses = st.mode === 'story' ? Object.values(m.waveCfg.bosses || {}).map((b) => b.id) : ['finger', 'jogo', 'mahito', 'sukuna'];
        for (const id of Array.from(new Set(bosses))) { const im = UI.el('img', { src: JJK.Art.enemyThumbURL(id, 44), width: 38, height: 38, style: 'border-radius:5px;border:2px solid #ff3b5c', alt: JJK.Bosses[id].name }); UI.tip(im, () => '<b style="color:#ff6a82">BOSS · ' + JJK.Bosses[id].name + '</b><br>' + JJK.Bosses[id].desc + '<br><span class="dim">' + JJK.Bosses[id].mechanics.join('<br>') + '</span>'); er.appendChild(im); }
        pan.appendChild(UI.el('div', { class: 'dim', style: 'font-size:11px;letter-spacing:1px', text: 'ENEMIES & BOSSES (hover for details)' }));
        pan.appendChild(er);
        pan.appendChild(UI.el('div', { class: 'grow' }));
        // start
        const team = p.getLoadout();
        const avg = team.length ? team.reduce((a, id) => a + p.d.characters[id].level, 0) / team.length : 0;
        if (team.length && st.mode === 'story' && avg < m.recommendedLevel * 2 - 1 && m.recommendedLevel > 1) pan.appendChild(UI.el('div', { class: 'hot', style: 'font-size:12px', text: '⚠ Your average unit level is ' + avg.toFixed(1) + '. This map is tuned around team level ~' + (m.recommendedLevel * 2) + '+.' }));
        const go = UI.btn(st.mode === 'endless' ? 'START ENDLESS' : 'START BATTLE', () => start(), 'primary big', { disabled: team.length === 0 });
        pan.appendChild(go);
        if (team.length === 0) pan.appendChild(UI.el('div', { class: 'hot', style: 'font-size:12px;text-align:center', text: 'Pick at least 1 character for your team →' }));
        return pan;
      };
      const diffTip = (df) => ({ normal: 'Baseline difficulty.', hard: 'Tougher curses, lower base HP and a worse sell refund — but 1.6× rewards. Required for the secret Toji challenge.', special: 'Brutal stats plus a map-specific rule. 2.4× rewards.' }[df]);

      const teamPanel = () => {
        const pan = UI.el('div', { class: 'panel col', style: 'flex:1;min-width:0;gap:8px' });
        const lo = p.getLoadout();
        const head = UI.el('div', { class: 'row' }, [UI.el('div', { class: 'h2 grow', style: 'margin:0', text: 'Team (' + lo.length + '/' + Balance.teamSize + ')' }), UI.btn('CLEAR', () => { p.setLoadout([]); render(); }, 'small')]);
        pan.appendChild(head);
        const slots = UI.el('div', { class: 'row', style: 'gap:8px' });
        for (let i = 0; i < Balance.teamSize; i++) {
          const id = lo[i];
          if (id) {
            const d = JJK.Characters[id];
            const s = UI.el('button', { class: 'loadslot full r-' + d.rarity, type: 'button', 'aria-label': 'Remove ' + d.name });
            s.append(JJK.Art.portraitImg(id, null, 120, 120), UI.el('div', { class: 'cost', text: '¥' + d.cost }), UI.el('div', { class: 'x', text: '✕' }));
            s.addEventListener('click', () => { p.toggleLoadout(id); A.sfx('back'); render(); });
            UI.tip(s, () => UI.charTip(id)); slots.appendChild(s);
          } else slots.appendChild(UI.el('div', { class: 'loadslot', text: '+' }));
        }
        pan.appendChild(slots);
        pan.appendChild(synergyRow(lo));
        // filters
        const fr = UI.el('div', { class: 'row', style: 'gap:5px;flex-wrap:wrap' });
        for (const f of ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'SPECIAL', 'JOAN']) {
          fr.appendChild(UI.el('span', { class: 'filter' + (st.filter === f ? ' on' : ''), text: f, role: 'button', tabindex: '0', on: { click: () => { st.filter = f; render(); }, keydown: (e) => { if (e.key === 'Enter') { st.filter = f; render(); } } } }));
        }
        pan.appendChild(fr);
        const pool = UI.el('div', { class: 'grid scroll', style: 'flex:1;min-height:0;gap:6px;padding-right:4px' });
        const order = p.ownedIds().filter((id) => st.filter === 'ALL' || JJK.Characters[id].rarity === st.filter);
        order.sort((a, b) => UI.TIER_ORDER.concat(['SPECIAL', 'JOAN']).indexOf(JJK.Characters[b].rarity) - UI.TIER_ORDER.concat(['SPECIAL', 'JOAN']).indexOf(JJK.Characters[a].rarity) || JJK.Characters[b].cost - JJK.Characters[a].cost);
        for (const id of order) {
          const d = JJK.Characters[id], inTeam = lo.includes(id);
          const c = UI.el('button', { class: 'ucard r-' + d.rarity + (inTeam ? ' sel' : ''), type: 'button', style: 'width:150px;height:62px;flex:none', 'aria-pressed': String(inTeam) });
          c.appendChild(JJK.Art.portraitImg(id, null, 100, 100)); c.firstChild.style.cssText = 'width:62px;height:62px;border-radius:0';
          c.appendChild(UI.el('div', { class: 'nm', style: 'margin-left:66px;font-size:13px', text: d.short }));
          c.appendChild(UI.el('div', { class: 'ct', style: 'margin-left:66px;font-size:11.5px', text: 'Lv ' + p.d.characters[id].level + ' · ¥' + d.cost }));
          c.addEventListener('click', () => { const r = p.toggleLoadout(id); if (!r.ok) { UI.toast(r.reason, 'bad'); A.sfx('error'); } else A.sfx('click'); render(); });
          UI.tip(c, () => UI.charTip(id)); pool.appendChild(c);
        }
        if (!order.length) pool.appendChild(UI.el('div', { class: 'dim', text: 'No owned characters in this category.' }));
        pan.appendChild(pool);
        return pan;
      };

      const synergyRow = (lo) => {
        const counts = { Student: 0, 'Physical Specialist': 0, Support: 0, 'Domain User': 0 };
        for (const id of lo) for (const t of JJK.Characters[id].traits) if (t in counts) counts[t]++;
        const row = UI.el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' });
        for (const t of Object.keys(counts)) {
          const tr = JJK.Traits[t]; const n = counts[t]; const active = tr.tiers ? tr.tiers.filter((x) => n >= x[0]).length : (n >= 2 ? 1 : 0);
          const el = UI.el('span', { class: 'pill', style: { opacity: n ? 1 : 0.45, borderColor: active ? '#4ade80' : '#ffffff22', color: active ? '#9af0b8' : '' }, text: t + ' ' + n + (active ? ' ✓' : '') });
          UI.tip(el, '<b>' + t + '</b><br>' + tr.desc); row.appendChild(el);
        }
        return row;
      };

      const start = () => {
        const team = p.getLoadout();
        if (!team.length) { UI.toast('Choose at least one character.', 'bad'); A.sfx('error'); return; }
        if (!p.isMapUnlocked(st.map)) { UI.toast('Map locked.', 'bad'); return; }
        S.lastMap = st.map; S.lastDiff = st.diff; S.lastMode = st.mode; p.commit();
        A.sfx('wave');
        UI.show('battle', { mapId: st.map, diff: st.diff, mode: st.mode === 'endless' ? 'endless' : 'story', from: 'play' });
      };

      const renderChallenges = () => {
        const pan = UI.el('div', { class: 'panel col scroll', style: 'flex:1;gap:8px' });
        if (!p.isFeatureUnlocked('challenges')) {
          pan.appendChild(UI.el('div', { class: 'h2', text: 'Challenges locked' }));
          pan.appendChild(UI.el('div', { class: 'dim', text: 'Unlocks: ' + p.featureLockReason('challenges') }));
          main.appendChild(pan); return;
        }
        pan.appendChild(UI.el('div', { class: 'h2', text: 'Challenges' }));
        pan.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: 'Special objectives completed during normal matches. Rewards are granted automatically the moment you finish the match that achieves them.' }));
        for (const ch of JJK.Challenges) {
          const done = !!p.d.challenges.done[ch.id];
          const hidden = ch.hidden && !done;
          const prog = ch.progress ? Math.min(ch.target, ch.progress(p.d)) : (done ? 1 : 0);
          const row = UI.el('div', { class: 'item' + (done ? ' done' : '') }, [
            UI.el('div', { style: 'width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:20px;background:#0a0918;border:2px solid ' + (done ? '#4ade80' : '#3a3566'), text: done ? '✓' : hidden ? '?' : '⚔' }),
            UI.el('div', { class: 'grow' }, [UI.el('b', { text: hidden ? '???' : (ch.hidden ? ch.hiddenName : ch.name) }), UI.el('div', { class: 'dim', style: 'font-size:12.5px', text: hidden ? ch.desc : ch.desc }),
              ch.progress ? UI.el('div', { class: 'bar', style: 'margin-top:4px;max-width:260px' }, UI.el('i', { style: { width: (prog / ch.target * 100) + '%' } })) : null]),
            UI.el('div', { class: 'dim', style: 'font-size:12px;width:60px;text-align:right', text: ch.progress ? prog + '/' + ch.target : done ? 'DONE' : '' }),
            UI.el('div', { class: 'row', style: 'gap:4px;flex-wrap:wrap;justify-content:flex-end;width:240px' }, UI.rewardChips(ch.reward)),
          ]);
          pan.appendChild(row);
        }
        main.appendChild(pan);
      };

      render();
      if (ctx.params.focus === 'team') { /* team panel is always visible on this screen */ }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
