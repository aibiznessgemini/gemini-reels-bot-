// film.js — "The Empty Wall": the 1911 theft of the Mona Lisa.
// One board, one continuous camera. Each narration line (= one beat) has ONE main object in focus.
import { rng, clamp, lerp, smooth, smoother, easeOut } from '/engine/engine.js';
import * as D from '/engine/draw.js';
const { INK, RED } = D;
const SP = 2.3; // sprite resolution (matches engine) for images drawn inside sprites

// ---------- figures ----------
function smockMan(g, w, h) { // worker in a long white smock and cap, three-quarter back view
  const cx = w * 0.5;
  // legs + shoes
  g.fillStyle = '#2a2a2a'; g.fillRect(cx - w * 0.17, h * 0.72, w * 0.13, h * 0.24); g.fillRect(cx + w * 0.04, h * 0.72, w * 0.13, h * 0.24);
  g.fillStyle = '#111'; g.beginPath(); g.ellipse(cx - w * 0.12, h * 0.965, w * 0.11, h * 0.025, 0, 0, 6.28); g.ellipse(cx + w * 0.11, h * 0.965, w * 0.11, h * 0.025, 0, 0, 6.28); g.fill();
  // smock
  const sg = g.createLinearGradient(cx - w * 0.4, 0, cx + w * 0.4, 0); sg.addColorStop(0, '#f4f4f0'); sg.addColorStop(0.55, '#d8d8d2'); sg.addColorStop(1, '#9a9a94');
  g.fillStyle = sg; g.beginPath(); g.moveTo(cx - w * 0.2, h * 0.2); g.bezierCurveTo(cx - w * 0.36, h * 0.24, cx - w * 0.38, h * 0.5, cx - w * 0.33, h * 0.78); g.lineTo(cx + w * 0.33, h * 0.78); g.bezierCurveTo(cx + w * 0.38, h * 0.5, cx + w * 0.36, h * 0.24, cx + w * 0.2, h * 0.2); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 3; for (const k of [-0.12, 0.02, 0.16]) { g.beginPath(); g.moveTo(cx + w * k, h * 0.3); g.quadraticCurveTo(cx + w * (k + 0.02), h * 0.55, cx + w * (k - 0.01), h * 0.77); g.stroke(); }
  // arms (hands in pockets / hidden under smock)
  g.fillStyle = '#cfcfc9'; g.beginPath(); g.moveTo(cx - w * 0.3, h * 0.25); g.quadraticCurveTo(cx - w * 0.44, h * 0.42, cx - w * 0.36, h * 0.56); g.lineTo(cx - w * 0.28, h * 0.55); g.quadraticCurveTo(cx - w * 0.32, h * 0.4, cx - w * 0.22, h * 0.3); g.fill();
  g.beginPath(); g.moveTo(cx + w * 0.3, h * 0.25); g.quadraticCurveTo(cx + w * 0.44, h * 0.42, cx + w * 0.36, h * 0.56); g.lineTo(cx + w * 0.28, h * 0.55); g.quadraticCurveTo(cx + w * 0.32, h * 0.4, cx + w * 0.22, h * 0.3); g.fill();
  // neck + head (face turned away, in shadow)
  g.fillStyle = '#7d7871'; g.fillRect(cx - w * 0.05, h * 0.15, w * 0.1, h * 0.06);
  const hg = g.createRadialGradient(cx - w * 0.04, h * 0.1, 2, cx, h * 0.12, w * 0.12); hg.addColorStop(0, '#a19a92'); hg.addColorStop(1, '#4a4640');
  g.fillStyle = hg; g.beginPath(); g.ellipse(cx, h * 0.115, w * 0.085, h * 0.06, 0, 0, 6.28); g.fill();
  g.fillStyle = '#161616'; g.beginPath(); g.ellipse(cx + w * 0.01, h * 0.075, w * 0.11, h * 0.035, -0.05, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.beginPath(); g.ellipse(cx + w * 0.05, h * 0.085, w * 0.11, h * 0.012, 0.08, 0, 6.28); g.fill();
}
function crowdPerson(g, w, h, kind, shade) { // back view: head + shoulders, period hats
  const cx = w * 0.5, hy = h * 0.32;
  g.fillStyle = shade; g.beginPath(); g.moveTo(cx - w * 0.5, h); g.bezierCurveTo(cx - w * 0.48, h * 0.62, cx - w * 0.3, h * 0.5, cx, h * 0.48); g.bezierCurveTo(cx + w * 0.3, h * 0.5, cx + w * 0.48, h * 0.62, cx + w * 0.5, h); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(cx - w * 0.02, h * 0.55, w * 0.04, h * 0.45);
  g.fillStyle = '#6e6a64'; g.fillRect(cx - w * 0.1, hy + h * 0.06, w * 0.2, h * 0.12);
  g.fillStyle = kind === 'lady' ? '#3b3026' : '#1c1a18'; g.beginPath(); g.ellipse(cx, hy, w * 0.19, h * 0.13, 0, 0, 6.28); g.fill();
  g.fillStyle = '#777'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * w * 0.19, hy + h * 0.02, w * 0.03, h * 0.04, 0, 0, 6.28); g.fill(); }
  g.fillStyle = '#121212';
  if (kind === 'bowler') { g.beginPath(); g.ellipse(cx, hy - h * 0.05, w * 0.3, h * 0.035, 0, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(cx, hy - h * 0.07, w * 0.2, h * 0.11, 0, Math.PI, 0); g.fill(); }
  if (kind === 'boater') { g.fillStyle = '#cfc6a8'; g.beginPath(); g.ellipse(cx, hy - h * 0.06, w * 0.33, h * 0.03, 0, 0, 6.28); g.fill(); g.fillRect(cx - w * 0.19, hy - h * 0.14, w * 0.38, h * 0.08); g.fillStyle = '#222'; g.fillRect(cx - w * 0.19, hy - h * 0.09, w * 0.38, h * 0.025); }
  if (kind === 'lady') { g.fillStyle = '#2a2a2a'; g.beginPath(); g.ellipse(cx, hy - h * 0.07, w * 0.46, h * 0.06, -0.06, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(cx - w * 0.05, hy - h * 0.12, w * 0.24, h * 0.08, 0, 0, 6.28); g.fill(); g.fillStyle = '#ddd'; g.beginPath(); g.ellipse(cx + w * 0.18, hy - h * 0.16, w * 0.16, h * 0.04, -0.5, 0, 6.28); g.fill(); }
  if (kind === 'cap') { g.beginPath(); g.ellipse(cx, hy - h * 0.06, w * 0.21, h * 0.07, 0, Math.PI, 0); g.fill(); }
  if (kind === 'homburg') { g.beginPath(); g.ellipse(cx, hy - h * 0.05, w * 0.32, h * 0.04, 0, 0, 6.28); g.fill(); g.fillRect(cx - w * 0.2, hy - h * 0.2, w * 0.4, h * 0.15); g.fillStyle = '#333'; g.fillRect(cx - w * 0.2, hy - h * 0.09, w * 0.4, h * 0.03); }
}
const bwCut = (w, h, fn, seed) => D.cutout(D.bwPhoto(w * SP, h * SP, (g) => { g.scale(SP, SP); fn(g, w, h); }, { seed, soft: 1.2, grain: 40 }), { border: 6 * SP, rgb: 5 * SP });
const putCut = (g, c, w, h) => { const P = (6 + 5 + 4) * SP; g.drawImage(c, -P / SP, -P / SP, c.width / SP, c.height / SP); };

// ---------- Louvre wall ----------
const GAP = { x: 750, y: 330, w: 300, h: 436 };
const PEGS = [[778, 352], [1022, 352], [778, 744], [1022, 744]];
function wall(g, w, h) {
  const r = rng(3);
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#4a2622'); bg.addColorStop(1, '#2c1512'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // damask pattern
  g.fillStyle = 'rgba(120,60,45,0.22)';
  for (let y = 40; y < h - 220; y += 110) for (let x = (y / 110 % 2) * 60; x < w; x += 120) { g.beginPath(); g.ellipse(x, y, 16, 30, 0, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(x, y - 34, 7, 9, 0, 0, 6.28); g.fill(); }
  // dado rail + wainscot
  g.fillStyle = '#1f0f0c'; g.fillRect(0, h - 210, w, h); g.fillStyle = '#6b4a2e'; g.fillRect(0, h - 222, w, 14); g.fillStyle = 'rgba(255,220,160,0.14)'; g.fillRect(0, h - 222, w, 3);
  for (let x = 30; x < w; x += 300) { g.strokeStyle = 'rgba(120,80,50,0.35)'; g.lineWidth = 4; g.strokeRect(x, h - 180, 250, 150); }
  // lighter patch where the painting hung (unfaded wall)
  g.fillStyle = 'rgba(150,80,62,0.55)'; g.fillRect(GAP.x - 18, GAP.y - 18, GAP.w + 36, GAP.h + 36);
  g.strokeStyle = 'rgba(20,8,6,0.35)'; g.lineWidth = 3; g.strokeRect(GAP.x - 18, GAP.y - 18, GAP.w + 36, GAP.h + 36);
  // neighbouring paintings (dark, gilded)
  const nb = (x, y, pw, ph, seed) => {
    D.ornateFrame(g, x, y, pw, ph, 34, { seed });
    const rr2 = rng(seed); const lg = g.createLinearGradient(0, y, 0, y + ph); lg.addColorStop(0, `hsl(${30 + rr2() * 30},25%,${18 + rr2() * 10}%)`); lg.addColorStop(1, `hsl(${20 + rr2() * 20},30%,${8 + rr2() * 6}%)`);
    g.fillStyle = lg; g.fillRect(x + 34, y + 34, pw - 68, ph - 68);
    g.fillStyle = 'rgba(200,160,100,0.12)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + 34 + rr2() * (pw - 68), y + 34 + rr2() * (ph - 68), 20 + rr2() * 80, 10 + rr2() * 50, rr2() * 3, 0, 6.28); g.fill(); }
  };
  nb(-160, 200, 600, 520, 11); nb(1360, 120, 640, 700, 12); nb(470, 100, 180, 230, 13); nb(1150, 520, 160, 200, 14);
  // pegs
  for (const [x, y] of PEGS) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(x + 5, y + 7, 10, 10, 0, 0, 6.28); g.fill(); const pg = g.createRadialGradient(x - 3, y - 3, 1, x, y, 10); pg.addColorStop(0, '#9a9a9a'); pg.addColorStop(1, '#2a2a2a'); g.fillStyle = pg; g.beginPath(); g.arc(x, y, 9, 0, 6.28); g.fill(); }
  // print border (it is a photograph lying on the board)
  g.strokeStyle = '#efe9dc'; g.lineWidth = 22; g.strokeRect(11, 11, w - 22, h - 22);
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = vg; g.fillRect(22, 22, w - 44, h - 44);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,230,200,${r() * 0.05})`; g.fillRect(22 + r() * (w - 44), 22 + r() * (h - 44), 2, 2); }
}

// ---------- engraved façade ----------
function facade(g, w, h) {
  D.paper(g, w, h, { seed: 21, color: '#ece2cb' });
  const x0 = 80, y0 = 150, W2 = w - 160, H2 = h - 330, ink = 'rgba(40,32,24,0.85)';
  g.strokeStyle = ink; g.lineWidth = 3;
  // sky hatching
  g.lineWidth = 1.4; g.strokeStyle = 'rgba(40,32,24,0.25)'; for (let y = y0 - 60; y < y0 + 160; y += 9) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + W2, y + 4); g.stroke(); }
  g.strokeStyle = ink; g.lineWidth = 3;
  // wings + central pavilion
  const base = y0 + H2;
  g.fillStyle = '#e4d8bd'; g.fillRect(x0, y0 + 160, W2, H2 - 160); g.strokeRect(x0, y0 + 160, W2, H2 - 160);
  const px = x0 + W2 / 2 - 190; g.fillRect(px, y0 + 60, 380, H2 - 60); g.strokeRect(px, y0 + 60, 380, H2 - 60);
  g.beginPath(); g.moveTo(px - 10, y0 + 60); g.lineTo(px + 50, y0 - 40); g.lineTo(px + 330, y0 - 40); g.lineTo(px + 390, y0 + 60); g.closePath(); g.fillStyle = '#cfc1a3'; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x0 - 10, y0 + 160); g.lineTo(x0 + 40, y0 + 110); g.lineTo(px, y0 + 110); g.moveTo(px + 380, y0 + 110); g.lineTo(x0 + W2 - 40, y0 + 110); g.lineTo(x0 + W2 + 10, y0 + 160); g.stroke();
  // windows (arched)
  const win = (x, y, ww, hh) => { g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x, y + ww / 2); g.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0); g.lineTo(x + ww, y + hh); g.closePath(); g.fillStyle = 'rgba(40,32,24,0.55)'; g.fill(); g.stroke(); };
  for (let x = x0 + 30; x < x0 + W2 - 60; x += 78) { if (x > px - 50 && x < px + 380) continue; win(x, y0 + 200, 42, 110); win(x, y0 + 360, 42, 130); }
  for (let x = px + 40; x < px + 340; x += 100) { win(x, y0 + 120, 56, 150); win(x, y0 + 330, 56, 170); }
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(40,32,24,0.4)'; for (let x = x0; x < x0 + W2; x += 7) { g.beginPath(); g.moveTo(x, base); g.lineTo(x + 20, base + 40); g.stroke(); }
  D.text(g, 'MUSÉE DU LOUVRE', w / 2, h - 80, 54, 'OldStd', INK, 'center', '700');
}

// ---------- blueprint floor plan ----------
const BP_ROUTE = [[585, 470], [330, 470], [330, 780], [900, 830], [1560, 830], [1700, 830]];
function floorPlan(g, w, h) {
  D.blueprint(g, w, h, { seed: 4 });
  D.bpStyle(g, 7);
  const room = (x, y, rw, rh) => g.strokeRect(x, y, rw, rh);
  room(420, 300, 330, 340);                 // Salon Carré
  room(420, 90, 330, 190); room(780, 90, 330, 300); room(1140, 90, 420, 300);
  room(750, 420, 960, 150);                 // long gallery
  room(120, 300, 280, 340);
  // doors (gaps)
  g.fillStyle = '#2d6aae'; for (const [x, y, ww, hh] of [[740, 470, 20, 60], [520, 290, 70, 20], [395, 440, 30, 60], [900, 380, 60, 50]]) g.fillRect(x, y, ww, hh);
  // staircase
  g.lineWidth = 4; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(140, 330 + i * 30); g.lineTo(380, 330 + i * 30); g.stroke(); }
  g.lineWidth = 7; g.strokeRect(120, 660, 1590, 260);  // service corridor
  g.lineWidth = 3; g.setLineDash([12, 10]); g.strokeRect(80, 50, 1680, 900); g.setLineDash([]);
  // exit door symbol
  g.lineWidth = 6; g.beginPath(); g.arc(1710, 830, 60, Math.PI * 0.5, Math.PI); g.stroke();
  // secondary labels as plain lines
  D.lines(g, 840, 140, 220, 60, { color: 'rgba(240,248,255,0.35)', lh: 22, th: 7, seed: 3 });
  D.lines(g, 1200, 140, 260, 60, { color: 'rgba(240,248,255,0.35)', lh: 22, th: 7, seed: 4 });
  D.lines(g, 900, 470, 300, 40, { color: 'rgba(240,248,255,0.35)', lh: 22, th: 7, seed: 5 });
  D.lines(g, 1300, 1000, 380, 80, { color: 'rgba(240,248,255,0.35)', lh: 24, th: 8, seed: 6 });
  D.text(g, 'SALON', 585, 455, 70, 'Marker', 'rgba(245,250,255,0.95)', 'center'); D.text(g, 'CARRÉ', 585, 535, 70, 'Marker', 'rgba(245,250,255,0.95)', 'center');
  D.tape(g, 140, 22, 200, 54, -0.05, 1); D.tape(g, w - 150, 26, 200, 54, 0.06, 2); D.tape(g, w / 2, h - 20, 220, 54, 0.02, 3);
}

// ---------- the painting on its panel, with room for dimension lines ----------
function panelWithDims(g, w, h) {
  const px = 60, py = 40, pw = 420, ph = 610;
  g.fillStyle = '#6b4a2a'; g.fillRect(px - 10, py - 10, pw + 20, ph + 20);
  g.strokeStyle = 'rgba(30,18,8,0.5)'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(px - 10, py - 10 + i * 53); g.bezierCurveTo(px + 100, py + i * 53, px + 300, py - 20 + i * 53, px + pw + 10, py - 5 + i * 53); g.stroke(); }
  g.drawImage(D.monaLisa(Math.round(pw * SP), Math.round(ph * SP)), px, py, pw, ph);
}

// ---------- empty frame + glass ----------
function emptyFrame(g, w, h) { D.ornateFrame(g, 20, 20, 520, 700, 70, { seed: 8 }); }
function frameLive(g, o, t, A) {
  const tg = o.tGlass, p = smoother((t - tg) / 0.7);
  const x = 150 + p * 120, y = 110 + p * 70, gw = 470, gh = 650;
  g.save(); g.translate(x, y); g.rotate(0.08 + p * 0.06);
  g.fillStyle = 'rgba(190,225,235,0.22)'; g.fillRect(0, 0, gw, gh); g.strokeStyle = 'rgba(235,250,255,0.75)'; g.lineWidth = 4; g.strokeRect(0, 0, gw, gh);
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 10; g.beginPath(); g.moveTo(gw * 0.1, gh * 0.25); g.lineTo(gw * 0.35, gh * 0.05); g.moveTo(gw * 0.16, gh * 0.33); g.lineTo(gw * 0.48, gh * 0.06); g.stroke();
  const glint = clamp((t - tg - 0.5) / 0.6); if (glint > 0 && glint < 1) { g.globalCompositeOperation = 'lighter'; const gx = lerp(-100, gw + 100, glint); const lg = g.createLinearGradient(gx - 60, 0, gx + 60, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, 0, gw, gh); }
  g.restore();
}

// ---------- clock ----------
function clockFace(g, w, h) {
  const cx = w / 2, cy = h / 2, R = w * 0.46;
  g.fillStyle = '#1b1410'; g.beginPath(); g.arc(cx, cy, R, 0, 6.28); g.fill();
  const fg = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 10, cx, cy, R); fg.addColorStop(0, '#f6efdc'); fg.addColorStop(1, '#cdbf9c');
  g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, R * 0.88, 0, 6.28); g.fill();
  g.strokeStyle = INK; for (let i = 0; i < 60; i++) { const a = i / 60 * 6.28, l = i % 5 === 0 ? 34 : 14; g.lineWidth = i % 5 === 0 ? 9 : 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * (R * 0.82), cy + Math.sin(a) * (R * 0.82)); g.lineTo(cx + Math.cos(a) * (R * 0.82 - l), cy + Math.sin(a) * (R * 0.82 - l)); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R * 0.95, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
}
function clockLive(g, o, t) {
  const cx = o.w / 2, cy = o.h / 2, R = o.w * 0.46, s = o.tSpin, e = o.tSpinEnd;
  const u = smoother((t - s) / (e - s));
  const minA = -Math.PI / 2 + (9 / 12) * 6.28 * 12 * 0 + u * 6.28 * 14 + (t - s) * 0.02, hourA = -Math.PI / 2 + 6.28 * (7 / 12) + u * 6.28 * 14 / 12;
  g.strokeStyle = INK; g.lineCap = 'round';
  g.lineWidth = 16; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(hourA) * R * 0.45, cy + Math.sin(hourA) * R * 0.45); g.stroke();
  g.lineWidth = 9; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(minA) * R * 0.7, cy + Math.sin(minA) * R * 0.7); g.stroke();
  g.fillStyle = RED; g.beginPath(); g.arc(cx, cy, 14, 0, 6.28); g.fill();
}

// ---------- calendar strip (the closed week) ----------
function weekStrip(g, w, h) {
  D.paper(g, w, h, { seed: 31, color: '#f1e8d4', edge: 'deckle' });
  D.lines(g, 60, 40, 500, 20, { seed: 2, th: 12 });
  const bw = (w - 120) / 7;
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * bw; g.strokeStyle = 'rgba(40,32,24,0.7)'; g.lineWidth = 3; g.strokeRect(x, 100, bw - 14, h - 170);
    D.text(g, String(22 + i), x + 18, 160, 46, 'OldStd', INK, 'left', '700');
    D.lines(g, x + 18, 200, bw - 60, 60, { seed: 40 + i, th: 7, lh: 18 });
  }
}

// ---------- newspapers ----------
function newspaper(g, w, h, o) {
  D.paper(g, w, h, { seed: o.seed, color: '#ebe3cf', edge: 'torn', tornSides: o.torn || 'rb', burn: 0.16 });
  D.text(g, o.mast, w / 2, 110, 84, 'Fraktur', INK, 'center');
  g.fillStyle = INK; g.fillRect(40, 135, w - 80, 4); g.fillRect(40, 145, w - 80, 1.5);
  D.lines(g, 50, 158, w - 100, 14, { seed: o.seed + 1, th: 7, lh: 14, color: 'rgba(60,50,40,0.25)' });
  D.fitText(g, o.head, w / 2, 260, w - 90, 86, 'OldStd', INK, 'center', '700');
  // the face, again
  const iw = 330, ih = 480, ix = o.imgLeft ? 50 : w - iw - 50, iy = 310;
  const ml = D.bwPhoto(iw * 1.6, ih * 1.6, (gg, W2, H2) => gg.drawImage(D.monaLisa(Math.round(W2), Math.round(H2)), 0, 0), { seed: o.seed, soft: 0.8, grain: 30 });
  g.drawImage(ml, ix, iy, iw, ih); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(ix, iy, iw, ih);
  const tx = o.imgLeft ? ix + iw + 30 : 50, tw = w - iw - 130;
  D.lines(g, tx, 320, tw, h - 380, { seed: o.seed + 2, cols: 2, gutter: 26, th: 8, lh: 19 });
}
const FRONT_HEAD = ['The stolen Mona Lisa is found', 'in Florence; the thief is', 'under arrest.'];
function frontPage(g, w, h) { // reference style: date tag, big serif headline, body, rule + masthead
  D.paper(g, w, h, { seed: 77, color: '#e9e2d0', edge: 'deckle', burn: 0.12 });
  FRONT_HEAD.forEach((s, i) => D.text(g, s, 60, 270 + i * 112, 94, 'OldStd', INK, 'left', '700'));
  D.lines(g, 60, 540, w - 120, 70, { seed: 9, th: 13, lh: 34, color: 'rgba(50,42,32,0.32)' });
  g.fillStyle = INK; g.fillRect(60, 735, w - 560, 4);
  D.text(g, 'The Evening Courier', w - 60, 752, 60, 'Fraktur', INK, 'right');
}

// ---------- suspects / people ----------
const photoOf = (opts, seed) => D.bwPhoto(460 * 1.4, 470 * 1.4, (g, W2, H2) => D.portrait(g, W2, H2, opts), { seed, soft: 1.6 });

// ---------- door ----------
function door(g, w, h) {
  D.paper(g, w, h, { seed: 51, color: '#e9dfc8' });
  const x = 70, y = 60, dw = w - 140, dh = h - 120;
  const wd = g.createLinearGradient(x, 0, x + dw, 0); wd.addColorStop(0, '#5a3a22'); wd.addColorStop(1, '#3b2414'); g.fillStyle = wd; g.fillRect(x, y, dw, dh);
  g.strokeStyle = 'rgba(20,10,4,0.7)'; g.lineWidth = 6; g.strokeRect(x, y, dw, dh);
  for (const [px, py, pw, ph] of [[x + 50, y + 60, dw - 100, dh * 0.35], [x + 50, y + dh * 0.5, dw - 100, dh * 0.42]]) { g.strokeRect(px, py, pw, ph); g.strokeStyle = 'rgba(255,220,170,0.12)'; g.strokeRect(px + 8, py + 8, pw - 16, ph - 16); g.strokeStyle = 'rgba(20,10,4,0.7)'; }
  g.fillStyle = '#c9a54e'; g.beginPath(); g.arc(x + dw - 70, y + dh * 0.47, 22, 0, 6.28); g.fill();
  g.fillStyle = '#d9c9a0'; g.fillRect(x + dw / 2 - 60, y + 20, 120, 34); D.lines(g, x + dw / 2 - 45, y + 31, 90, 12, { th: 10, lh: 14, color: 'rgba(40,30,20,0.5)' });
  g.strokeStyle = 'rgba(40,30,20,0.25)'; g.lineWidth = 1.5; for (let i = 0; i < 80; i++) { const yy = y + i * dh / 80; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + dw, yy + 3); g.stroke(); }
}
function knockFx(g, dt) { // three marker "knock" arcs
  for (let k = 0; k < 3; k++) {
    const p = clamp((dt - k * 0.28) / 0.25); if (p <= 0) continue;
    g.strokeStyle = RED; g.lineWidth = 8; g.lineCap = 'round'; g.globalAlpha *= 1;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(320, 470, 120 + k * 50, s > 0 ? -0.5 : Math.PI - 0.5, (s > 0 ? -0.5 : Math.PI - 0.5) + 1.0 * p); g.stroke(); }
  }
}

// ---------- staff card ----------
function staffCard(g, w, h, photo) {
  D.paper(g, w, h, { seed: 61, color: '#efe4c8', burn: 0.18 });
  g.strokeStyle = 'rgba(60,40,20,0.6)'; g.lineWidth = 4; g.strokeRect(24, 24, w - 48, h - 48);
  D.text(g, 'MUSÉE DU LOUVRE', w / 2, 110, 60, 'OldStd', INK, 'center', '700');
  g.fillStyle = 'rgba(40,30,20,0.6)'; g.fillRect(60, 135, w - 120, 3);
  g.drawImage(photo, 60, 170, 330, 390); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(60, 170, 330, 390);
  D.text(g, 'VINCENZO PERUGGIA', 430, 250, 54, 'Typewriter', INK, 'left');
  D.lines(g, 430, 300, w - 500, 230, { seed: 5, th: 10, lh: 32 });
  // tricolour ribbon
  [['#2f8a4a', 0], ['#f4f1e8', 1], ['#c8322a', 2]].forEach(([c, i]) => { g.fillStyle = c; g.fillRect(w - 170 + i * 36, h - 110, 36, 60); });
}

// ---------- glass case blueprint ----------
const ISO = (x, y, z) => [450 + (x - y) * 0.87, 380 + (x + y) * 0.5 - z];
const CASE_EDGES = (() => { const W2 = 300, Dp = 120, H2 = 380, P = [[0, 0, 0], [W2, 0, 0], [W2, Dp, 0], [0, Dp, 0], [0, 0, H2], [W2, 0, H2], [W2, Dp, H2], [0, Dp, H2]].map(p => ISO(p[0] - 150, p[1] - 60, p[2] - 160)); return [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].map(([a, b]) => [P[a], P[b]]); })();
function caseSheet(g, w, h) { D.blueprint(g, w, h, { seed: 12, grid: 34 }); D.lines(g, 50, h - 90, 360, 50, { color: 'rgba(240,248,255,0.35)', th: 8, lh: 22 }); D.tape(g, w / 2, 16, 200, 48, 0.03, 7); }
function caseLive(g, o, t) {
  const s = o.tBuild, p = clamp((t - s) / 1.6); D.bpStyle(g, 6);
  CASE_EDGES.forEach(([a, b], i) => { const q = clamp(p * CASE_EDGES.length - i); if (q <= 0) return; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(lerp(a[0], b[0], q), lerp(a[1], b[1], q)); g.stroke(); });
  if (p > 0.6) { g.globalAlpha *= clamp((p - 0.6) * 3); g.fillStyle = 'rgba(200,230,255,0.18)'; const [a, b] = [CASE_EDGES[4][0], CASE_EDGES[6][0]]; g.beginPath(); const P = CASE_EDGES; g.moveTo(...P[0][0]); g.lineTo(...P[1][0]); g.lineTo(...P[9][1]); g.lineTo(...P[8][1]); g.closePath(); g.fill(); }
}

// ---------- police report ----------
function report(g, w, h) {
  D.paper(g, w, h, { seed: 71, color: '#f0e9d8', fold: true });
  D.text(g, 'PRÉFECTURE DE POLICE', w / 2, 100, 46, 'OldStd', INK, 'center', '700');
  g.fillStyle = INK; g.fillRect(60, 122, w - 120, 3);
  D.lines(g, 60, 160, w - 120, h - 240, { seed: 7, th: 9, lh: 26 });
}

// ---------- trunk ----------
function trunkBody(g, w, h) {
  const x = 60, y = 260, bw = w - 120, bh = h - 300;
  g.fillStyle = 'rgba(0,0,0,0.0)';
  const wd = g.createLinearGradient(0, y, 0, y + bh); wd.addColorStop(0, '#6e4a2a'); wd.addColorStop(1, '#3d2614'); g.fillStyle = wd; g.fillRect(x, y, bw, bh);
  g.strokeStyle = 'rgba(25,14,6,0.55)'; g.lineWidth = 2; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x, y + i * bh / 6); g.lineTo(x + bw, y + i * bh / 6); g.stroke(); }
  g.fillStyle = '#2c2a28'; for (const bx of [x + 80, x + bw - 120]) g.fillRect(bx, y, 40, bh);
  g.fillStyle = '#b08a3e'; g.fillRect(x + bw / 2 - 36, y + 20, 72, 80); g.fillStyle = '#2a1a0c'; g.beginPath(); g.arc(x + bw / 2, y + 55, 10, 0, 6.28); g.fill();
}
function trunkLive(g, o, t) { // lid closing
  const x = 60, y = 260, bw = o.w - 120, p = smoother((t - o.tClose) / 0.8), ang = lerp(-1.25, 0, p);
  g.save(); g.translate(x, y); g.transform(1, 0, 0, Math.cos(ang), 0, 0);
  const lh = 200; g.fillStyle = '#7a5230'; g.beginPath(); g.moveTo(0, 0); g.lineTo(bw, 0); g.lineTo(bw, -lh * 0.8); g.quadraticCurveTo(bw / 2, -lh * 1.15, 0, -lh * 0.8); g.closePath(); g.fill();
  g.fillStyle = '#2c2a28'; g.fillRect(80, -lh, 40, lh); g.fillRect(bw - 120, -lh, 40, lh);
  g.restore();
  if (p < 1) { // the painting inside, disappearing under the lid
    g.save(); g.globalAlpha *= 1 - p; g.translate(o.w / 2 - 120, y - 60); g.rotate(-0.1); g.drawImage(D.monaLisa(240, 350), 0, 0, 180, 262); g.restore();
  }
}

// ---------- map ----------
const LON0 = -6, LON1 = 22, LAT0 = 38, LAT1 = 51.5;
const MW = 2800, MH = 1900;
const ll = (lon, lat) => [(lon - LON0) / (LON1 - LON0) * MW, (LAT1 - lat) / (LAT1 - LAT0) * MH];
const COAST = [[-8, 43.4], [-1.8, 43.4], [-1.4, 44.5], [-1.2, 45.8], [-2.2, 47.1], [-4.5, 47.8], [-4.8, 48.4], [-3, 48.8], [-1.6, 48.7], [-1.6, 49.6], [-1.2, 49.4], [0.2, 49.5], [1.5, 50.2], [1.6, 50.9], [2.5, 51.1], [3.6, 51.4], [4.2, 52.0], [4.8, 53], [23, 53],
  [23, 39.5], [20.2, 39.6], [19.4, 40.3], [19.5, 41.8], [18.5, 42.5], [16.4, 43.5], [15.2, 44.3], [14.5, 45.2], [13.8, 45.6], [12.4, 45.4], [12.3, 44.5], [13.6, 43.5], [14.7, 42.1], [16.0, 41.4], [18.5, 40.2], [17.2, 40.4], [16.5, 39.6], [17.1, 39.0], [16.1, 38.0], [15.6, 38.2], [15.7, 39.8], [14.9, 40.3], [14.2, 40.8], [12.5, 41.6], [11.2, 42.4], [10.5, 43.0], [10.2, 43.9], [8.8, 44.4], [7.5, 43.8], [6.6, 43.1], [5.3, 43.3], [4.2, 43.5], [3.0, 43.0], [3.2, 42.4], [3.2, 41.9], [2.0, 41.3], [0.9, 41.0], [-0.3, 39.5], [0.2, 38.7], [-0.7, 37.6], [-8, 37]];
const ISLANDS = [
  [[9.4, 43.0], [9.6, 42.5], [9.4, 41.4], [8.8, 41.6], [8.6, 42.3], [9.0, 42.7]],
  [[9.2, 41.2], [9.8, 40.9], [9.6, 39.2], [9.0, 39.0], [8.4, 39.0], [8.4, 40.6], [8.2, 40.9]],
  [[12.4, 38.1], [13.4, 38.2], [15.6, 38.3], [15.1, 37.0], [14.3, 36.8], [12.5, 37.6]],
  [[-5.7, 50.1], [-3.5, 50.4], [-1.0, 50.7], [1.4, 51.2], [1.7, 52.5], [1.7, 53.2], [-5, 53.2], [-4.5, 51.6], [-3, 51.4], [-5.2, 51.0]],
  [[2.4, 39.9], [3.4, 39.8], [3.2, 39.3], [2.4, 39.5]],
];
const ITALY = [[7.5, 43.8], [7.0, 44.2], [6.9, 45.0], [7.0, 45.9], [8.4, 46.4], [9.0, 46.0], [10.1, 46.4], [10.5, 46.9], [12.2, 47.0], [12.7, 46.6], [13.7, 46.5], [13.6, 45.8], [13.8, 45.6], [12.4, 45.4], [12.3, 44.5], [13.6, 43.5], [14.7, 42.1], [16.0, 41.4], [18.5, 40.2], [17.2, 40.4], [16.5, 39.6], [17.1, 39.0], [16.1, 38.0], [15.6, 38.2], [15.7, 39.8], [14.9, 40.3], [14.2, 40.8], [12.5, 41.6], [11.2, 42.4], [10.5, 43.0], [10.2, 43.9], [8.8, 44.4], [7.5, 43.8]];
const PARIS = ll(2.35, 48.86), FLOR = ll(11.25, 43.77);
function mapSheet(g, w, h) {
  D.vintageMap(g, w, h, [COAST, ...ISLANDS].map(p => p.map(q => ll(...q))), { seed: 5, cell: 80 });
  g.strokeStyle = 'rgba(90,50,25,0.55)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); ITALY.slice(0, 13).forEach((p, i) => { const q = ll(...p); i ? g.lineTo(...q) : g.moveTo(...q); }); g.stroke(); g.setLineDash([]);
  for (const [p, name, dx] of [[PARIS, 'PARIS', 36], [FLOR, 'FLORENCE', 40]]) { g.fillStyle = INK; g.beginPath(); g.arc(p[0], p[1], 18, 0, 6.28); g.fill(); D.text(g, name, p[0] + dx, p[1] + 28, 92, 'OldStd', INK, 'left', '700'); }
  for (const [lon, lat] of [[4.8, 45.75], [5.4, 43.3], [9.19, 45.46], [12.5, 41.9], [7.7, 45.07]]) { const p = ll(lon, lat); g.fillStyle = 'rgba(40,25,15,0.8)'; g.beginPath(); g.arc(p[0], p[1], 8, 0, 6.28); g.fill(); }
  g.strokeStyle = '#efe6d2'; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18);
}
function italyFx(g, dt) {
  const p = smoother(dt / 1.3), pts = ITALY.map(q => ll(...q));
  g.save(); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.globalAlpha *= 0.35 * smooth(dt / 1.0); g.fillStyle = '#e8402f'; g.fill(); g.restore();
  g.strokeStyle = RED; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round'; const n = Math.floor((pts.length - 1) * p);
  g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i <= n; i++) g.lineTo(...pts[i]); g.stroke();
}
function envelope(g, w, h) {
  D.paper(g, w, h, { seed: 81, color: '#efe4cc', burn: 0.1 });
  g.strokeStyle = 'rgba(60,45,30,0.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, h * 0.55); g.lineTo(w, 0); g.stroke();
  g.fillStyle = '#b8443a'; g.fillRect(w - 90, 20, 66, 80); g.strokeStyle = 'rgba(40,20,10,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(w - 100, 70, 40, 0, 6.28); g.stroke();
  D.lines(g, 50, h * 0.62, w * 0.6, 60, { th: 8, lh: 20, seed: 3, color: 'rgba(40,40,90,0.45)' });
}
function bizCard(g, w, h) {
  D.paper(g, w, h, { seed: 91, color: '#f3ecdb', burn: 0.08, aged: true });
  D.text(g, 'ALFREDO GERI', w / 2, 200, 84, 'OldStd', INK, 'center', '700');
  g.font = 'italic 400 42px OldStd'; g.fillStyle = 'rgba(40,32,24,0.75)'; g.textAlign = 'center'; g.fillText('antiquario · Firenze', w / 2, 270);
  g.fillStyle = 'rgba(40,32,24,0.5)'; g.fillRect(w / 2 - 140, 300, 280, 2);
  D.lines(g, w / 2 - 160, 340, 320, 40, { th: 7, lh: 18, seed: 4 });
}
function checkPanel(g, w, h) {
  g.fillStyle = '#241c18'; D.rr(g, 0, 0, w, h, 18); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(0, i * h / 40); g.lineTo(w, i * h / 40 + 8); g.stroke(); }
  g.fillStyle = '#6b4a2a'; g.fillRect(130, 110, 440, 630);
  g.drawImage(D.monaLisa(Math.round(420 * SP), Math.round(610 * SP)), 140, 120, 420, 610);
}
function magnifierLive(g, o, t) {
  const s = o.tCheck, p = clamp((t - s) / 2.0);
  if (t < s) return;
  const x = lerp(220, 430, smoother(p)) + Math.sin(t * 2) * 10, y = lerp(560, 290, smoother(p)) + Math.cos(t * 1.7) * 8, R = 120;
  g.save(); g.beginPath(); g.arc(x, y, R, 0, 6.28); g.clip(); g.translate(x, y); g.scale(1.7, 1.7); g.translate(-x, -y);
  g.drawImage(D.monaLisa(Math.round(420 * SP), Math.round(610 * SP)), 140, 120, 420, 610); g.restore();
  g.strokeStyle = '#1a1a1a'; g.lineWidth = 22; g.beginPath(); g.arc(x, y, R, 0, 6.28); g.stroke();
  g.strokeStyle = '#b8b8b8'; g.lineWidth = 6; g.beginPath(); g.arc(x, y, R - 8, 0, 6.28); g.stroke();
  g.strokeStyle = '#2a1a10'; g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + R * 0.75, y + R * 0.75); g.lineTo(x + R * 1.7, y + R * 1.7); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - R * 0.35, y - R * 0.4, R * 0.35, R * 0.18, -0.7, 0, 6.28); g.fill();
}
function courtDoc(g, w, h) {
  D.paper(g, w, h, { seed: 101, color: '#efe7d3', fold: true });
  D.text(g, 'TRIBUNALE DI FIRENZE', w / 2, 110, 50, 'OldStd', INK, 'center', '700');
  g.fillStyle = INK; g.fillRect(70, 135, w - 140, 3);
  D.lines(g, 70, 180, w - 140, 300, { seed: 11, th: 9, lh: 26 });
  D.text(g, '1 YEAR, 15 DAYS', w / 2, 590, 72, 'Typewriter', INK, 'center');
  D.lines(g, 70, 660, w - 140, h - 760, { seed: 12, th: 9, lh: 26 });
}
function guidePage(g, w, h) {
  D.paper(g, w, h, { seed: 111, color: '#efe6d0', edge: 'deckle' });
  D.text(g, 'CATALOGUE', w / 2, 100, 60, 'OldStd', INK, 'center', '700');
  g.fillStyle = INK; g.fillRect(60, 125, w - 120, 3);
  const r = rng(5); let y = 170;
  for (let i = 0; i < 7; i++) {
    const big = i === 1 || i === 3, th = big ? 170 : 90, tw = big ? 200 : 70;
    g.fillStyle = `hsl(${25 + r() * 25},25%,${20 + r() * 15}%)`; g.fillRect(60, y, tw, th);
    if (i === 5) g.drawImage(D.monaLisa(140, 200), 60, y, 62, 90);
    g.strokeStyle = 'rgba(40,30,20,0.6)'; g.lineWidth = 2; g.strokeRect(60, y, tw, th);
    D.lines(g, 60 + tw + 30, y + 10, w - tw - 160, th - 10, { seed: 20 + i, th: 8, lh: 20 });
    y += th + 26;
  }
}

const _m = document.createElement('canvas').getContext('2d');
const measure = (s, font) => { _m.font = font; return _m.measureText(s).width; };
// ======================================================================
export default function film({ obj, beat, T, cue }) {
  const w = (line, word, nth) => T.word(line, word, nth);

  // ---- row 1: the wall, the date, the façade, the man ----
  obj({ id: 'wall', x: 0, y: 0, w: 1800, h: 1200, draw: wall, shadow: 'paper' });
  obj({ id: 'date', x: 1950, y: 110, w: 1050, h: 640, shadow: 'none' });
  obj({ id: 'facade', x: 3150, y: 60, w: 1400, h: 900, rot: 0.02, draw: facade, appear: { line: 2, word: 'day' } });
  const smock = bwCut(560, 1000, smockMan, 5);
  obj({ id: 'smock', x: 4800, y: 30, w: 560, h: 1000, rot: -0.02, shadow: 'cutout', draw: (g) => putCut(g, smock), appear: { line: 3, word: 'man' } });
  // crowd in front of the wall (line 16) — children of the wall
  const kinds = ['bowler', 'lady', 'boater', 'homburg', 'cap', 'bowler', 'lady', 'boater', 'homburg'];
  kinds.forEach((k, i) => {
    const cw = 230, ch = 360, x = 40 + i * 195, y = 1200 - ch + 40 + (i % 2) * 30;
    const c = bwCut(cw, ch, (g, W2, H2) => crowdPerson(g, W2, H2, k, ['#1d1d1d', '#2b2b2b', '#151515'][i % 3]), 30 + i);
    obj({ id: 'crowd' + i, parent: 'wall', x, y, w: cw, h: ch, shadow: 'cutout', draw: g => putCut(g, c), appear: { line: 16, word: 'crowds', delay: 0.12 * [4, 1, 6, 0, 3, 7, 2, 5, 8][i] } });
  });
  obj({ id: 'returned', parent: 'wall', x: GAP.x - 8, y: GAP.y - 8, w: GAP.w + 16, h: GAP.h + 16, shadow: 'paper', draw: (g, _w, _h, o) => { g.fillStyle = '#3a2412'; g.fillRect(0, 0, o.w, o.h); g.drawImage(D.monaLisa(Math.round(GAP.w * SP), Math.round(GAP.h * SP)), 8, 8, GAP.w, GAP.h); }, appear: { line: 29, word: 'returned' } });

  // ---- row 2: plan, panel, frame, clock ----
  obj({ id: 'guide', x: 0, y: 1400, w: 760, h: 1150, rot: -0.03, draw: guidePage, appear: { line: 30, word: 'Before' } });
  obj({ id: 'panel', x: 1700, y: 1440, w: 640, h: 820, shadow: 'paper', pad: 30, draw: panelWithDims, appear: { line: 5, word: 'painted' } });
  obj({ id: 'plan', x: 2700, y: 1400, w: 1800, h: 1150, rot: -0.012, draw: floorPlan, appear: { line: 4, word: 'walked' } });
  const fr = obj({ id: 'frame', x: 4750, y: 1480, w: 760, h: 920, rot: 0.05, draw: emptyFrame, live: frameLive, appear: { line: 6, word: 'stripped' } });
  fr.tGlass = w(6, 'glass');
  const ck = obj({ id: 'clock', x: 4850, y: 2620, w: 620, h: 620, shadow: 'paper', draw: clockFace, live: clockLive, appear: { line: 8, word: 'Nobody', delay: -0.3 } });
  ck.tSpin = w(8, 'Nobody'); ck.tSpinEnd = T.line(8).end + 0.4;

  // ---- row 3: the painter, the closed week, the newspapers ----
  obj({ id: 'beroud', x: 4000, y: 2700, w: 520, h: 640, rot: 0.04, draw: (g, _w, _h, o) => D.polaroid(g, o.w, o.h, photoOf({ hat: 'homburg', mustache: true, beard: true, bg: ['#9a9890', '#45443f'] }, 9), { caption: 'LOUIS BÉROUD', seed: 4 }), appear: { line: 9, word: 'painter' } });
  obj({ id: 'week', x: 2420, y: 2760, w: 1350, h: 540, rot: -0.015, draw: weekStrip, appear: { line: 11, word: 'Louvre' } });
  obj({ id: 'news1', x: 80, y: 2560, w: 900, h: 1050, rot: -0.05, z: 1, draw: (g, _w, _h, o) => newspaper(g, o.w, o.h, { seed: 1, mast: 'Le Courrier du Soir', head: 'LA JOCONDE A DISPARU', imgLeft: false, torn: 'rb' }), appear: { line: 12, word: 'newspapers' } });
  obj({ id: 'news2', x: 720, y: 2700, w: 900, h: 1050, rot: 0.035, z: 2, draw: (g, _w, _h, o) => newspaper(g, o.w, o.h, { seed: 2, mast: 'The Daily Courier', head: 'STOLEN FROM THE LOUVRE', imgLeft: true, torn: 'lb' }), appear: { line: 12, word: 'again', nth: 1 } });
  obj({ id: 'news3', x: 1360, y: 2590, w: 900, h: 1050, rot: -0.02, z: 3, draw: (g, _w, _h, o) => newspaper(g, o.w, o.h, { seed: 3, mast: 'Il Giornale', head: 'WHERE IS SHE?', imgLeft: false, torn: 'rt' }), appear: { line: 12, word: 'again', nth: 2 } });

  // ---- row 4: suspects, the door, the thief ----
  obj({ id: 'apol', x: 220, y: 3850, w: 520, h: 640, rot: -0.04, draw: (g, _w, _h, o) => D.polaroid(g, o.w, o.h, photoOf({ head: 0.2, hair: true, tie: true, bg: ['#a09e98', '#4a4944'] }, 13), { caption: 'APOLLINAIRE', seed: 5 }), appear: { line: 13, word: 'Police' } });
  obj({ id: 'pica', x: 900, y: 3880, w: 520, h: 640, rot: 0.05, draw: (g, _w, _h, o) => D.polaroid(g, o.w, o.h, photoOf({ head: 0.16, tie: false, shirt: '#cfcfcb', bg: ['#8f8d87', '#3c3b37'] }, 14), { caption: 'PICASSO', seed: 6 }), appear: { line: 14, word: 'questioned' } });
  obj({ id: 'door', x: 1720, y: 3700, w: 640, h: 980, rot: -0.01, draw: door, appear: { line: 18, word: 'Meanwhile' } });
  const perPhoto = photoOf({ hat: 'cap', mustache: true, bg: ['#9c9a94', '#474641'] }, 21);
  obj({ id: 'card', x: 2600, y: 3820, w: 1050, h: 680, rot: 0.02, draw: (g, _w, _h, o) => staffCard(g, o.w, o.h, perPhoto), appear: { line: 19, word: 'name' } });
  const cs = obj({ id: 'case', x: 3850, y: 3780, w: 900, h: 720, rot: -0.03, draw: caseSheet, live: caseLive, appear: { line: 20, word: 'He' } });
  cs.tBuild = w(20, 'build');
  obj({ id: 'report', x: 4950, y: 3480, w: 720, h: 900, rot: 0.035, draw: report, appear: { line: 21, word: 'police' } });
  const tr = obj({ id: 'trunk', x: 4880, y: 4560, w: 900, h: 700, shadow: 'paper', draw: trunkBody, live: trunkLive, appear: { line: 22, word: 'For' } });
  tr.tClose = w(22, 'hidden');

  // ---- row 5: Florence ----
  obj({ id: 'map', x: 1500, y: 4900, w: MW, h: MH, rot: 0.01, draw: mapSheet, appear: { line: 23, word: 'Then' } });
  obj({ id: 'letter', parent: 'map', x: 1500 + PARIS[0] - 380, y: 4900 + PARIS[1] + 40, w: 420, h: 270, rot: -0.12, draw: envelope, appear: { line: 23, word: 'wrote' } });
  obj({ id: 'geri', x: 4500, y: 5450, w: 820, h: 480, rot: -0.04, draw: bizCard, appear: { line: 24, word: 'dealer' } });
  const ch = obj({ id: 'check', x: 5500, y: 5150, w: 700, h: 860, rot: 0.03, draw: checkPanel, live: magnifierLive, appear: { line: 25, word: 'They' } });
  ch.tCheck = w(25, 'checked') - 0.2;
  const perCut = D.cutout(D.bwPhoto(380 * SP, 420 * SP, (g, W2, H2) => { D.portrait(g, W2, H2, { hat: 'cap', mustache: true, bg: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'] }); }, { seed: 31, soft: 1.4 }), { border: 6 * SP, rgb: 5 * SP });
  obj({ id: 'front', x: 5900, y: 3650, w: 1500, h: 1080, rot: -0.01, draw: (g, _w, _h, o) => { frontPage(g, o.w, o.h); const P = 15 * SP; g.save(); g.beginPath(); g.rect(0, 0, o.w, o.h); g.clip(); g.drawImage(perCut, 750 - perCut.width / SP * 0.65, 610, perCut.width / SP * 1.3, perCut.height / SP * 1.3); g.restore(); }, appear: { line: 26, word: 'In' } });
  obj({ id: 'court', x: 250, y: 4950, w: 920, h: 1150, rot: -0.02, draw: courtDoc, appear: { line: 28, word: 'court' } });

  // extra foley that is not tied to a drop / fx
  for (let k = 0; k < 3; k++) cue(w(18, 'knocked') + k * 0.28, 'knock', -2, { seed: k });
  for (let t = ck.tSpin; t < ck.tSpinEnd; t += 0.14) cue(t, 'tick', -18, { seed: Math.round(t * 10) % 50 });
  cue(fr.tGlass, 'slide', -8, { seed: 3 });
  cue(tr.tClose + 0.72, 'hit', -12, { seed: 4, pitch: 0.7 });
  cue(w(29, 'returned') + 0.45, 'shimmer', -16, { seed: 2 });

  // =================== beats (one per narration line) ===================
  const pegFx = (word) => PEGS.map(([x, y], i) => ({ type: 'circle', on: 'wall', word, delay: i * 0.22, rect: [x - 34, y - 34, 68, 68], width: 7 }));
  beat({ line: 0, focus: ['wall'], cam: { rect: [430, 150, 940, 760] }, push: 0.02, note: 'hook: the empty wall',
    fx: [{ type: 'custom', on: 'wall', word: 'portrait', draw: (g, dt) => { g.globalAlpha *= smooth(dt / 0.8) * 0.9; g.strokeStyle = '#f3ead6'; g.lineWidth = 5; g.setLineDash([16, 12]); g.strokeRect(GAP.x, GAP.y, GAP.w, GAP.h); } }] });
  beat({ line: 1, focus: ['date'], blur: 0.6, fx: [
    { type: 'tag', on: 'date', word: 'Monday', text: 'MONDAY', x: 525, y: 80, size: 64, bg: RED, color: '#f6efe0', font: 'Anton' },
    { type: 'label', on: 'date', word: 'August', text: 'AUGUST 21', x: 525, y: 300, size: 230, color: RED, font: 'Anton' },
    { type: 'tag', on: 'date', word: '1911', text: '1911', x: 525, y: 520, size: 120, font: 'Anton' }] });
  beat({ line: 2, focus: ['facade'], fx: [{ type: 'stamp', word: 'closed', text: 'CLOSED', x: 700, y: 440, size: 170, rot: -9 }] });
  beat({ line: 3, focus: ['smock'], cam: { fill: 0.86 }, fx: [{ type: 'write', word: 'inside', text: '?', x: 470, y: 120, size: 200 }] });
  beat({ line: 4, focus: ['plan'], fx: [{ type: 'circle', word: 'Salon', rect: [380, 260, 410, 420], width: 10 }] });
  beat({ line: 5, focus: ['panel'], fx: [
    { type: 'dims', on: 'panel', word: '77', line: [560, 40, 560, 650], text: '77 cm', off: [0, 0], size: 70, bg: '#d6cab0' },
    { type: 'dims', on: 'panel', word: '53', line: [60, 720, 480, 720], text: '53 cm', size: 70, bg: '#d6cab0' }] });
  beat({ line: 6, focus: ['frame'] });
  beat({ line: 7, focus: ['plan'], fx: [{ type: 'route', on: 'plan', word: 'walked', pts: BP_ROUTE, dur: 1.3, color: '#ffd84a', width: 9 }] });
  beat({ line: 8, focus: ['clock'], push: 0.07 });
  beat({ line: 9, focus: ['beroud'] });
  beat({ line: 10, focus: ['wall'], linger: 0.4, cam: { rect: [690, 270, 420, 560] }, fx: pegFx('four') });
  beat({ line: 11, focus: ['week'], fx: [...[0, 1, 2, 3, 4, 5, 6].map(i => ({ type: 'xmark', word: 'shut', delay: i * 0.24, rect: [60 + i * (1230 / 7) + 30, 120, (1230 / 7) - 74, 300], width: 10 }))] });
  beat({ line: 12, focus: ['news1', 'news2', 'news3'], cam: { fill: 0.9 } });
  beat({ line: 13, focus: ['apol'], fx: [{ type: 'stamp', word: 'arrested', text: 'ARRESTED', x: 260, y: 300, size: 92, rot: -12 }] });
  beat({ line: 14, focus: ['pica'], fx: [{ type: 'write', word: 'questioned', text: '?', x: 400, y: 120, size: 170 }] });
  beat({ line: 15, focus: ['apol', 'pica'], linger: 0.6, fx: [{ type: 'stamp', on: 'pica', word: 'cleared', text: 'CLEARED', x: -95, y: 330, size: 150, rot: -7, color: '#2e8b4a', blend: 'source-over', opacity: 0.94, shake: 8 }] });
  beat({ line: 16, focus: ['wall'], cam: { rect: [0, 60, 1800, 1180], fill: 0.95 } });
  beat({ line: 17, focus: ['wall'], linger: 0.9, cam: { rect: [800, 820, 640, 440] }, fx: [{ type: 'circle', on: 'crowd5', word: 'Kafka', rect: [40, 20, 150, 170], width: 8 }, { type: 'write', on: 'crowd5', word: 'Kafka', delay: 0.15, text: 'KAFKA', x: -120, y: -40, size: 74, color: '#ffd84a', rot: -6 }] });
  beat({ line: 18, focus: ['door'], fx: [{ type: 'custom', word: 'knocked', draw: knockFx }] });
  beat({ line: 19, focus: ['card'], fx: [{ type: 'highlight', word: 'Peruggia', rect: [425, 200, 560, 66] }, { type: 'underline', word: 'Louvre', rect: [245, 124, 560] }] });
  beat({ line: 20, focus: ['case'], fx: [{ type: 'circle', word: 'protect', rect: [180, 80, 540, 560], width: 9, color: '#ffd84a' }] });
  beat({ line: 21, focus: ['report'], fx: [{ type: 'stamp', word: 'believed', text: 'ALIBI ACCEPTED', x: 360, y: 520, size: 80, rot: -10 }] });
  beat({ line: 22, focus: ['trunk'], fx: [{ type: 'label', word: 'years', text: '2 YEARS', x: 450, y: 600, size: 150, color: '#f3ead6', stroke: 'rgba(20,10,5,0.9)' }] });
  beat({ line: 23, focus: ['map'], tilt: 0.8, linger: 0.6, cam: { rect: [1500 + ll(-4.5, 50.6)[0], 4900 + ll(-4.5, 50.6)[1], ll(15.5, 41.8)[0] - ll(-4.5, 50.6)[0], ll(15.5, 41.8)[1] - ll(-4.5, 50.6)[1]] }, fx: [
    { type: 'route', on: 'map', word: 'art', pts: (() => { const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([lerp(PARIS[0], FLOR[0], u) + Math.sin(u * Math.PI) * 160, lerp(PARIS[1], FLOR[1], u) - Math.sin(u * Math.PI) * 40]); } return pts; })(), dur: 1.4, width: 10 },
    { type: 'circle', on: 'map', word: 'Florence', rect: [FLOR[0] - 90, FLOR[1] - 90, 180, 180], width: 10 }] });
  beat({ line: 24, focus: ['geri'], fx: [{ type: 'highlight', word: 'Geri', rect: [90, 128, 640, 92] }, { type: 'stamp', word: 'Uffizi', text: 'UFFIZI', round: true, x: 690, y: 360, size: 70, rot: -14, color: '#23408e' }] });
  beat({ line: 25, focus: ['check'], linger: 0.3, fx: [{ type: 'stamp', word: 'real', text: 'AUTHENTIC', x: 350, y: 640, size: 110, rot: -7, blend: 'source-over', opacity: 0.92 }] });
  beat({ line: 26, focus: ['front'], linger: 0.6, blur: 1, fx: [
    { type: 'tag', on: 'front', word: 'December', text: 'December 1913', x: 60, y: 120, size: 60, bg: RED, color: INK, font: 'OldStd', weight: '700', align: 'left', border: '#1a0b08' },
    { type: 'highlight', on: 'front', word: 'arrested', rect: FRONT_HEAD.map((s, i) => [50, 270 + i * 112 - 74, measure(s, '700 94px OldStd') + 22, 98]) }] });
  beat({ line: 27, focus: ['map'], tilt: 0.9, cam: { rect: [1500 + ll(5, 47.5)[0], 4900 + ll(5, 47.5)[1], ll(19.5, 37.5)[0] - ll(5, 47.5)[0], ll(19.5, 37.5)[1] - ll(5, 47.5)[1]] }, fx: [{ type: 'custom', on: 'map', word: 'home', draw: italyFx }] });
  beat({ line: 28, focus: ['court'], fx: [{ type: 'highlight', word: 'lenient', rect: [150, 540, 620, 80] }] });
  beat({ line: 29, focus: ['wall'], cam: { rect: [560, 230, 680, 640] }, fx: [{ type: 'tag', on: 'wall', word: 'January', text: 'JANUARY 1914', x: 900, y: 205, size: 70, font: 'Anton' }] });
  beat({ line: 30, focus: ['guide'], fx: [{ type: 'circle', word: 'not', rect: [26, 876, 130, 156], width: 8 }] });
  beat({ line: 31, focus: [], wide: true, blur: 0, tilt: 0.25, cam: { fill: 0.96 } });
  beat({ line: 32, focus: ['wall'], cam: { rect: [700, 290, 400, 520] }, push: 0.08 });
}
