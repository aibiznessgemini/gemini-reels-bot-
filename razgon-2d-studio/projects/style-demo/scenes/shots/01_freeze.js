// shots/01_freeze.js — "What if you could stop time?" demo: rainy street → snap → frozen world.
import { E, V, registerShot, mood, layer, blurLayer, veil, ease, prog, clamp, lerp, wordTime, glow, alpha, circle } from '/engine/core.js';
import { drawFigure, POSES, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import { camPath, travel, drift, camAdd, spring, impact, posesSpring, fg, kText } from '/engine/motion.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { street, streetGround, car } from '../sets/street.js';
import { YOU } from '../cast.js';

// local time (seconds into this shot) of a spoken word, or a fallback
const wt = (word, t, info, fb) => { const T0 = info.globalT - t, w = wordTime(word, T0); return w == null || !isFinite(w) ? fb : w - T0; };

const rimN = (M, dir = [0.4, -1]) => ({ color: M.rim, dir, w: 5 });
const rainOn = (g, t, a = 0.32) => FX.rain(g, t, { count: 320, a, color: '#c4d2ff' });

// s001 — "Imagine you could stop time."  wide, crane down from the moon onto YOU under the lamp
registerShot('s001', { draw(g, t, info) {
  const cam = camPath(t, [[0, { z: 1.0, x: 60, y: -120 }], [info.dur * 0.6, { z: 1.06, x: 10, y: -20 }], [info.dur, { z: 1.09, x: 0, y: 0 }]]);
  const { GY, CX, M } = street(g, t, cam);
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: CX + 30, y: GY, s: 1.15, facing: 1, outfit: YOU, pose: breathe(POSES.relaxed, t), expr: 'thinking', rim: rimN(M, [0.6, -1]), blink: (t % 3.1) > 3.0 });
    for (const [x, ph] of [[CX - 560, 0.2], [CX + 520, 1.4], [CX - 300, 2.2]]) drawFigure(g, { x: x + t * 60, y: GY, s: 0.95, facing: 1, pose: walkPose((t + ph) * Math.PI * 2 * 0.9), expr: 'neutral', rim: rimN(M), dim: 0.2 });
  });
  rainOn(g, t);
  fg(g, cam, (g) => FX.lampPost(g, E.W * 0.06, E.H + 40, E.H * 1.1, { light: M.practical, a: 0.1 }), { depth: 1.8, blur: 14 });
} });

// s002 — "You snap your fingers, and the whole world freezes."  medium: hand up → SNAP → rings, rain stops
registerShot('s002', { draw(g, t, info) {
  const tSnap = wt('snap', t, info, 0.9);
  const tFreeze = wt('freezes', t, info, 2.6);
  const hit = impact(t, tSnap, { amp: 10, decay: 7 });
  const cam = camAdd(camPath(t, [[0, { z: 1.45, x: 0, y: 40 }], [tSnap, { z: 1.55, x: -20, y: 30 }], [info.dur, { z: 1.62, x: -30, y: 20 }]]), hit);
  const { GY, CX, M } = street(g, t, cam);
  const frozen = t > tFreeze;
  layer(g, cam, 1, (g) => {
    const pose = posesSpring(t, [[0, POSES.relaxed], [tSnap - 0.35, POSES.pointUp]], { freq: 3, damp: 0.5 });
    drawFigure(g, { x: CX - 40, y: GY, s: 1.6, facing: 1, outfit: YOU, pose: breathe(pose, t), expr: t > tSnap ? 'determined' : 'thinking', rim: rimN(M, [0.6, -1]) });
    if (t > tSnap) FX.rings(g, CX + 40, GY - 360, t - tSnap, { count: 3, r0: 30, r1: 460, speed: 1.3, color: '#fff3e0', a: 0.7 * (1 - prog(t, tSnap, tSnap + 1.6)) });
  });
  if (frozen) { veil(g, '#4a6aa0', 0.18 * prog(t, tFreeze, tFreeze + 0.3), 'multiply'); FX.drops(g, t - tFreeze, { count: 90, rMin: 2, rMax: 9, drift: 1 }); }
  else rainOn(g, t);
  if (t > tSnap) glow(g, CX + 40, GY - 360, 220 * (1 - prog(t, tSnap, tSnap + 0.5)), '#ffffff', 0.8);
} });

// s003 — "The rain hangs in the air."  macro: frozen drops in front of the lamp, slow drift, time badge
registerShot('s003', { draw(g, t, info) {
  const cam = camAdd({ z: 1.0 + 0.05 * travel(t, 0, info.dur), x: -40 * travel(t, 0, info.dur) }, drift(t, 5, 3));
  blurLayer(g, 18, (g) => street(g, t, { z: 2.2, x: -620, y: -180 }));
  veil(g, '#0a1024', 0.35); veil(g, '#4a6aa0', 0.15, 'multiply');
  const M = mood('night');
  glow(g, E.W * 0.62, E.H * 0.32, 320, M.practical, 0.45);
  layer(g, cam, 1, (g) => FX.drops(g, t, { seed: 7, count: 70, rMin: 6, rMax: 34, drift: 3 }));
  blurLayer(g, 8, (g) => FX.drops(g, t, { seed: 9, count: 12, rMin: 40, rMax: 80, drift: 2 }), cam, 1.7);
  UI.badge(g, { str: 'TIME: 0.00×', a: ease.out(prog(t, 0.3, 0.8)) });
} });

// s004 — "The cars stop in the middle of the street."  wide: car frozen mid-street, headlights hanging
registerShot('s004', { draw(g, t, info) {
  const cam = camAdd(camPath(t, [[0, { z: 1.05, x: 120 }], [info.dur, { z: 1.12, x: 40 }]]), drift(t, 3, 5));
  const { GY, CX, M } = street(g, t, cam);
  veil(g, '#4a6aa0', 0.15, 'multiply');
  layer(g, cam, 0.95, (g) => {
    car(g, CX - 80, GY + V(150, 190), 1.4, { color: '#121019' });
    FX.lightCone(g, CX + 120, GY + V(85, 120), { angle: 0.05, spread: 0.35, len: 900, color: '#ffe9c0', a: 0.22 });
    car(g, CX + 900, GY + V(110, 150), 1.2, { color: '#16131e', facing: -1 });
  });
  layer(g, cam, 1, (g) => drawFigure(g, { x: CX - 620, y: GY, s: 1.0, facing: 1, outfit: YOU, pose: walkPose(1.2), expr: 'awe', rim: rimN(M, [0.8, -0.6]) }));
  FX.drops(g, 0, { seed: 11, count: 80, rMin: 2, rMax: 8, drift: 0 });
  UI.callout(g, t, { at: [CX + 40, GY + V(60, 90)], to: [CX + 260, GY - V(160, 220)], str: '0 KM/H', start: 0.5 });
} });

// s005 — "Everyone around you is frozen."  crowd frozen mid-step; only YOU moves through them
registerShot('s005', { draw(g, t, info) {
  const cam = camPath(t, [[0, { z: 1.25, x: -160 }], [info.dur, { z: 1.32, x: 80 }]]);
  const { GY, CX, M } = street(g, t, cam);
  veil(g, '#4a6aa0', 0.2, 'multiply');
  layer(g, cam, 1, (g) => {
    [[-520, 0.3, 1], [-300, 2.1, -1], [-80, 4.0, 1], [380, 1.2, -1], [600, 3.3, 1]].forEach(([dx, ph, f]) => drawFigure(g, { x: CX + dx, y: GY, s: 1.25, facing: f, pose: walkPose(ph), expr: 'neutral', rim: rimN(M), dim: 0.15 }));
    const k = travel(t, 0.2, info.dur, { accel: 0.25, brake: 0.4 });
    drawFigure(g, { x: lerp(CX - 700, CX + 180, k), y: GY, s: 1.25, facing: 1, outfit: YOU, pose: walkPose(t * Math.PI * 2 * 0.9), expr: 'awe', rim: rimN(M, [0.6, -1]) });
  });
  FX.drops(g, 0, { seed: 13, count: 70, rMin: 2, rMax: 8, drift: 0 });
} });

// s006 — "Everyone, except you."  giant face, smirk on "you", frozen drops around the head
registerShot('s006', { draw(g, t, info) {
  blurLayer(g, 14, (g) => street(g, t, { z: 1.6, x: 180, y: -140 })); veil(g, '#0a0e20', 0.4); veil(g, '#4a6aa0', 0.15, 'multiply');
  const M = mood('night'), tYou = wt('you', t, info, 1.2);
  const sp = spring(t, 0, { freq: 2.2, damp: 0.6 });
  const r = V(300, 330) * (0.94 + 0.06 * sp) * (1 + 0.04 * t);
  bigFace(g, E.W / 2, E.H * V(0.6, 0.55), r, { outfit: YOU, expr: t > tYou ? 'smirk' : 'awe', look: [0.15, -0.1], rimColor: M.rim, rimSide: 1, blink: (t % 2.9) > 2.8 });
  FX.drops(g, t, { seed: 17, count: 40, rMin: 3, rMax: 14, drift: 2 });
} });

// s007 — "So what would you do first?"  end question
registerShot('s007', { draw(g, t) {
  UI.endScreen(g, t, { question: 'What would YOU do first?', cast: [YOU] });
} });
