// Music bed + SFX for the 3D style test, synthesised in code (no samples).
// Soft "late-night" felt piano + warm pad + gentle pulse, and SFX on the cuts.
//   node --no-warnings scripts/test3d-audio.ts out/audio/test3d-bed.wav
import fs from "node:fs";

const SR = 44100;
const FPS = 30;
const DUR = 348 / FPS + 0.5;
const LEN = Math.ceil(DUR * SR);
const out = process.argv[2] ?? "out/audio/test3d-bed.wav";
const dry = new Float32Array(LEN);
const wet = new Float32Array(LEN);
let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const put = (i: number, v: number, send: number) => {
  if (i >= 0 && i < LEN) {
    dry[i] += v;
    wet[i] += v * send;
  }
};
const tone = (t: number, dur: number, f0: number, amp: number, o: { type?: "sine" | "tri"; attack?: number; decay?: number; send?: number; to?: number } = {}) => {
  const { type = "sine", attack = 0.01, decay = 0, send = 0.35, to } = o;
  const s = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const x = k / SR;
    ph += (to ? f0 * Math.pow(to / f0, k / n) : f0) / SR;
    const p = ph - Math.floor(ph);
    const w = type === "sine" ? Math.sin(2 * Math.PI * p) : 4 * Math.abs(p - 0.5) - 1;
    let env = Math.min(1, x / attack) * Math.min(1, (dur - x) / 0.05);
    if (decay) env *= Math.exp(-x / decay);
    put(s + k, w * env * amp, send);
  }
};
const piano = (t: number, n: number, a: number) => {
  tone(t, 3, midi(n), a, { decay: 1.1, attack: 0.005, send: 0.5 });
  tone(t, 3, midi(n) * 2, a * 0.22, { decay: 0.45, attack: 0.005, send: 0.5 });
};
const whoosh = (t: number, dur: number, amp: number, lp0: number, lp1: number) => {
  const s = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let y = 0;
  for (let k = 0; k < n; k++) {
    const fc = lp0 * Math.pow(lp1 / lp0, k / n);
    y += (1 - Math.exp((-2 * Math.PI * fc) / SR)) * (noise() - y);
    put(s + k, y * Math.sin((Math.PI * k) / n) * amp, 0.4);
  }
};
const pop = (t: number, amp: number) => tone(t, 0.12, 520, amp, { to: 900, decay: 0.04, attack: 0.002, send: 0.3 });
const chime = (t: number, notes: number[], amp: number) => notes.forEach((n, i) => tone(t + i * 0.07, 2, midi(n), amp, { decay: 0.6, attack: 0.002, send: 0.6 }));

// --- music: Dmaj7 | Bm7 | Gmaj7 | A6, 2.4 s per bar, felt piano + pad ---
const BAR = 2.4;
const CH = [
  [50, 57, 61, 66],
  [47, 54, 57, 62],
  [43, 50, 54, 59],
  [45, 52, 54, 61],
];
for (let b = 0; b < 5; b++) {
  const c = CH[b % 4];
  const t = b * BAR;
  tone(t, BAR + 0.4, midi(c[0] - 12), 0.05, { type: "tri", attack: 0.6, send: 0.7 });
  c.slice(1).forEach((n) => tone(t, BAR + 0.4, midi(n), 0.018, { type: "tri", attack: 0.8, send: 0.8 }));
  piano(t, c[0], 0.07);
  [1, 2, 3, 2].forEach((k, i) => piano(t + 0.6 * i + 0.3, c[k] + 12, 0.035));
  for (let i = 0; i < 4; i++) tone(t + i * 0.6, 0.2, 55, 0.08, { decay: 0.08, attack: 0.003, send: 0.05 }); // soft pulse
}

// --- SFX on picture cuts and events (frames from Test3D.tsx) ---
const sec = (f: number) => f / FPS;
[102, 160, 230, 287].forEach((f) => whoosh(sec(f) - 0.18, 0.4, 0.12, 400, 2600));
pop(sec(110), 0.12); // "100 strangers" badge
pop(sec(154), 0.06); // counter appears
chime(sec(300), [74, 78, 81, 86], 0.05); // someone waves + counter goes to 1
tone(sec(300), 0.08, 1200, 0.05, { decay: 0.03 });

// --- reverb + write ---
const rv = new Float32Array(LEN);
const combs = [1557, 1617, 1491, 1422].map((n) => ({ b: new Float32Array(n), i: 0 }));
for (let k = 0; k < LEN; k++) {
  let s = 0;
  for (const c of combs) {
    const y = c.b[c.i];
    c.b[c.i] = wet[k] + y * 0.8;
    c.i = (c.i + 1) % c.b.length;
    s += y;
  }
  rv[k] = s * 0.25;
}
let peak = 0;
const mix = new Float32Array(LEN);
for (let k = 0; k < LEN; k++) {
  mix[k] = Math.tanh(dry[k] + rv[k] * 0.3);
  peak = Math.max(peak, Math.abs(mix[k]));
}
const data = Buffer.alloc(LEN * 2);
for (let k = 0; k < LEN; k++) data.writeInt16LE(Math.round((mix[k] / peak) * 0.89 * 32767), k * 2);
const h = Buffer.alloc(44);
h.write("RIFF", 0);
h.writeUInt32LE(36 + data.length, 4);
h.write("WAVEfmt ", 8);
h.writeUInt32LE(16, 16);
h.writeUInt16LE(1, 20);
h.writeUInt16LE(1, 22);
h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 2, 28);
h.writeUInt16LE(2, 32);
h.writeUInt16LE(16, 34);
h.write("data", 36);
h.writeUInt32LE(data.length, 40);
fs.mkdirSync(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
fs.writeFileSync(out, Buffer.concat([h, data]));
console.log(`wrote ${out}`);
