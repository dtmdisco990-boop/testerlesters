/* Settings: audio, gameplay toggles, accessibility, data reset, credits. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Config } = JJK;

  UI.register('settings', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio, S = p.d.settings;
      ctx.root.appendChild(UI.topbar(ctx, 'Settings'));
      const body = UI.el('div', { class: 'body' });
      ctx.root.appendChild(body);
      const L = UI.el('div', { class: 'panel col scroll', style: 'width:560px;flex:none;gap:12px' });
      const R = UI.el('div', { class: 'panel col grow scroll', style: 'gap:12px' });
      body.append(L, R);

      const apply = () => { A.setVolumes(S); document.body.classList.toggle('reduced', !!S.reduced); };
      const slider = (label, key) => {
        const val = UI.el('b', { text: Math.round(S[key] * 100) + '%', style: 'width:44px;text-align:right' });
        const inp = UI.el('input', { type: 'range', min: 0, max: 100, value: Math.round(S[key] * 100), 'aria-label': label, style: 'flex:1' });
        inp.addEventListener('input', () => { S[key] = inp.value / 100; val.textContent = inp.value + '%'; apply(); });
        inp.addEventListener('change', () => { p.commit(); A.sfx('click'); });
        return UI.el('label', { class: 'row', style: 'gap:10px' }, [UI.el('span', { style: 'width:110px', text: label }), inp, val]);
      };
      const toggle = (label, key, hint, after) => {
        const cb = UI.el('input', { type: 'checkbox', 'aria-label': label }); cb.checked = !!S[key];
        cb.addEventListener('change', () => { S[key] = cb.checked; apply(); p.commit(); A.sfx('click'); if (after) after(); });
        const l = UI.el('label', { class: 'row', style: 'gap:10px' }, [cb, UI.el('div', { class: 'col' }, [UI.el('span', { text: label }), hint ? UI.el('span', { class: 'dim', style: 'font-size:11.5px', text: hint }) : null])]);
        return l;
      };

      L.appendChild(UI.el('div', { class: 'h2', text: 'Audio' }));
      L.append(slider('Master', 'master'), slider('Music', 'music'), slider('Effects', 'sfx'));
      L.appendChild(toggle('Mute all', 'muted'));
      L.appendChild(UI.btn('Test sound', () => { A.unlock(); A.sfx('upgrade'); }, 'small'));
      L.appendChild(UI.el('div', { class: 'h2', text: 'Gameplay' }));
      L.append(
        toggle('Auto-start waves by default', 'autoStart', 'Next wave begins automatically after the intermission.'),
        toggle('Show unit ranges', 'showRanges'),
        toggle('Show placement slots', 'showSlots', 'Draws the buildable tiles while placing units.'),
        toggle('Damage numbers', 'dmgNumbers'),
      );
      L.appendChild(UI.el('div', { class: 'h2', text: 'Accessibility & comfort' }));
      L.append(
        toggle('Screen shake', 'shake'),
        toggle('Reduce motion', 'reduced', 'Turns off shake, flashes and heavy particle effects.'),
        toggle('Skip summon animation', 'skipSummonAnim', 'Jump straight to the results.'),
      );

      R.appendChild(UI.el('div', { class: 'h2', text: 'Controls' }));
      const keys = [['1–6', 'Select a unit from the tray, then click a highlighted tile'], ['Click / tap', 'Place a unit, or select one on the field. Touch: tap once to preview, again to confirm'], ['Shift+click', 'Keep placing the same unit'], ['U', 'Upgrade selected unit'], ['Space', 'Start next wave'], ['F', 'Toggle 1× / 2× speed'], ['A', 'Toggle auto-start waves'], ['Shift+1–4', 'Activate Domain Expansion'], ['P', 'Pause'], ['Esc', 'Cancel placement, deselect, or pause'], ['M', 'Mute'], ['Panel buttons', 'Targeting mode, Upgrade and Sell are in the unit panel']];
      const kt = UI.el('table', { class: 'tbl' });
      for (const [k, v] of keys) kt.appendChild(UI.el('tr', null, [UI.el('td', null, UI.el('b', { text: k })), UI.el('td', { class: 'dim', text: v })]));
      R.appendChild(kt);
      R.appendChild(UI.el('div', { class: 'h2', text: 'Save data' }));
      R.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: 'Progress is stored in this browser only (localStorage). Save status: ' + p.sm.status + '. Clearing site data erases it.' }));
      R.appendChild(UI.btn('RESET ALL PROGRESS', () => UI.confirm('Reset all progress?', 'This deletes your characters, currencies, missions and records. A backup copy is kept in browser storage (jjk_td_save_reset_backup).', () => {
        p.sm.resetProgress(); UI.toast('Progress reset.', 'gold'); setTimeout(() => location.reload(), 300);
      }, 'Reset everything', 'danger'), 'danger small'));
      R.appendChild(UI.el('div', { class: 'h2', text: 'About' }));
      R.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px', text: 'Jujutsu Kaisen Tower Defense v' + Config.VERSION + '. An unofficial fan project. All art is generated procedurally in code and all audio is synthesised; no copyrighted assets are included. Jujutsu Kaisen belongs to Gege Akutami / Shueisha.' }));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
