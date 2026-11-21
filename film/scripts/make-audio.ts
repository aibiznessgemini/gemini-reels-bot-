// Code-synthesised music + SFX for the style tests. No samples, no stock audio,
// so nothing can be claimed by Content ID. Cue times come from the same
// timeline the picture uses, so every sound lands on its exact frame.
//
//   node scripts/make-audio.ts <style> <out.wav>
import fs from "node:fs";
import * as TL from "../src/test/timeline.ts";

const SR = 44100;
const LEN = Math.ceil((TL.DURATION / TL.FPS + 0.5) * SR);
const style = process.argv[2] ?? "paper";
const outPath = process.argv[3] ?? `out/audio-${style}.wav`;

const dry = new Float32Array(LEN);
const wet = new Float32Array(LEN); // reverb send
const sec = (frame: number) => frame / TL.FPS;

// ---------- deterministic noise ----------
let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;

// ---------- building blocks ----------
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

type Osc = "sine" | "tri" | "square" | "saw";
const osc = (type: Osc, ph: number) => {
  const p = ph - Math.floor(ph);
  switch (type) {
    case "sine":
      return Math.sin(2 * Math.PI * p);
    case "tri":
      return 4 * Math.abs(p - 0.5) - 1;
    case "square":
      return p < 0.5 ? 1 : -1;
    case "saw":
      return 2 * p - 1;
  }
};

const write = (i: number, v: number, send: number) => {
  if (i < 0 || i >= LEN) return;
  dry[i] += v;
  wet[i] += v * send;
};

/** Enveloped oscillator note. */
const tone = (t: number, dur: number, freq: number, amp: number, o: { type?: Osc; attack?: number; decay?: number; send?: number; sweepTo?: number; vib?: number } = {}) => {
  const { type = "sine", attack = 0.01, decay = 0, send = 0.3, sweepTo, vib = 0 } = o;
  const start = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const x = k / SR;
    const f = sweepTo ? freq * Math.pow(sweepTo / freq, k / n) : freq;
    ph += (f * (1 + vib * Math.sin(2 * Math.PI * 5.5 * x))) / SR;
    let env = Math.min(1, x / attack) * Math.min(1, (dur - x) / 0.05);
    if (decay > 0) env *= Math.exp(-x / decay);
    write(start + k, osc(type, ph) * env * amp, send);
  }
};

/** Music-box / bell: inharmonic sine partials with fast decay. */
const bell = (t: number, freq: number, amp: number, decay = 0.9) => {
  [
    [1, 1],
    [2.76, 0.4],
    [5.4, 0.18],
  ].forEach(([m, a]) => tone(t, decay * 3, freq * m, amp * a, { decay: decay / m, attack: 0.002, send: 0.5 }));
};

/** Karplus-Strong plucked string. */
const pluck = (t: number, freq: number, amp: number, dur = 1.6, bright = 0.5) => {
  const start = Math.floor(t * SR);
  const p = Math.max(2, Math.round(SR / freq));
  const buf = new Float32Array(p).map(() => noise());
  const n = Math.floor(dur * SR);
  let prev = 0;
  for (let k = 0; k < n; k++) {
    const idx = k % p;
    const cur = buf[idx];
    const next = buf[(idx + 1) % p];
    const avg = 0.996 * (bright * cur + (1 - bright) * 0.5 * (cur + next));
    buf[idx] = avg;
    prev = prev * 0.2 + cur * 0.8;
    write(start + k, prev * amp * Math.min(1, (dur - k / SR) / 0.08), 0.35);
  }
};

/** Filtered noise burst (footsteps, whooshes, wind). */
const noiseHit = (t: number, dur: number, amp: number, o: { lp?: number; lpTo?: number; hp?: number; attack?: number; send?: number; shape?: (x: number) => number } = {}) => {
  const { lp = 2000, lpTo, hp = 0, attack = 0.003, send = 0.2, shape } = o;
  const start = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let y = 0;
  let h = 0;
  for (let k = 0; k < n; k++) {
    const x = k / SR;
    const fc = lpTo ? lp * Math.pow(lpTo / lp, k / n) : lp;
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += a * (noise() - y);
    let v = y;
    if (hp > 0) {
      const ah = 1 - Math.exp((-2 * Math.PI * hp) / SR);
      h += ah * (v - h);
      v = v - h;
    }
    const env = shape ? shape(x / dur) : Math.min(1, x / attack) * Math.exp(-x / (dur / 4));
    write(start + k, v * env * amp, send);
  }
};

// ---------- music ----------
// Am | F | C | G  then resolve to C on the title card.
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const BAR = 2.0;
const TITLE = sec(TL.TITLE_FROM);
const MOTIF = [76, 74, 72, 69, 72, 74, 72, 67]; // gentle falling line, one per beat

const music = () => {
  switch (style) {
    case "paper": {
      // music box arpeggios + warm pad
      CHORDS.forEach((c, b) => {
        tone(b * BAR, BAR, midi(c[0] - 12), 0.05, { type: "tri", attack: 0.4, send: 0.6 });
        for (let i = 0; i < 8; i++) bell(b * BAR + i * 0.25, midi(c[i % 3] + (i >= 3 && i < 6 ? 24 : 12)), 0.05);
      });
      [72, 76, 79, 84].forEach((n, i) => bell(TITLE + 0.1 + i * 0.12, midi(n), 0.07, 1.4));
      break;
    }
    case "woodcut": {
      // folk guitar strums + bass
      CHORDS.forEach((c, b) => {
        [0, 0.75, 1.0, 1.5].forEach((off, s) => [...c, c[0] + 12].forEach((n, i) => pluck(b * BAR + off + i * 0.018, midi(n), s === 0 ? 0.16 : 0.1, 1.4, 0.6)));
        pluck(b * BAR, midi(c[0] - 12), 0.22, 1.9, 0.3);
      });
      [48, 52, 55, 60, 64].forEach((n, i) => pluck(TITLE + 0.1 + i * 0.03, midi(n), 0.16, 2.2, 0.6));
      break;
    }
    case "pixel": {
      // chiptune: 16th-note square arps, triangle bass, noise hats
      CHORDS.forEach((c, b) => {
        for (let i = 0; i < 16; i++) tone(b * BAR + i * 0.125, 0.11, midi(c[i % 3] + 12), 0.035, { type: "square", attack: 0.002, send: 0.1 });
        for (let i = 0; i < 4; i++) tone(b * BAR + i * 0.5, 0.4, midi(c[0] - 12), 0.12, { type: "tri", attack: 0.005, send: 0.05 });
        for (let i = 0; i < 8; i++) noiseHit(b * BAR + i * 0.25 + 0.125, 0.04, 0.05, { lp: 9000, hp: 5000, send: 0 });
      });
      [72, 76, 79, 84].forEach((n, i) => tone(TITLE + i * 0.1, i === 3 ? 1.2 : 0.1, midi(n), 0.06, { type: "square", attack: 0.002, send: 0.2, vib: i === 3 ? 0.01 : 0 }));
      break;
    }
    case "chalk": {
      // soft felt piano
      const piano = (t: number, n: number, a: number) => {
        tone(t, 2.5, midi(n), a, { decay: 0.9, attack: 0.004, send: 0.45 });
        tone(t, 2.5, midi(n) * 2, a * 0.25, { decay: 0.4, attack: 0.004, send: 0.45 });
      };
      CHORDS.forEach((c, b) => {
        piano(b * BAR, c[0] - 12, 0.12);
        c.forEach((n, i) => piano(b * BAR + 0.5 + i * 0.12, n, 0.06));
        piano(b * BAR + 1.0, MOTIF[b * 2], 0.07);
        piano(b * BAR + 1.5, MOTIF[b * 2 + 1], 0.06);
      });
      [48, 55, 64, 67, 72].forEach((n, i) => piano(TITLE + 0.1 + i * 0.09, n, 0.08));
      break;
    }
    case "puppet": {
      // lute-like pentatonic plucks over a low drone + soft frame drum
      tone(0, TITLE + 1.5, midi(45), 0.06, { type: "saw", attack: 1.2, send: 0.5 });
      tone(0, TITLE + 1.5, midi(52), 0.03, { type: "tri", attack: 1.5, send: 0.5 });
      const scale = [69, 72, 74, 76, 79, 81];
      for (let i = 0; i < 16; i++) pluck(i * 0.5, midi(scale[(i * 3 + (i >> 2)) % scale.length]), 0.12, 1.2, 0.7);
      for (let i = 0; i < 8; i++) noiseHit(i * 1.0, 0.25, 0.22, { lp: 220, send: 0.2 });
      [57, 64, 69, 72, 76].forEach((n, i) => pluck(TITLE + 0.1 + i * 0.06, midi(n), 0.15, 2.4, 0.7));
      break;
    }
  }
};

// ---------- SFX ----------
const sfx = () => {
  TL.footstepFrames().forEach((f, i) => {
    const t = sec(f);
    if (style === "pixel") tone(t, 0.05, i % 2 ? 160 : 140, 0.08, { type: "square", attack: 0.001, send: 0 });
    else if (style === "chalk") noiseHit(t, 0.03, 0.12, { lp: 6000, hp: 1500, send: 0.1 });
    else noiseHit(t, 0.07, 0.35, { lp: style === "woodcut" ? 900 : 500, send: 0.1 });
  });

  // wind while it snows
  const w0 = sec(TL.SNOW_FROM);
  const w1 = sec(TL.SNOW_TO);
  noiseHit(w0, w1 - w0, style === "pixel" ? 0.05 : 0.12, { lp: 500, lpTo: 900, hp: 150, send: 0.4, shape: (x) => Math.sin(Math.PI * x) * (0.7 + 0.3 * Math.sin(x * 20)) });

  // each caption: soft paper/pop
  TL.LINES.forEach((l) => {
    if (style === "pixel") tone(sec(l.from), 0.06, 880, 0.05, { type: "square", attack: 0.001, send: 0.1 });
    else noiseHit(sec(l.from), 0.12, 0.08, { lp: 3500, hp: 800, send: 0.2 });
  });

  // counter reaches 0: ding
  if (style === "pixel") [988, 1319].forEach((fr, i) => tone(sec(TL.STOP_FRAME) + i * 0.08, 0.18, fr, 0.06, { type: "square", attack: 0.001 }));
  else bell(sec(TL.STOP_FRAME), midi(84), 0.09, 0.7);

  // door creak + warm light chime
  const d = sec(TL.DOOR_OPEN);
  if (style === "pixel") tone(d, 0.35, 220, 0.05, { type: "square", sweepTo: 440, attack: 0.002 });
  else tone(d, 0.42, 310, 0.035, { type: "saw", sweepTo: 190, vib: 0.08, attack: 0.02, send: 0.2 });
  [79, 84, 88].forEach((n, i) => (style === "pixel" ? tone(d + 0.15 + i * 0.07, 0.3, midi(n), 0.04, { type: "square" }) : bell(d + 0.15 + i * 0.07, midi(n), 0.05, 0.9)));

  // jump: whoosh up, thump down, two happy yips
  const j = sec(TL.JUMP_FROM);
  const land = sec(TL.JUMP_FROM + TL.JUMP_FRAMES);
  if (style === "pixel") tone(j, 0.25, 300, 0.07, { type: "square", sweepTo: 900, attack: 0.001 });
  else noiseHit(j, 0.3, 0.12, { lp: 600, lpTo: 4000, send: 0.2, shape: (x) => Math.sin(Math.PI * x) });
  noiseHit(land, 0.09, 0.35, { lp: 400, send: 0.1 });
  [0, 0.16].forEach((o) => tone(land + 0.12 + o, 0.09, 620, 0.07, { type: style === "pixel" ? "square" : "tri", sweepTo: 1050, attack: 0.004, send: 0.2 }));

  // title: low warm hit + a tap per letter
  tone(TITLE, 1.2, 55, 0.25, { decay: 0.35, attack: 0.003, send: 0.3 });
  noiseHit(TITLE, 0.5, 0.06, { lp: 1500, send: 0.5 });
  TL.titleLetterFrames().forEach((f) => {
    if (style === "pixel") tone(sec(f), 0.04, 660, 0.05, { type: "square", attack: 0.001 });
    else noiseHit(sec(f), 0.035, 0.18, { lp: 5000, hp: 1200, send: 0.15 });
  });
};

// ---------- reverb (Schroeder) ----------
const reverb = (input: Float32Array) => {
  const out = new Float32Array(LEN);
  const combs = [1557, 1617, 1491, 1422].map((n) => ({ buf: new Float32Array(n), i: 0 }));
  for (let k = 0; k < LEN; k++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.buf[c.i] = input[k] + y * 0.78;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    out[k] = s * 0.25;
  }
  for (const n of [225, 556]) {
    const buf = new Float32Array(n);
    let i = 0;
    for (let k = 0; k < LEN; k++) {
      const b = buf[i];
      const y = -out[k] + b;
      buf[i] = out[k] + b * 0.5;
      i = (i + 1) % n;
      out[k] = y;
    }
  }
  return out;
};

music();
sfx();
const rv = reverb(wet);
const mix = new Float32Array(LEN);
let peak = 0;
for (let k = 0; k < LEN; k++) {
  mix[k] = Math.tanh((dry[k] + rv[k] * 0.35) * 1.2);
  peak = Math.max(peak, Math.abs(mix[k]));
}

// 16-bit mono WAV
const data = Buffer.alloc(LEN * 2);
for (let k = 0; k < LEN; k++) data.writeInt16LE(Math.round((mix[k] / Math.max(peak, 1e-6)) * 0.89 * 32767), k * 2);
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
fs.mkdirSync(outPath.split("/").slice(0, -1).join("/") || ".", { recursive: true });
fs.writeFileSync(outPath, Buffer.concat([header, data]));
console.log(`wrote ${outPath} (${(LEN / SR).toFixed(1)}s, ${style})`);
