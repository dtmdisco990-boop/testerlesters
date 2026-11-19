/* Characters screen: collection grid + detail panel (levels, stars, shards, upgrades, team). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Balance, Util } = JJK;

  UI.register('characters', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio;
      A.music('menu');
      const st = { sel: ctx.params.select && JJK.Characters[ctx.params.select] ? ctx.params.select : p.getLoadout()[0] || p.ownedIds()[0] || 'yuji', filter: 'ALL', owned: 'ALL' };
      ctx.root.appendChild(UI.topbar(ctx, 'Characters'));
      const body = UI.el('div', { class: 'body' });
      ctx.root.appendChild(body);
      const left = UI.el('div', { class: 'col grow', style: 'min-width:0;gap:8px' });
      const grid = UI.el('div', { class: 'grid scroll', style: 'flex:1;min-height:0;padding:4px;gap:12px' });
      const detail = UI.el('div', { class: 'detail panel scroll' });
      body.append(left, detail);

      const filters = UI.el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' });
      const info = UI.el('span', { class: 'dim', style: 'margin-left:auto;font-size:12px' });
      left.append(filters, grid);

      const renderFilters = () => {
        UI.clear(filters);
        for (const f of ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'SPECIAL', 'JOAN']) filters.appendChild(UI.el('span', { class: 'filter' + (st.filter === f ? ' on' : ''), role: 'button', tabindex: '0', text: f, on: { click: () => { st.filter = f; renderAll(); }, keydown: (e) => { if (e.key === 'Enter') { st.filter = f; renderAll(); } } } }));
        for (const f of ['ALL', 'OWNED', 'LOCKED']) filters.appendChild(UI.el('span', { class: 'filter' + (st.owned === f ? ' on' : ''), role: 'button', tabindex: '0', text: f, style: f === 'ALL' ? 'margin-left:14px' : '', on: { click: () => { st.owned = f; renderAll(); }, keydown: (e) => { if (e.key === 'Enter') { st.owned = f; renderAll(); } } } }));
        info.textContent = p.ownedIds().length + ' / ' + JJK.CharacterOrder.length + ' collected';
        filters.appendChild(info);
      };
      const renderGrid = () => {
        UI.clear(grid);
        const lo = p.getLoadout();
        const list = JJK.CharacterOrder.filter((id) => (st.filter === 'ALL' || JJK.Characters[id].rarity === st.filter) && (st.owned === 'ALL' || (st.owned === 'OWNED') === p.owns(id)));
        list.sort((a, b) => (p.owns(b) - p.owns(a)) || (UI.TIER_ORDER.concat(['SPECIAL', 'JOAN']).indexOf(JJK.Characters[b].rarity) - UI.TIER_ORDER.concat(['SPECIAL', 'JOAN']).indexOf(JJK.Characters[a].rarity)));
        for (const id of list) {
          const c = UI.charCard(id, { inTeam: lo.includes(id), onClick: (cid) => { st.sel = cid; A.sfx('click'); renderGrid(); renderDetail(); }, tip: false });
          if (id === st.sel) c.style.outline = '3px solid #fff';
          grid.appendChild(c);
        }
        if (!list.length) grid.appendChild(UI.el('div', { class: 'dim', text: 'Nothing matches this filter.' }));
      };

      const kv = (k, v, tip) => UI.el('div', { tip: tip || null }, [UI.el('span', { class: 'dim', text: k + ' ' }), UI.el('b', { text: v })]);

      const renderDetail = () => {
        UI.clear(detail);
        const id = st.sel, d = JJK.Characters[id]; if (!d) return;
        const owned = p.owns(id), data = p.d.characters[id];
        detail.style.borderColor = UI.rc(d.rarity);
        const head = UI.el('div', { class: 'row', style: 'align-items:flex-start' });
        const im = JJK.Art.portraitImg(id, null, 240, 240); im.style.cssText = 'width:130px;height:130px;border:3px solid ' + UI.rc(d.rarity) + ';flex:none' + (owned ? '' : ';filter:grayscale(1) brightness(.5)');
        head.append(im, UI.el('div', { class: 'col grow', style: 'gap:2px' }, [UI.el('div', { class: 'h1', style: 'font-size:24px;line-height:1.05', text: d.name }), UI.el('div', { class: 'dim', text: d.title }), UI.el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, [UI.rarityTag(d.rarity), UI.el('span', { class: 'pill', text: d.role }), UI.el('span', { class: 'pill', text: d.attackType })]), owned ? UI.el('div', { style: 'margin-top:4px' }, [UI.stars(data.stars)]) : null]));
        detail.appendChild(head);
        detail.appendChild(UI.el('div', { style: 'font-size:13px' , text: d.desc }));
        const traits = UI.el('div', { class: 'row', style: 'gap:5px;flex-wrap:wrap' });
        for (const t of d.traits) { const el = UI.el('span', { class: 'pill', text: t }); if (JJK.Traits[t]) UI.tip(el, '<b>' + t + '</b><br>' + JJK.Traits[t].desc); traits.appendChild(el); }
        detail.appendChild(traits);

        // stats at current level
        const lv = owned ? data.level : 1, stars = owned ? data.stars : 0;
        const mult = 1 + (lv - 1) * Balance.charDmgPerLevel + stars * Balance.starDmg;
        const stats = UI.el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;font-size:12.5px' });
        stats.append(kv('Deploy cost', '¥' + d.cost), kv('Damage', (d.base.dmg * mult).toFixed(1), 'Base ' + d.base.dmg + ' × ' + mult.toFixed(2) + ' from level/stars'), kv('Attack delay', d.base.spa + 's'), kv('Range', String(d.base.range + (stars >= 3 ? Balance.starRangeAt3 : 0)) + ' tiles'), kv('Damage type', { phys: 'Physical', cursed: 'Cursed', true: 'True' }[d.base.dtype]), kv('Targets', d.targets === 'both' ? 'Ground + Air' : d.targets === 'air' ? 'Air' : 'Ground'), kv('Placement', { ground: 'Ground', elevated: 'Elevated', any: 'Any' }[d.place]), kv('Max placed', String(Balance.rarity[d.rarity].maxPlace)));
        detail.appendChild(stats);

        // progression
        if (owned) {
          const need = p.charXpNeeded(id);
          const prog = UI.el('div', { class: 'col', style: 'gap:4px' });
          prog.append(UI.el('div', { class: 'row' }, [UI.el('b', { text: 'Level ' + data.level + ' / ' + Balance.charLevelCap }), UI.el('span', { class: 'grow' }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: need ? data.xp + ' / ' + need + ' XP' : 'MAX' })]), UI.el('div', { class: 'bar' }, UI.el('i', { style: { width: (need ? data.xp / need * 100 : 100) + '%' } })));
          const items = UI.el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' });
          for (const k of Object.keys(JJK.Items)) {
            const it = JJK.Items[k], n = p.d.items[k] || 0;
            const b = UI.btn(it.name + ' ×' + n, () => { const r = p.useXpItem(id, k); if (!r.ok) { UI.toast(r.reason, 'bad'); A.sfx('error'); } else { A.sfx('upgrade'); UI.toast(d.short + (r.levels ? ' reached level ' + data.level + '!' : ' gained XP'), 'good'); } renderAll(); }, 'small', { disabled: n < 1 || data.level >= Balance.charLevelCap, tip: it.desc });
            items.appendChild(b);
          }
          prog.appendChild(items);
          // stars
          const sc = p.starCost(id);
          const sh = p.shardsOf(id);
          const starRow = UI.el('div', { class: 'row', style: 'gap:8px;margin-top:4px' }, [UI.el('div', { class: 'grow', style: 'font-size:12.5px' }, [UI.el('b', { text: 'Star upgrade' }), UI.el('div', { class: 'dim', text: sc ? 'Needs ' + sc.shards + ' shards (have ' + sh + ') + ' + UI.fmt(sc.coins) + ' coins. Each star +' + Math.round(Balance.starDmg * 100) + '% damage; ★3 adds range; ★5 −' + Math.round(Balance.starCostDiscountAt5 * 100) + '% deploy cost.' : 'Maximum stars reached.' })]), UI.btn('★ UPGRADE', () => { const r = p.upgradeStar(id); if (!r.ok) { UI.toast(r.reason, 'bad'); A.sfx('error'); } else { A.sfx('upgrade'); UI.toast(d.short + ' is now ' + r.stars + '★', 'gold'); } renderAll(); }, 'gold small', { disabled: !sc || sh < sc.shards || p.coins < sc.coins })]);
          prog.appendChild(starRow);
          detail.appendChild(prog);
          const lo = p.getLoadout();
          detail.appendChild(UI.btn(lo.includes(id) ? 'REMOVE FROM TEAM' : 'ADD TO TEAM', () => { const r = p.toggleLoadout(id); if (!r.ok) { UI.toast(r.reason, 'bad'); A.sfx('error'); } else A.sfx('click'); renderAll(); }, lo.includes(id) ? '' : 'primary'));
        } else if (d.rarity === 'JOAN') {
          const box = UI.el('div', { class: 'panel col joan-box', style: 'gap:6px' });
          box.append(UI.el('div', { class: 'h2', style: 'margin:0', text: 'Locked' }), UI.el('div', { style: 'font-size:12.5px', text: p.charUnlockHint(id) }),
            UI.el('div', { class: 'dim', style: 'font-size:12px', text: 'Odds: 1 in ' + JJK.SummonMath.JOAN_ODDS.toLocaleString('en-US') + ' per pull. No shard unlock, no shop offer.' + (p.shardsOf(id) ? ' Shards: ' + p.shardsOf(id) : '') }));
          detail.appendChild(box);
        } else {
          const need = p.unlockShardCost(id), have = p.shardsOf(id);
          const box = UI.el('div', { class: 'panel col', style: 'gap:6px;background:#0c0b1e' });
          box.append(UI.el('div', { class: 'h2', style: 'margin:0', text: 'Locked' }), UI.el('div', { style: 'font-size:12.5px', text: p.charUnlockHint(id) }),
            UI.el('div', { class: 'row' }, [UI.icon('shard', 18), UI.el('b', { text: have + ' / ' + need + ' shards' }), UI.el('span', { class: 'grow' }), UI.btn('UNLOCK WITH SHARDS', () => { const r = p.unlockWithShards(id); if (r.ok) { A.sfx('claim'); UI.toast(d.name + ' unlocked!', 'gold'); } else { UI.toast(r.reason, 'bad'); A.sfx('error'); } renderAll(); }, 'gold small', { disabled: have < need })]),
            UI.el('div', { class: 'bar gold' }, UI.el('i', { style: { width: Math.min(100, have / need * 100) + '%' } })));
          const acq = [];
          if (d.unlock.type === 'summon') { if (JJK.Expansion.includes(id)) acq.push('Culling Game banner only'); else acq.push('Summon banners', 'Shop shard offers'); } if (d.unlock.type === 'bossKills') acq.push('Boss mastery'); if (d.unlock.type === 'map') acq.push('Story clear'); if (d.unlock.type === 'mission') acq.push('Mission reward'); if (d.unlock.type === 'challenge') acq.push('Challenge reward'); if (d.unlock.type === 'boss') acq.push('Boss drop'); if (d.unlock.type === 'secret') acq.push('Secret challenge');
          box.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: 'Ways to obtain: ' + acq.join(' · ') + ' · duplicate shards' }));
          detail.appendChild(box);
        }

        // upgrade path
        detail.appendChild(UI.el('div', { class: 'h2', style: 'margin-top:6px', text: 'In-battle upgrades' }));
        const ul = UI.el('div', { class: 'uplist' });
        d.upgrades.forEach((u, i) => { const cost = Math.round(u.cost); ul.appendChild(UI.el('div', { class: 'upstep', tip: u.desc }, [UI.el('span', { class: 'n', text: String(i + 1) }), UI.el('div', { class: 'grow' }, [UI.el('b', { text: u.name }), UI.el('div', { class: 'dim', style: 'font-size:11px', text: u.desc })]), UI.el('span', { class: 'gold', style: 'font-size:11.5px', text: '¥' + cost })])); });
        detail.appendChild(ul);
        const domUp = d.upgrades.find((u) => u.flags && u.flags.domain);
        if (domUp) { const dm = JJK.Domains[domUp.flags.domain]; detail.appendChild(UI.el('div', { class: 'panel', style: 'border-color:' + dm.color + ';font-size:12.5px;padding:8px' }, [UI.el('b', { style: 'color:' + dm.color, text: 'Domain Expansion: ' + dm.name }), UI.el('div', { class: 'dim', text: 'Cooldown ' + dm.cd + 's · Duration ' + dm.dur + 's' }), UI.el('div', { text: dm.desc })])); }
      };
      const renderAll = () => { renderFilters(); renderGrid(); renderDetail(); };
      renderAll();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
