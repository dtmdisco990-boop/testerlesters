/* Entry point: builds the save/profile, wires the UI shell, and opens the menu. Any failure here is reported by the boot guard in index.html. */
(function (G) {
  'use strict';
  const JJK = G.JJK;
  const prog = (pct, msg) => { if (G.__bootProgress) G.__bootProgress(pct, msg); };

  function makeStorage() {
    try {
      const s = G.localStorage; const k = '__jjk_probe';
      s.setItem(k, '1'); s.removeItem(k);
      return s;
    } catch (e) { return new JJK.Util.MemoryStorage(); }
  }

  const REQUIRED = ['Util', 'Config', 'Balance', 'Characters', 'CharacterOrder', 'Enemies', 'Bosses', 'Maps', 'Items', 'Banners', 'Shop', 'Missions', 'Challenges', 'SaveManager', 'Profile', 'SummonMath', 'Waves', 'Battle', 'Kits', 'BossAI', 'Art', 'Backgrounds', 'VFX', 'BattleRenderer', 'Audio', 'UI', 'Debug'];

  function start() {
    const missing = REQUIRED.filter((k) => !JJK[k]);
    if (missing.length) throw new Error('Game files are incomplete (missing: ' + missing.join(', ') + '). Check that every file was uploaded.');
    for (const s of ['menu', 'play', 'battle', 'results', 'characters', 'summon', 'shop', 'inventory', 'missions', 'codex', 'settings']) if (!JJK.UI.screens[s]) throw new Error('Screen not registered: ' + s);
    prog(60, 'Loading save');
    let storageOk = true;
    const storage = makeStorage(); if (storage instanceof JJK.Util.MemoryStorage) storageOk = false;
    const sm = new JJK.SaveManager(storage);
    sm.load();
    const profile = new JJK.Profile(sm);
    const UI = JJK.UI;
    const $ = (id) => document.getElementById(id);
    UI.profile = profile; UI.sm = sm;
    UI.rootEl = $('screen-root'); UI.overlayEl = $('overlay-root'); UI.toastRoot = $('toast-root'); UI.tooltipEl = $('tooltip');
    UI.stage = $('stage') || UI.rootEl.parentNode; UI.canvas = $('battle-canvas');
    for (const k of ['rootEl', 'overlayEl', 'toastRoot', 'tooltipEl', 'stage', 'canvas']) if (!UI[k]) throw new Error('Missing page element for UI.' + k);
    if (!storageOk) setTimeout(() => UI.toast('Browser storage is unavailable: progress will not be saved this session.', 'bad'), 800);

    prog(72, 'Preparing audio');
    const S = profile.d.settings;
    JJK.Audio.init(S);
    document.body.classList.toggle('reduced', !!S.reduced);
    const unlock = () => { JJK.Audio.unlock(); };
    G.addEventListener('pointerdown', unlock, { once: false, passive: true });
    G.addEventListener('keydown', unlock, { passive: true });
    // Subtle click sound for every button
    document.addEventListener('click', (ev) => { const b = ev.target && ev.target.closest && ev.target.closest('button.btn'); if (b && !b.disabled && !b.__noclick) JJK.Audio.sfx('click'); }, true);
    document.addEventListener('mouseover', (ev) => { const b = ev.target && ev.target.closest && ev.target.closest('button.btn'); if (b && b !== start._lastHover && !b.disabled) { start._lastHover = b; JJK.Audio.sfx('hover'); } });

    // errors after boot never leave a blank screen: toast (throttled) and keep going
    let lastErr = 0;
    const report = (msg) => { console.error('[runtime]', msg); const n = Date.now(); if (n - lastErr > 4000) { lastErr = n; try { UI.toast('A minor error occurred. The game keeps running.', 'bad'); } catch (e) { /* ignore */ } } };
    G.addEventListener('error', (e) => report(e.message));
    G.addEventListener('unhandledrejection', (e) => report(e.reason && e.reason.message));

    // keep stage scaled
    const fit = () => { const w = G.innerWidth, h = G.innerHeight, k = Math.min(w / 1280, h / 720); UI.stage.style.transformOrigin = '0 0'; UI.stage.style.transform = 'scale(' + k + ')'; UI.stage.style.left = Math.round((w - 1280 * k) / 2) + 'px'; UI.stage.style.top = Math.round((h - 720 * k) / 2) + 'px'; };
    if (!UI.stage.__fitBound) { G.addEventListener('resize', fit); fit(); UI.stage.__fitBound = true; }

    prog(85, 'Loading art');
    const artDone = JJK.Art.loadManifest('assets/manifest.json').catch(() => false);
    const finish = () => {
      prog(100, 'Ready');
      UI.show('menu');
      if (G.__bootDone) G.__bootDone();
      G.__jjk = { UI, profile, sm, ready: true };
    };
    // never let a slow/missing manifest block boot
    Promise.race([artDone, new Promise((r) => setTimeout(r, 1500))]).then(finish, finish);
  }

  try { start(); } catch (err) { console.error(err); if (G.__bootFail) G.__bootFail('Startup error: ' + (err && err.message)); else throw err; }
})(typeof window !== 'undefined' ? window : globalThis);
