// thumbs.js — thumbnail art (no text; text is added by tools/thumbnail.mjs v2).
// Formula: dark background, ONE giant subject on the right 60%, strong single-colour glow,
// scale contrast or an exaggerated face. Left ~40% stays calm for the big text.
import { E, registerShot, mood, glow, circle, ring, seg, poly, alpha, radGrad, linGrad, rng, backdrop } from '/engine/core.js';
import { drawFigure, POSES, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import { YOU } from '../cast.js';

const dark = (g, top, bot) => { g.fillStyle = linGrad(g, 0, 0, 0, E.H, [top, bot]); g.fillRect(-E.W, -E.H, E.W * 3, E.H * 3); };
const vignette = (g) => { g.fillStyle = radGrad(g, E.W * 0.62, E.H * 0.5, E.H * 0.35, E.W * 0.75, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']); g.fillRect(0, 0, E.W, E.H); };

// t001 — THE MOON IS GONE: a giant moon breaking apart, tiny YOU looking up
registerShot('t001', { draw(g) {
  const M = mood('night');
  dark(g, '#05070f', '#141a33');
  FX.stars(g, 0, { count: 160, area: [0, 0, E.W, E.H * 0.8] });
  const cx = E.W * 0.68, cy = E.H * 0.42, r = 330;
  glow(g, cx, cy, r * 2.4, '#9fb8ff', 0.35);
  // moon split into drifting pieces
  const pieces = [[0, 0, 0], [70, -40, 0.9], [-60, 50, 2.1], [40, 80, 3.6], [-80, -60, 5.0]];
  pieces.forEach(([dx, dy, a0], k) => {
    g.save(); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0 + 0.08, a0 + (k === 0 ? 0.85 : 1.3)); g.closePath(); g.clip();
    g.translate(dx, dy); circle(g, cx, cy, r, '#e9ecf8');
    [[-90, -80, 60], [60, 40, 80], [120, -120, 40], [-140, 110, 50], [10, 160, 35]].forEach(([x, y, rr]) => circle(g, cx + x, cy + y, rr, '#c9cfe2'));
    g.restore();
  });
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  circle(g, cx, cy, r, '#e9ecf8');
  [[-90, -80, 60], [60, 40, 80], [120, -120, 40], [-140, 110, 50], [10, 160, 35]].forEach(([x, y, rr]) => circle(g, cx + x, cy + y, rr, '#c9cfe2'));
  g.restore();
  // glowing cracks
  const R = rng(4); g.save(); g.shadowColor = '#ffb347'; g.shadowBlur = 30;
  for (let k = 0; k < 6; k++) { let x = cx + (R() - 0.5) * 80, y = cy + (R() - 0.5) * 80; const a = R() * Math.PI * 2; const pts = [[x, y]]; for (let s = 0; s < 6; s++) { x += Math.cos(a + (R() - 0.5)) * 60; y += Math.sin(a + (R() - 0.5)) * 60; pts.push([x, y]); } seg(g, pts, 6, '#ffb347'); }
  g.restore();
  // rocks flying away
  for (let k = 0; k < 14; k++) { const a = R() * Math.PI * 2, d = r * (1.08 + R() * 0.5); circle(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 8 + R() * 22, '#d5dbee'); }
  // ground + tiny YOU
  g.fillStyle = '#07080f'; g.beginPath(); g.ellipse(E.W * 0.62, E.H * 1.18, E.W * 0.7, E.H * 0.33, 0, 0, Math.PI * 2); g.fill();
  drawFigure(g, { x: E.W * 0.5, y: E.H * 0.87, s: 1.0, facing: 1, outfit: YOU, pose: POSES.handsOnHead, expr: 'shocked', look: [0.6, -1], rim: { color: '#cfe0ff', dir: [0.6, -1], w: 5 } });
  vignette(g);
} });

// t002 — STRUCK BY LIGHTNING: giant shocked face, bolt hitting the hood
registerShot('t002', { draw(g) {
  dark(g, '#0a0716', '#1c1430');
  FX.lightning(g, { seed: 3, x1: E.W * 0.78, y1: -40, x2: E.W * 0.66, y2: E.H * 0.24, w: 14, color: '#bfe4ff', jag: 90 });
  FX.lightning(g, { seed: 8, x1: E.W * 0.98, y1: E.H * 0.05, x2: E.W * 0.86, y2: E.H * 0.6, w: 6, color: '#bfe4ff', jag: 60 });
  glow(g, E.W * 0.66, E.H * 0.3, 700, '#8fd0ff', 0.45);
  bigFace(g, E.W * 0.66, E.H * 0.62, 360, { outfit: YOU, expr: 'shocked', look: [0, -0.3], rimColor: '#bfe4ff', rimSide: 1 });
  const R = rng(9);
  for (let k = 0; k < 40; k++) { const x = E.W * 0.66 + (R() - 0.5) * 1100, y = E.H * 0.62 + (R() - 0.6) * 800; if (Math.hypot(x - E.W * 0.66, y - E.H * 0.62) < 420) continue; FX.sparkle(g, x, y, 10 + R() * 26, '#e8f6ff', 0.9); }
  FX.speedLines(g, 0, { cx: E.W * 0.66, cy: E.H * 0.5, count: 50, a: 0.35, inner: 420 });
  vignette(g);
} });

// t003 — EARTH STOPS: YOU flung through the air above the curve of the planet
registerShot('t003', { draw(g) {
  dark(g, '#020410', '#0b1630');
  FX.stars(g, 0, { count: 200, area: [0, 0, E.W, E.H] });
  const ex = E.W * 0.62, ey = E.H * 2.25, er = E.H * 1.45;
  glow(g, ex, ey - er, 900, '#5fb6ff', 0.4);
  g.fillStyle = radGrad(g, ex - 300, ey - er, 200, er, ['#3d8be0', '#1d4a8f', '#0b1d40']); g.beginPath(); g.arc(ex, ey, er, 0, Math.PI * 2); g.fill();
  ring(g, ex, ey, er + 6, 10, alpha('#9fd8ff', 0.7));
  // land patches
  [[ -500, -1380, 260], [200, -1420, 200], [600, -1300, 180]].forEach(([x, y, r]) => { g.fillStyle = '#2f7a4a'; g.beginPath(); g.ellipse(ex + x, ey + y, r, r * 0.25, 0, 0, Math.PI * 2); g.fill(); });
  FX.speedLines(g, 0, { cx: E.W * 1.4, cy: E.H * 0.45, count: 70, a: 0.4, inner: 200 });
  drawFigure(g, { x: E.W * 0.6, y: E.H * 0.66, s: 3.1, facing: 1, rot: 1.25, outfit: YOU, pose: POSES.dive, expr: 'scared', rim: { color: '#9fd8ff', dir: [0, 1], w: 6 }, shadow: false, trail: { count: 5, dx: -70 } });
  // things flung with you
  const R = rng(5); for (let k = 0; k < 8; k++) { const x = E.W * (0.45 + R() * 0.5), y = E.H * (0.2 + R() * 0.5); g.save(); g.translate(x, y); g.rotate(R() * 3); g.fillStyle = '#1a1d2e'; g.fillRect(-20, -12, 40 + R() * 40, 24); g.restore(); }
  vignette(g);
} });

// t004 — THEY LIKE YOU: nervous giant face, smiling people behind
registerShot('t004', { draw(g) {
  dark(g, '#140a14', '#2a1622');
  glow(g, E.W * 0.64, E.H * 0.5, 800, '#F2A541', 0.28);
  [[0.42, 0.9, 'smile'], [0.88, 0.92, 'happy'], [0.98, 0.95, 'joy']].forEach(([fx, fy, ex], k) => drawFigure(g, { x: E.W * fx, y: E.H * fy, s: 1.6, facing: fx < 0.6 ? 1 : -1, pose: POSES.wave, expr: ex, rim: { color: '#ffc68a', dir: [0, -1], w: 5 }, dim: 0.1 }));
  bigFace(g, E.W * 0.66, E.H * 0.58, 330, { outfit: YOU, expr: 'scared', look: [-0.4, 0], rimColor: '#ffc68a', rimSide: 1 });
  // sweat drops
  [[0.78, 0.36], [0.81, 0.45]].forEach(([fx, fy]) => { g.fillStyle = '#9fd8ff'; g.beginPath(); g.moveTo(E.W * fx, E.H * fy - 30); g.quadraticCurveTo(E.W * fx + 22, E.H * fy + 10, E.W * fx, E.H * fy + 18); g.quadraticCurveTo(E.W * fx - 22, E.H * fy + 10, E.W * fx, E.H * fy - 30); g.fill(); });
  vignette(g);
} });

// t005 — NOBODY'S WATCHING?: a giant amber eye, tiny YOU in a spotlight inside the pupil
registerShot('t005', { draw(g) {
  dark(g, '#06050a', '#120e18');
  const cx = E.W * 0.66, cy = E.H * 0.5, w = 620, h = 330;
  // lids (almond)
  g.fillStyle = '#1a1520'; g.beginPath(); g.moveTo(cx - w, cy); g.quadraticCurveTo(cx, cy - h * 1.6, cx + w, cy); g.quadraticCurveTo(cx, cy + h * 1.6, cx - w, cy); g.fill();
  g.save(); g.beginPath(); g.moveTo(cx - w * 0.92, cy); g.quadraticCurveTo(cx, cy - h * 1.42, cx + w * 0.92, cy); g.quadraticCurveTo(cx, cy + h * 1.42, cx - w * 0.92, cy); g.clip();
  g.fillStyle = '#d9d2c4'; g.fillRect(cx - w, cy - h * 2, w * 2, h * 4);
  g.fillStyle = radGrad(g, cx, cy, 40, 300, ['#ffd86b', '#F2A541', '#a8631c']); circle(g, cx, cy, 300, g.fillStyle);
  for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; seg(g, [[cx + Math.cos(a) * 150, cy + Math.sin(a) * 150], [cx + Math.cos(a) * 290, cy + Math.sin(a) * 290]], 3, 'rgba(120,60,10,.35)'); }
  circle(g, cx, cy, 160, '#050407');
  // spotlight inside the pupil
  g.save(); g.beginPath(); g.arc(cx, cy, 160, 0, Math.PI * 2); g.clip();
  FX.lightCone(g, cx, cy - 170, { angle: Math.PI / 2, spread: 0.55, len: 360, color: '#fff2d0', a: 0.5 });
  FX.pool(g, cx, cy + 95, 70, 14, '#fff2d0', 0.6);
  drawFigure(g, { x: cx, y: cy + 95, s: 0.55, facing: 1, outfit: YOU, pose: POSES.handsOnHead, expr: 'nervous', rim: { color: '#fff2d0', dir: [0, -1], w: 3 } });
  g.restore();
  circle(g, cx - 110, cy - 110, 40, 'rgba(255,255,255,.85)'); circle(g, cx - 60, cy - 70, 14, 'rgba(255,255,255,.7)');
  g.restore();
  glow(g, cx, cy, 700, '#F2A541', 0.12);
  vignette(g);
} });
