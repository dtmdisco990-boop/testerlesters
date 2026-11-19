/* Debug tools. Hidden unless the URL has ?debug=1 AND Config.ALLOW_DEBUG is true (flip that to false for release). */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const enabled = !!(JJK.Config && JJK.Config.ALLOW_DEBUG && typeof location !== 'undefined' && /[?&]debug=1\b/.test(location.search));
  let panel = null, auto = null;

  const Debug = {
    enabled,
    toggle() {
      if (!enabled) return;
      if (panel) { panel.remove(); panel = null; return; }
      const UI = JJK.UI, p = UI.profile;
      panel = UI.el('div', { class: 'dbg' });
      const add = (label, fn) => panel.appendChild(UI.btn(label, () => { try { fn(); } catch (e) { UI.toast('Debug: ' + e.message, 'bad'); } }, 'small'));
      panel.appendChild(UI.el('h4', { text: 'DEBUG (not in release)' }));
      add('+1000 Coins', () => { p.addCoins(1000); p.commit(); });
      add('+500 Gems', () => { p.addGems(500); p.commit(); });
      add('+5 Player Lv', () => { for (let i = 0; i < 5; i++) p.addPlayerXP(p.playerXpNeeded()); p.commit(); });
      add('Unlock all', () => { p.debugUnlockAll = !p.debugUnlockAll; UI.toast('debugUnlockAll=' + p.debugUnlockAll); UI.show(UI.current.name, UI.current.params); });
      add('Grant all chars', () => { JJK.CharacterOrder.forEach((id) => p.grantCharacter(id)); p.commit(); });
      add('Add XP items', () => { for (const k of Object.keys(JJK.Items)) p.d.items[k] = (p.d.items[k] || 0) + 5; p.commit(); });
      panel.appendChild(UI.el('hr'));
      const B = () => G.__battle && G.__battle.battle;
      add('Wave +5', () => { const b = B(); if (b) b.debugJumpToWave(b.wave + 5); });
      add('Instant WIN', () => { const b = B(); if (b) b.debugInstantVictory(); });
      add('Instant LOSE', () => { const b = B(); if (b) b.debugInstantDefeat(); });
      add('+5000 Yen', () => { const b = B(); if (b) b.addYen(5000); });
      add('Autoplay on/off', () => {
        if (auto) { clearInterval(auto); auto = null; UI.toast('Autoplay off'); return; }
        const b0 = B(); if (!b0) { UI.toast('Open a battle first', 'bad'); return; }
        UI.toast('Autoplay on');
        auto = setInterval(() => {
          const b = B(); if (!b || b.over) { clearInterval(auto); auto = null; return; }
          const order = b.teamOrder.slice().sort((x, y) => b.roster[x].cost - b.roster[y].cost);
          const hasAir = b.teamOrder.some((id) => b.roster[id].def.targets !== 'ground');
          JJK.Bot.decide(b, order, 'good', hasAir, {});
        }, 400);
      });
      panel.appendChild(UI.el('hr'));
      panel.appendChild(UI.el('div', { id: 'dbg-info', class: 'dim' }));
      add('Close', () => Debug.toggle());
      UI.overlayEl.appendChild(panel);
      const info = panel.querySelector('#dbg-info');
      const t = setInterval(() => {
        if (!panel) { clearInterval(t); return; }
        const b = B();
        info.textContent = b ? 'wave ' + b.wave + ' state ' + b.state + ' enemies ' + b.enemies.length + ' units ' + b.units.length + ' yen ' + Math.floor(b.yen) : 'screen: ' + (UI.current && UI.current.name);
      }, 300);
    },
  };
  JJK.Debug = Debug;
})(typeof window !== 'undefined' ? window : globalThis);
