/* Results screen: shows exactly what was granted (the Profile already persisted it; reloading this screen cannot double-pay). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Util } = JJK;

  UI.register('results', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio;
      const r = ctx.params.result || p.d.lastRewards;
      if (!r) { UI.show('menu'); return; }
      A.music(r.victory ? 'menu' : null);
      const map = JJK.Maps[r.mapId];
      const root = ctx.root;
      const col = UI.el('div', { class: 'col', style: 'height:100%;padding:0 80px;gap:10px;overflow:auto', }); col.classList.add('scroll');
      root.appendChild(col);
      col.appendChild(UI.el('div', { class: 'res-title ' + (r.victory ? 'win' : 'lose'), text: r.victory ? 'VICTORY' : 'DEFEAT' }));
      const sub = map.name + ' · ' + r.diff.toUpperCase() + (r.mode === 'endless' ? ' · ENDLESS' : '');
      col.appendChild(UI.el('div', { class: 'dim', style: 'text-align:center;letter-spacing:4px;margin-top:-6px', text: sub.toUpperCase() }));
      if (r.debug) col.appendChild(UI.el('div', { class: 'pill', style: 'align-self:center;border-color:#f80;color:#fb4', text: 'DEBUG MATCH: no rewards or progress were recorded' }));
      if (r.newRecord) col.appendChild(UI.el('div', { class: 'gold', style: 'text-align:center;font-family:var(--head);letter-spacing:6px;font-size:20px', text: '★ NEW RECORD ★' }));

      const stats = UI.el('div', { class: 'row', style: 'justify-content:center;gap:14px;flex-wrap:wrap' });
      const stat = (k, v) => UI.el('div', { class: 'panel', style: 'padding:8px 18px;text-align:center;min-width:120px' }, [UI.el('div', { class: 'dim', style: 'font-size:11px;letter-spacing:2px', text: k }), UI.el('div', { style: 'font-size:22px;font-weight:700;font-family:var(--head)', text: v })]);
      UI.append(stats, [stat('WAVES CLEARED', r.mode === 'endless' ? String(r.wavesCleared) : r.wavesCleared + ' / ' + r.totalWaves), stat('CURSES EXORCISED', UI.fmt(r.kills)), stat('TIME', Util.fmtTime(r.duration)), r.mode === 'endless' ? stat('SCORE', UI.fmt(r.score)) : null]);
      col.appendChild(stats);

      const two = UI.el('div', { class: 'row', style: 'align-items:flex-start;gap:14px' });
      col.appendChild(two);

      // rewards
      const rw = UI.el('div', { class: 'panel col grow', style: 'gap:6px' });
      rw.appendChild(UI.el('div', { class: 'h2', text: 'Rewards' }));
      let delay = 0;
      const line = (content) => { const row = UI.el('div', { class: 'row rewardrow', style: 'animation-delay:' + (delay += 0.12) + 's' }, content); rw.appendChild(row); return row; };
      const R = r.rewards || {};
      if (R.coins) line([UI.icon('coins', 20), UI.el('b', { text: '+' + UI.fmt(R.coins) + ' Coins' }), R.bossCoins ? UI.el('span', { class: 'dim', style: 'font-size:12px', text: '(incl. ' + R.bossCoins + ' boss bounty)' }) : null]);
      if (R.gems) line([UI.icon('gems', 20), UI.el('b', { text: '+' + UI.fmt(R.gems) + ' Cursed Gems' }), R.firstClear ? UI.el('span', { class: 'pill gold', text: 'FIRST CLEAR' }) : null]);
      if (R.playerXp) line([UI.icon('xp', 20), UI.el('b', { text: '+' + R.playerXp + ' Player XP' }), R.levelUps ? UI.el('span', { class: 'pill ok', text: 'LEVEL UP ×' + R.levelUps + ' → Lv ' + p.playerLevel() }) : null]);
      for (const d of r.drops || []) {
        const c = JJK.Characters[d.id];
        if (d.kind === 'shards') line([UI.icon('shard', 20), UI.el('b', { style: 'color:' + UI.rc(c.rarity), text: c.short + ' shards ×' + d.n }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: 'boss drop' })]);
        else line([UI.el('b', { class: 'gold', text: '★ ' + c.name + ' joined your roster!' }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: 'boss drop' })]);
      }
      if (!R.coins && !R.gems && !R.playerXp) line([UI.el('span', { class: 'dim', text: 'No rewards: clear at least one wave to earn some.' })]);
      two.appendChild(rw);

      // character XP
      const cx = UI.el('div', { class: 'panel col', style: 'width:430px;gap:6px' });
      cx.appendChild(UI.el('div', { class: 'h2', text: 'Character XP' }));
      const cxp = R.charXp || {};
      for (const id of Object.keys(cxp)) {
        const d = JJK.Characters[id], info = cxp[id], data = p.d.characters[id];
        const need = p.charXpNeeded(id);
        const row = UI.el('div', { class: 'row rewardrow', style: 'animation-delay:' + (delay += 0.1) + 's' }, [
          JJK.Art.portraitImg(id, null, 80, 80),
          UI.el('div', { class: 'grow' }, [UI.el('div', { class: 'row' }, [UI.el('b', { text: d.short }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: '+' + info.xp + ' XP' }), info.levelUps ? UI.el('span', { class: 'pill ok', text: 'LV UP → ' + info.level }) : null]), UI.el('div', { class: 'bar', style: 'margin-top:3px' }, UI.el('i', { style: { width: (need ? Math.min(100, data.xp / need * 100) : 100) + '%' } }))]),
          UI.el('span', { class: 'dim', style: 'font-size:12px;width:38px;text-align:right', text: 'Lv ' + info.level }),
        ]);
        row.firstChild.style.cssText = 'width:36px;height:36px;border-radius:50%;border:2px solid ' + UI.rc(d.rarity);
        cx.appendChild(row);
      }
      if (!Object.keys(cxp).length) cx.appendChild(UI.el('div', { class: 'dim', text: 'No team members earned XP.' }));
      two.appendChild(cx);

      // unlocks & challenges
      if ((r.newChars && r.newChars.length) || (r.challenges && r.challenges.length)) {
        const un = UI.el('div', { class: 'panel col', style: 'gap:8px' });
        un.appendChild(UI.el('div', { class: 'h2 gold', text: 'Unlocked!' }));
        const rowc = UI.el('div', { class: 'row', style: 'gap:12px;flex-wrap:wrap' });
        for (const id of Array.from(new Set(r.newChars || []))) rowc.appendChild(UI.charCard(id, { onClick: null }));
        for (const ch of r.challenges || []) rowc.appendChild(UI.el('div', { class: 'item done' }, [UI.el('div', { class: 'col', style: 'gap:2px' }, [UI.el('b', { text: '✓ Challenge: ' + ch.name }), UI.el('div', { class: 'row', style: 'gap:4px;flex-wrap:wrap' }, UI.rewardChips(ch.reward))])]));
        un.appendChild(rowc);
        col.appendChild(un);
        A.sfx('claim');
      }

      // actions
      const acts = UI.el('div', { class: 'row', style: 'justify-content:center;gap:12px;margin:8px 0 18px' });
      const retry = ctx.params.retry;
      acts.appendChild(UI.btn('MAIN MENU', () => UI.show('menu'), ''));
      acts.appendChild(UI.btn('MAP SELECT', () => UI.show('play', { from: 'menu' }), ''));
      if (r.victory && r.mode === 'story') {
        const order = Object.values(JJK.Maps).sort((a, b) => a.order - b.order);
        const nxt = order[order.findIndex((m) => m.id === r.mapId) + 1];
        if (nxt && p.isMapUnlocked(nxt.id)) acts.appendChild(UI.btn('NEXT MAP ▶', () => { p.d.settings.lastMap = nxt.id; p.d.settings.lastDiff = 'normal'; p.commit(); UI.show('play', { from: 'menu' }); }, 'gold'));
      }
      if (retry) acts.appendChild(UI.btn('RETRY', () => UI.show('battle', Object.assign({ from: 'play' }, retry)), 'primary'));
      col.appendChild(acts);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
