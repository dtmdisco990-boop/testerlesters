/* Owner Lab: sandbox + self-tests for every character, boss, enemy, map and summon banner.
   ACCESS: the Lab only opens after the private owner access code is entered. Only a salted PBKDF2-SHA256 hash of that code lives in
   Config.OWNER_ACCESS (generated with tools/owner-access.js); the entered code is hashed with the browser's Web Crypto API and compared.
   A successful unlock lives in sessionStorage only (cleared when the browser session ends) and is never written to the game save.
   Reach the prompt with Ctrl+Shift+O, or by tapping the JUJUTSU KAISEN logo on the main menu 7 times.
   Matches in the lab are debug matches (no rewards, no progress).
   NOTE: this is a soft lock (static client-side game); it keeps casual players out, it is not server-side security. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Balance, Util, Config } = JJK;
  const SESSION_KEY = 'jjk_owner_session', GUARD_KEY = 'jjk_owner_guard';
  const MAX_FAILS = 5, LOCK_MS = 30000, LOCK_CAP_MS = 15 * 60000;

  const store = (kind) => { try { return G[kind]; } catch (e) { return null; } };
  const rd = (st, k) => { try { return st ? st.getItem(k) : null; } catch (e) { return null; } };
  const wr = (st, k, v) => { try { if (st) { if (v == null) st.removeItem(k); else st.setItem(k, v); } } catch (e) { /* storage unavailable: fall back to memory */ } };
  const cfg = () => (Config && Config.OWNER_ACCESS) || {};
  const b64 = (str) => { const bin = G.atob(str), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; };
  const hex = (buf) => Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');
  const sameHex = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

  // brute-force guard (lives outside the game save): MAX_FAILS wrong codes -> lockout, doubling each time, up to 15 minutes
  let mem = { sessionOpen: false, guard: { f: 0, lvl: 0, until: 0 } };
  const getGuard = () => { try { const g = JSON.parse(rd(store('localStorage'), GUARD_KEY) || 'null'); if (g && typeof g.until === 'number') return g; } catch (e) { /* ignore */ } return mem.guard; };
  const setGuard = (g) => { mem.guard = g; wr(store('localStorage'), GUARD_KEY, JSON.stringify(g)); };

  const Owner = {
    forceJoan: false,
    /** Does the Lab exist in this build? (separate from whether this browser session has unlocked it) */
    enabled() { return !!cfg().enabled; },
    /** Has an access code been set up (a hash installed)? An unconfigured build keeps the Lab locked for everyone. */
    configured() { return !!(cfg().salt && cfg().hash); },
    available() { return this.enabled(); },
    /** Has THIS browser session authenticated? */
    unlocked() { return this.enabled() && this.configured() && (mem.sessionOpen || rd(store('sessionStorage'), SESSION_KEY) === '1'); },
    lockedFor() { const g = getGuard(); return Math.max(0, g.until - Date.now()); },
    /** Hash a code with Web Crypto PBKDF2-SHA256 (the same derivation tools/owner-access.js uses). */
    async derive(code, saltB64, iterations) {
      const subtle = G.crypto && G.crypto.subtle;
      if (!subtle) throw new Error('crypto-unavailable');
      const key = await subtle.importKey('raw', new TextEncoder().encode(String(code)), 'PBKDF2', false, ['deriveBits']);
      return hex(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(saltB64), iterations }, key, 256));
    },
    /** Resolves { ok } or { ok:false, reason: 'denied'|'locked'|'unconfigured'|'unavailable' }. Never exposes the hash or any part-match. */
    async check(code) {
      if (!this.enabled() || !this.configured()) return { ok: false, reason: 'unconfigured' };
      if (this.lockedFor() > 0) return { ok: false, reason: 'locked' };
      let good = false;
      try { good = sameHex(await this.derive(code, cfg().salt, cfg().iterations || 210000), cfg().hash); } catch (e) { return { ok: false, reason: 'unavailable' }; }
      const g = getGuard();
      if (good) { setGuard({ f: 0, lvl: 0, until: 0 }); mem.sessionOpen = true; wr(store('sessionStorage'), SESSION_KEY, '1'); return { ok: true }; }
      g.f = (g.f || 0) + 1;
      if (g.f >= MAX_FAILS) { g.until = Date.now() + Math.min(LOCK_CAP_MS, LOCK_MS * Math.pow(2, g.lvl || 0)); g.lvl = (g.lvl || 0) + 1; g.f = 0; setGuard(g); return { ok: false, reason: 'locked' }; }
      setGuard(g);
      return { ok: false, reason: 'denied' };
    },
    lock() { mem.sessionOpen = false; wr(store('sessionStorage'), SESSION_KEY, null); },
    prompt(onOk) {
      if (!this.enabled()) { UI.toast('The Owner Lab is not part of this build.', 'bad'); return; }
      if (this.unlocked()) { onOk(); return; }
      const input = UI.el('input', { type: 'password', class: 'owner-input oa-input', placeholder: 'ACCESS CODE', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Owner access code', maxlength: '128' });
      const msg = UI.el('div', { class: 'oa-msg', role: 'status', 'aria-live': 'polite' });
      const card = UI.el('div', { class: 'oa-card' }, [
        UI.el('div', { class: 'oa-lock', 'aria-hidden': 'true', text: '🔒' }),
        UI.el('div', { class: 'oa-title', text: 'OWNER ACCESS' }),
        UI.el('div', { class: 'oa-sub', text: 'Restricted. Enter the access code to continue.' }),
        input, msg]);
      let busy = false, timer = 0, api = null;
      const showLock = () => {
        clearInterval(timer);
        const tick = () => { const s = Math.ceil(Owner.lockedFor() / 1000); if (s <= 0) { clearInterval(timer); msg.textContent = ''; msg.className = 'oa-msg'; input.disabled = false; input.focus(); return; } input.disabled = true; msg.className = 'oa-msg bad'; msg.textContent = 'TOO MANY ATTEMPTS · TRY AGAIN IN ' + (s >= 90 ? Math.ceil(s / 60) + ' MIN' : s + 's'); };
        tick(); timer = setInterval(tick, 500);
      };
      const submit = async () => {
        if (busy || input.disabled) return;
        const v = input.value; input.value = ''; if (!v) return;
        busy = true; msg.className = 'oa-msg'; msg.textContent = 'VERIFYING…';
        const r = await Owner.check(v);
        busy = false;
        if (r.ok) { clearInterval(timer); if (api) api.close(); onOk(); return; }
        if (r.reason === 'locked') { showLock(); return; }
        if (r.reason === 'unconfigured') { msg.className = 'oa-msg bad'; msg.textContent = 'OWNER ACCESS IS NOT SET UP ON THIS BUILD'; return; }
        if (r.reason === 'unavailable') { msg.className = 'oa-msg bad'; msg.textContent = 'SECURE CONTEXT REQUIRED (HTTPS)'; return; }
        msg.className = 'oa-msg bad shake'; msg.textContent = 'ACCESS DENIED'; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); input.focus();
      };
      api = UI.modal({ width: 400, body: card, onClose: () => clearInterval(timer), buttons: [{ label: 'Cancel' }, { label: 'Unlock', cls: 'primary', keepOpen: true, onClick: () => { submit(); return false; } }] });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); e.stopPropagation(); });
      if (this.lockedFor() > 0) showLock();
      setTimeout(() => input.focus(), 30);
    },
    openLab() {
      if (!this.enabled()) return;
      if (UI.current && UI.current.name === 'battle') return;
      this.prompt(() => UI.show('owner', { from: (UI.current && UI.current.name) || 'menu' }));
    },
    attachMenu(wrap) {
      if (!this.enabled()) return;
      const logo = wrap.querySelector('.menu-logo'); if (!logo) return;
      let n = 0, t0 = 0;
      logo.addEventListener('click', () => { const now = Date.now(); if (now - t0 > 4000) n = 0; t0 = now; if (++n >= 7) { n = 0; Owner.openLab(); } });
    },
  };
  JJK.Owner = Owner;
  if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && (e.key === 'O' || e.key === 'o')) { e.preventDefault(); Owner.openLab(); } });

  // ------------------------------------------------------------------ helpers
  const el = (...a) => UI.el(...a);
  const sel = (opts, val, onChange, style) => {
    const s = el('select', { class: 'owner-input', style: style || '' });
    for (const o of opts) s.appendChild(el('option', { value: o.v, text: o.t }));
    s.value = val; s.addEventListener('change', () => onChange(s.value)); return s;
  };
  const allEnemyIds = () => Object.keys(JJK.Enemies);
  const allBossIds = () => Object.keys(JJK.Bosses);
  const pause = () => new Promise((r) => setTimeout(r, 0));

  // ------------------------------------------------------------------ in-battle lab panel
  Owner.attachBattleLab = function (ctx, battle, st, setSpeed) {
    const root = ctx.root;
    let panel = null, timer = 0;
    const B = battle;
    const toggle = UI.btn('LAB', () => { if (panel) { close(); } else openPanel(); }, 'small', { style: 'position:absolute;left:8px;top:58px;z-index:60;border-color:#f80;color:#fb4' });
    root.appendChild(toggle);
    const close = () => { if (panel) { panel.remove(); panel = null; clearInterval(timer); } };
    ctx.onExit(close);
    const spawn = (type, n, wave, lane) => { for (let i = 0; i < n; i++) { try { B.spawnEnemy(type, { wave, lane }); } catch (e) { UI.toast(e.message, 'bad'); return; } } };
    function openPanel() {
      panel = el('div', { class: 'dbg lab-panel' });
      const add = (label, fn, cls) => panel.appendChild(UI.btn(label, () => { try { fn(); } catch (e) { UI.toast('Lab: ' + e.message, 'bad'); } }, 'small ' + (cls || '')));
      panel.appendChild(el('h4', { text: 'OWNER LAB · debug match (no rewards)' }));
      const ids = [{ v: '', t: '-- enemy --' }].concat(allEnemyIds().map((k) => ({ v: k, t: k }))).concat(allBossIds().map((k) => ({ v: k, t: 'BOSS ' + k })));
      let type = 'wisp', count = 1, wave = Math.max(10, B.wave), lane = 0;
      const row1 = el('div', { class: 'row', style: 'gap:4px;flex-wrap:wrap' });
      const sType = sel(ids.slice(1), type, (v) => { type = v; }, 'width:118px');
      const nIn = el('input', { type: 'number', class: 'owner-input', value: 1, min: 1, max: 200, style: 'width:50px', title: 'count' }); nIn.addEventListener('input', () => { count = Math.max(1, Math.min(200, +nIn.value || 1)); });
      const wIn = el('input', { type: 'number', class: 'owner-input', value: wave, min: 1, max: 999, style: 'width:56px', title: 'wave (HP scale)' }); wIn.addEventListener('input', () => { wave = Math.max(1, +wIn.value || 1); });
      const lanes = Math.max(B.geo.ground.length, 1);
      const lIn = sel(Array.from({ length: lanes }, (_, i) => ({ v: i, t: 'lane ' + (i + 1) })), 0, (v) => { lane = +v; }, 'width:70px');
      row1.append(sType, nIn, wIn, lIn); panel.appendChild(row1);
      add('Spawn', () => spawn(type, count, wave, lane), 'primary');
      add('Spawn ALL enemy types', () => allEnemyIds().forEach((k) => spawn(k, 1, wave, lane)));
      add('Spawn ALL bosses', () => allBossIds().forEach((k) => spawn(k, 1, wave, lane)));
      add('Kill all enemies', () => { for (const e of B.enemies.slice()) if (e.alive) B.damage(e, (e.hp + e.shield) * 1000 + 1, { type: 'true', pierceShield: true, ignoreWard: true }); });
      panel.appendChild(el('hr'));
      add('+¥99,999', () => B.addYen(99999, 0, 0, true));
      add('Heal base', () => { B.baseHp = B.baseMax; });
      add('God mode: ' + (B.godMode ? 'ON' : 'off'), () => { B.godMode = !B.godMode; close(); openPanel(); });
      add('Max-upgrade all units', () => { for (const u of B.units.slice()) while (!u.removed && B.upgrade(u).ok); });
      add('Reset domain cooldowns', () => { for (const u of B.units) u.domainCd = 0; });
      add('Start wave', () => B.startWave());
      add('Wave +5', () => B.debugJumpToWave(B.wave + 5));
      add('Instant WIN', () => B.debugInstantVictory());
      add('Instant LOSE', () => B.debugInstantDefeat());
      panel.appendChild(el('hr'));
      const sp = el('div', { class: 'row', style: 'gap:4px' });
      for (const s of [0.5, 1, 2, 4, 8]) sp.appendChild(UI.btn(s + '×', () => setSpeed(s), 'small'));
      panel.appendChild(sp);
      const info = el('div', { class: 'dim', style: 'margin-top:6px' }); panel.appendChild(info);
      add('Close', close);
      UI.overlayEl.appendChild(panel);
      timer = setInterval(() => { info.textContent = 'wave ' + B.wave + '/' + (B.totalWaves === Infinity ? '∞' : B.totalWaves) + ' · ' + B.state + ' · enemies ' + B.enemies.filter((e) => e.alive).length + ' · units ' + B.units.length + ' · ¥' + Math.floor(B.yen) + ' · base ' + Math.ceil(B.baseHp) + '/' + B.baseMax + ' · ' + st.speed + '×'; }, 250);
    }
  };

  // ------------------------------------------------------------------ the lab screen
  UI.register('owner', {
    enter(ctx) {
      if (!Owner.unlocked()) { setTimeout(() => UI.show('menu'), 0); return; }
      const p = UI.profile, A = JJK.Audio;
      A.music('menu');
      let tab = ctx.params.tab || 'sandbox';
      ctx.root.appendChild(UI.topbar(ctx, 'Owner Lab', { backTo: 'menu', extra: UI.btn('LOCK', () => { Owner.lock(); UI.show('menu'); }, 'small') }));
      const tabs = el('div', { class: 'tabs' }), body = el('div', { class: 'body owner-body' });
      ctx.root.append(tabs, body);
      const TABS = [['sandbox', 'SANDBOX'], ['selftest', 'SELF-TEST'], ['summon', 'SUMMON LAB'], ['gallery', 'GALLERY'], ['save', 'SAVE TOOLS']];
      const renderTabs = () => { UI.clear(tabs); for (const [k, t] of TABS) tabs.appendChild(el('div', { class: 'tab' + (tab === k ? ' on' : ''), role: 'button', tabindex: '0', text: t, on: { click: () => { tab = k; render(); } } })); };
      const render = () => { renderTabs(); UI.clear(body); ({ sandbox, selftest, summon, gallery, save })[tab](body); };

      // ---------------- SANDBOX
      function sandbox(box) {
        const st = { map: 'tokyo', diff: 'normal', mode: 'story', level: 30, stars: 5, yen: 99999, god: true, pick: new Set(JJK.CharacterOrder) };
        const left = el('div', { class: 'panel col', style: 'width:330px;flex:none;gap:8px' });
        const right = el('div', { class: 'panel col grow scroll', style: 'gap:8px;min-width:0' });
        box.append(left, right);
        const maps = Object.values(JJK.Maps).sort((a, b) => a.order - b.order);
        const field = (label, node) => el('label', { class: 'owner-field' }, [el('span', { class: 'dim', text: label }), node]);
        left.append(
          el('div', { class: 'h2', style: 'margin:0', text: 'Sandbox battle' }),
          el('div', { class: 'dim', style: 'font-size:12px', text: 'Any map, any difficulty, any characters (owned or not). Debug match: nothing is saved or rewarded. Use the LAB button in the battle to spawn bosses and enemies.' }),
          field('Map', sel(maps.map((m) => ({ v: m.id, t: m.name + ' (' + m.waves + ' waves)' })), st.map, (v) => { st.map = v; })),
          field('Difficulty', sel([{ v: 'normal', t: 'Normal' }, { v: 'hard', t: 'Hard' }, { v: 'special', t: 'Special (map rule)' }], st.diff, (v) => { st.diff = v; })),
          field('Mode', sel([{ v: 'story', t: 'Story' }, { v: 'endless', t: 'Endless' }], st.mode, (v) => { st.mode = v; })),
          field('Character level', sel([1, 10, 20, 30].map((n) => ({ v: n, t: 'Lv ' + n })), st.level, (v) => { st.level = +v; })),
          field('Stars', sel([0, 1, 2, 3, 4, 5].map((n) => ({ v: n, t: n + '★' })), st.stars, (v) => { st.stars = +v; })),
          field('Starting Yen', (() => { const i = el('input', { type: 'number', class: 'owner-input', value: st.yen, min: 0, max: 99999999 }); i.addEventListener('input', () => { st.yen = Math.max(0, +i.value || 0); }); return i; })()),
          field('Base can\'t be destroyed', (() => { const c = el('input', { type: 'checkbox' }); c.checked = st.god; c.addEventListener('change', () => { st.god = c.checked; }); return c; })()),
          UI.btn('START SANDBOX BATTLE', () => {
            const team = JJK.CharacterOrder.filter((id) => st.pick.has(id)).map((id) => ({ id, level: st.level, stars: st.stars }));
            if (!team.length) { UI.toast('Pick at least one character.', 'bad'); return; }
            UI.show('battle', { mapId: st.map, diff: st.diff, mode: st.mode, from: 'owner', lab: { team, yen: st.yen, god: st.god } });
          }, 'primary big'),
        );
        const head = el('div', { class: 'row', style: 'gap:8px;align-items:center' });
        right.appendChild(head);
        const grid = el('div', { class: 'row', style: 'flex-wrap:wrap;gap:6px' });
        right.appendChild(grid);
        const draw = () => {
          UI.clear(head).append(el('div', { class: 'h2', style: 'margin:0', text: 'Characters in the tray (' + st.pick.size + '/' + JJK.CharacterOrder.length + ')' }), el('span', { class: 'grow' }),
            UI.btn('All', () => { JJK.CharacterOrder.forEach((i) => st.pick.add(i)); draw(); }, 'small'), UI.btn('None', () => { st.pick.clear(); draw(); }, 'small'));
          UI.clear(grid);
          for (const id of JJK.CharacterOrder) {
            const d = JJK.Characters[id], on = st.pick.has(id);
            const chip = el('button', { class: 'ucard r-' + d.rarity + (on ? ' sel' : ''), type: 'button', style: 'width:150px;height:56px;' + (on ? '' : 'opacity:.4') });
            chip.append(JJK.Art.portraitImg(id, null, 120, 120), el('div', { class: 'nm', text: d.short }), el('div', { class: 'ct', text: '¥' + d.cost + ' · max ' + Balance.rarity[d.rarity].maxPlace }));
            chip.addEventListener('click', () => { on ? st.pick.delete(id) : st.pick.add(id); draw(); });
            UI.tip(chip, () => UI.charTip(id));
            grid.appendChild(chip);
          }
        };
        draw();
      }

      // ---------------- SELF-TEST
      function selftest(box) {
        const S = JJK.SelfTest, groups = S.groups.concat(['models']);
        const on = new Set(groups);
        const left = el('div', { class: 'panel col', style: 'width:300px;flex:none;gap:8px' });
        const right = el('div', { class: 'panel col grow', style: 'min-width:0;gap:8px' });
        box.append(left, right);
        const counts = {}; for (const t of S.tasks) counts[t.group] = (counts[t.group] || 0) + 1;
        left.append(el('div', { class: 'h2', style: 'margin:0', text: 'Self-test' }), el('div', { class: 'dim', style: 'font-size:12px', text: 'Runs the real simulation headlessly against every character (L1 and max level, placement limits, deploy cost), enemy, boss (AI for 60s + a Jahjuan kill), map × difficulty, summon banner (6,000 pulls each, pity, 2M JOAN rolls) and checks every sprite exists. Uses a throwaway profile: your save is never touched.' }));
        for (const g of groups) {
          const c = el('input', { type: 'checkbox' }); c.checked = true; c.addEventListener('change', () => { c.checked ? on.add(g) : on.delete(g); });
          left.appendChild(el('label', { class: 'owner-field' }, [el('span', { text: g.toUpperCase() + ' (' + (counts[g] || modelItems().length) + ')' }), c]));
        }
        const bar = el('div', { class: 'bar gold', style: 'height:12px' }, el('i', { style: { width: '0%' } }));
        const sum = el('div', { style: 'font-weight:700' });
        const onlyFail = el('input', { type: 'checkbox' });
        const table = el('table', { class: 'tbl owner-table' });
        const wrap = el('div', { class: 'scroll', style: 'flex:1;min-height:0' }, table);
        let last = null;
        const paint = () => {
          UI.clear(table); if (!last) return;
          table.appendChild(el('tr', null, ['', 'Group', 'Test', 'Result', 'ms'].map((h) => el('th', { text: h }))));
          for (const r of last.results) { if (onlyFail.checked && r.ok) continue; table.appendChild(el('tr', { class: r.ok ? '' : 'bad' }, [el('td', { text: r.ok ? '✔' : '✘', style: 'color:' + (r.ok ? '#6f6' : '#f66') }), el('td', { text: r.group }), el('td', { text: r.name }), el('td', { text: r.detail, style: 'font-size:11.5px;color:' + (r.ok ? '#aab' : '#f99') }), el('td', { text: r.ms })])); }
        };
        onlyFail.addEventListener('change', paint);
        let running = false;
        const run = UI.btn('RUN SELF-TEST', async () => {
          if (running) return; running = true; last = null; UI.clear(table); sum.textContent = 'Running…';
          const prog = (done, total) => { bar.firstChild.style.width = (done / total * 100) + '%'; };
          const sim = await S.run({ groups: Array.from(on).filter((g) => g !== 'models'), tick: prog, pause });
          let results = sim.results.slice();
          if (on.has('models')) results = results.concat(await modelChecks(pause));
          last = { results, total: results.length, passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, ms: sim.ms };
          bar.firstChild.style.width = '100%';
          sum.textContent = (last.failed ? '✘ ' + last.failed + ' FAILED · ' : '✔ ALL PASSED · ') + last.passed + '/' + last.total + ' checks in ' + (last.ms / 1000).toFixed(1) + 's';
          sum.style.color = last.failed ? '#f66' : '#6f6'; if (last.failed) onlyFail.checked = true;
          paint(); running = false; G.__selftest = last;
        }, 'primary big');
        left.append(run, el('label', { class: 'owner-field' }, [el('span', { text: 'Show failures only' }), onlyFail]),
          UI.btn('Copy report', () => { if (!last) return; const t = last.results.map((r) => (r.ok ? 'PASS' : 'FAIL') + ' [' + r.group + '] ' + r.name + ' - ' + r.detail).join('\n'); try { navigator.clipboard.writeText(t); UI.toast('Report copied.'); } catch (e) { UI.toast('Clipboard unavailable.', 'bad'); } }, 'small'));
        right.append(sum, bar, wrap);
      }
      function modelItems() { return JJK.CharacterOrder.map((i) => ['unit', i]).concat(Object.keys(JJK.Enemies).map((i) => ['enemy', i]), Object.keys(JJK.Bosses).map((i) => ['boss', i])); }
      async function modelChecks(pz) {
        const out = [], px = (cv) => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 40) if (d[i] > 20) n++; return n; };
        for (const [kind, id] of modelItems()) {
          let ok = true, detail = '';
          try {
            if (kind === 'unit') { const s = JJK.Art.unitSprite(id, 54), c = JJK.Art.cutout && JJK.Art.cutout(id), pt = JJK.Art.portrait(id, 200, 200); ok = !!(s && s.canvas && px(s.canvas) > 300 && pt && (pt.naturalWidth || pt.width)); detail = 'sprite + portrait' + (c ? ' + cutout' : ''); }
            else { const f = JJK.Art.enemyFrames(id); ok = f.length === 8 && px(f[0]) > 25; detail = f.length + ' frames'; }
            if (!ok) detail = 'missing or blank: ' + detail;
          } catch (e) { ok = false; detail = e.message; }
          out.push({ group: 'models', name: kind + ':' + id, ok, detail, ms: 0 });
          if (out.length % 12 === 0) await pz();
        }
        return out;
      }

      // ---------------- SUMMON LAB
      function summon(box) {
        const left = el('div', { class: 'panel col', style: 'width:360px;flex:none;gap:8px' });
        const right = el('div', { class: 'panel col grow scroll', style: 'gap:8px;min-width:0' });
        box.append(left, right);
        const fj = UI.btn('Force JOAN on the next real pull: ' + (Owner.forceJoan ? 'ARMED' : 'off'), () => { Owner.forceJoan = !Owner.forceJoan; render(); }, 'small' + (Owner.forceJoan ? ' primary' : ''));
        left.append(el('div', { class: 'h2', style: 'margin:0', text: 'Real summons (uses your save)' }),
          el('div', { class: 'dim', style: 'font-size:12px', text: 'Arm "force JOAN", then pull on the Summon screen to watch the rainbow reveal. It costs the normal gems and grants Jahjuan to your real save.' }), fj,
          UI.btn('+10,000 Gems', () => { p.addGems(10000); p.commit(); UI.toast('+10,000 gems'); }, 'small'),
          UI.btn('Open Summon screen', () => UI.show('summon', { from: 'owner' }), 'small primary'));
        right.appendChild(el('div', { class: 'h2', style: 'margin:0', text: 'Simulator (throwaway profile, nothing saved)' }));
        const banners = [JJK.Banners.standard, JJK.Banners.culling].concat(JJK.Banners.featured);
        let bid = 'standard', n = 100000, real = true;
        const nIn = el('input', { type: 'number', class: 'owner-input', value: n, min: 10, max: 2000000, step: 10 }); nIn.addEventListener('input', () => { n = Math.max(10, Math.min(2000000, Math.round((+nIn.value || 10) / 10) * 10)); });
        const rc = el('input', { type: 'checkbox' }); rc.checked = true; rc.addEventListener('change', () => { real = rc.checked; });
        const out = el('div', { class: 'col', style: 'gap:4px' });
        right.append(el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;align-items:center' }, [sel(banners.map((b) => ({ v: b.id, t: b.name })), bid, (v) => { bid = v; }), nIn, el('label', { class: 'owner-field', style: 'gap:6px' }, [el('span', { text: 'real JOAN odds' }), rc]),
          UI.btn('SIMULATE', async () => {
            UI.clear(out).append(el('div', { text: 'Simulating…' })); await pause();
            const sm = new JJK.SaveManager(new Util.MemoryStorage()); sm.load();
            const pr = new JJK.Profile(sm, { now: () => Date.now() }); pr.debugUnlockAll = true; sm.data.currencies.gems = 1e15;
            const rng = Util.makeRng((Date.now() & 0xffffff) | 1); const jr = Util.makeRng((Date.now() >>> 3) & 0xffffff); rng.joan = real ? () => jr.next() : () => (jr.next() < 0.001 ? 0 : 1);
            const counts = {}, chars = {}; let joan = 0;
            for (let i = 0; i < n / 10; i++) { const r = pr.summon(bid, 10, rng); for (const x of r.results) { counts[x.tier] = (counts[x.tier] || 0) + 1; chars[x.id] = (chars[x.id] || 0) + 1; if (x.tier === 'JOAN') joan++; } if (i % 400 === 399) await pause(); }
            UI.clear(out);
            const banner = banners.find((b) => b.id === bid);
            out.append(el('div', { style: 'font-weight:700', text: n.toLocaleString('en-US') + ' pulls on ' + banner.name + (real ? '' : ' (JOAN odds boosted to 1 in 1000 for this run)') }));
            for (const t of ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'JOAN']) { if (!counts[t]) { if (t === 'JOAN') out.appendChild(el('div', { class: 'rc r-JOAN', text: 'JOAN  0 pulls' })); continue; } out.appendChild(el('div', { style: 'color:' + UI.rc(t), text: t + '  ' + counts[t].toLocaleString('en-US') + '  (' + (counts[t] / n * 100).toFixed(3) + '%)' + (banner.rates[t] ? '   base ' + banner.rates[t] + '%' : '') })); }
            out.appendChild(el('div', { class: 'dim', text: 'JOAN hits: ' + joan + (real ? '  ·  expected ≈ ' + (n / 200000).toFixed(2) : '') }));
          }, 'primary')]), out);
      }

      // ---------------- GALLERY
      function gallery(box) {
        let kind = ctx.params.gal || 'characters';
        const col = el('div', { class: 'panel col grow scroll', style: 'gap:8px;min-width:0' }); box.appendChild(col);
        const draw = () => {
          UI.clear(col);
          const f = el('div', { class: 'row', style: 'gap:5px' });
          for (const k of ['characters', 'enemies', 'bosses', 'summons']) f.appendChild(el('span', { class: 'filter' + (kind === k ? ' on' : ''), text: k.toUpperCase(), role: 'button', tabindex: '0', on: { click: () => { kind = k; draw(); } } }));
          col.appendChild(f);
          const grid = el('div', { class: 'row', style: 'flex-wrap:wrap;gap:8px' }); col.appendChild(grid);
          const tile = (label, sub, node, color) => grid.appendChild(el('div', { class: 'panel col owner-tile', style: 'border-color:' + (color || 'var(--line)') }, [node, el('b', { style: 'font-size:12px', text: label }), el('span', { class: 'dim', style: 'font-size:10.5px', text: sub || '' })]));
          const cv = (src, w, h) => { const c = el('canvas', { width: w, height: h }); const g = c.getContext('2d'); if (src) { const sw = src.width || src.naturalWidth, shh = src.height || src.naturalHeight, k = Math.min(w / sw, h / shh); g.drawImage(src, (w - sw * k) / 2, (h - shh * k) / 2, sw * k, shh * k); } return c; };
          try {
            if (kind === 'characters') for (const id of JJK.CharacterOrder) { const d = JJK.Characters[id]; const s = JJK.Art.unitSprite(id, 80); tile(d.short, d.rarity + ' · ¥' + d.cost, cv(s && s.canvas, 120, 130), UI.rc(d.rarity)); }
            else if (kind === 'enemies') for (const id of Object.keys(JJK.Enemies)) tile(id, 'hp ' + JJK.Enemies[id].hp, cv(JJK.Art.enemyFrames(id)[0], 110, 110));
            else if (kind === 'bosses') for (const id of Object.keys(JJK.Bosses)) tile(JJK.Bosses[id].name || id, 'boss', cv(JJK.Art.enemyFrames(id)[0], 170, 170), '#ff4d6d');
            else for (const [id, v] of [['dog', 'white'], ['dog', 'black'], ['nue'], ['max'], ['rika'], ['dragon'], ['garuda']]) tile(id + (v ? ' ' + v : ''), 'summon', cv(JJK.Art.summonFrames(id, v)[0], 100, 100));
          } catch (e) { grid.appendChild(el('div', { text: 'Gallery error: ' + e.message })); }
        };
        draw();
      }

      // ---------------- SAVE TOOLS
      function save(box) {
        const col = el('div', { class: 'panel col', style: 'width:420px;gap:8px' }); box.appendChild(col);
        const add = (label, fn) => col.appendChild(UI.btn(label, () => { try { fn(); p.commit(); UI.toast(label + ' ✔'); } catch (e) { UI.toast(e.message, 'bad'); } }, 'small'));
        col.append(el('div', { class: 'h2', style: 'margin:0', text: 'Save tools (these change your REAL save)' }), el('div', { class: 'dim', style: 'font-size:12px', text: 'Sandbox battles never touch the save. These do, so use them only on an owner/test save.' }));
        add('+100,000 Coins', () => p.addCoins(100000));
        add('+10,000 Gems', () => p.addGems(10000));
        add('Player level +10', () => { for (let i = 0; i < 10; i++) p.addPlayerXP(p.playerXpNeeded()); });
        add('Grant ALL characters (incl. Jahjuan)', () => { JJK.CharacterOrder.forEach((id) => p.grantCharacter(id)); });
        add('Max all owned characters (Lv 30, 5★)', () => { for (const id of p.ownedIds()) { const c = p.d.characters[id]; c.level = Balance.charLevelCap; c.stars = Balance.maxStars; } });
        add('+5 of every XP item', () => { for (const k of Object.keys(JJK.Items)) p.d.items[k] = (p.d.items[k] || 0) + 5; });
        add('Toggle unlock-everything (maps, banners, features): ' + (p.debugUnlockAll ? 'ON' : 'off'), () => { p.debugUnlockAll = !p.debugUnlockAll; render(); });
      }

      render();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
