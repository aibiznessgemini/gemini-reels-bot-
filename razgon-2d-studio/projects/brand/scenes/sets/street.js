// sets/street.js — rainy night street: lit facades, lamp posts with cones, wet road. Reusable: street(g, t, cam, o).
import { E, V, mood, layer, backdrop, rr, circle, linGrad, glow, alpha, shade, mix } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';

export const streetGround = () => E.H * V(0.8, 0.68);
export function car(g, x, GY, s = 1, o = {}) {
  const c = o.color || '#0f0d16', lit = o.lights ?? true;
  g.save(); g.translate(x, GY); g.scale(s * (o.facing ?? 1), s);
  rr(g, -150, -78, 300, 56, 18); g.fillStyle = c; g.fill();
  rr(g, -92, -122, 170, 54, 20); g.fill();
  g.fillStyle = alpha('#9fb8ff', 0.18); rr(g, -80, -114, 70, 36, 8); g.fill(); rr(g, -2, -114, 66, 36, 8); g.fill();
  for (const wx of [-92, 92]) { circle(g, wx, -22, 30, '#07060b'); circle(g, wx, -22, 12, '#2a2734'); }
  if (lit) { circle(g, 142, -56, 9, '#fff4d8'); glow(g, 150, -56, 90, '#ffe7b0', 0.7); circle(g, -146, -56, 7, '#ff4a3a'); glow(g, -150, -56, 50, '#ff4a3a', 0.6); }
  g.restore();
}
export function street(g, t, cam, o = {}) {
  const M = mood(o.mood || 'night'), GY = streetGround(), CX = E.W / 2;
  const wall = shade(M.wall, -0.25), wallDark = shade(M.wall, -0.55);
  layer(g, cam, 0.12, (g) => {
    backdrop(g, M.sky);
    FX.stars(g, t, { area: [-E.W, 0, E.W * 3, GY * 0.5], count: 90, color: '#dfe6ff' });
    FX.moon(g, CX + V(560, 260), GY - V(700, 1100), 46, '#eef1ff');
    FX.skyline(g, { x: -E.W, y: GY - V(380, 640), w: E.W * 3, minH: 120, maxH: V(330, 520), color: mix(M.sky[1], wallDark, 0.7), windowColor: alpha(M.practical, 0.55), lit: 0.22, seed: 21 });
  });
  layer(g, cam, 0.5, (g) => {
    const xs = [-1500, -980, -460, 60, 580, 1100, 1620];
    xs.forEach((dx, i) => FX.facade(g, { x: CX + dx - 260, y: GY, w: 500, h: V(420 + (i % 3) * 70, 700 + (i % 3) * 90), color: i % 2 ? wall : shade(wall, -0.12), win: M.practical, dark: wallDark, cols: 4, rows: 3, lit: 0.45, seed: 40 + i, door: i % 3 === 1 }));
  });
  layer(g, cam, 0.85, (g) => {
    g.fillStyle = linGrad(g, 0, GY, 0, GY + 500, [shade(M.road, -0.05), shade(M.dark, -0.3)]); g.fillRect(-E.W, GY, E.W * 3, E.H * 2);
    g.fillStyle = shade(M.road, 0.08); g.fillRect(-E.W, GY - 6, E.W * 3, 10);                      // kerb
    for (let x = -E.W; x < E.W * 2; x += 260) { g.fillStyle = alpha('#e8e4dc', 0.22); g.fillRect(x, GY + V(120, 160), 120, 8); } // lane marks
    for (const i of [-2, -1, 0, 1, 2]) { const lx = CX + i * 620 + 120; FX.lampPost(g, lx, GY, V(360, 520), { light: M.practical, a: 0.2 }); FX.pool(g, lx + 37, GY + 40, 220, 40, M.practical, 0.28); }
    for (const i of [-2, -1, 0, 1, 2]) FX.pool(g, CX + i * 620 + 160, GY + V(200, 260), 90, 220, M.practical, 0.06);       // wet reflections
  });
  return { GY, CX, M };
}
