/* Shared utilities: math helpers, seeded RNG, event emitter, formatting, time helpers. */
(function (G) {
  'use strict';
  const JJK = (G.JJK = G.JJK || {});
  const Util = {};

  Util.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  Util.lerp = (a, b, t) => a + (b - a) * t;
  Util.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  Util.dist2 = (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  Util.isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  Util.int = (v, def = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return def;
    return Util.clamp(Math.floor(n), min, max);
  };
  Util.num = (v, def = 0, min = -Infinity, max = Infinity) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return def;
    return Util.clamp(n, min, max);
  };
  Util.isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  Util.clone = (o) => JSON.parse(JSON.stringify(o));
  Util.now = () => Date.now();
  Util.dayIndex = (ms) => Math.floor(ms / 86400000);
  Util.weekIndex = (ms) => Math.floor((ms / 86400000 + 4) / 7); // weeks start Monday (epoch was Thursday)


  Util.hashString = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };

  /** Deterministic mulberry32 PRNG. */
  Util.makeRng = function (seed) {
    let s = seed >>> 0;
    const r = {
      next() {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range(a, b) { return a + (b - a) * r.next(); },
      int(a, b) { return Math.floor(a + (b - a + 1) * r.next()); },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      chance(p) { return r.next() < p; },
      getState() { return s; },
      setState(v) { s = v >>> 0; },
    };
    return r;
  };

  /** Weighted pick: items = [{w:number, ...}] returns the chosen item. */
  Util.weighted = function (rng, items) {
    let total = 0;
    for (const it of items) total += it.w;
    if (total <= 0) return items[0];
    let x = rng.next() * total;
    for (const it of items) {
      x -= it.w;
      if (x < 0) return it;
    }
    return items[items.length - 1];
  };

  Util.fmt = function (n) {
    n = Math.floor(n);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };
  Util.fmtComma = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  Util.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  };

  /** Minimal safe event emitter. */
  class Emitter {
    constructor() { this._h = new Map(); }
    on(evt, fn) {
      let a = this._h.get(evt);
      if (!a) { a = []; this._h.set(evt, a); }
      a.push(fn);
      return () => this.off(evt, fn);
    }
    off(evt, fn) {
      const a = this._h.get(evt);
      if (!a) return;
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    }
    emit(evt, data) {
      const a = this._h.get(evt);
      if (!a || a.length === 0) return;
      const list = a.length === 1 ? a : a.slice();
      for (let i = 0; i < list.length; i++) {
        try { list[i](data); } catch (err) { if (G.console) console.error('[event ' + evt + ']', err); }
      }
    }
    clear() { this._h.clear(); }
  }
  Util.Emitter = Emitter;

  /** Simple object pool. */
  Util.Pool = class {
    constructor(factory, reset, cap) { this.f = factory; this.r = reset; this.items = []; this.cap = cap || 512; }
    get() { return this.items.length ? this.items.pop() : this.f(); }
    put(o) { if (this.items.length < this.cap) { if (this.r) this.r(o); this.items.push(o); } }
  };

  /** In-memory Storage fallback (private mode / tests). */
  Util.MemoryStorage = class {
    constructor() { this.m = new Map(); }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(k, String(v)); }
    removeItem(k) { this.m.delete(k); }
    key(i) { return Array.from(this.m.keys())[i] || null; }
    get length() { return this.m.size; }
  };

  JJK.Util = Util;
})(typeof window !== 'undefined' ? window : globalThis);
