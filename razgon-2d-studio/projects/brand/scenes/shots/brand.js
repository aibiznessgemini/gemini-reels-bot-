// brand.js — channel art for The You Experiment in the Razgon 2D look.
// b001 = banner (2560x1440; YouTube safe area = centre 1160x317 logical units), b002 = avatar (centre square crop).
import { E, registerShot, mood, layer, blurLayer, veil, text, alpha, rr, glow, FONTS, S } from '/engine/core.js';
import { drawFigure, POSES, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import { street } from '../sets/street.js';
import { YOU, SAM, DR } from '../cast.js';

registerShot('b001', { draw(g, t) {
  const cam = { z: 1.0, x: 0, y: -40 };
  const { GY, CX, M } = street(g, 0, cam, { mood: 'dusk' });
  const rim = (d) => ({ color: M.rim, dir: d, w: 5 });
  layer(g, cam, 1, (g) => {
    // extras outside the safe area, the cast at its edges
    [[-900, 1], [-830, 1], [780, -1], [890, -1]].forEach(([dx, f], i) => drawFigure(g, { x: CX + dx, y: GY, s: 1.05, facing: f, pose: [POSES.relaxed, POSES.crossArms, POSES.think, POSES.relaxed][i], expr: ['smile', 'smirk', 'thinking', 'happy'][i], rim: rim([0, -1]), dim: 0.15 }));
    drawFigure(g, { x: CX - 740, y: GY, s: 1.25, facing: 1, outfit: SAM, pose: POSES.cheer, expr: 'joy', rim: rim([0.6, -1]) });
    drawFigure(g, { x: CX + 660, y: GY, s: 1.25, facing: -1, outfit: DR, pose: POSES.explain, expr: 'smile', rim: rim([-0.6, -1]) });
    drawFigure(g, { x: CX - 640, y: GY, s: 1.35, facing: 1, outfit: YOU, pose: POSES.wave, expr: 'happy', rim: rim([0.6, -1]) });
  });
  FX.dust(g, 0.5, { count: 40, color: '#ffe2bd', a: 0.3 });
  // text inside the safe area (x 380–1540, y 381–698)
  const ui = S().ui;
  rr(g, CX - 560, 395, 1120, 290, 40); g.fillStyle = 'rgba(14,10,20,0.62)'; g.fill();
  rr(g, CX - 190, 410, 380, 52, 26); g.fillStyle = '#F2A541'; g.fill();
  text(g, 'NEW FILM EVERY DAY', CX, 437, { size: 28, color: '#120c10', font: FONTS.ui, weight: 900, spacing: 3 });
  text(g, 'THE YOU EXPERIMENT', CX, 540, { size: 92, color: ui.cream, glow: 34, glowColor: 'rgba(255,140,60,.8)', spacing: 4 });
  text(g, 'What if…? Starring you.', CX, 632, { size: 46, color: '#F2A541', font: FONTS.serif, weight: 900, italic: true, glow: 14, glowColor: 'rgba(255,170,90,.5)' });
} });

registerShot('b002', { draw(g, t) {
  blurLayer(g, 16, (g) => street(g, 0, { z: 1.5, x: -120, y: -160 }, { mood: 'dusk' }));
  veil(g, '#140c14', 0.35);
  const M = mood('dusk');
  glow(g, E.W / 2, E.H * 0.52, 520, '#F2A541', 0.18);
  bigFace(g, E.W / 2, E.H * 0.56, 330, { outfit: YOU, expr: 'happy', look: [0.1, -0.05], rimColor: M.rim, rimSide: 1 });
} });
