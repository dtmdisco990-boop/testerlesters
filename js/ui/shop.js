/* Shop: daily deals, weekly shards, permanent items. All prices in Coins; stock/limits come from Profile.shopStock(). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Util } = JJK;

  UI.register('shop', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio;
      A.music('menu');
      ctx.root.appendChild(UI.topbar(ctx, 'Shop'));
      const body = UI.el('div', { class: 'body col scroll', style: 'gap:12px' });
      ctx.root.appendChild(body);

      const offerView = (o) => {
        const soldOut = o.limit && o.bought >= o.limit;
        const can = p.coins >= o.price;
        const card = UI.el('div', { class: 'shopitem' + (soldOut ? ' sold' : '') });
        const top = UI.el('div', { class: 'row', style: 'gap:10px' });
        if (o.kind === 'shards') {
          const d = JJK.Characters[o.charId];
          const im = JJK.Art.portraitImg(o.charId, null, 120, 120); im.style.cssText = 'width:54px;height:54px;border-radius:8px;border:2px solid ' + UI.rc(d.rarity);
          top.appendChild(im);
          top.appendChild(UI.el('div', { class: 'col grow' }, [UI.el('b', { style: 'color:' + UI.rc(d.rarity), text: d.short + ' Shards ×' + o.qty }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: (p.owns(o.charId) ? 'Owned · have ' : 'Not owned · have ') + p.shardsOf(o.charId) + (p.owns(o.charId) ? '' : '/' + p.unlockShardCost(o.charId)) })]));
        } else if (o.kind === 'item') {
          const it = JJK.Items[o.item];
          top.appendChild(UI.el('div', { class: 'itemico', style: 'background:' + it.color, text: '✦' }));
          top.appendChild(UI.el('div', { class: 'col grow' }, [UI.el('b', { text: it.name + (o.qty > 1 ? ' ×' + o.qty : '') }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: it.desc + ' Owned: ' + (p.d.items[o.item] || 0) })]));
        } else {
          top.appendChild(UI.icon('gems', 40));
          top.appendChild(UI.el('div', { class: 'col grow' }, [UI.el('b', { text: o.qty + ' Cursed Gems' }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: 'Convert Coins to summon currency.' })]));
        }
        card.appendChild(top);
        if (o.label) card.appendChild(UI.el('div', { class: 'pill gold', text: o.label }));
        const row = UI.el('div', { class: 'row', style: 'justify-content:space-between;margin-top:6px' });
        row.appendChild(UI.el('span', { class: 'dim', style: 'font-size:12px', text: o.limit ? (soldOut ? 'SOLD OUT' : (o.limit - o.bought) + '/' + o.limit + ' left') : 'Unlimited' }));
        const b = UI.btn(null, () => {
          const r = p.buy(o.key);
          if (!r.ok) { UI.toast(r.reason, 'bad'); A.sfx('error'); return; }
          A.sfx('buy'); UI.toast('Purchased!', 'good'); render();
        }, can && !soldOut ? 'primary small' : 'small', { disabled: !!soldOut, tip: !can && !soldOut ? 'Not enough Coins (' + UI.fmt(p.coins) + '/' + UI.fmt(o.price) + ')' : null });
        if (!can || soldOut) b.classList.add('disabled');
        b.append(UI.icon('coins', 16), ' ' + UI.fmt(o.price));
        row.appendChild(b); card.appendChild(row);
        return card;
      };

      const section = (title, sub, list) => {
        const s = UI.el('div', { class: 'panel col', style: 'gap:8px' });
        s.appendChild(UI.el('div', { class: 'row' }, [UI.el('div', { class: 'h2', text: title }), UI.el('span', { class: 'dim grow', style: 'font-size:12px;margin-left:10px', text: sub })]));
        const grid = UI.el('div', { class: 'shopgrid' });
        for (const o of list) grid.appendChild(offerView(o));
        s.appendChild(grid); return s;
      };

      const render = () => {
        UI.clear(body);
        const st = p.shopStock();
        const now = p.now();
        const hrs = Math.ceil(((st.day + 1) * 86400000 - now) / 3600000);
        const wd = Math.ceil((((st.week + 1) * 7 - 4) * 86400000 - now) / 86400000);
        body.appendChild(section('Daily Deals', 'Rotates at 00:00 UTC (in ~' + hrs + 'h). One of each per day.', st.featured));
        body.appendChild(section('Weekly Shards', 'Rotates Mondays UTC (in ~' + wd + 'd). Shards unlock characters or raise stars.', st.shards));
        body.appendChild(section('Supplies', 'Always available.', st.items));
      };
      render();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
