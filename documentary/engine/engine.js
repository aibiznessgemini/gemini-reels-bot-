// engine.js — one-board documentary engine.
// The whole film is ONE big board (world). Objects (papers, photos, maps, labels) live on it at world
// coordinates, drop onto it at the word they belong to, and ONE continuous camera glides between them.
// Every frame: board + non-focus objects (blurred, dimmed)  →  focus objects (sharp)  →  word-synced fx
// → motion blur (from camera speed) → tilt-shift edges → glow → grain → vignette.
export const W = 1920, H = 1080, FPS = 30;

// ---------- small math ----------
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };
export const smoother = u => { u = clamp(u); return u * u * u * (u * (u * 6 - 15) + 10); };
export const easeOut = u => 1 - Math.pow(1 - clamp(u), 3);
export const easeOutBack = (u, k = 1.6) => { u = clamp(u) - 1; return 1 + (k + 1) * u * u * u + k * u * u; };
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
export { canvas as makeCanvas };

// ---------- timeline (exact narration timings) ----------
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
export function makeTimeline(tm) {
  const T = { duration: tm.duration, lines: tm.lines, errors: [] };
  T.line = i => tm.lines[i];
  T.word = (i, w, nth = 1) => {
    const L = tm.lines[i]; if (!L) { T.errors.push(`line ${i} missing`); return 0; }
    const key = norm(w); let n = 0;
    for (const x of L.words) if (norm(x.w).startsWith(key) && ++n === nth) return x.start;
    T.errors.push(`word "${w}" (#${nth}) not found in line ${i}: ${L.text}`); return L.start;
  };
  T.wordEnd = (i, w, nth = 1) => { const L = tm.lines[i]; const key = norm(w); let n = 0; for (const x of L.words) if (norm(x.w).startsWith(key) && ++n === nth) return x.end; return L.end; };
  return T;
}

// ---------- state ----------
const S = { objs: new Map(), list: [], beats: [], cues: [], keys: [], shakes: [], T: null, board: null, frames: 0 };
export const state = S;
const SPR = 2.3;                  // sprite pixels per world unit (max camera zoom ≈ 2.2 stays crisp)

// ---------- film definition API ----------
// obj({ id, x, y, w, h, rot, z, parent, shadow:'paper'|'cutout'|'none', draw(g,o), live(g,o,t,A), appear:{line,word,nth,delay,at,style} })
export function obj(spec) {
  const o = Object.assign({ rot: 0, z: 0, shadow: 'paper', fx: [], pad: 24, alpha: 1 }, spec);
  o.cx = o.x + o.w / 2; o.cy = o.y + o.h / 2; o.seed = hash(o.id);
  if (S.objs.has(o.id)) throw new Error('duplicate object ' + o.id);
  S.objs.set(o.id, o); S.list.push(o); return o;
}
// beat({ line, focus:[ids], cam:{zoom, fill, dx, dy, rot, rect:[x,y,w,h]}, wide, blur, tilt, fx:[...], note })
export function beat(spec) { S.beats.push(Object.assign({ focus: [], fx: [], blur: 1, tilt: 0.35 }, spec)); }
export const cue = (t, name, gain = 0, extra = {}) => S.cues.push({ t: +t.toFixed(3), name, gain, ...extra });

// ---------- build ----------
export async function build(T, film, photos = {}) {
  S.T = T;
  const photo = name => { if (!photos[name]) T.errors.push(`photo missing: ${name}`); return photos[name] || null; };
  film({ obj, beat, T, cue, photo });
  // resolve appear times
  for (const o of S.list) {
    const a = o.appear;
    if (!a) { o.t0 = -1; continue; }
    o.t0 = (a.at != null ? a.at : a.word ? T.word(a.line, a.word, a.nth || 1) : T.line(a.line).start) + (a.delay || 0);
    o.style = a.style || 'drop';
    const r = rng(o.seed); o.dropRot = (r() - 0.5) * 14; o.dropDx = (r() - 0.5) * 60;
    if (o.style === 'drop') cue(o.t0 + 0.42, 'paper', a.gain ?? -4, { seed: o.seed % 97 });
    if (o.style === 'slide') cue(o.t0 + 0.05, 'slide', -6, { seed: o.seed % 97 });
  }
  // parents / z order
  for (const o of S.list) if (o.parent) { const p = S.objs.get(o.parent); if (!p) throw new Error('no parent ' + o.parent); o.z = p.z + 0.001 * (1 + S.list.indexOf(o) % 900); }
  S.list.sort((a, b) => a.z - b.z || S.list.indexOf(a) - S.list.indexOf(b));
  // sprites
  for (const o of S.list) makeSprite(o);
  // fx attached to objects
  for (const b of S.beats) {
    for (const f of b.fx) {
      const on = S.objs.get(f.on || b.focus[0]); if (!on) { T.errors.push(`fx target missing: ${f.on}`); continue; }
      f.t0 = (f.at != null ? f.at : f.word ? T.word(b.line, f.word, f.nth || 1) : T.line(b.line).start) + (f.delay || 0);
      f.seed = hash(JSON.stringify([b.line, f.type, f.text || '', f.x || 0, f.rect || 0]));
      on.fx.push(f); fxCue(f);
    }
  }
  S.board = makeBoard();
  planCamera(T);
}

function makeSprite(o) {
  const s = Math.min(SPR, 4000 / (Math.max(o.w, o.h) + 2 * o.pad));
  const c = canvas((o.w + 2 * o.pad) * s, (o.h + 2 * o.pad) * s), g = c.getContext('2d');
  g.scale(s, s); g.translate(o.pad, o.pad);
  if (o.draw) o.draw(g, o.w, o.h, o);
  o.sprite = c; o.sScale = s;
  if (o.shadow !== 'none') {
    const k = 0.18, bl = o.shadow === 'cutout' ? 5 : 7;
    const sc = canvas(c.width * k + 40, c.height * k + 40), sg = sc.getContext('2d');
    sg.filter = `brightness(0) blur(${bl}px)`; sg.drawImage(c, 20, 20, c.width * k, c.height * k);
    o.shadowC = sc; o.shK = k;
  }
}

// ---------- board (the table everything sits on) ----------
function makeBoard() {
  const N = 1024, c = canvas(N, N), g = c.getContext('2d'), r = rng(7);
  g.fillStyle = '#d6cab0'; g.fillRect(0, 0, N, N);
  // soft mottling (tileable: draw each blob 9 times wrapped)
  for (let i = 0; i < 140; i++) {
    const x = r() * N, y = r() * N, rad = 40 + r() * 220, dark = r() < 0.55;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, dark ? `rgba(120,95,60,${0.05 + r() * 0.05})` : `rgba(250,244,226,${0.05 + r() * 0.06})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  // fibres
  g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) { const x = r() * N, y = r() * N, a = r() * 6.28, l = 3 + r() * 14; g.strokeStyle = r() < 0.5 ? `rgba(90,70,40,${0.06 + r() * 0.08})` : `rgba(255,252,240,${0.08 + r() * 0.1})`; g.lineWidth = 0.6 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  // pixel noise
  const id = g.getImageData(0, 0, N, N), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9; }
  g.putImageData(id, 0, 0);
  // specks
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(60,45,25,${0.15 + r() * 0.4})`; g.beginPath(); g.arc(r() * N, r() * N, 0.6 + r() * 1.8, 0, 6.28); g.fill(); }
  // large-scale stains in world space (drawn per frame, culled)
  const stains = []; const r2 = rng(11);
  for (let i = 0; i < 160; i++) stains.push({ x: -2000 + r2() * 14000, y: -2000 + r2() * 11000, r: 300 + r2() * 1400, a: 0.04 + r2() * 0.08, dark: r2() < 0.6 });
  return { tile: c, stains };
}

// ---------- camera ----------
function frameOf(b) {
  const ids = b.wide ? S.list.filter(o => !o.parent).map(o => o.id) : b.focus;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const id of ids) { const o = S.objs.get(id); if (!o) continue; x0 = Math.min(x0, o.x); y0 = Math.min(y0, o.y); x1 = Math.max(x1, o.x + o.w); y1 = Math.max(y1, o.y + o.h); }
  const c = b.cam || {};
  if (c.rect) [x0, y0, x1, y1] = [c.rect[0], c.rect[1], c.rect[0] + c.rect[2], c.rect[1] + c.rect[3]];
  const fill = c.fill || (b.wide ? 0.92 : 0.8);
  let z = c.zoom || Math.min(W * fill / (x1 - x0), H * fill / (y1 - y0));
  if (c.zoomMul) z *= c.zoomMul;
  return { x: (x0 + x1) / 2 + (c.dx || 0), y: (y0 + y1) / 2 + (c.dy || 0), z, r: (c.rot || 0) * Math.PI / 180 };
}
function planCamera(T) {
  const B = S.beats.sort((a, b) => a.line - b.line), K = [];
  const F = B.map(frameOf);
  B.forEach((b, k) => {
    const L = T.line(b.line), prev = F[k - 1], f = F[k], next = F[k + 1];
    const far = prev ? Math.hypot(f.x - prev.x, f.y - prev.y) * Math.min(f.z, prev.z) / W + Math.abs(Math.log(f.z / prev.z)) * 0.6 : 0;
    const minArr = k === 0 ? 0 : B[k - 1].depart + (far > 2 ? 1.9 : far > 0.9 ? 1.5 : far > 0.35 ? 1.05 : 0.8);
    const arrive = k === 0 ? 0 : Math.max(minArr, L.start + (far > 2 ? 0.9 : far > 0.9 ? 0.75 : far > 0.35 ? 0.55 : 0.4));
    const nextL = B[k + 1] ? T.line(B[k + 1].line) : null;
    const farN = next ? Math.hypot(next.x - f.x, next.y - f.y) * Math.min(f.z, next.z) / W + Math.abs(Math.log(next.z / f.z)) * 0.6 : 0;
    const depart = nextL ? Math.max(arrive + 0.6, L.end - (farN > 2 ? 0.75 : farN > 0.9 ? 0.55 : farN > 0.35 ? 0.35 : 0.15) + (b.linger || 0)) : T.duration;
    b.arrive = arrive; b.depart = depart; b.far = far; if (prev) b.moveFrom = B[k - 1].depart;
    // mid pull-back for long moves (the camera rises, then dives to the next object)
    if (prev && far > 0.55) {
      const t0 = B[k - 1].depart, tm = t0 + (arrive - t0) * 0.48;
      const zm = Math.min(f.z, prev.z) / (1 + 0.55 * Math.min(far, 3));
      K.push({ t: tm, x: (prev.x + f.x) / 2, y: (prev.y + f.y) / 2, z: zm, r: (prev.r + f.r) / 2 });
      if (far > 0.9) cue(t0 + (arrive - t0) * 0.25, 'whoosh', -15, { dur: Math.min(1.6, arrive - t0) });
    }
    if (k === 0) K.push({ t: 0, x: f.x, y: f.y, z: f.z * 1.12, r: f.r });
    else K.push({ t: arrive, ...f });
    // slow drift during the hold: gentle push-in + lean toward where we go next
    const hold = depart - arrive, dir = next ? [next.x - f.x, next.y - f.y] : [0, 0], dl = Math.hypot(...dir) || 1;
    const lean = next ? Math.min(0.035 * dl, 26 / f.z) * hold / 4 : 0;
    const push = b.push ?? 0.045;
    K.push({ t: depart, x: f.x + dir[0] / dl * lean, y: f.y + dir[1] / dl * lean, z: f.z * (1 + push * Math.min(hold, 6) / 4), r: f.r + (b.cam?.rotDrift || 0) * Math.PI / 180 });
    // focus switch moment (midpoint of the incoming move)
    b.switch = k === 0 ? -1 : (B[k - 1].depart + arrive) / 2;
  });
  K.sort((a, b) => a.t - b.t);
  // remove near-duplicate times
  S.keys = K.filter((k, i) => i === 0 || k.t - K[i - 1].t > 0.05);
  S.keys.forEach(k => k.lz = Math.log(k.z));
  S.tan = {};
  for (const c of ['x', 'y', 'lz', 'r']) S.tan[c] = monotoneTangents(S.keys.map(k => k.t), S.keys.map(k => k[c]));
}
function monotoneTangents(xs, ys) {
  const n = xs.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  m[0] = d[0] || 0; m[n - 1] = d[n - 2] || 0;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const tt = 3 / Math.sqrt(s); m[i] = tt * a * d[i]; m[i + 1] = tt * b * d[i]; }
  }
  return m;
}
function interp(c, t) {
  const K = S.keys, m = S.tan[c];
  if (t <= K[0].t) return K[0][c];
  if (t >= K[K.length - 1].t) return K[K.length - 1][c];
  let i = 0; while (K[i + 1].t < t) i++;
  const h = K[i + 1].t - K[i].t, u = (t - K[i].t) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * K[i][c] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * K[i + 1][c] + (u3 - u2) * h * m[i + 1];
}
export function camAt(t, handheld = true) {
  const c = { x: interp('x', t), y: interp('y', t), z: Math.exp(interp('lz', t)), r: interp('r', t) };
  if (handheld) {
    const hx = Math.sin(t * 0.83 + 1.3) * 0.55 + Math.sin(t * 1.91 + 0.4) * 0.3 + Math.sin(t * 0.31 + 2.2) * 0.8;
    const hy = Math.sin(t * 0.71 + 0.2) * 0.5 + Math.sin(t * 1.63 + 2.9) * 0.3 + Math.sin(t * 0.27 + 4.1) * 0.8;
    c.x += hx * 2.4 / c.z; c.y += hy * 2.0 / c.z; c.r += (Math.sin(t * 0.47 + 0.7) * 0.06 + Math.sin(t * 1.13) * 0.025) * Math.PI / 180;
    for (const s of S.shakes) { const dt = t - s.t; if (dt < 0 || dt > 0.45) continue; const a = s.a * Math.exp(-dt / 0.09); c.x += Math.sin(dt * 90 + s.t) * a / c.z; c.y += Math.cos(dt * 77 + s.t * 3) * a / c.z; }
  }
  return c;
}
export const shake = (t, a = 7) => S.shakes.push({ t, a });

// focus weight of an object at time t (0 = background, 1 = in focus)
function focusW(o, t) {
  const id = o.parent && !S.beats.some(b => b.focus.includes(o.id)) ? o.parent : o.id;
  let w = 0; const B = S.beats;
  for (let k = 0; k < B.length; k++) {
    if (!B[k].focus.includes(id) || (k > 0 && B[k - 1].focus.includes(id))) continue;
    let j = k; while (B[j + 1] && B[j + 1].focus.includes(id)) j++;   // merge consecutive beats
    const a = B[k].switch, e = B[j + 1] ? B[j + 1].switch : 1e9;
    w = Math.max(w, smooth((t - a + 0.3) / 0.6) * (1 - smooth((t - e + 0.3) / 0.6)));
  }
  return w;
}
function beatParam(t, key, def) {
  const B = S.beats; let v = B[0][key] ?? def;
  for (let k = 1; k < B.length; k++) { const u = smooth((t - B[k].switch + 0.4) / 0.8); if (u <= 0) break; v = lerp(v, B[k].wide ? 0 : (B[k][key] ?? def), u); }
  return v;
}

// 0..1: how much we are in the middle of a long camera move (DOF opens up while travelling)
function moving(t) {
  let m = 0;
  for (const b of S.beats) { if (b.moveFrom == null || b.far < 0.55) continue; const u = (t - b.moveFrom) / (b.arrive - b.moveFrom); if (u > 0 && u < 1) m = Math.max(m, Math.sin(Math.PI * u) ** 2 * clamp(b.far / 1.2)); }
  return m;
}

// ---------- object pose (drop-in physics) ----------
function pose(o, t) {
  if (o.t0 < 0 || o.style === 'none') return t >= o.t0 ? { dx: 0, dy: 0, sc: 1, rot: 0, a: 1, lift: 0 } : null;
  const p = (t - o.t0) / (o.style === 'drop' ? 0.62 : 0.5);
  if (p < 0) return null;
  if (p >= 1) return { dx: 0, dy: 0, sc: 1, rot: 0, a: 1, lift: 0 };
  if (o.style === 'drop') {
    const e = easeOut(p), up = 1 - e, settle = Math.sin(clamp((p - 0.62) / 0.38) * Math.PI) * 0.012;
    return { dx: up * o.dropDx, dy: -up * Math.min(160, o.h * 0.22), sc: 1 + up * 0.32 - settle, rot: up * o.dropRot * Math.PI / 180, a: clamp(p * 6), lift: up };
  }
  if (o.style === 'slide') { const e = easeOut(p); return { dx: (1 - e) * -o.w * 0.5, dy: 0, sc: 1, rot: (1 - e) * 0.06, a: clamp(p * 4), lift: (1 - e) * 0.3 }; }
  if (o.style === 'pop') { const e = easeOutBack(p, 1.4); return { dx: 0, dy: 0, sc: 0.75 + 0.25 * e, rot: 0, a: clamp(p * 4), lift: 0 }; }
  return { dx: 0, dy: 0, sc: 1, rot: 0, a: smooth(p), lift: 0 }; // fade
}

function drawObj(g, o, t, alpha, frontLift) {
  const P = pose(o, t); if (!P || alpha <= 0.002) return;
  const s = o.sScale, sw = o.sprite.width / s, sh = o.sprite.height / s;
  g.save(); g.translate(o.cx + P.dx, o.cy + P.dy);
  if (o.shadowC) {
    const lift = P.lift + frontLift * 0.35, k = o.shK;
    const off = (o.shadow === 'cutout' ? 6 : 10) + lift * 55;
    g.save(); g.translate(off * 0.55, off); g.rotate(o.rot + P.rot); g.scale(P.sc * (1 + lift * 0.06), P.sc * (1 + lift * 0.06));
    g.globalAlpha = alpha * P.a * (o.shadow === 'cutout' ? 0.55 : 0.5) * (1 - lift * 0.35);
    const w2 = o.shadowC.width / (s * k), h2 = o.shadowC.height / (s * k);
    g.drawImage(o.shadowC, -w2 / 2, -h2 / 2, w2, h2); g.restore();
  }
  g.rotate(o.rot + P.rot); g.scale(P.sc, P.sc);
  g.globalAlpha = alpha * P.a * o.alpha;
  g.drawImage(o.sprite, -sw / 2, -sh / 2, sw, sh);
  g.translate(-o.w / 2, -o.h / 2);
  const A = alpha * P.a * o.alpha;
  if (o.live) { g.save(); o.live(g, o, t, A); g.restore(); }
  for (const f of o.fx) if (t >= f.t0 && (f.until == null || t < f.until)) { g.save(); g.globalAlpha = A; FX[f.type](g, f, t - f.t0, A); g.restore(); }
  g.restore();
}

// ---------- word-synced effects ----------
const RED = '#d42a1f', YEL = 'rgba(255,214,0,0.92)';
export const COLORS = { RED, YEL, INK: '#17140f', CREAM: '#efe6d2' };
function fxCue(f) {
  const m = { circle: ['marker', -9], underline: ['marker', -11], route: ['pencil', -12], xmark: ['marker', -10], stamp: ['stamp', -3], highlight: ['highlight', -12], tag: ['pop', -14], label: ['pop', -14], write: ['marker', -10], dims: ['pencil', -13], check: ['marker', -10] }[f.type];
  if (!m) return;
  const t = f.type === 'stamp' ? f.t0 + 0.11 : f.t0;
  cue(t, m[0], f.gain ?? m[1], { dur: f.dur || (f.type === 'route' ? 1.2 : 0.5), seed: f.seed % 89 });
  if (f.type === 'stamp') shake(f.t0 + 0.11, f.shake ?? 6);
}
function wobblyEllipse(f, n = 90) {
  const r = rng(f.seed), ph = r() * 6.28, a0 = -2.2 + r() * 0.6, turns = 1.12, pts = [];
  const [x, y, w, h] = f.rect, cx = x + w / 2, cy = y + h / 2;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = a0 + u * turns * Math.PI * 2, k = 1 + 0.035 * Math.sin(a * 3 + ph) + 0.05 * u;
    pts.push([cx + Math.cos(a) * w / 2 * k, cy + Math.sin(a) * h / 2 * k * (1 - 0.04 * u)]);
  }
  return pts;
}
function strokePartial(g, pts, p) {
  const n = Math.max(1, Math.floor((pts.length - 1) * p)); if (p <= 0) return;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= n; i++) g.lineTo(pts[i][0], pts[i][1]);
  const fr = (pts.length - 1) * p - n; if (n < pts.length - 1 && fr > 0) g.lineTo(lerp(pts[n][0], pts[n + 1][0], fr), lerp(pts[n][1], pts[n + 1][1], fr));
  g.stroke();
}
function markerStyle(g, f, w) { g.strokeStyle = f.color || RED; g.lineWidth = f.width || w; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = 'rgba(120,0,0,0.25)'; g.shadowBlur = 2; }
const stampCache = new Map();
function stampSprite(f) {
  const key = f.text + (f.color || '') + (f.size || 0) + (f.round ? 'r' : '');
  if (stampCache.has(key)) return stampCache.get(key);
  const size = f.size || 90, g0 = canvas(10, 10).getContext('2d');
  g0.font = `${size}px Anton`; const tw = g0.measureText(f.text).width;
  const pad = size * 0.35, w = f.round ? size * 3.2 : tw + pad * 2, h = f.round ? size * 3.2 : size * 1.5;
  const s = 2, c = canvas(w * s + 8, h * s + 8), g = c.getContext('2d'); g.scale(s, s); g.translate(2, 2);
  const col = f.color || RED; g.strokeStyle = col; g.fillStyle = col;
  if (f.round) {
    g.lineWidth = size * 0.09; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - size * 0.08, 0, 6.28); g.stroke();
    g.lineWidth = size * 0.04; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - size * 0.3, 0, 6.28); g.stroke();
    g.font = `${size * 0.8}px Anton`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f.text, w / 2, h / 2 + size * 0.04);
  } else {
    g.lineWidth = size * 0.09; g.strokeRect(size * 0.06, size * 0.06, w - size * 0.12, h - size * 0.12);
    g.font = `${size}px Anton`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f.text, w / 2, h / 2 + size * 0.05);
  }
  // ink wear
  const r = rng(hash(key)); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.beginPath(); g.arc(r() * w, r() * h, 0.4 + r() * (r() < 0.05 ? 5 : 1.6), 0, 6.28); g.fill(); }
  for (let i = 0; i < 14; i++) { g.globalAlpha = 0.25; g.lineWidth = 1 + r() * 3; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 20); g.stroke(); }
  const out = { c, w, h }; stampCache.set(key, out); return out;
}
function setFont(g, f, size) { g.font = `${f.weight || ''} ${size}px ${f.font || 'Anton'}`.trim(); }
export const FX = {
  circle(g, f, dt) { const p = smoother(dt / (f.dur || 0.55)); const pts = wobblyEllipse(f); markerStyle(g, f, f.width || 8); g.globalAlpha *= 0.95; strokePartial(g, pts, p); },
  underline(g, f, dt) {
    const p = smoother(dt / (f.dur || 0.4)), [x, y, w] = f.rect, r = rng(f.seed), pts = [];
    for (let i = 0; i <= 30; i++) pts.push([x + w * i / 30, y + Math.sin(i * 0.5 + r() * 0.5) * 2.5 + i * 0.15]);
    markerStyle(g, f, f.width || 7); strokePartial(g, pts, p);
  },
  xmark(g, f, dt) {
    const [x, y, w, h] = f.rect, d = f.dur || 0.35; markerStyle(g, f, f.width || 9);
    strokePartial(g, [[x, y], [x + w * 0.5, y + h * 0.52], [x + w, y + h]], smoother(dt / (d * 0.5)));
    if (dt > d * 0.5) strokePartial(g, [[x + w, y], [x + w * 0.48, y + h * 0.5], [x, y + h]], smoother((dt - d * 0.5) / (d * 0.5)));
  },
  check(g, f, dt) { const [x, y, w, h] = f.rect; markerStyle(g, f, f.width || 10); strokePartial(g, [[x, y + h * 0.55], [x + w * 0.35, y + h], [x + w, y]], smoother(dt / (f.dur || 0.35))); },
  highlight(g, f, dt) {
    const rects = Array.isArray(f.rect[0]) ? f.rect : [f.rect], d = f.dur || 0.45 * rects.length;
    g.globalCompositeOperation = 'multiply'; g.fillStyle = f.color || YEL;
    rects.forEach((rc, i) => {
      const p = smoother((dt - i * d / rects.length) / (d / rects.length)); if (p <= 0) return;
      const [x, y, w, h] = rc; g.beginPath(); g.moveTo(x - 4, y + 3); g.lineTo(x + w * p + 4, y); g.lineTo(x + w * p + 2, y + h); g.lineTo(x - 2, y + h + 2); g.closePath(); g.fill();
    });
  },
  stamp(g, f, dt) {
    const sp = stampSprite(f), p = clamp(dt / 0.12), sc = lerp(1.9, 1, smooth(p)) * (1 + 0.04 * Math.exp(-(dt - 0.12) * 25) * (dt > 0.12));
    g.translate(f.x, f.y); g.rotate((f.rot ?? -8) * Math.PI / 180); g.scale(sc, sc);
    g.globalAlpha *= clamp(p * 3) * (f.opacity ?? 0.88); g.globalCompositeOperation = f.blend || 'multiply';
    g.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.c.width / 2, sp.c.height / 2);
  },
  label(g, f, dt) {
    const p = clamp(dt / (f.dur || 0.35)), e = easeOutBack(p, 1.5), size = f.size || 120;
    g.translate(f.x, f.y); g.rotate((f.rot || 0) * Math.PI / 180); g.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); g.globalAlpha *= clamp(p * 3);
    setFont(g, f, size); g.textAlign = f.align || 'center'; g.textBaseline = 'middle';
    if (f.stroke) { g.lineWidth = size * 0.08; g.strokeStyle = f.stroke; g.lineJoin = 'round'; g.strokeText(f.text, 0, 0); }
    g.fillStyle = f.color || RED; g.fillText(f.text, 0, 0);
  },
  write(g, f, dt) { // handwritten marker text revealed left → right
    const size = f.size || 80; setFont(g, { font: f.font || 'Marker' }, size); g.textAlign = 'left'; g.textBaseline = 'middle';
    const tw = g.measureText(f.text).width, p = smoother(dt / (f.dur || Math.max(0.4, f.text.length * 0.06)));
    g.translate(f.x, f.y); g.rotate((f.rot || 0) * Math.PI / 180); const x0 = f.align === 'center' ? -tw / 2 : 0;
    g.beginPath(); g.rect(x0 - 10, -size, (tw + 20) * p, size * 2); g.clip();
    g.fillStyle = f.color || RED; g.fillText(f.text, x0, 0);
  },
  tag(g, f, dt) { // filled box with text (red date tag / yellow year tag)
    const size = f.size || 70, p = smoother(dt / (f.dur || 0.3)); setFont(g, f, size);
    const tw = g.measureText(f.text).width, padX = size * 0.28, w = tw + padX * 2, h = size * 1.22;
    g.translate(f.x, f.y); g.rotate((f.rot || 0) * Math.PI / 180);
    const x0 = f.align === 'left' ? 0 : -w / 2;
    g.beginPath(); g.rect(x0 - 2, -h / 2 - 2, (w + 4) * p, h + 4); g.clip();
    g.fillStyle = f.bg || YEL; g.fillRect(x0, -h / 2, w, h);
    if (f.border) { g.strokeStyle = f.border; g.lineWidth = 3; g.strokeRect(x0 + 1.5, -h / 2 + 1.5, w - 3, h - 3); }
    g.fillStyle = f.color || COLORS.INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f.text, x0 + w / 2, size * 0.06);
  },
  route(g, f, dt) {
    const pts = f.pts, d = f.dur || 1.2, p = smoother(dt / d);
    markerStyle(g, f, f.width || 7); g.setLineDash(f.dash || [18, 14]); g.lineDashOffset = 0; strokePartial(g, pts, p); g.setLineDash([]);
    if (p >= 1 && f.arrow !== false) {
      const a = pts[pts.length - 1], b = pts[pts.length - 2], ang = Math.atan2(a[1] - b[1], a[0] - b[0]), s = (f.width || 7) * 3.2, q = clamp((dt - d) / 0.15);
      g.globalAlpha *= q; g.beginPath(); g.moveTo(a[0] + Math.cos(ang) * s * 0.4, a[1] + Math.sin(ang) * s * 0.4); g.lineTo(a[0] + Math.cos(ang + 2.5) * s, a[1] + Math.sin(ang + 2.5) * s); g.moveTo(a[0] + Math.cos(ang) * s * 0.4, a[1] + Math.sin(ang) * s * 0.4); g.lineTo(a[0] + Math.cos(ang - 2.5) * s, a[1] + Math.sin(ang - 2.5) * s); g.stroke();
    }
  },
  dims(g, f, dt) { // blueprint-style dimension line with label
    const [x1, y1, x2, y2] = f.line, p = smoother(dt / (f.dur || 0.5)); const col = f.color || RED;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = f.width || 4; g.lineCap = 'round';
    const xe = lerp(x1, x2, p), ye = lerp(y1, y2, p), ang = Math.atan2(y2 - y1, x2 - x1), s = 18;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(xe, ye); g.stroke();
    const tick = (x, y) => { g.beginPath(); g.moveTo(x + Math.cos(ang + Math.PI / 2) * s, y + Math.sin(ang + Math.PI / 2) * s); g.lineTo(x - Math.cos(ang + Math.PI / 2) * s, y - Math.sin(ang + Math.PI / 2) * s); g.stroke(); };
    tick(x1, y1); if (p >= 1) tick(x2, y2);
    if (f.text && p > 0.5) {
      const q = clamp((p - 0.5) * 3), size = f.size || 64; g.globalAlpha *= q; g.font = `${size}px ${f.font || 'Anton'}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const mx = (x1 + x2) / 2 + (f.off ? f.off[0] : 0), my = (y1 + y2) / 2 + (f.off ? f.off[1] : 0), tw = g.measureText(f.text).width;
      if (f.bg !== false) { g.fillStyle = f.bg || COLORS.CREAM; g.fillRect(mx - tw / 2 - 14, my - size * 0.62, tw + 28, size * 1.2); }
      g.fillStyle = col; g.fillText(f.text, mx, my + size * 0.04);
    }
  },
  custom(g, f, dt, A) { f.draw(g, dt, A); },
};

// ---------- frame rendering ----------
let C = null;
export function init(outCanvas) {
  const mk = () => { const c = canvas(W, H); return [c, c.getContext('2d')]; };
  const [B, bg] = mk(), [M, mg] = mk(), [Tm, tg] = mk(); const small = canvas(W / 4, H / 4), sg = small.getContext('2d');
  const small2 = canvas(W / 4, H / 4), s2g = small2.getContext('2d');
  // grain plates
  const grain = []; for (let k = 0; k < 8; k++) { const c = canvas(W / 2, H / 2), g = c.getContext('2d'), id = g.createImageData(c.width, c.height), r = rng(100 + k); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); grain.push(c); }
  // vignette
  const vig = canvas(W, H), vg = vig.getContext('2d'); const gr = vg.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.02);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(10,6,2,0.28)'); gr.addColorStop(1, 'rgba(8,4,0,0.78)'); vg.fillStyle = gr; vg.fillRect(0, 0, W, H);
  // tilt-shift mask (top/bottom)
  const mask = canvas(W, H), mk2 = mask.getContext('2d'); const lg = mk2.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(0.24, 'rgba(0,0,0,0)'); lg.addColorStop(0.76, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,1)'); mk2.fillStyle = lg; mk2.fillRect(0, 0, W, H);
  C = { out: outCanvas, og: outCanvas.getContext('2d'), B, bg, M, mg, Tm, tg, small, sg, small2, s2g, grain, vig, mask };
  for (const g of [bg, mg, tg, C.og]) { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; }
}
function applyCam(g, c) { g.setTransform(1, 0, 0, 1, 0, 0); g.translate(W / 2, H / 2); g.rotate(c.r); g.scale(c.z, c.z); g.translate(-c.x, -c.y); }
function drawBoard(g, c) {
  const R = Math.hypot(W, H) / 2 / c.z + 50;
  const pat = g.createPattern(S.board.tile, 'repeat');
  g.fillStyle = pat; g.fillRect(c.x - R, c.y - R, 2 * R, 2 * R);
  for (const s of S.board.stains) {
    if (Math.abs(s.x - c.x) > R + s.r || Math.abs(s.y - c.y) > R + s.r) continue;
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    gr.addColorStop(0, s.dark ? `rgba(110,80,45,${s.a})` : `rgba(255,250,235,${s.a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(s.x - s.r, s.y - s.r, 2 * s.r, 2 * s.r);
  }
}
function visible(o, c) { const R = Math.hypot(W, H) / 2 / c.z + 300; return !(o.x > c.x + R || o.x + o.w < c.x - R || o.y > c.y + R || o.y + o.h < c.y - R); }

export function render(t) {
  const c = camAt(t), { bg, mg, og, B, M, small, sg } = C;
  const mv = moving(t), blurAmt = beatParam(t, 'blur', 1) * (1 - 0.7 * mv), tilt = beatParam(t, 'tilt', 0.35) * (1 - 0.5 * mv);
  const fw = new Map(); for (const o of S.list) fw.set(o, focusW(o, t));
  // 1) back layer: board + everything not in focus
  bg.setTransform(1, 0, 0, 1, 0, 0); applyCam(bg, c); drawBoard(bg, c);
  for (const o of S.list) { if (!visible(o, c)) continue; const w = fw.get(o), a = 1 - smooth((w - 0.5) / 0.5); if (a > 0) drawObj(bg, o, t, a, 0); }
  // 2) main: back layer, defocused + dimmed
  mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalAlpha = 1; mg.globalCompositeOperation = 'source-over'; mg.filter = 'none';
  mg.drawImage(B, 0, 0);
  if (blurAmt > 0.01) {
    sg.filter = 'blur(2.2px)'; sg.drawImage(B, 0, 0, W / 4, H / 4); sg.filter = 'none';
    mg.globalAlpha = clamp(blurAmt); mg.drawImage(small, 0, 0, W, H); mg.globalAlpha = 1;
    mg.fillStyle = `rgba(28,20,12,${0.2 * blurAmt})`; mg.fillRect(0, 0, W, H);
  }
  // 3) focus objects, sharp, lifted
  applyCam(mg, c);
  for (const o of S.list) { const w = fw.get(o); if (w <= 0 || !visible(o, c)) continue; drawObj(mg, o, t, smooth(w / 0.5), w); }
  mg.setTransform(1, 0, 0, 1, 0, 0);
  // 4) motion blur from camera speed (shutter ≈ 0.5 frame)
  const dt = 0.5 / FPS, c0 = camAt(t - dt, false), c1 = camAt(t + dt * 0.0001, false);
  const vx = (c1.x - c0.x) * c.z, vy = (c1.y - c0.y) * c.z; let vz = Math.log(c1.z / c0.z);
  const cr = Math.cos(c.r), sr = Math.sin(c.r); let sx = vx * cr - vy * sr, sy = vx * sr + vy * cr;
  let blurPx = Math.hypot(sx, sy) + Math.abs(vz) * W * 0.5;
  const CAP = 46; if (blurPx > CAP) { const k = CAP / blurPx; sx *= k; sy *= k; vz *= k; blurPx = CAP; }
  og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-over'; og.filter = 'none'; og.globalAlpha = 1;
  if (blurPx > 1.5) {
    const n = Math.min(7, 2 + Math.floor(blurPx / 6));
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5, k = Math.exp(-vz * u);
      og.globalAlpha = 1 / (i + 1);
      og.setTransform(k, 0, 0, k, W / 2 * (1 - k) + sx * u, H / 2 * (1 - k) + sy * u); og.drawImage(M, 0, 0);
    }
    og.setTransform(1, 0, 0, 1, 0, 0); og.globalAlpha = 1;
  } else og.drawImage(M, 0, 0);
  // 5) tilt-shift: blur top & bottom bands
  if (tilt > 0.01) {
    const { Tm, tg, small2, s2g, mask } = C;
    s2g.filter = 'blur(2.5px)'; s2g.drawImage(C.out, 0, 0, W / 4, H / 4); s2g.filter = 'none';
    tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(small2, 0, 0, W, H);
    tg.globalCompositeOperation = 'destination-in'; tg.drawImage(mask, 0, 0); tg.globalCompositeOperation = 'source-over';
    og.globalAlpha = clamp(tilt); og.drawImage(Tm, 0, 0); og.globalAlpha = 1;
  }
  // 6) soft glow
  const s2 = C.s2g; s2.filter = 'blur(3px)'; s2.drawImage(C.out, 0, 0, W / 4, H / 4); s2.filter = 'none';
  og.globalCompositeOperation = 'screen'; og.globalAlpha = 0.16; og.drawImage(C.small2, 0, 0, W, H);
  // 7) grain + vignette + gentle warm grade
  const fi = Math.round(t * FPS);
  og.globalCompositeOperation = 'overlay'; og.globalAlpha = 0.09; const gp = C.grain[fi % 8], ox = (fi * 37) % 64, oy = (fi * 53) % 64;
  og.drawImage(gp, -ox, -oy, W + 64, H + 64);
  og.globalCompositeOperation = 'multiply'; og.globalAlpha = 1; og.drawImage(C.vig, 0, 0);
  og.globalCompositeOperation = 'soft-light'; og.globalAlpha = 0.18; og.fillStyle = '#ffb070'; og.fillRect(0, 0, W, H);
  og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1;
  // fade in / out
  const fin = clamp(t / 0.6), fout = clamp((S.T.duration - t) / 0.9), f = Math.min(fin, fout);
  if (f < 1) { og.fillStyle = `rgba(0,0,0,${1 - smooth(f)})`; og.fillRect(0, 0, W, H); }
}

// beat table (for the project folder): time → narration → one main object → on-screen text
export function beatTable() {
  return S.beats.map(b => {
    const L = S.T.line(b.line);
    const texts = b.fx.filter(f => f.text).map(f => `${f.text}${f.word ? ` (@"${f.word}")` : ''}`);
    return { line: b.line, start: L.start, end: L.end, text: L.text, focus: b.wide ? ['(wide: whole board)'] : b.focus, onscreen: [...(b.onscreen || []), ...texts], fx: b.fx.map(f => `${f.type}${f.word ? '@' + f.word : ''}`), note: b.note || '' };
  });
}
