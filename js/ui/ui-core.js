/* UI core: DOM helpers, screen manager, toasts, modals, tooltips, shared widgets. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const { Util, Balance } = JJK;

  const UI = {
    screens: {}, current: null, profile: null, sm: null, _tipTimer: 0,
    DIFF_COLOR: { normal: '#4ade80', hard: '#ffb23f', special: '#ff3b5c' },
    TIER_ORDER: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],

    // ------------------------------------------------------------------ DOM helper
    el(tag, props, children) {
      const e = document.createElement(tag);
      if (props) {
        for (const k of Object.keys(props)) {
          const v = props[k];
          if (v == null || v === false) continue;
          if (k === 'class') e.className = v;
          else if (k === 'text') e.textContent = v;
          else if (k === 'html') e.innerHTML = v;
          else if (k === 'style') { if (typeof v === 'string') e.setAttribute('style', v); else Object.assign(e.style, v); }
          else if (k === 'on') { for (const ev of Object.keys(v)) e.addEventListener(ev, v[ev]); }
          else if (k === 'disabled') e.disabled = !!v;
          else if (k === 'tip') UI.tip(e, v);
          else e.setAttribute(k, v === true ? '' : v);
        }
      }
      UI.append(e, children);
      return e;
    },
    append(e, children) {
      if (children == null || children === false) return e;
      if (Array.isArray(children)) { for (const c of children) UI.append(e, c); }
      else if (children instanceof Node) e.appendChild(children);
      else e.appendChild(document.createTextNode(String(children)));
      return e;
    },
    clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; },
    btn(label, onClick, cls, extra) {
      return UI.el('button', Object.assign({ class: 'btn ' + (cls || ''), type: 'button', on: { click: (ev) => { if (!ev.currentTarget.disabled && onClick) onClick(ev); } } }, extra || {}), label);
    },
    fmt(n) { return Util.fmtComma(Math.round(n)); },
    rc(r) { return Balance.rarity[r].color; },
    icon(name, px) { return UI.el('img', { class: 'ico', src: JJK.Art.icon(name, px || 18), width: px || 18, height: px || 18, alt: name, draggable: 'false', style: { verticalAlign: 'middle' } }); },
    stars(n, max) { const s = UI.el('span', { class: 'stars' }); for (let i = 0; i < (max || Balance.maxStars); i++) s.appendChild(UI.el('span', { class: i < n ? '' : 'off', text: '★' })); return s; },
    rarityTag(r) { return UI.el('span', { class: 'pill r-' + r, style: { color: UI.rc(r), borderColor: UI.rc(r) }, text: r }); },

    // ------------------------------------------------------------------ screens
    register(name, def) { UI.screens[name] = def; },
    show(name, params) {
      const def = UI.screens[name];
      if (!def) { UI.toast('Unknown screen: ' + name, 'bad'); return; }
      UI.closeModals(); UI.hideTip();
      const prev = UI.current;
      if (prev) { try { for (const f of prev.cleanups.splice(0)) f(); if (prev.def.exit) prev.def.exit(prev); } catch (e) { console.error('[exit]', e); } }
      const root = UI.rootEl; UI.clear(root);
      const holder = UI.el('div', { class: 'screen' + (def.transparent ? ' transparent' : ''), 'data-screen': name });
      root.appendChild(holder);
      const ctx = { name, def, params: params || {}, root: holder, cleanups: [], onExit(fn) { ctx.cleanups.push(fn); }, ui: UI, profile: UI.profile };
      UI.current = ctx;
      UI.canvas.classList.toggle('on', !!def.battle);
      try { def.enter(ctx); } catch (err) {
        console.error('[screen ' + name + ']', err);
        UI.toast('Something went wrong opening ' + name + '. Returning to the menu.', 'bad');
        if (name !== 'menu') { setTimeout(() => UI.show('menu'), 0); }
        else UI.fatal('The main menu failed to open: ' + (err && err.message));
      }
      return ctx;
    },
    back(fallback) { const p = UI.current && UI.current.params; UI.show((p && p.from) || fallback || 'menu'); },
    fatal(msg) {
      UI.modal({ title: 'Something broke', body: UI.el('div', null, [UI.el('p', { text: msg }), UI.el('p', { class: 'dim', text: 'You can retry, or reset your save (a backup copy is kept).' })]), buttons: [
        { label: 'Reload', cls: 'primary', onClick: () => location.reload() },
        { label: 'Reset save', cls: 'danger', onClick: () => { UI.sm.resetProgress(); location.reload(); } },
      ], dismiss: false });
    },

    // ------------------------------------------------------------------ toast / modal / tooltip
    toast(msg, kind) {
      const t = UI.el('div', { class: 'toast ' + (kind || ''), text: msg, role: 'status' });
      UI.toastRoot.appendChild(t);
      while (UI.toastRoot.children.length > 4) UI.toastRoot.removeChild(UI.toastRoot.firstChild);
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2600);
    },
    modal(o) {
      const back = UI.el('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true' });
      const box = UI.el('div', { class: 'modal', style: o.width ? { width: o.width + 'px' } : null });
      if (o.title) box.appendChild(UI.el('h2', { text: o.title }));
      if (o.body) box.appendChild(typeof o.body === 'string' ? UI.el('div', { text: o.body }) : o.body);
      const api = { el: back, close() { back.remove(); if (o.onClose) o.onClose(); } };
      if (o.buttons && o.buttons.length) {
        const act = UI.el('div', { class: 'actions' });
        for (const b of o.buttons) act.appendChild(UI.btn(b.label, () => { if (b.onClick) { if (b.onClick(api) === false) return; } if (!b.keepOpen) api.close(); }, b.cls));
        box.appendChild(act);
      }
      back.appendChild(box);
      if (o.dismiss !== false) back.addEventListener('pointerdown', (e) => { if (e.target === back) api.close(); });
      UI.overlayEl.appendChild(back);
      const first = box.querySelector('button'); if (first) first.focus();
      return api;
    },
    confirm(title, msg, onYes, yesLabel, cls) {
      return UI.modal({ title, body: UI.el('div', { text: msg }), buttons: [{ label: 'Cancel' }, { label: yesLabel || 'Confirm', cls: cls || 'primary', onClick: onYes }] });
    },
    closeModals() { UI.clear(UI.overlayEl); },
    tip(el, content) {
      const show = (ev) => {
        const html = typeof content === 'function' ? content() : content;
        if (!html) return;
        const t = UI.tooltipEl; t.innerHTML = ''; if (html instanceof Node) t.appendChild(html); else t.innerHTML = html;
        t.style.display = 'block';
        UI.moveTip(ev, el);
      };
      el.addEventListener('mouseenter', show);
      el.addEventListener('mousemove', (ev) => UI.moveTip(ev, el));
      el.addEventListener('mouseleave', () => UI.hideTip());
      el.addEventListener('focus', () => { show(null); UI.moveTip(null, el); });
      el.addEventListener('blur', () => UI.hideTip());
      el.addEventListener('touchstart', (ev) => { show(ev.touches[0]); clearTimeout(UI._tipTimer); UI._tipTimer = setTimeout(() => UI.hideTip(), 2500); }, { passive: true });
    },
    moveTip(ev, el) {
      const t = UI.tooltipEl, st = UI.stage.getBoundingClientRect(), k = 1280 / st.width;
      let x, y;
      if (ev && ev.clientX != null) { x = (ev.clientX - st.left) * k + 14; y = (ev.clientY - st.top) * k + 16; }
      else { const r = el.getBoundingClientRect(); x = (r.left - st.left) * k; y = (r.bottom - st.top) * k + 6; }
      const w = t.offsetWidth, h = t.offsetHeight;
      if (x + w > 1272) x = Math.max(4, x - w - 28);
      if (y + h > 712) y = Math.max(4, y - h - 30);
      t.style.left = x + 'px'; t.style.top = y + 'px';
    },
    hideTip() { if (UI.tooltipEl) UI.tooltipEl.style.display = 'none'; },

    // ------------------------------------------------------------------ shared widgets
    /** Top bar with back button, title, level/XP and currencies. Updates itself when the profile changes. */
    topbar(ctx, title, o) {
      o = o || {};
      const p = UI.profile;
      const bar = UI.el('div', { class: 'topbar' });
      if (o.back !== false) bar.appendChild(UI.btn('◀ BACK', () => { JJK.Audio.sfx('back'); UI.back(o.backTo); }, 'small', { 'aria-label': 'Back' }));
      bar.appendChild(UI.el('div', { class: 'title', text: title }));
      bar.appendChild(UI.el('div', { class: 'grow' }));
      if (o.extra) bar.appendChild(o.extra);
      const lv = UI.el('div', { class: 'lvl-badge' }), lvTxt = UI.el('span', { class: 'lv' }), xpBar = UI.el('div', { class: 'bar' }, UI.el('i')), xpTxt = UI.el('span', { class: 'dim', style: 'font-size:11px' });
      lv.append(lvTxt, xpBar, xpTxt);
      const coins = UI.el('div', { class: 'cur', tip: 'Coins: earned from matches and missions. Spend them in the Shop and on star upgrades.' }), gems = UI.el('div', { class: 'cur', tip: 'Cursed Gems: used for Summons.' });
      const refresh = () => {
        const need = p.playerXpNeeded();
        lvTxt.textContent = 'LV ' + p.playerLevel();
        xpBar.firstChild.style.width = (need ? Math.min(100, (p.d.player.xp / need) * 100) : 100) + '%';
        xpTxt.textContent = need ? p.d.player.xp + '/' + need : 'MAX';
        UI.clear(coins).append(UI.icon('coins', 18), UI.fmt(p.coins));
        UI.clear(gems).append(UI.icon('gems', 18), UI.fmt(p.gems));
      };
      refresh();
      const off = p.events.on('changed', refresh);
      ctx.onExit(off);
      bar.append(lv, coins, gems);
      return bar;
    },
    /** Reward summary as a list of small elements. */
    rewardChips(r) {
      const out = [];
      if (!r) return out;
      if (r.coins) out.push(UI.el('span', { class: 'cur' }, [UI.icon('coins', 16), '+' + UI.fmt(r.coins)]));
      if (r.gems) out.push(UI.el('span', { class: 'cur' }, [UI.icon('gems', 16), '+' + UI.fmt(r.gems)]));
      if (r.xp) out.push(UI.el('span', { class: 'cur' }, [UI.icon('xp', 16), '+' + r.xp + ' XP']));
      if (r.items) for (const k of Object.keys(r.items)) out.push(UI.el('span', { class: 'cur' }, [JJK.Items[k].name + ' ×' + r.items[k]]));
      if (r.shards) for (const k of Object.keys(r.shards)) out.push(UI.el('span', { class: 'cur', style: { color: UI.rc(JJK.Characters[k].rarity) } }, [UI.icon('shard', 16), JJK.Characters[k].short + ' ×' + r.shards[k]]));
      if (r.char) out.push(UI.el('span', { class: 'cur gold' }, ['★ ' + JJK.Characters[r.char].name]));
      return out;
    },
    /** Character card. opts: {onClick, selected, showLevel, locked(bool), inTeam} */
    charCard(id, o) {
      o = o || {};
      const def = JJK.Characters[id], p = UI.profile;
      const owned = p.owns(id), data = p.d.characters[id];
      const card = UI.el('button', { class: 'chcard r-' + def.rarity + (owned ? '' : ' locked') + (o.inTeam ? ' inteam' : ''), type: 'button', 'aria-label': def.name + (owned ? '' : ' (locked)') });
      const art = JJK.Art.portraitImg(id, 'art', 200, 200); art.classList.add('art'); art.style.height = '138px';
      card.appendChild(art);
      card.appendChild(UI.el('div', { class: 'rtag', text: def.rarity }));
      if (owned) card.appendChild(UI.el('div', { class: 'lvtag', text: 'Lv ' + data.level }));
      else {
        card.appendChild(UI.el('div', { class: 'lock', text: 'LOCKED' }));
        const sh = p.shardsOf(id);
        if (sh > 0) card.appendChild(UI.el('div', { class: 'lvtag', text: sh + '/' + p.unlockShardCost(id) + ' ◆' }));
      }
      const nm = UI.el('div', { class: 'nm' }, [UI.el('b', { text: def.short }), UI.el('span', { text: owned ? '' : def.role })]);
      if (owned) nm.lastChild.appendChild(UI.stars(data.stars));
      card.appendChild(nm);
      if (o.onClick) card.addEventListener('click', () => o.onClick(id));
      if (o.tip !== false) UI.tip(card, () => UI.charTip(id));
      return card;
    },
    charTip(id) {
      const def = JJK.Characters[id], b = def.base;
      return '<b style="color:' + UI.rc(def.rarity) + '">' + def.name + '</b> <span class="dim">· ' + def.role + '</span><br>' +
        '<span class="dim">' + def.title + '</span><br>' + def.desc + '<br>' +
        '<span class="dim">Cost</span> ¥' + def.cost + ' &nbsp; <span class="dim">Range</span> ' + b.range + ' &nbsp; <span class="dim">Dmg</span> ' + b.dmg + '<br>' +
        '<span class="dim">Traits:</span> ' + def.traits.join(', ');
    },
    enemyTipText(id) {
      const d = JJK.Enemies[id] || JJK.Bosses[id];
      return '<b>' + d.name + '</b><br>' + d.desc + '<br><span class="dim">Tip:</span> ' + (d.tip || '');
    },
    /** Subscribe helper that auto-cleans on screen exit. */
    sub(ctx, emitter, evt, fn) { const off = emitter.on(evt, fn); ctx.onExit(off); return off; },
  };

  JJK.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
