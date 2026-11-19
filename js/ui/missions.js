/* Missions: Daily (3 per UTC day), Milestone missions, and Challenges (incl. hidden ones). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Util } = JJK;

  UI.register('missions', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio;
      A.music('menu');
      let tab = ctx.params.tab || 'daily';
      ctx.root.appendChild(UI.topbar(ctx, 'Missions'));
      const tabs = UI.el('div', { class: 'tabs' });
      const body = UI.el('div', { class: 'body col scroll', style: 'gap:8px' });
      ctx.root.append(tabs, body);

      const claim = (res, label) => {
        if (!res.ok) { UI.toast(res.reason, 'bad'); A.sfx('error'); return; }
        A.sfx('claim');
        const chips = UI.el('span', { class: 'row', style: 'gap:8px' }, UI.rewardChips(res.reward));
        UI.toast('Reward claimed' + (res.reward && res.reward.char ? ': new character!' : '.'), 'good');
        render();
      };
      const row = (name, desc, prog, target, reward, done, claimed, onClaim) => {
        const r = UI.el('div', { class: 'shopitem row' + (claimed ? ' sold' : ''), style: 'gap:14px;align-items:center' });
        r.appendChild(UI.el('div', { class: 'col grow', style: 'gap:3px' }, [
          UI.el('b', { text: name }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: desc }),
          UI.el('div', { class: 'bar', style: 'height:8px;max-width:420px' }, UI.el('i', { style: { width: Math.min(100, prog / target * 100) + '%' } })),
          UI.el('span', { class: 'dim', style: 'font-size:11px', text: UI.fmt(prog) + ' / ' + UI.fmt(target) }),
        ]));
        r.appendChild(UI.el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;max-width:230px;justify-content:flex-end' }, UI.rewardChips(reward)));
        const b = UI.btn(claimed ? 'CLAIMED' : done ? 'CLAIM' : 'IN PROGRESS', () => onClaim(), done && !claimed ? 'primary small' : 'small disabled', { disabled: !done || claimed });
        r.appendChild(b); return r;
      };

      const render = () => {
        UI.clear(tabs); UI.clear(body);
        const cl = p.claimableCount();
        for (const [k, l] of [['daily', 'Daily'], ['missions', 'Missions'], ['challenges', 'Challenges']]) {
          const t = UI.el('button', { class: 'tab' + (tab === k ? ' on' : ''), type: 'button', text: l });
          t.addEventListener('click', () => { tab = k; A.sfx('click'); render(); });
          tabs.appendChild(t);
        }
        if (cl) tabs.appendChild(UI.el('span', { class: 'pill gold', style: 'margin-left:10px', text: cl + ' to claim' }));
        if (tab === 'daily') {
          const left = Math.ceil(((Util.dayIndex(p.now()) + 1) * 86400000 - p.now()) / 3600000);
          body.appendChild(UI.el('div', { class: 'dim', text: 'Daily missions reset at 00:00 UTC (in ~' + left + 'h). No login streaks, nothing is lost by skipping a day.' }));
          for (const d of p.dailyMissions()) body.appendChild(row(d.name, 'Resets daily.', d.progress, d.target, d.reward, d.done, d.claimed, () => claim(p.claimDaily(d.id))));
        } else if (tab === 'missions') {
          const groups = {};
          for (const m of JJK.Missions) (groups[m.group] = groups[m.group] || []).push(m);
          for (const g of Object.keys(groups)) {
            body.appendChild(UI.el('div', { class: 'h2', text: g }));
            // unclaimed-ready first, then in progress, then claimed
            const list = groups[g].map((m) => ({ m, s: p.missionStatus(m) })).sort((a, b) => (a.s.claimed - b.s.claimed) || ((b.s.done ? 1 : 0) - (a.s.done ? 1 : 0)));
            for (const { m, s } of list) body.appendChild(row(m.name, m.desc, s.progress, s.target, m.reward, s.done, s.claimed, () => claim(p.claimMission(m.id))));
          }
        } else {
          if (!p.isFeatureUnlocked('challenges')) { body.appendChild(UI.el('div', { class: 'panel', text: p.featureLockReason('challenges') })); return; }
          body.appendChild(UI.el('div', { class: 'dim', text: 'Challenges are completed inside matches. Rewards are granted automatically when you finish the match.' }));
          for (const c of JJK.Challenges) {
            const done = !!p.d.challenges.done[c.id];
            if (c.hidden && !done) { body.appendChild(UI.el('div', { class: 'shopitem row', style: 'opacity:.7' }, [UI.el('div', { class: 'col grow' }, [UI.el('b', { text: '??? Hidden challenge' }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: 'Discover it by playing differently.' })])])); continue; }
            const prog = c.progress ? Math.min(c.target, c.progress(p.d)) : done ? 1 : 0;
            body.appendChild(row(c.hiddenName && done ? c.hiddenName : c.name, c.desc, prog, c.target, c.reward, done, done, () => {}));
          }
        }
      };
      render();
      UI.sub(ctx, p.events, 'changed', () => { /* header counters update via topbar */ });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
