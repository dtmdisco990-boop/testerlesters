/* INDEX: enemies and bosses (discovered by fighting them) and the sorcerer roster. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI;

  UI.register('codex', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio;
      A.music('menu');
      let tab = ctx.params.tab || 'enemies', sel = null;
      ctx.root.appendChild(UI.topbar(ctx, 'Index'));
      const tabs = UI.el('div', { class: 'tabs' });
      const body = UI.el('div', { class: 'body' });
      ctx.root.append(tabs, body);
      const list = UI.el('div', { class: 'panel col scroll', style: 'width:420px;flex:none;gap:6px' });
      const detail = UI.el('div', { class: 'panel col grow scroll', style: 'gap:8px' });
      body.append(list, detail);

      const entries = () => {
        if (tab === 'enemies') return JJK.EnemyOrder.map((id) => ({ id, def: JJK.Enemies[id], seen: !!p.d.index.enemies[id], kind: 'enemy' }));
        if (tab === 'bosses') return JJK.BossOrder.map((id) => ({ id, def: JJK.Bosses[id], seen: !!p.d.index.bosses[id], kind: 'boss' }));
        return JJK.CharacterOrder.map((id) => ({ id, def: JJK.Characters[id], seen: p.owns(id), kind: 'char' }));
      };
      const thumb = (e, px) => (e.kind === 'char' ? JJK.Art.portraitImg(e.id, null, 120, 120) : UI.el('img', { src: JJK.Art.enemyThumbURL(e.id, px || 96), width: px || 48, height: px || 48, alt: '' }));

      const render = () => {
        UI.clear(tabs); UI.clear(list); UI.clear(detail);
        for (const [k, l] of [['enemies', 'Curses'], ['bosses', 'Bosses'], ['chars', 'Sorcerers']]) {
          const t = UI.el('button', { class: 'tab' + (tab === k ? ' on' : ''), type: 'button', text: l });
          t.addEventListener('click', () => { tab = k; sel = null; A.sfx('click'); render(); });
          tabs.appendChild(t);
        }
        const es = entries();
        const found = es.filter((e) => e.seen).length;
        tabs.appendChild(UI.el('span', { class: 'dim', style: 'margin-left:12px;align-self:center', text: found + '/' + es.length + (tab === 'chars' ? ' owned' : ' discovered') }));
        if (!sel || !es.find((e) => e.id === sel)) sel = (es.find((e) => e.seen) || es[0]).id;
        for (const e of es) {
          const row = UI.el('button', { class: 'shopitem row' + (sel === e.id ? ' on' : ''), type: 'button', style: 'gap:10px;text-align:left;align-items:center' });
          const th = thumb(e, 48); th.style.cssText = 'width:48px;height:48px;object-fit:contain;' + (e.seen ? '' : 'filter:brightness(0) opacity(.6)');
          row.appendChild(th);
          row.appendChild(UI.el('div', { class: 'col grow' }, [UI.el('b', { text: e.seen ? e.def.name : '???' }), UI.el('span', { class: 'dim', style: 'font-size:12px', text: e.seen ? (e.kind === 'char' ? e.def.rarity + ' · ' + e.def.role : e.def.title || (e.def.air ? 'Flying' : 'Ground')) : (e.kind === 'char' ? 'Not owned' : 'Not yet encountered') })]));
          row.addEventListener('click', () => { sel = e.id; A.sfx('click'); render(); });
          list.appendChild(row);
        }
        const e = es.find((x) => x.id === sel), d = e.def;
        if (!e.seen) {
          detail.appendChild(UI.el('div', { class: 'h2', text: '???' }));
          detail.appendChild(UI.el('div', { class: 'dim', text: e.kind === 'char' ? p.charUnlockHint(e.id) || 'Keep playing to find this sorcerer.' : 'Encounter this ' + (e.kind === 'boss' ? 'boss' : 'curse') + ' in a match to reveal its entry.' }));
          return;
        }
        const head = UI.el('div', { class: 'row', style: 'gap:14px' });
        const big = thumb(e, 120); big.style.cssText = 'width:120px;height:120px;object-fit:contain;border-radius:10px;background:#0006';
        head.appendChild(big);
        head.appendChild(UI.el('div', { class: 'col' }, [UI.el('div', { class: 'h1', style: 'font-size:26px', text: d.name }), UI.el('div', { class: 'dim', text: e.kind === 'char' ? d.title : d.title || (d.air ? 'Flying curse' : 'Ground curse') })]));
        detail.appendChild(head);
        detail.appendChild(UI.el('p', { text: d.desc }));
        if (e.kind === 'char') {
          detail.appendChild(UI.el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, [UI.rarityTag(d.rarity), ...d.traits.map((t) => UI.el('span', { class: 'pill', text: t }))]));
          detail.appendChild(UI.el('div', { class: 'dim', text: 'Cost ¥' + d.cost + ' · Range ' + d.base.range + ' · ' + d.attackType + ' · ' + (d.place === 'ground' ? 'Ground only' : 'Ground or elevated') + ' · Targets ' + d.targets }));
          detail.appendChild(UI.btn('Open in Characters', () => UI.show('characters', { sel: e.id, from: 'codex' }), 'small'));
        } else {
          const rows = [['HP', UI.fmt(d.hp)], ['Speed', d.speed], ['Armor', Math.round((d.armor || 0) * 100) + '%'], ['Yen', d.yen], ['Base damage on leak', d.leak], ['Type', d.air ? 'Flying (needs air-capable units)' : 'Ground']];
          const tt = UI.el('table', { class: 'tbl', style: 'width:360px' });
          for (const [k, v] of rows) tt.appendChild(UI.el('tr', null, [UI.el('td', { class: 'dim', text: k }), UI.el('td', { text: String(v) })]));
          detail.appendChild(tt);
          if (d.tip) detail.appendChild(UI.el('div', null, [UI.el('b', { text: 'How to counter: ' }), d.tip]));
          if (d.mechanics) { detail.appendChild(UI.el('div', { class: 'h2', text: 'Mechanics' })); const ul = UI.el('ul'); for (const m of d.mechanics) ul.appendChild(UI.el('li', { text: m })); detail.appendChild(ul); }
          const rec = p.d.bossRecords && p.d.bossRecords[e.id];
          if (rec) detail.appendChild(UI.el('div', { class: 'dim', text: 'Defeated ' + rec.kills + ' time' + (rec.kills === 1 ? '' : 's') + (rec.best ? ' · fastest ' + Math.round(rec.best) + 's' : '') }));
        }
      };
      render();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
