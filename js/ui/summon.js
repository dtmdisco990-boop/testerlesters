/* Summon screen: banners, transparent rates, pity, x1/x10 with a skippable reveal animation. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Balance, Util } = JJK;
  const TAU = Math.PI * 2;
  const TIERS = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
  const pct = (x) => (x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toFixed(3)).replace(/\.?0+$/, '') + '%';

  function bannerArt(canvas, b) {
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, Art().shade(b.color, -0.6)); bg.addColorStop(1, '#07060f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = b.color; g.globalAlpha = 0.25; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(W * 0.5, H * 0.38, 40 + i * 28, 0, TAU); g.stroke(); }
    g.globalAlpha = 1;
    const ids = b.featured ? [b.featured.id] : (b.showcase || ['yuji', 'nobara', 'nanami']);
    ids.forEach((id, i) => {
      const im = Art().portrait(id, 200, 200);
      const sz = b.featured ? H - 24 : Math.round(H * 0.56), x = b.featured ? (W - sz) / 2 : 10 + i * Math.round(W * 0.3), y = b.featured ? 12 : Math.round(H * 0.28) + (i === 1 ? 14 : 0);
      g.save(); g.beginPath(); g.rect(x, y, sz, sz); g.clip(); g.drawImage(im, x, y, sz, sz); g.restore();
      g.strokeStyle = b.color; g.lineWidth = 2; g.strokeRect(x, y, sz, sz);
    });
    const v = g.createLinearGradient(0, H * 0.55, 0, H); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  const Art = () => JJK.Art;

  UI.register('summon', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio, S = p.d.settings;
      A.music('menu');
      const featured = p.currentFeaturedBanner();
      const banners = [JJK.Banners.standard, featured, JJK.Banners.culling];
      const st = { id: ctx.params.banner && p.bannerById(ctx.params.banner) && p.isBannerUnlocked(ctx.params.banner) ? ctx.params.banner : featured.id, busy: false };
      ctx.root.appendChild(UI.topbar(ctx, 'Summon'));
      const body = UI.el('div', { class: 'body' });
      ctx.root.appendChild(body);
      const left = UI.el('div', { class: 'col', style: 'width:262px;flex:none;gap:12px' });
      const right = UI.el('div', { class: 'panel col grow scroll', style: 'min-width:0;gap:8px' });
      body.append(left, right);

      const renderBanners = () => {
        UI.clear(left);
        for (const b of banners) {
          const card = UI.el('button', { class: 'banner' + (st.id === b.id ? ' on' : ''), type: 'button', style: '--bc:' + b.color + ';width:240px;height:158px' });
          const cv = UI.el('canvas', { width: 240, height: 158 }); bannerArt(cv, b); card.appendChild(cv);
          const locked = !p.isBannerUnlocked(b.id);
          card.appendChild(UI.el('div', { class: 'cap' }, [UI.el('b', { text: b.name }), UI.el('span', { class: 'dim', style: 'font-size:11px', text: locked ? 'LOCKED: ' + p.bannerLockReason(b.id) : b.subtitle + (b.featured ? ' · Rate-up: ' + JJK.Characters[b.featured.id].short : '') })]));
          if (locked) card.style.filter = 'grayscale(0.85) brightness(0.7)';
          card.addEventListener('click', () => { if (st.busy) return; if (locked) { A.sfx('error'); UI.toast('Locked: ' + p.bannerLockReason(b.id), 'bad'); return; } st.id = b.id; A.sfx('click'); render(); });
          left.appendChild(card);
        }
        const nxt = JJK.Banners.featured[(JJK.Banners.featured.indexOf(featured) + 1) % JJK.Banners.featured.length];
        const days = Math.max(1, Math.ceil((((Util.weekIndex(p.now()) + 1) * 7 - 4) * 86400000 - p.now()) / 86400000));
        left.appendChild(UI.el('div', { class: 'dim', style: 'font-size:11.5px', text: 'Featured banner rotates weekly. Next: ' + nxt.name + ' in ~' + days + ' day' + (days === 1 ? '' : 's') + '.' }));
        left.appendChild(UI.el('div', { class: 'row', style: 'gap:6px' }, [UI.icon('gems', 18), UI.el('b', { text: UI.fmt(p.gems) + ' Cursed Gems' })]));
        left.appendChild(UI.el('div', { class: 'dim', style: 'font-size:11.5px', text: 'Earn gems from first clears, missions, boss kills and Endless milestones.' }));
      };

      const render = () => {
        renderBanners();
        const b = p.bannerById(st.id);
        UI.clear(right);
        const pity = p.pityOf(b.id), rates = JJK.SummonMath.tierRates(b, pity);
        right.appendChild(UI.el('div', { class: 'row' }, [UI.el('div', { class: 'grow' }, [UI.el('div', { class: 'h1', style: 'font-size:28px;color:' + b.color, text: b.name }), UI.el('div', { class: 'dim', style: 'font-size:13px', text: b.blurb })])]));
        // pity
        const hiTier = b.pity.tier;
        const pbar = UI.el('div', { class: 'col', style: 'gap:3px' });
        pbar.append(UI.el('div', { class: 'row' }, [UI.el('b', { text: 'PITY ' }), UI.el('span', { class: 'rc r-' + hiTier, style: 'color:' + UI.rc(hiTier) + ';font-weight:700', text: hiTier + ' guaranteed at pull ' + b.pity.hard }), UI.el('span', { class: 'grow' }), UI.el('b', { text: pity + ' / ' + b.pity.hard })]));
        const bar = UI.el('div', { class: 'bar', style: 'height:12px;position:relative' }, [UI.el('i', { style: { width: Math.min(100, pity / b.pity.hard * 100) + '%', background: 'linear-gradient(90deg,' + b.color + ', #fff)' } }), UI.el('div', { style: 'position:absolute;top:0;bottom:0;width:2px;background:#fff9;left:' + (b.pity.softStart / b.pity.hard * 100) + '%', title: 'Soft pity starts' })]);
        pbar.append(bar, UI.el('div', { class: 'dim', style: 'font-size:11.5px', text: 'Soft pity from pull ' + b.pity.softStart + ': +' + b.pity.softStep + '% ' + hiTier + '+ chance per pull. Next pull ' + hiTier + '+ chance: ' + pct(TIERS.slice(TIERS.indexOf(hiTier)).reduce((a, t) => a + rates[t], 0)) + (b.guaranteeAfterLoss ? (p.d.summon.lost[b.id] ? '. Your next featured-tier pull is GUARANTEED to be ' + JJK.Characters[b.featured.id].short + '.' : '. If your ' + hiTier + ' is not ' + JJK.Characters[b.featured.id].short + ', the next one is guaranteed.') : '') }));
        right.appendChild(pbar);
        // buttons
        const c1 = p.bannerCost(b.id, 1), c10 = p.bannerCost(b.id, 10), can1 = p.gems >= c1, can10 = p.gems >= c10;
        const act = UI.el('div', { class: 'row', style: 'gap:12px' });
        const mkBtn = (n, cost, can) => UI.btn(null, () => doSummon(n), (n === 10 ? 'primary' : '') + ' big', { disabled: st.busy, tip: can ? null : 'Not enough Cursed Gems (' + UI.fmt(p.gems) + '/' + cost + ')' });
        for (const [n, cost, can] of [[1, c1, can1], [10, c10, can10]]) {
          const bt = mkBtn(n, cost, can); bt.appendChild(UI.el('span', { text: 'SUMMON ×' + n + '  ' })); bt.appendChild(UI.icon('gems', 18)); bt.appendChild(document.createTextNode(' ' + cost));
          if (!can) bt.classList.add('disabled');
          act.appendChild(bt);
        }
        act.appendChild(UI.el('div', { class: 'dim', style: 'font-size:12px;max-width:260px', text: '×10 guarantees at least one ' + (b.guarantee10 || 'RARE') + ' or better. Duplicates become shards used for star upgrades or unlocking characters.' }));
        right.appendChild(act);
        // rates table
        const two = UI.el('div', { class: 'row', style: 'align-items:flex-start;gap:14px' });
        const tt = UI.el('table', { class: 'tbl', style: 'width:300px;flex:none' });
        tt.appendChild(UI.el('tr', null, [UI.el('th', { text: 'Rarity' }), UI.el('th', { text: 'Base rate' }), UI.el('th', { text: 'Now' })]));
        for (const t of TIERS) { if (!(b.rates[t] > 0)) continue; tt.appendChild(UI.el('tr', null, [UI.el('td', { style: 'color:' + UI.rc(t) + ';font-weight:700', text: t }), UI.el('td', { text: pct(b.rates[t]) }), UI.el('td', { class: rates[t] > b.rates[t] + 1e-9 ? 'ok' : '', text: pct(rates[t]) })])); }
        tt.appendChild(UI.el('tr', null, [UI.el('td', { class: 'rc r-JOAN', style: 'font-weight:700', text: 'JOAN' }), UI.el('td', { text: '1 in ' + JJK.SummonMath.JOAN_ODDS.toLocaleString('en-US') }), UI.el('td', { class: 'dim', text: 'every pull' })]));
        two.appendChild(tt);
        const cr = JJK.SummonMath.charRates(b);
        const list = UI.el('div', { class: 'col grow', style: 'gap:3px' });
        list.appendChild(UI.el('div', { class: 'dim', style: 'font-size:11px;letter-spacing:1px', text: 'PER-CHARACTER BASE RATES (before pity)' }));
        const gr = UI.el('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px 10px' });
        for (const c of cr.sort((a, z) => TIERS.indexOf(z.tier) - TIERS.indexOf(a.tier))) {
          const d = JJK.Characters[c.id];
          const e = UI.el('div', { class: 'row', style: 'gap:5px;font-size:12px;width:178px' }, [JJK.Art.portraitImg(c.id, null, 60, 60), UI.el('span', { class: 'grow', style: 'color:' + UI.rc(c.tier), text: d.short + (c.featured ? ' ★' : '') }), UI.el('span', { class: p.owns(c.id) ? 'dim' : '', text: pct(c.rate) })]);
          e.firstChild.style.cssText = 'width:22px;height:22px;border-radius:50%';
          UI.tip(e, () => UI.charTip(c.id) + '<br>' + (p.owns(c.id) ? '<span class="ok">Owned</span>' : '<span class="hot">Not owned</span>')); gr.appendChild(e);
        }
        list.appendChild(gr); two.appendChild(list);
        right.appendChild(two);
        // history
        const hist = p.d.summon.history.slice(-12).reverse();
        if (hist.length) { const hr = UI.el('div', { class: 'row', style: 'gap:4px;align-items:center' }); hr.appendChild(UI.el('span', { class: 'dim', style: 'font-size:11px;letter-spacing:1px;margin-right:4px', text: 'RECENT' })); for (const id of hist) { const im = JJK.Art.portraitImg(id, null, 60, 60); im.style.cssText = 'width:28px;height:28px;border-radius:50%;border:2px solid ' + UI.rc(JJK.Characters[id].rarity); UI.tip(im, JJK.Characters[id].name); hr.appendChild(im); } right.appendChild(hr); }
        right.appendChild(UI.el('div', { class: 'dim', style: 'font-size:11px', text: 'Total summons: ' + p.d.summon.total + '. All odds are shown above; there are no hidden rates.' }));
      };

      const doSummon = (n) => {
        if (st.busy) return;
        const b = p.bannerById(st.id);
        const cost = p.bannerCost(st.id, n);
        if (p.gems < cost) { UI.toast('Not enough Cursed Gems (' + p.gems + '/' + cost + ').', 'bad'); A.sfx('error'); return; }
        st.busy = true;
        let rng; // Owner Lab: "force JOAN on the next pull" (one-shot, only while unlocked)
        if (JJK.Owner && JJK.Owner.unlocked() && JJK.Owner.forceJoan) { JJK.Owner.forceJoan = false; rng = Util.makeRng(Date.now() & 0xffffff); rng.joan = () => 0; }
        const res = p.summon(b.id, n, rng);
        if (!res.ok) { st.busy = false; UI.toast(res.reason, 'bad'); A.sfx('error'); return; }
        reveal(res, b, n);
      };

      // -------------------------------------------------------------- reveal animation
      const reveal = (res, b, n) => {
        const ov = UI.el('div', { class: 'reveal' });
        UI.overlayEl.appendChild(ov);
        const cv = UI.el('canvas', { width: 1280, height: 720 }); ov.appendChild(cv);
        const g = cv.getContext('2d');
        const hasJoan = res.results.some((r) => r.tier === 'JOAN');
        if (hasJoan) ov.classList.add('joan');
        const best = hasJoan ? 'JOAN' : res.results.reduce((a, r) => (TIERS.indexOf(r.tier) > TIERS.indexOf(a) ? r.tier : a), 'COMMON');
        const bc = UI.rc(best);
        const hue = (k) => 'hsl(' + (((k % 1) + 1) % 1 * 360).toFixed(0) + ',100%,62%)';
        // JOAN is always revealed last, after everything else in the pull
        const seq = res.results.slice().sort((a, z) => (a.tier === 'JOAN') - (z.tier === 'JOAN'));
        const sparks = hasJoan ? Array.from({ length: 140 }, () => ({ x: rng0(), y: rng0(), v: 30 + rng0() * 140, s: 1 + rng0() * 3, h: rng0(), p: rng0() * 6 })) : [];
        function rng0() { return Math.random(); }
        const grid = UI.el('div', { class: 'grid-res' }); ov.appendChild(grid);
        const skipBtn = UI.btn('SKIP ▶▶', () => finish(), 'small skip'); ov.appendChild(skipBtn);
        const doneBar = UI.el('div', { class: 'row', style: 'position:absolute;left:0;right:0;bottom:24px;justify-content:center;gap:12px;display:none' });
        ov.appendChild(doneBar);
        const quick = (S.skipSummonAnim || S.reduced) && !hasJoan; // a JOAN pull always gets the full animation (still skippable)
        let phase = quick && !hasJoan ? 'reveal' : 'charge', t = 0, shown = 0, raf = 0, last = performance.now(), nextT = 0, done = false;
        const cards = [];
        const rng = Util.makeRng(Date.now() & 0xffff);
        const parts = Array.from({ length: 80 }, () => ({ a: rng.range(0, TAU), r: rng.range(250, 650), s: rng.range(0.6, 1.6), z: rng.range(1, 3) }));
        if (!quick) A.sfx(hasJoan ? 'summonCharge' : 'summonCharge');
        const cardEl = (r, big) => {
          const c = UI.charCard(r.id, { tip: false });
          c.classList.add('rescard'); c.style.pointerEvents = 'none';
          if (big) c.style.transform = 'scale(1.9)';
          if (r.isNew) c.appendChild(UI.el('div', { class: 'new-tag', text: 'NEW!' }));
          else c.appendChild(UI.el('div', { class: 'lvtag', style: 'left:auto;right:6px;top:auto;bottom:56px;color:#5ac8ff;border-color:#5ac8ff', text: '+' + r.shards + ' ◆' }));
          return c;
        };
        const showNext = () => {
          const r = seq[shown]; if (!r) return;
          const c = cardEl(r, n === 1);
          if (r.tier === 'JOAN') {
            c.classList.add('joan-card');
            ov.append(UI.el('div', { class: 'joan-title', text: 'J O A N' }), UI.el('div', { class: 'joan-sub', text: (r.isNew ? 'INVINCIBLE JAHJUAN HAS ARRIVED' : 'INVINCIBLE JAHJUAN RETURNS (+' + r.shards + ' ◆)') }));
            A.sfx('joan'); joanT = 0; joanShown = true; shake = 1.2;
          }
          if (n === 1) { grid.style.top = '230px'; }
          grid.appendChild(c); cards.push(c);
          if (r.tier !== 'JOAN') A.sfx('reveal', r.tier);
          pulse = 1; pulseCol = r.tier === 'JOAN' ? '#ffffff' : UI.rc(r.tier);
          shown++;
        };
        let pulse = 0, pulseCol = bc, joanT = 0, joanShown = false, shake = 0;
        function finish() {
          if (done) return; done = true; cancelAnimationFrame(raf);
          UI.clear(grid);
          if (n === 1) grid.style.top = '230px';
          for (const r of seq) { const c = cardEl(r, n === 1); if (r.tier === 'JOAN') c.classList.add('joan-card'); grid.appendChild(c); }
          if (hasJoan && !ov.querySelector('.joan-title')) { const jr = res.results.find((r) => r.tier === 'JOAN'); ov.append(UI.el('div', { class: 'joan-title', text: 'J O A N' }), UI.el('div', { class: 'joan-sub', text: jr.isNew ? 'INVINCIBLE JAHJUAN HAS ARRIVED' : 'INVINCIBLE JAHJUAN RETURNS (+' + jr.shards + ' ◆)' })); A.sfx('joan'); }
          skipBtn.remove();
          UI.clear(doneBar); doneBar.style.display = 'flex';
          const sum = res.results.filter((r) => r.isNew).length;
          doneBar.append(UI.el('div', { class: 'dim', style: 'align-self:center', text: (sum ? sum + ' new · ' : '') + res.results.reduce((a, r) => a + (r.shards || 0), 0) + ' shards gained' }));
          doneBar.append(UI.btn('OK', () => { ov.remove(); st.busy = false; render(); }, 'primary'));
          doneBar.append(UI.btn('SUMMON ×' + n + ' AGAIN', () => { ov.remove(); st.busy = false; render(); doSummon(n); }, 'gold', { disabled: p.gems < p.bannerCost(st.id, n) }));
          g.clearRect(0, 0, 1280, 720); g.fillStyle = '#05040a'; g.fillRect(0, 0, 1280, 720);
          if (hasJoan) { const cg = g.createConicGradient(0, 640, 360); ['#ff3b3b', '#ffd23a', '#3bff7a', '#3bd2ff', '#7a3bff', '#ff3bd2', '#ff3b3b'].forEach((c2, i) => cg.addColorStop(i / 6, c2)); g.fillStyle = cg; g.globalAlpha = 0.22; g.beginPath(); g.arc(640, 360, 460, 0, TAU); g.fill(); g.globalAlpha = 1; }
          else { g.fillStyle = bc; g.globalAlpha = 0.08; g.beginPath(); g.arc(640, 360, 420, 0, TAU); g.fill(); g.globalAlpha = 1; }
          if (TIERS.indexOf(best) >= 3) A.sfx('reveal', best);
        }
        const loop = (now) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
          g.clearRect(0, 0, 1280, 720); g.fillStyle = '#05040a'; g.fillRect(0, 0, 1280, 720);
          const cx = 640, cy = 340;
          if (hasJoan) {
            // JOAN: the whole sequence is a hue-cycling rainbow
            if (phase === 'charge') {
              const k = Math.min(1, t / 2.6);
              for (let i = 0; i < 140; i++) { const a2 = i * 2.399 + t * (0.6 + (i % 5) * 0.2), r = (680 - k * 640) * (0.35 + (i % 9) / 9); g.fillStyle = hue(i / 140 + t * 0.5); g.globalAlpha = 0.4 + 0.5 * k; g.fillRect(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r, 2 + (i % 3), 2 + (i % 3)); }
              g.globalAlpha = 1;
              for (let i = 0; i < 7; i++) { g.strokeStyle = hue(i / 7 + t * 0.8); g.lineWidth = 3 + k * 3; g.beginPath(); g.arc(cx, cy, 60 + i * 26 + k * 40 + Math.sin(t * 12 + i) * 4 * k, t * (i % 2 ? -2 : 2) + i, t * (i % 2 ? -2 : 2) + i + 3.6); g.stroke(); }
              const rad = 30 + k * 110, gr = g.createRadialGradient(cx, cy, 2, cx, cy, rad * 2.4); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, hue(t)); gr.addColorStop(1, 'rgba(0,0,0,0)');
              g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rad * 2.4, 0, TAU); g.fill();
              if (t > 2.6) { phase = 'burst'; t = 0; }
            } else if (phase === 'burst') {
              const k = t / 0.9;
              g.fillStyle = '#fff'; g.globalAlpha = Math.max(0, 1 - k * 1.4); g.fillRect(0, 0, 1280, 720); g.globalAlpha = 1;
              for (let i = 0; i < 6; i++) { const kk = Math.max(0, k - i * 0.08); g.strokeStyle = hue(i / 6 + t); g.lineWidth = 16 * (1 - Math.min(1, kk)); g.beginPath(); g.arc(cx, cy, kk * 900, 0, TAU); g.stroke(); }
              if (t > 0.9) { phase = 'reveal'; t = 0; nextT = 0; }
            } else {
              g.save();
              if (shake > 0) { g.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 18 * shake); shake -= dt; }
              g.translate(cx, cy); g.rotate(t * 0.25);
              const N = 24; for (let i = 0; i < N; i++) { g.rotate(TAU / N); g.fillStyle = hue(i / N + t * 0.35); g.globalAlpha = 0.28; g.beginPath(); g.moveTo(0, 0); g.lineTo(1000, -38); g.lineTo(1000, 38); g.fill(); }
              g.restore(); g.globalAlpha = 1;
              for (const sp of sparks) { const yy = (sp.y * 760 - t * sp.v + 760 * 10) % 760, tw = 0.5 + 0.5 * Math.sin(t * 6 + sp.p); g.fillStyle = hue(sp.h + t * 0.3); g.globalAlpha = tw; g.fillRect(sp.x * 1280, yy, sp.s, sp.s); g.globalAlpha = 1; }
              if (joanShown) { joanT += dt; const gk = 0.5 + 0.5 * Math.sin(joanT * 3); const gr = g.createRadialGradient(cx, cy + 40, 10, cx, cy + 40, 420); gr.addColorStop(0, hue(joanT * 0.4) .replace(')', ',.35)').replace('hsl(', 'hsla(')); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.globalAlpha = 0.6 + gk * 0.4; g.fillRect(0, 0, 1280, 720); g.globalAlpha = 1; }
              if (pulse > 0) { g.fillStyle = pulseCol; g.globalAlpha = pulse * 0.5; g.fillRect(0, 0, 1280, 720); g.globalAlpha = 1; pulse -= dt * 2; }
              nextT -= dt;
              if (nextT <= 0 && shown < res.results.length) { showNext(); nextT = shown < res.results.length ? 0.32 : 0; if (seq[shown] && seq[shown].tier === 'JOAN') nextT = 1.2; }
              if (shown >= res.results.length && !done && nextT < -3.2) finish();
            }
            return;
          }
          if (phase === 'charge') {
            const k = Math.min(1, t / 1.8);
            for (const p2 of parts) { const r = p2.r * (1 - k * 0.92); g.fillStyle = bc; g.globalAlpha = 0.35 + 0.5 * k; g.fillRect(cx + Math.cos(p2.a + t * p2.s) * r, cy + Math.sin(p2.a + t * p2.s) * r, p2.z, p2.z); }
            g.globalAlpha = 1;
            const rad = 20 + k * 90 + Math.sin(t * 20) * 4 * k;
            const gr = g.createRadialGradient(cx, cy, 2, cx, cy, rad * 2.2); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, bc); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rad * 2.2, 0, TAU); g.fill();
            g.strokeStyle = bc; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx, cy, 70 + i * 36 + k * 20, t * (i + 1), t * (i + 1) + 3.2); g.stroke(); }
            if (t > 1.8) { phase = 'burst'; t = 0; }
          } else if (phase === 'burst') {
            const k = t / 0.5;
            g.fillStyle = bc; g.globalAlpha = Math.max(0, 1 - k); g.fillRect(0, 0, 1280, 720); g.globalAlpha = 1;
            g.strokeStyle = '#fff'; g.lineWidth = 8 * (1 - k); g.beginPath(); g.arc(cx, cy, k * 700, 0, TAU); g.stroke();
            if (t > 0.5) { phase = 'reveal'; t = 0; nextT = 0; }
          } else {
            // reveal
            const rays = TIERS.indexOf(best) + 2;
            g.save(); g.translate(cx, cy); g.globalAlpha = 0.14;
            for (let i = 0; i < 14; i++) { g.rotate(TAU / 14); g.fillStyle = i % 2 ? bc : '#fff'; g.beginPath(); g.moveTo(0, 0); g.lineTo(900, -26 - rays * 3); g.lineTo(900, 26 + rays * 3); g.fill(); }
            g.restore(); g.globalAlpha = 1;
            if (pulse > 0) { g.fillStyle = pulseCol; g.globalAlpha = pulse * 0.22; g.fillRect(0, 0, 1280, 720); g.globalAlpha = 1; pulse -= dt * 3; }
            if (quick && shown === 0) { finish(); return; }
            nextT -= dt;
            if (nextT <= 0 && shown < res.results.length) { showNext(); nextT = n === 1 ? 0.3 : 0.32; }
            if (shown >= res.results.length && !done && nextT < -0.9) finish();
          }
        };
        if (quick) { finish(); return; }
        raf = requestAnimationFrame(loop);
        ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });
        ctx.onExit(() => cancelAnimationFrame(raf));
      };

      render();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
