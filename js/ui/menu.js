/* Main menu. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const UI = JJK.UI, { Balance, Util } = JJK;

  UI.register('menu', {
    enter(ctx) {
      const p = UI.profile, A = JJK.Audio;
      A.music('menu');
      const root = ctx.root; root.classList.add('transparent');
      const wrap = UI.el('div', { class: 'menu-wrap' });
      root.appendChild(wrap);

      // animated key art (right side)
      const art = UI.el('canvas', { class: 'menu-right', width: 700, height: 720 });
      wrap.appendChild(art);
      const g = art.getContext('2d');
      const team = p.getLoadout().slice(0, 3);
      const feat = team.length ? team : ['yuji', 'panda', 'nobara'];
      const rng = Util.makeRng(42);
      const motes = Array.from({ length: 70 }, () => ({ x: rng.range(0, 700), y: rng.range(0, 720), s: rng.range(0.4, 2.4), v: rng.range(6, 30), p: rng.range(0, 6.28) }));
      let raf = 0, t0 = performance.now();
      const reduced = p.d.settings.reduced;
      const draw = (now) => {
        const t = (now - t0) / 1000;
        const bg = g.createLinearGradient(0, 0, 700, 720); bg.addColorStop(0, '#1c1550'); bg.addColorStop(0.6, '#0d0a24'); bg.addColorStop(1, '#2a0a24');
        g.fillStyle = bg; g.fillRect(0, 0, 700, 720);
        // cursed energy rings
        g.save(); g.translate(430, 330);
        for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(138,107,255,' + (0.35 - i * 0.05) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 150 + i * 56 + Math.sin(t * 0.8 + i) * 6, t * 0.2 * (i % 2 ? 1 : -1), t * 0.2 * (i % 2 ? 1 : -1) + 4.6); g.stroke(); }
        g.restore();
        // portraits
        feat.forEach((id, i) => {
          const im = JJK.Art.portrait(id, 200, 200);
          const isImg = im instanceof HTMLImageElement; // replacement art: free-standing cutouts, no frame
          const sz = i === 0 ? 400 : 290, x = i === 0 ? 270 : (i === 1 ? 60 : 410), y = (i === 0 ? (isImg ? 60 : 170) : (i === 1 ? (isImg ? 190 : 330) : (isImg ? 250 : 360))) + (reduced ? 0 : Math.sin(t * 1.1 + i * 1.7) * 7);
          g.save(); g.shadowColor = isImg ? 'rgba(138,107,255,.7)' : '#000'; g.shadowBlur = isImg ? 28 : 24; g.globalAlpha = i === 0 ? 1 : 0.92;
          if (!isImg) { g.beginPath(); g.roundRect ? g.roundRect(x, y, sz, sz, 14) : g.rect(x, y, sz, sz); g.clip(); }
          g.drawImage(im, x, y, sz, sz);
          g.restore();
          if (!isImg) { g.strokeStyle = UI.rc(JJK.Characters[id].rarity); g.lineWidth = 3; g.strokeRect(x, y, sz, sz); }
        });
        for (const m of motes) { const y = (m.y - t * m.v) % 720; const yy = y < 0 ? y + 720 : y; g.fillStyle = 'rgba(190,170,255,' + (0.25 + 0.25 * Math.sin(t * 2 + m.p)) + ')'; g.fillRect(m.x + Math.sin(t + m.p) * 8, yy, m.s, m.s); }
        const edge = g.createLinearGradient(0, 0, 140, 0); edge.addColorStop(0, '#0b0a14'); edge.addColorStop(1, 'rgba(11,10,20,0)'); g.fillStyle = edge; g.fillRect(0, 0, 140, 720);
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      ctx.onExit(() => cancelAnimationFrame(raf));

      // left column
      const left = UI.el('div', { class: 'menu-left' });
      left.appendChild(UI.el('div', { class: 'menu-logo' }, [UI.el('div', { class: 'a', text: 'JUJUTSU' }), UI.el('div', { class: 'a', text: 'KAISEN' }), UI.el('div', { class: 'b', text: 'TOWER DEFENSE' })]));
      const btns = UI.el('div', { class: 'menu-btns' });
      const mk = (label, screen, o) => {
        o = o || {};
        const lock = o.feature ? p.featureLockReason(o.feature) : '';
        const b = UI.el('button', { class: 'menu-btn' + (o.cls ? ' ' + o.cls : ''), type: 'button', disabled: !!lock });
        b.appendChild(document.createTextNode(label));
        if (lock) b.appendChild(UI.el('span', { class: 'sub', text: 'Unlocks: ' + lock }));
        else if (o.sub) b.appendChild(UI.el('span', { class: 'sub', text: o.sub }));
        if (o.badge) b.appendChild(UI.el('span', { class: 'badge', text: o.badge }));
        b.addEventListener('click', () => UI.show(screen, { from: 'menu' }));
        btns.appendChild(b);
      };
      const claim = p.claimableCount();
      mk('PLAY', 'play', { cls: 'play', sub: 'Choose a map, difficulty and team' });
      mk('CHARACTERS', 'characters');
      mk('SUMMON', 'summon', { sub: 'Banners, rates and pity' });
      mk('SHOP', 'shop', { feature: 'shop' });
      mk('INVENTORY', 'inventory');
      mk('MISSIONS', 'missions', { badge: claim ? String(claim) : null });
      mk('INDEX', 'codex', { sub: 'Curses, bosses and traits' });
      mk('SETTINGS', 'settings');
      left.appendChild(btns);
      left.appendChild(UI.el('div', { class: 'grow' }));
      left.appendChild(UI.el('div', { class: 'dim', style: 'font-size:11px', text: 'v' + JJK.Config.VERSION + ' · fan-made, non-commercial · progress saves automatically' }));
      wrap.appendChild(left);

      // top-right player info
      const top = UI.el('div', { class: 'menu-top' });
      const lvl = UI.el('div', { class: 'lvl-badge panel', style: 'padding:6px 12px' });
      const need = p.playerXpNeeded();
      lvl.append(UI.el('span', { class: 'lv', text: 'LV ' + p.playerLevel() }), UI.el('div', { class: 'bar', style: 'width:110px' }, UI.el('i', { style: { width: (need ? Math.min(100, p.d.player.xp / need * 100) : 100) + '%' } })), UI.el('span', { class: 'dim', style: 'font-size:11px', text: need ? p.d.player.xp + '/' + need + ' XP' : 'MAX' }));
      top.append(lvl, UI.el('div', { class: 'cur', tip: 'Coins' }, [UI.icon('coins', 18), UI.fmt(p.coins)]), UI.el('div', { class: 'cur', tip: 'Cursed Gems' }, [UI.icon('gems', 18), UI.fmt(p.gems)]));
      wrap.appendChild(top);

      // team preview
      const tm = UI.el('div', { class: 'menu-team panel' });
      tm.appendChild(UI.el('div', { class: 'h2', style: 'margin:0', text: 'Your team' }));
      const heads = UI.el('div', { class: 'heads' });
      const lo = p.getLoadout();
      for (let i = 0; i < Balance.teamSize; i++) {
        if (lo[i]) { const im = JJK.Art.portraitImg(lo[i], null, 100, 100); im.style.cssText = 'width:54px;height:54px;border:2px solid ' + UI.rc(JJK.Characters[lo[i]].rarity); UI.tip(im, () => UI.charTip(lo[i])); heads.appendChild(im); }
        else heads.appendChild(UI.el('div', { style: 'width:54px;height:54px;border:2px dashed #3a3566;border-radius:6px' }));
      }
      tm.appendChild(heads);
      tm.appendChild(UI.btn('EDIT TEAM', () => UI.show('play', { from: 'menu', focus: 'team' }), 'small', { style: 'margin-top:8px' }));
      wrap.appendChild(tm);

      // daily progress
      const daily = UI.el('div', { class: 'menu-daily panel' });
      daily.appendChild(UI.el('div', { class: 'h2', style: 'margin:0 0 6px', text: 'Daily missions' }));
      for (const dm of p.dailyMissions()) {
        const row = UI.el('div', { style: 'margin-bottom:6px;font-size:12px' }, [
          UI.el('div', { class: 'row' }, [UI.el('span', { class: 'grow' + (dm.claimed ? ' dim' : ''), text: dm.name }), UI.el('span', { class: dm.done ? 'ok' : 'dim', text: dm.claimed ? 'CLAIMED' : dm.done ? 'READY' : dm.progress + '/' + dm.target })]),
          UI.el('div', { class: 'bar' }, UI.el('i', { style: { width: Math.min(100, dm.progress / dm.target * 100) + '%' } })),
        ]);
        daily.appendChild(row);
      }
      daily.style.cursor = 'pointer'; daily.addEventListener('click', () => UI.show('missions', { from: 'menu' }));
      wrap.appendChild(daily);

      if (JJK.Debug && JJK.Debug.enabled) {
        const d = UI.btn('DEBUG', () => JJK.Debug.toggle(), 'small', { style: 'position:absolute;left:10px;top:8px;z-index:5;opacity:.7' });
        wrap.appendChild(d);
      }
      if (JJK.Owner) JJK.Owner.attachMenu(wrap);
      if (p.sm.status === 'corrupt-reset') UI.toast('Your save could not be read and was reset. A forensic copy was kept.', 'bad');
      else if (p.sm.status === 'recovered') UI.toast('Save recovered from the previous backup slot.', 'gold');
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
