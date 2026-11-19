/* Battle screen: owns the Battle + renderer, the game loop, input, HUD and the unit panel. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Balance, Util } = JJK;
  const TILE = Balance.TILE, FY = Balance.FIELD_Y, STEP = Balance.STEP;

  UI.register('battle', {
    battle: true, transparent: true,
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio, S = p.d.settings;
      const prm = ctx.params;
      // Owner Lab sandbox: only honoured while the lab is unlocked in this session
      const lab = prm.lab && JJK.Owner && JJK.Owner.unlocked() ? prm.lab : null;
      const team = lab ? lab.team : p.teamForBattle();
      let battle;
      try {
        battle = new JJK.Battle({ mapId: prm.mapId, diff: prm.diff, mode: prm.mode, team, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, startYen: lab ? lab.yen : undefined });
        if (lab) { battle.debugUsed = true; battle.godMode = !!lab.god; battle.rules.maxDeployed = 999; }
      } catch (err) { UI.toast(err.message || 'Could not start the battle.', 'bad'); setTimeout(() => UI.show('play'), 0); return; }
      const matchId = 'm' + Date.now() + ':' + Math.floor(Math.random() * 1e9);
      battle.autoStart = !!S.autoStart;
      const map = battle.map, endless = battle.endless;
      const R = ctx.renderer = new JJK.BattleRenderer(UI.canvas);
      R.view.showSlots = S.showSlots !== false;
      R.setBattle(battle, { dmgNumbers: S.dmgNumbers, shake: S.shake, reduced: S.reduced });
      A.music('battle');
      const st = { speed: 1, paused: false, selected: 0, placingId: null, placing: null, over: false, acc: 0, last: performance.now(), raf: 0, finishT: 0, bossAlive: false, lastPanelKey: '', t: 0, cast: null, castT: 0, hudT: 0, touchTile: null, hotkeyDomain: [] };
      const root = ctx.root;

      // -------------------------------------------------------------- HUD (top)
      const top = UI.el('div', { class: 'hud-top' });
      const pauseBtn = UI.btn('❚❚', () => setPaused(true), 'small hud-icon', { 'aria-label': 'Pause (Esc)', tip: 'Pause (Esc / P)' });
      const waveEl = UI.el('div', { class: 'stat wave' });
      const baseEl = UI.el('div', { class: 'basebar', tip: 'Base HP. Curses that reach the end of the path damage it.' }, [UI.el('i'), UI.el('span')]);
      const yenEl = UI.el('div', { class: 'stat', tip: 'Yen: spend it on deploying and upgrading. Earned from kills and wave bonuses.' });
      const scoreEl = UI.el('div', { class: 'stat', style: 'min-width:100px', tip: 'Score' });
      const speedBtn = UI.btn('1×', () => setSpeed(st.speed === 1 ? 2 : 1), 'small hud-icon', { style: 'width:46px', tip: 'Game speed (F)' });
      const autoBtn = UI.btn('AUTO', () => setAuto(!battle.autoStart), 'small', { tip: 'Auto-start the next wave after a short break (A)' });
      const muteBtn = UI.btn(S.muted ? '🔇' : '🔊', () => { S.muted = !S.muted; A.setVolumes({ muted: S.muted }); muteBtn.textContent = S.muted ? '🔇' : '🔊'; p.commit(); }, 'small hud-icon', { tip: 'Mute (M)' });
      top.append(pauseBtn, UI.el('div', { class: 'stat', style: 'min-width:0;padding:4px 12px;font-family:var(--head);letter-spacing:2px', text: map.short.toUpperCase() }), waveEl, baseEl, yenEl, endless ? scoreEl : UI.el('div'), UI.el('div', { class: 'grow' }), autoBtn, speedBtn, muteBtn);
      root.appendChild(top);

      const setSpeed = (s) => { st.speed = s; speedBtn.textContent = s + '×'; speedBtn.classList.toggle('on', s >= 2); };
      const setAuto = (on) => { battle.autoStart = on; S.autoStart = on; autoBtn.classList.toggle('on', on); autoBtn.classList.toggle('primary', on); p.commit(); };
      autoBtn.classList.toggle('on', battle.autoStart); autoBtn.classList.toggle('primary', battle.autoStart);

      // -------------------------------------------------------------- tray
      const tray = UI.el('div', { class: 'hud-tray' + (lab ? ' lab' : '') });
      const cards = {};
      battle.teamOrder.forEach((id, i) => {
        const d = JJK.Characters[id];
        const c = UI.el('button', { class: 'ucard r-' + d.rarity, type: 'button', 'aria-label': 'Deploy ' + d.name });
        const nm = UI.el('div', { class: 'nm', text: d.short }), ct = UI.el('div', { class: 'ct' }), ft = UI.el('div', { class: 'ft' });
        c.append(JJK.Art.portraitImg(id, null, 120, 120), nm, ct, ft, UI.el('span', { class: 'key', text: String(i + 1) }));
        c.addEventListener('click', () => pickCard(id));
        UI.tip(c, () => UI.charTip(id) + '<br><span class="dim">Place: ' + ({ ground: 'ground tiles', elevated: 'elevated tiles', any: 'any tile' }[d.place]) + ' · Targets: ' + d.targets + '</span>');
        cards[id] = { el: c, ct, ft };
        tray.appendChild(c);
      });
      root.appendChild(tray);

      const pickCard = (id) => {
        if (battle.over) return;
        if (st.placingId === id) { cancelPlacing(); return; }
        const ro = battle.roster[id];
        if (battle.placedCount(id) >= battle.maxPlace(id)) { UI.toast(ro.def.short + ' placement limit reached (' + battle.maxPlace(id) + ').', 'bad'); A.sfx('error'); return; }
        if (battle.yen < ro.cost) { UI.toast('Not enough Yen (need ¥' + ro.cost + ').', 'bad'); A.sfx('error'); }
        st.placingId = id; st.placing = { id, c: null, r: null, valid: false, reason: '' }; R.view.placing = st.placing; select(0); A.sfx('click');
        refreshTray();
      };
      const cancelPlacing = () => { st.placingId = null; st.placing = null; R.view.placing = null; st.touchTile = null; refreshTray(); };

      // -------------------------------------------------------------- start button + preview
      const startBtn = UI.btn('START WAVE ▶', () => startWave(), 'primary big startbtn', { style: 'display:none', tip: 'Start the next wave (Space)' });
      const nextBar = UI.el('div', { class: 'tipbanner', style: 'display:none' });
      root.append(startBtn, nextBar);
      const startWave = () => {
        if (battle.over) return;
        if (battle.state === 'wave' && !battle.canStartWave()) { UI.toast('Wave still spawning.', 'bad'); return; }
        if (!battle.units.length && battle.wave === 0 && !battle.endless) { UI.toast('Deploy at least one unit first.', 'bad'); A.sfx('error'); return; }
        if (battle.startWave()) A.sfx('wave');
      };

      // -------------------------------------------------------------- boss bar & banners
      const bossBar = UI.el('div', { class: 'bossbar', style: 'display:none' });
      const bossNm = UI.el('div', { class: 'nm' }), bossFill = UI.el('i'), bossShield = UI.el('u'), bossCast = UI.el('div', { class: 'cast' });
      bossBar.append(bossNm, UI.el('div', { class: 'bb' }, [bossFill, bossShield]), bossCast);
      root.appendChild(bossBar);
      const banner = (title, sub, color) => {
        const b = UI.el('div', { class: 'centerbanner', style: color ? '--c:' + color : '' }, [UI.el('div', { class: 't', text: title }), sub ? UI.el('div', { class: 's', text: sub }) : null]);
        root.appendChild(b); setTimeout(() => b.remove(), 2300);
      };

      // -------------------------------------------------------------- unit panel + domain buttons
      const panelHost = UI.el('div'); root.appendChild(panelHost);
      const side = UI.el('div', { class: 'hud-side' }); root.appendChild(side);
      const domBtns = new Map();

      function select(uid) {
        st.selected = uid; R.view.selectedUid = uid; st.lastPanelKey = '';
        if (uid) { if (st.placingId) cancelPlacing(); }
        buildPanel();
      }
      const panelRefs = {};
      function buildPanel() {
        UI.clear(panelHost); for (const k of Object.keys(panelRefs)) delete panelRefs[k];
        const u = battle.getUnit(st.selected);
        if (!u) { st.selected = 0; R.view.selectedUid = 0; return; }
        const d = u.def;
        const left = u.x > 640;
        const pan = UI.el('div', { class: 'upanel r-' + d.rarity, style: (left ? 'left:8px' : 'right:8px') });
        const hd = UI.el('div', { class: 'hd' }, [JJK.Art.portraitImg(u.id, null, 120, 120), UI.el('div', { class: 'grow' }, [UI.el('h3', { text: d.name }), UI.el('div', { class: 'dim', text: d.role }), (panelRefs.lvl = UI.el('div', { class: 'gold', style: 'font-weight:700' }))]), UI.btn('✕', () => select(0), 'small', { style: 'align-self:flex-start;padding:2px 8px', 'aria-label': 'Close' })]);
        pan.appendChild(hd);
        const stats = UI.el('div', { class: 'stats' });
        for (const [k, label, tipText] of [['dmg', 'Damage', 'Per-hit damage including level/star/synergy bonuses.'], ['spa', 'Atk. delay', 'Seconds between attacks (lower is faster).'], ['range', 'Range', 'In tiles. Elevated tiles add +0.4.'], ['kills', 'Kills', ''], ['dealt', 'Total damage', ''], ['type', 'Type', 'Physical is reduced by armor; Cursed ignores armor.']]) {
          const v = UI.el('b'); panelRefs[k] = v;
          const row = UI.el('div', { tip: tipText || null }, [UI.el('span', { class: 'dim', text: label + ' ' }), v]);
          stats.appendChild(row);
        }
        pan.appendChild(stats);
        if (d.targeting.length > 1) {
          const modes = UI.el('div', { class: 'modes' }); panelRefs.modes = {};
          for (const m of d.targeting) {
            const b = UI.el('span', { class: 'mode', role: 'button', tabindex: '0', text: m, tip: { first: 'Enemy furthest along the path.', last: 'Enemy least far along the path.', strongest: 'Highest current HP + shield.', weakest: 'Lowest current HP + shield.', closest: 'Nearest to this unit.' }[m] });
            b.addEventListener('click', () => { battle.setTargeting(u.uid, m); A.sfx('click'); refreshPanel(true); });
            b.addEventListener('keydown', (e) => { if (e.key === 'Enter') b.click(); });
            panelRefs.modes[m] = b; modes.appendChild(b);
          }
          pan.appendChild(UI.el('div', { class: 'dim', style: 'font-size:11px', text: 'TARGETING' })); pan.appendChild(modes);
        }
        pan.appendChild(UI.el('div', { style: 'font-size:12px;margin-bottom:4px' }, [UI.el('span', { class: 'dim', text: 'Ability: ' }), d.desc]));
        pan.appendChild((panelRefs.next = UI.el('div', { class: 'nextup' })));
        const btns = UI.el('div', { class: 'btns' });
        panelRefs.upBtn = UI.btn('UPGRADE', () => doUpgrade(u), 'good'); panelRefs.sellBtn = UI.btn('SELL', () => doSell(u), 'danger');
        btns.append(panelRefs.upBtn, panelRefs.sellBtn); pan.appendChild(btns);
        panelHost.appendChild(pan);
        panelRefs.level = u.level; panelRefs.pan = pan;
        refreshPanel(true);
      }
      function refreshPanel(force) {
        const u = battle.getUnit(st.selected);
        if (!u) { if (st.selected) select(0); return; }
        const r = panelRefs; if (!r.pan) return;
        r.lvl.textContent = 'Level ' + u.level + ' / ' + u.def.maxLevel + (u.onElevated ? ' · elevated' : '');
        r.dmg.textContent = (u.dmg * battle.dmgMul(u)).toFixed(1);
        r.spa.textContent = (u.baseSpa / battle.spdMul(u)).toFixed(2) + 's';
        r.range.textContent = u.range.toFixed(1);
        r.kills.textContent = String(u.kills);
        r.dealt.textContent = UI.fmt(u.damageDealt);
        r.type.textContent = ({ phys: 'Physical', cursed: 'Cursed', true: 'True' })[u.dtype] || u.dtype;
        if (r.modes) for (const m of Object.keys(r.modes)) r.modes[m].classList.toggle('on', u.targeting === m);
        const cost = battle.upgradeCost(u);
        if (force || r.nextKey !== u.level) {
          r.nextKey = u.level;
          UI.clear(r.next);
          if (cost == null) r.next.appendChild(UI.el('b', { class: 'gold', text: 'MAX LEVEL' }));
          else { const up = u.def.upgrades[u.level - 1]; r.next.append(UI.el('b', { text: 'Next: ' + up.name }), UI.el('div', { class: 'dim', style: 'font-size:11.5px', text: up.desc })); }
        }
        r.upBtn.textContent = cost == null ? 'MAXED' : 'UPGRADE ¥' + cost;
        r.upBtn.disabled = cost == null || battle.yen < cost || battle.over;
        r.sellBtn.textContent = 'SELL +¥' + battle.sellValue(u);
        r.sellBtn.disabled = battle.over;
      }
      function doUpgrade(u) {
        const r = battle.upgrade(u.uid);
        if (!r.ok) { UI.toast(r.reason, 'bad'); A.sfx('error'); }
        refreshPanel(true);
      }
      function doSell(u) {
        const go = () => { const r = battle.sell(u.uid); if (r.ok) { select(0); A.sfx('sell'); } };
        if (u.invested >= 600 && u.level >= 3) UI.confirm('Sell ' + u.def.short + '?', 'You will get ¥' + battle.sellValue(u) + ' back (' + Math.round(battle.sellRefund * 100) + '% of ¥' + u.invested + ' invested).', go, 'Sell', 'danger');
        else go();
      }

      function refreshDomains() {
        const owners = battle.units.filter((u) => u.flags.domain);
        const keep = new Set(owners.map((u) => u.uid));
        for (const [uid, o] of domBtns) if (!keep.has(uid)) { o.el.remove(); domBtns.delete(uid); }
        owners.forEach((u, i) => {
          let o = domBtns.get(u.uid);
          const dom = JJK.Domains[u.flags.domain];
          if (!o) {
            const el = UI.el('button', { class: 'domainbtn', type: 'button', style: '--dc:' + dom.color });
            const cd = UI.el('div', { class: 'cd' }), cdt = UI.el('div', { class: 'cdt' });
            el.append(UI.el('div', { text: 'DOMAIN · ' + u.def.short.toUpperCase() }), UI.el('small', { text: dom.name }), cd, cdt);
            el.addEventListener('click', () => activate(u.uid));
            UI.tip(el, () => '<b style="color:' + dom.color + '">' + dom.name + '</b> <span class="dim">(cooldown ' + dom.cd + 's, lasts ' + dom.dur + 's)</span><br>' + dom.desc + '<br><span class="dim">Hotkey: ' + (i + 1) + ' on numpad / Shift+' + (i + 1) + '</span>');
            side.appendChild(el); o = { el, cd, cdt, uid: u.uid }; domBtns.set(u.uid, o);
          }
          const ready = battle.canActivateDomain(u);
          o.el.classList.toggle('ready', ready);
          const pct = dom.cd > 0 ? Math.min(100, (u.domainCd / dom.cd) * 100) : 0;
          o.cd.style.width = (ready ? 0 : pct) + '%';
          o.cdt.textContent = u.disabledT > 0 ? 'X' : (u.domainCd > 0 ? Math.ceil(u.domainCd) + 's' : (battle.domain ? '…' : ''));
        });
        st.hotkeyDomain = owners.map((u) => u.uid);
      }
      function activate(uid) {
        const u = battle.getUnit(uid);
        if (!u) return;
        if (battle.activateDomain(uid)) { A.sfx('domain'); return; }
        if (u.disabledT > 0) UI.toast('Disabled right now!', 'bad');
        else if (battle.domain) UI.toast('Another domain is active.', 'bad');
        else UI.toast('Domain on cooldown (' + Math.ceil(u.domainCd) + 's).', 'bad');
        A.sfx('error');
      }

      // -------------------------------------------------------------- tray refresh
      function refreshTray() {
        for (const id of battle.teamOrder) {
          const c = cards[id], ro = battle.roster[id], placed = battle.placedCount(id), max = battle.maxPlace(id);
          c.ct.textContent = '¥' + ro.cost;
          c.ft.textContent = '';
          c.ft.append(UI.el('span', { text: placed + '/' + max + ' placed' }), UI.el('span', { text: ro.def.place === 'elevated' ? 'ELEV' : ro.def.place === 'any' ? 'ANY' : 'GND' }));
          c.el.classList.toggle('poor', battle.yen < ro.cost && placed < max);
          c.el.classList.toggle('maxed', placed >= max);
          c.el.classList.toggle('sel', st.placingId === id);
        }
      }

      // -------------------------------------------------------------- pause / quit
      let pauseModal = null;
      function setPaused(on) {
        if (battle.over) return;
        st.paused = on;
        if (on && !pauseModal) {
          pauseModal = UI.modal({
            title: 'Paused', dismiss: false,
            body: UI.el('div', { style: 'min-width:340px' }, [
              UI.el('div', { class: 'dim', text: map.name + ' · ' + battle.diffId.toUpperCase() + (endless ? ' · ENDLESS' : '') + ' · Wave ' + battle.wave }),
              UI.el('div', { class: 'row', style: 'margin-top:14px' }, [UI.el('span', { class: 'grow', text: 'Master volume' }), UI.el('input', { type: 'range', class: 'slider', min: 0, max: 100, value: Math.round(S.master * 100), on: { input: (e) => { S.master = e.target.value / 100; A.setVolumes({ master: S.master }); }, change: () => p.commit() } })]),
              UI.el('div', { class: 'row', style: 'margin-top:8px' }, [UI.el('span', { class: 'grow', text: 'Show damage numbers' }), toggle(S.dmgNumbers, (v) => { S.dmgNumbers = v; R.vfx.settings.dmgNumbers = v; p.commit(); })]),
              UI.el('div', { class: 'row', style: 'margin-top:8px' }, [UI.el('span', { class: 'grow', text: 'Screen shake' }), toggle(S.shake, (v) => { S.shake = v; R.vfx.settings.shake = v; p.commit(); })]),
            ]),
            buttons: [
              { label: 'Forfeit', cls: 'danger', keepOpen: true, onClick: () => { UI.confirm('Forfeit this match?', 'It counts as a defeat. You keep the rewards for waves already cleared.', () => { if (pauseModal) { pauseModal.close(); pauseModal = null; } finishMatch(false, true); }, 'Forfeit', 'danger'); return false; } },
              { label: 'Restart', keepOpen: true, onClick: () => { UI.confirm('Restart?', 'The current match is abandoned with no rewards.', () => { if (pauseModal) { pauseModal.close(); pauseModal = null; } UI.show('battle', { mapId: prm.mapId, diff: prm.diff, mode: prm.mode, from: prm.from }); }, 'Restart'); return false; } },
              { label: 'Resume', cls: 'primary', onClick: () => { st.paused = false; pauseModal = null; st.last = performance.now(); } },
            ],
            onClose: () => { st.paused = false; pauseModal = null; st.last = performance.now(); },
          });
        } else if (!on && pauseModal) { pauseModal.close(); pauseModal = null; }
      }
      const toggle = (init, fn) => { const t = UI.el('button', { class: 'toggle' + (init ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': String(!!init) }); t.addEventListener('click', () => { const v = !t.classList.contains('on'); t.classList.toggle('on', v); t.setAttribute('aria-checked', String(v)); fn(v); }); return t; };

      // -------------------------------------------------------------- finishing
      function finishMatch(victory, forfeit) {
        if (st.over) return;
        st.over = true;
        if (forfeit) battle.debugInstantDefeat(); // routes through finish(false)
        const summary = battle.getSummary();
        st.finishT = victory ? 1.6 : 1.2;
        st.summary = summary;
      }
      function openResults() {
        let result;
        try { result = p.applyMatchResult(st.summary, matchId); } catch (err) { console.error(err); UI.toast('Could not record rewards: ' + err.message, 'bad'); UI.show('menu'); return; }
        UI.show('results', { result, from: prm.from, retry: { mapId: prm.mapId, diff: prm.diff, mode: prm.mode } });
      }

      // -------------------------------------------------------------- battle events
      const ev = battle.events;
      const on = (e, fn) => UI.sub(ctx, ev, e, fn);
      on('wave', (e) => {
        const sub = (e.label || '') + (e.mutator ? ' · ' + e.mutator.label : '');
        if (e.boss) { banner('BOSS WAVE', JJK.Bosses[e.boss.id || e.boss] ? JJK.Bosses[e.boss.id || e.boss].name : sub, '#ff3b5c'); }
        else banner('WAVE ' + e.n, sub);
      });
      on('waveClear', (e) => { A.sfx('waveClear'); if (e.bonus > 0) UI.toast('Wave ' + e.n + ' cleared! +¥' + e.bonus, 'good'); });
      on('bossSpawn', (e) => { A.sfx('boss'); A.music('boss'); st.bossAlive = true; st.bossRef = e.enemy; bossNm.textContent = (JJK.Bosses[e.enemy.type].name + ' — ' + (JJK.Bosses[e.enemy.type].title || '')).toUpperCase(); banner(JJK.Bosses[e.enemy.type].name.toUpperCase(), JJK.Bosses[e.enemy.type].title, '#ff3b5c'); });
      on('bossDeath', () => { A.sfx('bossHit'); A.music('battle'); });
      on('bossCast', (e) => { st.cast = e; st.castT = 2.4; bossCast.textContent = e.name.toUpperCase(); bossCast.style.setProperty('--c', e.color); bossCast.style.animation = 'none'; void bossCast.offsetWidth; bossCast.style.animation = ''; });
      on('bossPhase', (e) => { banner(e.name.toUpperCase(), 'PHASE CHANGE', '#ffb23f'); A.sfx('bossHit'); });
      on('telegraph', () => A.sfx('telegraph'));
      on('unitPlaced', () => { A.sfx('place'); refreshTray(); p.d.flags.seenTutorial = true; tipEl.style.display = 'none'; });
      on('unitUpgraded', () => { A.sfx('upgrade'); refreshTray(); });
      on('unitSold', () => { refreshTray(); });
      on('kill', (e) => { A.sfx('kill'); });
      on('hit', (e) => { if (e.crit || (e.src && e.kind === 'bf')) A.sfx('hit'); });
      on('leak', () => A.sfx('leak'));
      on('domainEnd', () => A.sfx('domainEnd'));
      on('victory', () => { A.sfx('victory'); finishMatch(true); });
      on('defeat', () => { A.sfx('defeat'); finishMatch(false); });
      on('yen', (e) => { if (e.amount >= 60) A.sfx('coin'); });

      // -------------------------------------------------------------- tutorial tip
      const tipEl = UI.el('div', { class: 'tipbanner', style: 'top:auto;bottom:196px;display:none' });
      root.appendChild(tipEl);

      // -------------------------------------------------------------- input
      const cv = UI.canvas;
      const tileInfo = (pt) => { const t = R.toTile(pt.x, pt.y); const chk = st.placingId ? battle.canPlace(st.placingId, t.c, t.r) : null; return { t, chk }; };
      const onMove = (e) => {
        const pt = R.toStage(e);
        if (st.placing) {
          if (pt.y < FY || pt.y > FY + Balance.ROWS * TILE) { st.placing.c = null; return; }
          const { t, chk } = tileInfo(pt);
          if (e.pointerType === 'touch' && e.type === 'pointermove') return;
          st.placing.c = t.c; st.placing.r = t.r; st.placing.valid = !!chk.ok; st.placing.reason = chk.ok ? '' : chk.reason;
        } else {
          const u = R.unitAtPoint(pt.x, pt.y); R.view.hoverUid = u ? u.uid : 0;
          cv.style.cursor = u ? 'pointer' : 'default';
        }
      };
      const onDown = (e) => {
        if (e.button === 2) { e.preventDefault(); if (st.placingId) cancelPlacing(); else select(0); return; }
        if (st.paused || battle.over) return;
        A.unlock();
        const pt = R.toStage(e);
        if (st.placing) {
          const { t, chk } = tileInfo(pt);
          if (e.pointerType === 'touch') { // touch: first tap previews, second tap on the same tile confirms
            const same = st.touchTile && st.touchTile.c === t.c && st.touchTile.r === t.r;
            st.placing.c = t.c; st.placing.r = t.r; st.placing.valid = !!chk.ok; st.placing.reason = chk.ok ? '' : chk.reason;
            if (!same || !chk.ok) { st.touchTile = t; return; }
          }
          if (chk.ok) {
            const id = st.placingId, r = battle.place(id, t.c, t.r);
            if (r.ok) { if (!e.shiftKey && e.pointerType !== 'touch') cancelPlacing(); else { st.touchTile = null; } select(r.unit.uid); if (e.shiftKey) { /* keep placing the same unit */ pickCard(id); } }
          } else { UI.toast(chk.reason, 'bad'); A.sfx('error'); }
          return;
        }
        const u = R.unitAtPoint(pt.x, pt.y);
        select(u ? u.uid : 0);
      };
      cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerdown', onDown);
      const noMenu = (e) => e.preventDefault();
      cv.addEventListener('contextmenu', noMenu);
      const onKey = (e) => {
        if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
        const k = e.key;
        if (k === 'Escape') { if (pauseModal) setPaused(false); else if (st.placingId) cancelPlacing(); else if (st.selected) select(0); else setPaused(true); return; }
        if (st.paused || battle.over) return;
        if (k >= '1' && k <= '6' && !e.shiftKey) { const id = battle.teamOrder[+k - 1]; if (id) pickCard(id); }
        else if (e.shiftKey && e.code && /^Digit[1-4]$/.test(e.code)) { const uid = st.hotkeyDomain[+e.code.slice(5) - 1]; if (uid) activate(uid); }
        else if (k === ' ') { e.preventDefault(); if (battle.canStartWave() && battle.state !== 'wave') startWave(); }
        else if (k === 'u' || k === 'U') { const u = battle.getUnit(st.selected); if (u) doUpgrade(u); }
        else if (k === 'f' || k === 'F') setSpeed(st.speed === 1 ? 2 : 1);
        else if (k === 'a' || k === 'A') setAuto(!battle.autoStart);
        else if (k === 'p' || k === 'P') setPaused(true);
        else if (k === 'm' || k === 'M') muteBtn.click();
      };
      document.addEventListener('keydown', onKey);
      const onVis = () => { if (document.hidden && !battle.over) setPaused(true); };
      document.addEventListener('visibilitychange', onVis);
      ctx.onExit(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('contextmenu', noMenu); cancelAnimationFrame(st.raf); R.dispose(); cv.style.cursor = 'default'; if (UI.current === ctx) { /* keep */ } });

      // -------------------------------------------------------------- loop
      const hudCache = {};
      function updateHud() {
        const nextWave = battle.wave + 1;
        const wtxt = endless ? 'WAVE ' + battle.wave : 'WAVE ' + battle.wave + ' / ' + battle.totalWaves;
        if (hudCache.w !== wtxt) { waveEl.textContent = wtxt; hudCache.w = wtxt; }
        const pct = Util.clamp(battle.baseHp / battle.baseMax, 0, 1);
        if (hudCache.b !== battle.baseHp) { baseEl.firstChild.style.width = pct * 100 + '%'; baseEl.lastChild.textContent = '♥ ' + Math.ceil(battle.baseHp) + ' / ' + battle.baseMax; hudCache.b = battle.baseHp; }
        if (hudCache.y !== battle.yen) { UI.clear(yenEl).append(UI.icon('yen', 18), UI.fmt(battle.yen)); hudCache.y = battle.yen; refreshTray(); if (st.selected) refreshPanel(); }
        if (endless && hudCache.s !== battle.score) { scoreEl.textContent = 'SCORE ' + UI.fmt(battle.score); hudCache.s = battle.score; }
        // start button / next wave preview
        const canStart = !battle.over && battle.canStartWave() && battle.state !== 'wave';
        startBtn.style.display = canStart ? '' : 'none';
        if (canStart) {
          startBtn.textContent = battle.wave === 0 ? 'START WAVE 1 ▶' : battle.autoStart ? 'NEXT WAVE ▶ (' + Math.max(0, battle.autoTimer).toFixed(1) + 's)' : 'START WAVE ' + nextWave + ' ▶';
          const key = nextWave + ':' + battle.diffId;
          if (hudCache.nb !== key) {
            hudCache.nb = key;
            const spec = endless ? JJK.Waves.endless(map, nextWave, battle.diff) : battle.waves[nextWave - 1];
            UI.clear(nextBar);
            if (spec) {
              const types = Array.from(new Set(spec.entries.map((x) => x.type)));
              nextBar.append(UI.el('b', { style: 'color:#fff', text: 'NEXT · WAVE ' + nextWave }), ' ' + (spec.label || '') + ' · ' + spec.entries.length + ' curses ');
              for (const tp of types.slice(0, 7)) nextBar.appendChild(UI.el('img', { src: JJK.Art.enemyThumbURL(tp, 36), width: 22, height: 22, style: 'vertical-align:middle;margin-left:4px;border-radius:4px' + (JJK.Bosses[tp] ? ';border:2px solid #ff3b5c' : ''), title: (JJK.Enemies[tp] || JJK.Bosses[tp]).name }));
              if (spec.mutator && JJK.WaveMutators[spec.mutator]) nextBar.appendChild(UI.el('span', { class: 'gold', text: '  ⚠ ' + JJK.WaveMutators[spec.mutator].label }));
              if (spec.bonus) nextBar.appendChild(UI.el('span', { class: 'dim', text: '  · clear bonus ¥' + spec.bonus }));
            }
          }
          nextBar.style.display = st.bossAlive ? 'none' : '';
        } else nextBar.style.display = 'none';
        // boss bar
        const boss = battle.enemies.find((x) => x.alive && x.boss);
        if (boss) {
          bossBar.style.display = '';
          bossFill.style.width = Util.clamp(boss.hp / boss.maxHp, 0, 1) * 100 + '%';
          bossShield.style.width = boss.shieldMax > 0 ? Util.clamp(boss.shield / boss.maxHp, 0, 1) * 100 + '%' : '0%';
          if (!bossNm.textContent) bossNm.textContent = (JJK.Bosses[boss.type].name).toUpperCase();
        } else if (st.bossAlive) { st.bossAlive = false; bossBar.style.display = 'none'; bossNm.textContent = ''; bossCast.textContent = ''; }
        if (st.castT > 0) { st.castT -= 0.25; if (st.castT <= 0) bossCast.textContent = ''; }
        // tutorial hint
        if (!p.d.flags.seenTutorial && !battle.units.length) { tipEl.style.display = ''; tipEl.textContent = st.placingId ? 'Click a highlighted tile to deploy. Right-click or Esc to cancel.' : 'Select a character below to start deploying. Then press START WAVE.'; }
        refreshDomains();
        if (st.selected) refreshPanel();
      }

      function frame(now) {
        st.raf = requestAnimationFrame(frame);
        let dt = (now - st.last) / 1000; st.last = now;
        if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
        try {
          if (!st.paused) {
            if (!battle.over) {
              st.acc += dt * st.speed;
              let n = 0;
              while (st.acc >= STEP && n < 8) { battle.update(STEP); st.acc -= STEP; n++; }
              if (n >= 8) st.acc = 0;
            } else if (st.finishT > 0) {
              st.finishT -= dt;
              st.acc += dt * 0.5; while (st.acc >= STEP) { st.acc -= STEP; }
              if (st.finishT <= 0) { cancelAnimationFrame(st.raf); openResults(); return; }
            }
            R.frame(dt * (battle.over ? 0.5 : st.speed));
          } else R.frame(0);
          st.hudT += dt; if (st.hudT >= 0.1) { st.hudT = 0; updateHud(); }
        } catch (err) {
          console.error('[battle loop]', err);
          cancelAnimationFrame(st.raf);
          UI.modal({ title: 'Battle error', dismiss: false, body: UI.el('div', null, [UI.el('p', { text: 'The battle hit an unexpected error and was stopped: ' + (err && err.message) }), UI.el('p', { class: 'dim', text: 'No rewards were lost or granted for this match.' })]), buttons: [{ label: 'Back to menu', cls: 'primary', onClick: () => UI.show('menu') }] });
        }
      }
      refreshTray(); updateHud(); buildPanel();
      st.last = performance.now(); st.raf = requestAnimationFrame(frame);
      ctx.battleState = { battle, st, select, pickCard, startWave, setSpeed, setPaused, finishMatch };
      if (lab) JJK.Owner.attachBattleLab(ctx, battle, st, setSpeed);
      G.__battle = ctx.battleState; // exposed for debugging and automated tests only
      if (!endless && battle.wave === 0) setTimeout(() => { if (!p.d.flags.seenTutorial) tipEl.style.display = ''; }, 200);
    },
    exit() { if (G.__battle) G.__battle = null; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
