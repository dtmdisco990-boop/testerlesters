/* AudioManager: fully synthesized SFX + generative music (WebAudio). No audio files, nothing copyrighted.
   Optional replacements: list files under audio.sfx / audio.music in assets/manifest.json. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});

  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
  const MOODS = {
    menu: { bpm: 84, root: 50, scale: 'minor', prog: [0, 5, 3, 4], vol: 0.8, arp: true },
    battle: { bpm: 118, root: 45, scale: 'phrygian', prog: [0, 0, 5, 4], vol: 0.9, arp: true, drums: true },
    boss: { bpm: 140, root: 43, scale: 'phrygian', prog: [0, 1, 0, 4], vol: 1, arp: true, drums: true },
    summon: { bpm: 70, root: 55, scale: 'dorian', prog: [0, 3, 5, 4], vol: 0.7, arp: false },
  };

  const A = {
    ctx: null, master: null, musicGain: null, sfxGain: null, comp: null,
    vol: { master: 0.8, music: 0.5, sfx: 0.8, muted: false },
    buffers: { sfx: {}, music: {} },
    mood: null, _timer: null, _next: 0, _step: 0, _lastSfx: {}, _noise: null, _musicSrc: null,

    init(settings) {
      if (settings) this.setVolumes(settings);
      return this;
    },
    /** Must be called from a user gesture (browsers block audio until then). Safe to call repeatedly. */
    unlock() {
      try {
        if (!this.ctx) {
          const AC = G.AudioContext || G.webkitAudioContext;
          if (!AC) return false;
          this.ctx = new AC();
          this.comp = this.ctx.createDynamicsCompressor();
          this.master = this.ctx.createGain(); this.musicGain = this.ctx.createGain(); this.sfxGain = this.ctx.createGain();
          this.musicGain.connect(this.master); this.sfxGain.connect(this.master); this.master.connect(this.comp); this.comp.connect(this.ctx.destination);
          const len = this.ctx.sampleRate; this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const d = this._noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          this.applyVolumes();
          if (this.mood) { const m = this.mood; this.mood = null; this.music(m); }
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
      } catch (e) { return false; }
    },
    setVolumes(v) {
      if (v) { for (const k of ['master', 'music', 'sfx']) if (typeof v[k] === 'number') this.vol[k] = Math.max(0, Math.min(1, v[k])); if (typeof v.muted === 'boolean') this.vol.muted = v.muted; }
      this.applyVolumes();
    },
    applyVolumes() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(this.vol.muted ? 0 : this.vol.master, t, 0.03);
      this.musicGain.gain.setTargetAtTime(this.vol.music * 0.55, t, 0.05);
      this.sfxGain.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.03);
    },

    // ------------------------------------------------------------------ primitives
    tone(freq, t0, dur, type, gain, o) {
      const c = this.ctx; if (!c) return;
      o = o || {};
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = type || 'sine'; osc.frequency.setValueAtTime(freq, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(o.dest || this.sfxGain);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    },
    noise(t0, dur, gain, o) {
      const c = this.ctx; if (!c) return;
      o = o || {};
      const src = c.createBufferSource(); src.buffer = this._noise; src.loop = true;
      const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1500, t0);
      if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      f.Q.value = o.q || 1;
      const g = c.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(o.dest || this.sfxGain);
      src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
    },

    // ------------------------------------------------------------------ SFX
    /** Play a named effect. Unknown names are ignored. Rapid repeats of the same effect are throttled. */
    sfx(name, arg) {
      const c = this.ctx; if (!c || this.vol.muted || c.state !== 'running') return;
      const now = c.currentTime;
      const minGap = { hit: 0.05, kill: 0.04, shoot: 0.06, coin: 0.05 }[name] || 0.02;
      if (this._lastSfx[name] && now - this._lastSfx[name] < minGap) return;
      this._lastSfx[name] = now;
      const buf = this.buffers.sfx[name];
      if (buf) { const s = c.createBufferSource(); s.buffer = buf; s.connect(this.sfxGain); s.start(); return; }
      const f = SFX[name]; if (f) f(this, now, arg);
    },

    // ------------------------------------------------------------------ music
    music(name) {
      if (name === this.mood) return;
      this.mood = name;
      if (this._musicSrc) { try { this._musicSrc.stop(); } catch (e) { /* ignore */ } this._musicSrc = null; }
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      if (!name || !this.ctx) return;
      const buf = this.buffers.music[name];
      if (buf) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(this.musicGain); s.start(); this._musicSrc = s; return; }
      const m = MOODS[name]; if (!m) return;
      this._step = 0; this._next = this.ctx.currentTime + 0.08;
      this._timer = setInterval(() => this.schedule(m), 60);
    },
    schedule(m) {
      const c = this.ctx; if (!c || c.state !== 'running') { if (c) this._next = c.currentTime + 0.1; return; }
      const spb = 60 / m.bpm / 2; // eighth notes
      const sc = SCALES[m.scale];
      while (this._next < c.currentTime + 0.3) {
        const t = this._next, s = this._step, bar = Math.floor(s / 8) % m.prog.length, deg = m.prog[bar];
        const root = m.root + sc[deg % 7];
        const dest = this.musicGain;
        if (s % 8 === 0) { // pad + bass
          for (const iv of [0, 7, 12]) this.tone(NOTE(root + 12 + iv), t, spb * 8, 'sawtooth', 0.025 * m.vol, { dest, attack: 0.4 });
          this.tone(NOTE(root), t, spb * 3.6, 'triangle', 0.12 * m.vol, { dest, attack: 0.02 });
        }
        if (s % 4 === 2) this.tone(NOTE(root), t, spb * 1.6, 'triangle', 0.09 * m.vol, { dest });
        if (m.arp && s % 2 === 0) {
          const k = [0, 2, 4, 6, 4, 2, 7, 4][(s / 2) % 8 | 0];
          this.tone(NOTE(m.root + 24 + sc[(deg + k) % 7] + (k > 6 ? 12 : 0)), t, spb * 1.4, 'square', 0.025 * m.vol, { dest });
        }
        if (m.drums) {
          if (s % 4 === 0) this.tone(120, t, 0.14, 'sine', 0.22 * m.vol, { dest, to: 40 });
          if (s % 8 === 4) this.noise(t, 0.12, 0.12 * m.vol, { dest, freq: 2600, q: 0.8 });
          if (s % 2 === 1) this.noise(t, 0.04, 0.04 * m.vol, { dest, type: 'highpass', freq: 7000 });
        }
        this._step++; this._next += spb;
      }
    },

    // ------------------------------------------------------------------ optional replacement files
    loadManifest(manifest) {
      if (!this.ctx || !manifest || !manifest.audio || typeof fetch === 'undefined') return Promise.resolve();
      const jobs = [];
      for (const kind of ['sfx', 'music']) {
        const src = manifest.audio[kind]; if (!src) continue;
        for (const name of Object.keys(src)) {
          jobs.push(fetch('assets/' + String(src[name]).replace(/^\/+/, '')).then((r) => r.arrayBuffer()).then((ab) => this.ctx.decodeAudioData(ab)).then((b) => { this.buffers[kind][name] = b; }).catch(() => { /* fall back to synth */ }));
        }
      }
      return Promise.all(jobs);
    },
  };

  const SFX = {
    click(a, t) { a.tone(660, t, 0.06, 'square', 0.07, { to: 880 }); },
    hover(a, t) { a.tone(900, t, 0.03, 'sine', 0.025); },
    back(a, t) { a.tone(520, t, 0.07, 'square', 0.06, { to: 330 }); },
    error(a, t) { a.tone(160, t, 0.18, 'sawtooth', 0.09, { to: 110 }); a.tone(150, t + 0.08, 0.16, 'sawtooth', 0.07, { to: 100 }); },
    place(a, t) { a.tone(180, t, 0.14, 'sine', 0.25, { to: 70 }); a.tone(520, t + 0.04, 0.1, 'triangle', 0.1, { to: 780 }); a.noise(t, 0.08, 0.1, { freq: 900 }); },
    upgrade(a, t) { [60, 64, 67, 72].forEach((n, i) => a.tone(NOTE(n + 12), t + i * 0.06, 0.16, 'triangle', 0.1)); },
    sell(a, t) { a.tone(NOTE(84), t, 0.1, 'sine', 0.1); a.tone(NOTE(91), t + 0.07, 0.18, 'sine', 0.09); },
    coin(a, t) { a.tone(NOTE(88), t, 0.07, 'square', 0.04); a.tone(NOTE(95), t + 0.05, 0.12, 'square', 0.04); },
    shoot(a, t) { a.noise(t, 0.05, 0.05, { freq: 3000, to: 1200 }); },
    hit(a, t) { a.noise(t, 0.05, 0.07, { freq: 1800, to: 700 }); a.tone(220, t, 0.04, 'square', 0.03, { to: 120 }); },
    kill(a, t) { a.tone(300, t, 0.1, 'triangle', 0.06, { to: 90 }); a.noise(t, 0.08, 0.05, { freq: 1200, to: 400 }); },
    leak(a, t) { a.tone(90, t, 0.4, 'sawtooth', 0.2, { to: 40 }); a.noise(t, 0.3, 0.15, { freq: 400, type: 'lowpass' }); },
    wave(a, t) { a.tone(NOTE(57), t, 0.5, 'sawtooth', 0.09); a.tone(NOTE(64), t + 0.05, 0.5, 'sawtooth', 0.06); a.tone(NOTE(69), t + 0.2, 0.6, 'sawtooth', 0.06); },
    waveClear(a, t) { [67, 71, 74, 79].forEach((n, i) => a.tone(NOTE(n), t + i * 0.07, 0.25, 'triangle', 0.09)); },
    boss(a, t) { a.tone(55, t, 1.4, 'sawtooth', 0.22, { to: 38, attack: 0.1 }); a.tone(58, t, 1.4, 'sawtooth', 0.18, { to: 41, attack: 0.1 }); a.noise(t, 1.2, 0.1, { freq: 300, type: 'lowpass' }); },
    telegraph(a, t) { a.tone(NOTE(81), t, 0.08, 'square', 0.05); a.tone(NOTE(81), t + 0.16, 0.08, 'square', 0.05); },
    bossHit(a, t) { a.noise(t, 0.3, 0.2, { freq: 600, to: 120, type: 'lowpass' }); a.tone(70, t, 0.3, 'sine', 0.3, { to: 35 }); },
    domain(a, t) { a.tone(80, t, 1.2, 'sawtooth', 0.14, { to: 640, attack: 0.1 }); a.noise(t, 1.1, 0.12, { freq: 200, to: 5000, q: 0.6 }); a.tone(NOTE(48), t + 0.9, 1.4, 'sine', 0.3, { to: NOTE(36) }); },
    domainEnd(a, t) { a.tone(640, t, 0.6, 'sawtooth', 0.08, { to: 90 }); },
    summonCharge(a, t) { a.tone(200, t, 1.6, 'sawtooth', 0.07, { to: 1200, attack: 0.5 }); a.noise(t, 1.6, 0.06, { freq: 400, to: 6000, q: 0.5 }); },
    reveal(a, t, tier) {
      const idx = { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3, MYTHIC: 4, JOAN: 5 }[tier] || 0;
      const base = 60 + idx * 2;
      for (let i = 0; i <= idx + 1; i++) a.tone(NOTE(base + [0, 4, 7, 12, 16, 19][i]), t + i * 0.09, 0.4 + idx * 0.15, 'triangle', 0.08 + idx * 0.015);
      if (idx >= 3) { a.noise(t, 0.8, 0.12, { freq: 3000, to: 9000, q: 0.5 }); a.tone(NOTE(36), t, 1.2, 'sine', 0.3); }
    },
    // JOAN pull: a rising rainbow arpeggio over a sub-bass hit, then a shimmering chord.
    joan(a, t) {
      a.tone(NOTE(28), t, 2.4, 'sine', 0.35, { to: NOTE(24) }); a.noise(t, 1.6, 0.14, { freq: 500, to: 12000, q: 0.5 });
      [60, 64, 67, 72, 76, 79, 84, 88, 91, 96].forEach((n, i) => a.tone(NOTE(n), t + 0.1 + i * 0.07, 0.5, 'triangle', 0.09));
      [72, 76, 79, 84, 88].forEach((n) => { a.tone(NOTE(n), t + 0.9, 1.8, 'sine', 0.07); a.tone(NOTE(n + 12), t + 0.9, 1.8, 'triangle', 0.035); });
    },
    victory(a, t) { [67, 72, 76, 79, 84].forEach((n, i) => { a.tone(NOTE(n), t + i * 0.13, 0.5, 'triangle', 0.1); a.tone(NOTE(n - 12), t + i * 0.13, 0.5, 'sawtooth', 0.04); }); },
    defeat(a, t) { [64, 62, 59, 55].forEach((n, i) => a.tone(NOTE(n), t + i * 0.22, 0.6, 'sawtooth', 0.07, { to: NOTE(n - 1) })); },
    claim(a, t) { a.tone(NOTE(79), t, 0.09, 'square', 0.05); a.tone(NOTE(84), t + 0.07, 0.15, 'square', 0.05); a.tone(NOTE(88), t + 0.14, 0.2, 'triangle', 0.06); },
    buy(a, t) { a.tone(NOTE(76), t, 0.08, 'square', 0.05); a.tone(NOTE(83), t + 0.06, 0.16, 'triangle', 0.07); },
    tick(a, t) { a.tone(1200, t, 0.02, 'square', 0.03); },
  };

  JJK.Audio = A;
})(typeof window !== 'undefined' ? window : globalThis);
