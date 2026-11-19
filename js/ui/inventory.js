/* Inventory: currencies, XP items (usable on a chosen character), shard stockpile. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Balance } = JJK;

  UI.register('inventory', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio;
      A.music('menu');
      ctx.root.appendChild(UI.topbar(ctx, 'Inventory'));
      const body = UI.el('div', { class: 'body' });
      ctx.root.appendChild(body);
      const left = UI.el('div', { class: 'panel col scroll', style: 'width:520px;flex:none;gap:10px' });
      const right = UI.el('div', { class: 'panel col grow scroll', style: 'gap:10px' });
      body.append(left, right);
      let selItem = null;

      const render = () => {
        UI.clear(left); UI.clear(right);
        left.appendChild(UI.el('div', { class: 'h2', text: 'Currencies' }));
        left.appendChild(UI.el('div', { class: 'row', style: 'gap:16px' }, [
          UI.el('div', { class: 'cur', tip: 'Coins' }, [UI.icon('coins', 22), UI.el('b', { text: ' ' + UI.fmt(p.coins) + ' Coins' })]),
          UI.el('div', { class: 'cur', tip: 'Cursed Gems' }, [UI.icon('gems', 22), UI.el('b', { text: ' ' + UI.fmt(p.gems) + ' Cursed Gems' })]),
        ]));
        left.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: 'Yen is earned and spent inside matches only.' }));
        left.appendChild(UI.el('div', { class: 'h2', text: 'Training Items' }));
        let any = false;
        for (const id of Object.keys(JJK.Items)) {
          const it = JJK.Items[id], n = p.d.items[id] || 0; if (n > 0) any = true;
          const row = UI.el('button', { class: 'shopitem row' + (selItem === id ? ' on' : ''), type: 'button', style: 'text-align:left;gap:10px' }, [
            UI.el('div', { class: 'itemico', style: 'background:' + it.color, text: '✦' }),
            UI.el('div', { class: 'col grow' }, [UI.el('b', { text: it.name }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: it.desc })]),
            UI.el('b', { style: 'font-size:20px', text: '×' + n }),
          ]);
          row.addEventListener('click', () => { if (n < 1) { UI.toast('You have none. Buy more in the Shop.', 'bad'); return; } selItem = id; A.sfx('click'); render(); });
          left.appendChild(row);
        }
        if (!any) left.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: 'No items yet. Earn them from matches and missions, or buy them in the Shop.' }));
        left.appendChild(UI.el('div', { class: 'h2', text: 'Shards' }));
        const sh = Object.keys(p.d.shards).filter((k) => p.d.shards[k] > 0);
        if (!sh.length) left.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: 'No shards. Duplicates from the Summon and boss drops give shards.' }));
        const grid = UI.el('div', { class: 'row', style: 'flex-wrap:wrap;gap:6px' });
        for (const id of sh) {
          const d = JJK.Characters[id]; if (!d) continue;
          const e = UI.el('div', { class: 'pill', style: 'border-color:' + UI.rc(d.rarity) + ';color:' + UI.rc(d.rarity) }, [UI.icon('shard', 14), ' ' + d.short + ' ×' + p.d.shards[id] + (p.owns(id) ? '' : ' / ' + p.unlockShardCost(id))]);
          grid.appendChild(e);
        }
        left.appendChild(grid);

        // right: apply selected item
        if (selItem && (p.d.items[selItem] || 0) > 0) {
          const it = JJK.Items[selItem];
          right.appendChild(UI.el('div', { class: 'h2', text: 'Use ' + it.name + ' on…' }));
          const g = UI.el('div', { class: 'cardgrid' });
          for (const id of p.ownedIds()) {
            const c = p.d.characters[id], max = c.level >= Balance.charLevelCap;
            const card = UI.charCard(id, { onClick: () => { const r = p.useXpItem(id, selItem); if (!r.ok) { UI.toast(r.reason, 'bad'); A.sfx('error'); return; } A.sfx('upgrade'); UI.toast(JJK.Characters[id].short + (r.levels ? ' reached Lv ' + p.d.characters[id].level + '!' : ' gained XP.'), 'good'); render(); } });
            if (max) card.classList.add('disabled');
            const need = max ? 'MAX' : c.xp + '/' + Balance.charXpToNext(c.level) + ' XP';
            card.appendChild(UI.el('div', { class: 'xpline', style: 'font-size:10px;text-align:center;color:#bcd', text: need }));
            g.appendChild(card);
          }
          right.appendChild(g);
        } else {
          right.appendChild(UI.el('div', { class: 'h2', text: 'Characters' }));
          right.appendChild(UI.el('div', { class: 'dim', text: 'Select a training item on the left to apply it to a character. Items also work from the Characters screen.' }));
        }
      };
      render();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
