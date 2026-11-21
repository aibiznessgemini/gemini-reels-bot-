// Music bed + SFX for a film, synthesised in code (no samples → nothing to claim).
// Reads films/<slug>/film.json (with durations filled in) and writes two stereo WAVs:
//   out/<slug>/bed.wav  – music, gets ducked under the voice by the mixer
//   out/<slug>/sfx.wav  – sound effects, never ducked
//
//   node --no-warnings pipeline/music.ts <slug>
import fs from "node:fs";
import { type FilmSpec, FPS, filmFrames, type Mood, sceneStarts } from "../src/engine/types.ts";

const slug = process.argv[2];
if (!slug) throw new Error("usage: music.ts <slug>");
const spec: FilmSpec = JSON.parse(fs.readFileSync(`films/${slug}/film.json`, "utf8"));
const SR = 44100;
const TOTAL = filmFrames(spec) / FPS + 1.5;
const LEN = Math.ceil(TOTAL * SR);

// ---------- stereo buses ----------
type Bus = { L: Float32Array; R: Float32Array; wet: Float32Array };
const bus = (): Bus => ({ L: new Float32Array(LEN), R: new Float32Array(LEN), wet: new Float32Array(LEN) });
const music = bus();
const fx = bus();
const put = (b: Bus, i: number, v: number, pan = 0, send = 0.3) => {
  if (i < 0 || i >= LEN) return;
  b.L[i] += v * Math.cos(((pan + 1) * Math.PI) / 4) * 1.414;
  b.R[i] += v * Math.sin(((pan + 1) * Math.PI) / 4) * 1.414;
  b.wet[i] += v * send;
};

let seed = 1234;
for (const c of slug) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const human = () => (rnd() - 0.5) * 0.02; // ±10 ms timing
const vel = () => 0.8 + rnd() * 0.25;

// ---------- instruments ----------
type W = "sine" | "tri" | "saw";
const osc = (w: W, p: number) => (w === "sine" ? Math.sin(2 * Math.PI * p) : w === "tri" ? 4 * Math.abs(p - Math.floor(p) - 0.5) - 1 : 2 * (p - Math.floor(p)) - 1);

const voice = (b: Bus, t: number, dur: number, f0: number, amp: number, o: { w?: W; a?: number; d?: number; r?: number; pan?: number; send?: number; to?: number; lp?: number; detune?: number } = {}) => {
  const { w = "sine", a = 0.01, d = 0, r = 0.08, pan = 0, send = 0.3, to, lp, detune = 0 } = o;
  const s = Math.floor(t * SR);
  const n = Math.floor((dur + r) * SR);
  let p1 = rnd();
  let p2 = rnd();
  let y = 0;
  const al = lp ? 1 - Math.exp((-2 * Math.PI * lp) / SR) : 1;
  for (let k = 0; k < n; k++) {
    const x = k / SR;
    const f = to ? f0 * Math.pow(to / f0, Math.min(1, x / dur)) : f0;
    p1 += (f * (1 + detune)) / SR;
    p2 += (f * (1 - detune)) / SR;
    let v = detune ? (osc(w, p1) + osc(w, p2)) * 0.5 : osc(w, p1);
    if (lp) v = y += al * (v - y);
    let env = Math.min(1, x / a);
    if (d) env *= Math.exp(-x / d);
    if (x > dur) env *= Math.max(0, 1 - (x - dur) / r);
    put(b, s + k, v * env * amp, pan, send);
  }
};

/** felt piano: soft hammer (fast decay upper partial) + body */
const piano = (t: number, n: number, amp: number, pan = 0) => {
  const f = midi(n);
  voice(music, t, 2.6, f, amp, { a: 0.004, d: 1.2, r: 0.4, pan, send: 0.45 });
  voice(music, t, 1.2, f * 2, amp * 0.18, { a: 0.003, d: 0.35, r: 0.2, pan, send: 0.45 });
  voice(music, t, 0.4, f * 3, amp * 0.06, { a: 0.002, d: 0.08, r: 0.1, pan, send: 0.3 });
};
/** warm pad: detuned saws through a low-pass, slow attack */
const pad = (t: number, dur: number, notes: number[], amp: number, lp = 900) =>
  notes.forEach((n, i) => voice(music, t, dur, midi(n), amp, { w: "saw", a: 0.9, r: 1.2, pan: (i % 2 ? 0.45 : -0.45), send: 0.7, lp, detune: 0.004 }));
const pluck = (t: number, n: number, amp: number, pan: number) => voice(music, t, 0.3, midi(n), amp, { w: "tri", a: 0.003, d: 0.18, r: 0.15, pan, send: 0.5 });
const bell = (b: Bus, t: number, n: number, amp: number, pan = 0) =>
  [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([m, a]) => voice(b, t, 2.2, midi(n) * m, amp * a, { a: 0.002, d: 0.9 / m, r: 0.3, pan, send: 0.6 }));
const sub = (t: number, dur: number, n: number, amp: number) => voice(music, t, dur, midi(n), amp, { a: 0.03, r: 0.2, send: 0 });
const kick = (t: number, amp: number) => voice(music, t, 0.32, 120, amp, { to: 42, a: 0.002, d: 0.12, r: 0.05, send: 0.05 });
const noiseHit = (b: Bus, t: number, dur: number, amp: number, o: { lp?: number; lpTo?: number; hp?: number; pan?: number; panTo?: number; send?: number; shape?: (x: number) => number } = {}) => {
  const { lp = 3000, lpTo, hp = 0, pan = 0, panTo, send = 0.2, shape } = o;
  const s = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let y = 0;
  let h = 0;
  for (let k = 0; k < n; k++) {
    const x = k / n;
    const fc = lpTo ? lp * Math.pow(lpTo / lp, x) : lp;
    y += (1 - Math.exp((-2 * Math.PI * fc) / SR)) * (noise() - y);
    let v = y;
    if (hp) {
      h += (1 - Math.exp((-2 * Math.PI * hp) / SR)) * (v - h);
      v -= h;
    }
    const env = shape ? shape(x) : Math.exp(-x * 6);
    put(b, s + k, v * env * amp, panTo !== undefined ? pan + (panTo - pan) * x : pan, send);
  }
};
const shaker = (t: number, amp: number) => noiseHit(music, t, 0.06, amp, { lp: 12000, hp: 6000, pan: 0.3, send: 0.1 });

// ---------- mood → harmony ----------
const MOODS: Record<Mood, { bpm: number; chords: number[][]; scale: number[] }> = {
  curious: { bpm: 84, chords: [[50, 57, 61, 64], [47, 54, 57, 62], [43, 50, 54, 59], [45, 52, 57, 61]], scale: [62, 64, 66, 69, 71, 73, 74] },
  tense: { bpm: 76, chords: [[50, 57, 60, 65], [46, 53, 58, 62], [48, 55, 60, 63], [45, 52, 57, 61]], scale: [62, 63, 65, 67, 69, 70, 72] },
  warm: { bpm: 78, chords: [[43, 50, 54, 59], [40, 47, 52, 55], [36, 43, 48, 52], [38, 45, 50, 54]], scale: [67, 69, 71, 74, 76, 78, 79] },
  sad: { bpm: 66, chords: [[45, 52, 55, 60], [41, 48, 52, 57], [36, 43, 48, 52], [43, 50, 55, 59]], scale: [64, 67, 69, 71, 72, 74, 76] },
  wonder: { bpm: 80, chords: [[52, 59, 63, 66], [49, 56, 59, 64], [45, 52, 57, 61], [47, 54, 59, 63]], scale: [64, 66, 68, 71, 73, 75, 76] },
};
const M = MOODS[spec.mood ?? "curious"];
const beat = 60 / M.bpm;
const bar = beat * 4;
const end = filmFrames(spec) / FPS;
const nBars = Math.ceil(end / bar);

for (let b = 0; b < nBars; b++) {
  const t0 = b * bar;
  const pos = t0 / end; // 0..1 through the film
  const ch = M.chords[b % 4];
  const intro = pos < 0.1;
  const outro = pos > 0.86;
  const peak = pos > 0.45 && pos < 0.78;
  const last = b === nBars - 1;

  pad(t0, bar, ch.slice(1), intro ? 0.012 : 0.016, 700 + 900 * Math.sin(Math.PI * pos));
  sub(t0, bar * 0.95, ch[0] - 12, intro || outro ? 0.05 : 0.08);
  piano(t0 + human(), ch[0], 0.06 * vel(), -0.2);
  if (!intro) [1, 2, 3, 2].forEach((k, i) => piano(t0 + beat * i + beat * 0.5 + human(), ch[k] + 12, 0.03 * vel(), 0.25));
  if (!intro && !outro) {
    // gentle melody: one note per beat from the scale, contour follows the bar
    for (let i = 0; i < 4; i++) if (rnd() > 0.35) piano(t0 + beat * i + human(), M.scale[(b * 3 + i * 2) % M.scale.length] + 12, 0.028 * vel(), 0.1);
  }
  if (pos > 0.18 && !outro) for (let i = 0; i < 8; i++) pluck(t0 + i * beat * 0.5 + human(), ch[(i % 3) + 1] + 24, 0.012 * vel(), i % 2 ? 0.5 : -0.5);
  if (pos > 0.25 && !outro) {
    kick(t0, 0.18);
    kick(t0 + beat * 2.5, 0.12);
    if (peak) for (let i = 0; i < 8; i++) shaker(t0 + i * beat * 0.5 + human(), i % 2 ? 0.03 : 0.018);
  }
  if (last) bell(music, t0 + beat * 2, ch[0] + 24, 0.05);
}

// ---------- SFX ----------
const starts = sceneStarts(spec).map((f) => f / FPS);
const whoosh = (t: number, amp = 0.16) => noiseHit(fx, t - 0.22, 0.45, amp, { lp: 300, lpTo: 3200, pan: -0.6, panTo: 0.6, send: 0.35, shape: (x) => Math.sin(Math.PI * x) ** 2 });
const pop = (t: number, amp = 0.14) => {
  voice(fx, t, 0.09, 380, amp, { to: 980, a: 0.002, d: 0.05, r: 0.04, send: 0.25 });
  noiseHit(fx, t, 0.015, amp * 0.6, { lp: 8000, send: 0 });
};
const chime = (t: number) => [74, 78, 81, 86].forEach((n, i) => bell(fx, t + i * 0.07, n, 0.045, -0.3 + i * 0.2));
const thud = (t: number) => {
  voice(fx, t, 0.35, 95, 0.32, { to: 38, a: 0.002, d: 0.15, send: 0.15 });
  noiseHit(fx, t, 0.12, 0.08, { lp: 600, send: 0.1 });
};
const tick = (t: number) => [0, 0.07, 0.14].forEach((o) => voice(fx, t + o, 0.02, 2400, 0.05, { a: 0.001, d: 0.01, send: 0.05 }));
const riser = (endT: number) => {
  noiseHit(fx, endT - 1.3, 1.3, 0.08, { lp: 400, lpTo: 6000, send: 0.4, shape: (x) => x * x });
  voice(fx, endT - 1.3, 1.25, 220, 0.025, { w: "saw", to: 880, a: 0.4, r: 0.05, lp: 2500, send: 0.4 });
};
const sparkle = (t: number) => {
  for (let i = 0; i < 7; i++) bell(fx, t + i * 0.05 + rnd() * 0.03, 88 + Math.floor(rnd() * 8), 0.02, rnd() * 2 - 1);
};

spec.scenes.forEach((s, i) => {
  const t = starts[i];
  const prev = spec.scenes[i - 1];
  if (i > 0 && (prev.set !== s.set || prev.shot !== s.shot)) whoosh(t, prev.set !== s.set ? 0.17 : 0.09);
  if (s.badge) pop(t + 8 / FPS);
  if (s.counter && (!prev?.counter || String(prev.counter.value) !== String(s.counter.value))) tick(t + 6 / FPS);
  for (const e of s.sfx ?? []) {
    if (e === "whoosh") whoosh(t);
    if (e === "pop") pop(t + 0.1);
    if (e === "chime") chime(t + 0.15);
    if (e === "thud") thud(t + 0.05);
    if (e === "tick") tick(t + 0.1);
    if (e === "riser") riser(t);
    if (e === "sparkle") sparkle(t + 0.1);
  }
});

// ---------- reverb + write ----------
const reverb = (b: Bus) => {
  const mk = (n: number) => ({ buf: new Float32Array(n), i: 0 });
  const cl = [1557, 1617, 1491, 1422].map(mk);
  const cr = [1580, 1640, 1514, 1445].map(mk);
  let lpL = 0;
  let lpR = 0;
  for (let k = 0; k < LEN; k++) {
    let sl = 0;
    let sr = 0;
    for (const c of cl) {
      const y = c.buf[c.i];
      c.buf[c.i] = b.wet[k] + y * 0.82;
      c.i = (c.i + 1) % c.buf.length;
      sl += y;
    }
    for (const c of cr) {
      const y = c.buf[c.i];
      c.buf[c.i] = b.wet[k] + y * 0.82;
      c.i = (c.i + 1) % c.buf.length;
      sr += y;
    }
    lpL += 0.35 * (sl - lpL); // darker tail
    lpR += 0.35 * (sr - lpR);
    b.L[k] += lpL * 0.07;
    b.R[k] += lpR * 0.07;
  }
};

const writeWav = (b: Bus, path: string, target: number) => {
  reverb(b);
  let peak = 1e-6;
  for (let k = 0; k < LEN; k++) peak = Math.max(peak, Math.abs(b.L[k]), Math.abs(b.R[k]));
  const g = target / peak;
  const data = Buffer.alloc(LEN * 4);
  for (let k = 0; k < LEN; k++) {
    data.writeInt16LE(Math.round(Math.tanh(b.L[k] * g) * 32767), k * 4);
    data.writeInt16LE(Math.round(Math.tanh(b.R[k] * g) * 32767), k * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path, Buffer.concat([h, data]));
};

fs.mkdirSync(`out/${slug}`, { recursive: true });
writeWav(music, `out/${slug}/bed.wav`, 0.85);
writeWav(fx, `out/${slug}/sfx.wav`, 0.85);
console.log(`music: ${spec.mood ?? "curious"} ${M.bpm} bpm, ${nBars} bars, ${end.toFixed(1)} s → out/${slug}/bed.wav + sfx.wav`);
