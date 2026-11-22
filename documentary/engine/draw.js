// draw.js — reusable drawing kit for documentary boards (papers, gray text lines, tape, B&W photos,
// portraits, cut-outs with red/cyan edges, blueprints, vintage maps, ornate frames).
import { rng, hash, makeCanvas, clamp, lerp } from './engine.js';

export const INK = '#17140f', RED = '#d42a1f', YEL = '#ffd600', PAPER = '#efe6d2', LINE = 'rgba(70,62,50,0.30)';

export function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function text(g, s, x, y, size, font = 'OldStd', color = INK, align = 'left', weight = '', base = 'alphabetic') {
  g.font = `${weight} ${size}px ${font}`.trim(); g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y);
}
export function fitText(g, s, x, y, maxW, size, font, color, align = 'left', weight = '') {
  g.font = `${weight} ${size}px ${font}`.trim(); const w = g.measureText(s).width; const k = Math.min(1, maxW / w);
  text(g, s, x, y, size * k, font, color, align, weight);
}

// aged paper sheet; edge: 'clean' | 'torn' | 'deckle'
export function paper(g, w, h, o = {}) {
  const r = rng(o.seed ?? hash(w + 'x' + h)), col = o.color || PAPER;
  g.save();
  g.beginPath();
  if (o.edge === 'torn' || o.edge === 'deckle') {
    const amp = o.edge === 'torn' ? 9 : 3.5, step = o.edge === 'torn' ? 14 : 8;
    const torn = o.tornSides || 'trbl';
    const side = (k, x0, y0, x1, y1, nx, ny, first) => { const A = torn.includes(k) ? amp : 0, L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / step)); for (let i = first ? 0 : 1; i <= n; i++) { const u = i / n, j = (r() - 0.5) * 2 * A * (i === 0 || i === n ? 0.2 : 1); const x = lerp(x0, x1, u) + nx * j, y = lerp(y0, y1, u) + ny * j; i === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } };
    side('t', 0, 0, w, 0, 0, 1, true); side('r', w, 0, w, h, 1, 0); side('b', w, h, 0, h, 0, 1); side('l', 0, h, 0, 0, 1, 0);
    g.closePath();
  } else g.rect(0, 0, w, h);
  g.fillStyle = col; g.fill(); g.clip();
  // uneven tone
  for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, rad = (0.15 + r() * 0.5) * Math.max(w, h); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(150,120,70,0.07)' : 'rgba(255,255,245,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  // edge burn
  if (o.aged !== false) {
    const e = Math.min(w, h) * 0.16;
    for (const [x0, y0, x1, y1] of [[0, 0, e, 0], [w, 0, w - e, 0], [0, 0, 0, e], [0, h, 0, h - e]]) {
      const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, `rgba(120,85,40,${o.burn ?? 0.22})`); lg.addColorStop(1, 'rgba(120,85,40,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
    }
  }
  // specks + fibres
  for (let i = 0; i < w * h / 900; i++) { g.fillStyle = `rgba(80,60,35,${0.05 + r() * 0.12})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
  if (o.fold) { const x = w * (0.45 + r() * 0.1); const lg = g.createLinearGradient(x - 14, 0, x + 14, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, 'rgba(90,70,40,0.16)'); lg.addColorStop(0.55, 'rgba(255,255,255,0.18)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(x - 14, 0, 28, h); }
  g.restore();
}

// placeholder text: light gray lines that read as "paper", never as words
export function lines(g, x, y, w, h, o = {}) {
  const r = rng(o.seed ?? hash([x, y, w, h].join())), lh = o.lh || 22, th = o.th || 8, cols = o.cols || 1, gut = o.gutter || 28;
  const cw = (w - gut * (cols - 1)) / cols; g.fillStyle = o.color || LINE;
  for (let c = 0; c < cols; c++) {
    let yy = y, k = 0, para = 3 + Math.floor(r() * 4);
    while (yy + th <= y + h) {
      const last = ++k % para === 0; const lw = last ? cw * (0.3 + r() * 0.4) : cw * (0.9 + r() * 0.1);
      rr(g, x + c * (cw + gut), yy, lw, th, th / 2); g.fill();
      yy += lh; if (last) { yy += lh * 0.5; para = 3 + Math.floor(r() * 4); }
    }
  }
}
export function tape(g, x, y, w, h, rot = 0, seed = 1) {
  const r = rng(seed); g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(-w / 2, -h / 2); for (let i = 0; i <= 6; i++) g.lineTo(-w / 2 + w * i / 6, -h / 2 + (r() - 0.5) * 3);
  for (let i = 0; i <= 5; i++) g.lineTo(w / 2 + (r() - 0.5) * 6, -h / 2 + h * i / 5);
  for (let i = 6; i >= 0; i--) g.lineTo(-w / 2 + w * i / 6, h / 2 + (r() - 0.5) * 3);
  for (let i = 5; i >= 0; i--) g.lineTo(-w / 2 + (r() - 0.5) * 6, -h / 2 + h * i / 5);
  g.closePath(); g.fillStyle = 'rgba(232,218,170,0.82)'; g.fill(); g.strokeStyle = 'rgba(160,140,90,0.35)'; g.lineWidth = 1; g.stroke(); g.restore();
}

// ---------- photos ----------
// render drawFn into an offscreen canvas, then make it an old B&W print (gray, contrast, grain, soft)
export function bwPhoto(w, h, drawFn, o = {}) {
  const s = 1, c = makeCanvas(w * s, h * s), g = c.getContext('2d'); g.scale(s, s);
  drawFn(g, w, h);
  const c2 = makeCanvas(w * s, h * s), g2 = c2.getContext('2d');
  g2.filter = `grayscale(1) contrast(${o.contrast ?? 1.15}) blur(${o.soft ?? 1.1}px)`; g2.drawImage(c, 0, 0); g2.filter = 'none';
  const id = g2.getImageData(0, 0, c2.width, c2.height), d = id.data, r = rng(o.seed ?? 3), tint = o.tint || [1, 0.98, 0.93];
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * (o.grain ?? 34); for (let k = 0; k < 3; k++) d[i + k] = clamp(d[i + k] + n, 0, 255) * tint[k]; }
  g2.putImageData(id, 0, 0);
  return c2;
}
// a real archive photo (HTMLImageElement) as an old B&W print: cover-cropped, grain, soft, warm paper tint.
//   focus: [fx, fy] 0..1 point of the image to keep in the crop centre
export function photoPrint(img, w, h, o = {}) {
  return bwPhoto(w, h, (g, W2, H2) => {
    const k = Math.max(W2 / img.width, H2 / img.height) * (o.zoom || 1), iw = img.width * k, ih = img.height * k;
    const [fx, fy] = o.focus || [0.5, 0.5];
    g.drawImage(img, clamp(W2 / 2 - iw * fx, W2 - iw, 0), clamp(H2 / 2 - ih * fy, H2 - ih, 0), iw, ih);
  }, { seed: o.seed ?? 5, soft: o.soft ?? 0.6, grain: o.grain ?? 26, contrast: o.contrast ?? 1.1, tint: o.tint });
}
// stylised bust portrait (drawn in grays; pass to bwPhoto). opts: hat 'bowler'|'cap'|'beret'|'homburg', mustache, beard, hair, glasses, coat, bg, light
export function portrait(g, w, h, o = {}) {
  const bgc = o.bg || ['#8c8c88', '#3a3a38'];
  const gr = g.createRadialGradient(w * 0.38, h * 0.3, 0, w * 0.5, h * 0.5, h * 0.8); gr.addColorStop(0, bgc[0]); gr.addColorStop(1, bgc[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const cx = w * (o.cx ?? 0.5), hy = h * (o.hy ?? 0.4), hr = w * (o.head ?? 0.17);
  // shoulders / coat
  g.fillStyle = o.coat || '#222'; g.beginPath(); g.moveTo(cx - w * 0.48, h * 1.02); g.bezierCurveTo(cx - w * 0.46, h * 0.76, cx - w * 0.3, hy + hr * 1.55, cx - hr * 0.45, hy + hr * 1.3);
  g.lineTo(cx + hr * 0.45, hy + hr * 1.3); g.bezierCurveTo(cx + w * 0.3, hy + hr * 1.55, cx + w * 0.46, h * 0.76, cx + w * 0.48, h * 1.02); g.closePath(); g.fill();
  if (o.smock) { g.fillStyle = '#e8e8e4'; g.fill(); }
  // shirt collar + tie
  g.fillStyle = o.shirt || '#d8d8d4'; g.beginPath(); g.moveTo(cx - hr * 0.55, hy + hr * 1.2); g.lineTo(cx, hy + hr * 2.3); g.lineTo(cx + hr * 0.55, hy + hr * 1.2); g.closePath(); g.fill();
  if (o.tie !== false) { g.fillStyle = o.tieColor || '#333'; g.beginPath(); g.moveTo(cx - hr * 0.12, hy + hr * 1.35); g.lineTo(cx + hr * 0.12, hy + hr * 1.35); g.lineTo(cx + hr * 0.18, hy + hr * 2.3); g.lineTo(cx, hy + hr * 2.45); g.lineTo(cx - hr * 0.18, hy + hr * 2.3); g.closePath(); g.fill(); }
  // lapels
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - hr * 0.6, hy + hr * 1.25); g.lineTo(cx - hr * 0.1, hy + hr * 2.6); g.moveTo(cx + hr * 0.6, hy + hr * 1.25); g.lineTo(cx + hr * 0.1, hy + hr * 2.6); g.stroke();
  // neck
  g.fillStyle = '#8a8580'; g.fillRect(cx - hr * 0.42, hy + hr * 0.6, hr * 0.84, hr * 0.75);
  // ears
  g.fillStyle = '#9a948e'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * hr * 0.95, hy + hr * 0.12, hr * 0.17, hr * 0.28, 0, 0, 6.28); g.fill(); }
  // head
  const hg = g.createRadialGradient(cx - hr * 0.35, hy - hr * 0.3, hr * 0.1, cx, hy, hr * 1.25); hg.addColorStop(0, '#d6d0c8'); hg.addColorStop(0.6, '#a49d95'); hg.addColorStop(1, '#5e5852');
  g.fillStyle = hg; g.beginPath(); g.ellipse(cx, hy, hr * 0.92, hr * 1.18, 0, 0, 6.28); g.fill();
  // hair
  if (o.hair !== false) { const hc = o.hairColor || '#1e1c1a'; g.save(); g.beginPath(); g.ellipse(cx, hy, hr * 0.97, hr * 1.23, 0, 0, 6.28); g.clip(); g.fillStyle = hc; g.beginPath(); g.moveTo(cx - hr * 1.1, hy - hr * 0.02); g.quadraticCurveTo(cx - hr * 0.85, hy - hr * 0.72, cx - hr * 0.1, hy - hr * 0.68); g.quadraticCurveTo(cx + hr * 0.75, hy - hr * 0.8, cx + hr * 1.1, hy - hr * 0.1); g.lineTo(cx + hr * 1.1, hy - hr * 1.5); g.lineTo(cx - hr * 1.1, hy - hr * 1.5); g.closePath(); g.fill(); g.restore(); }
  // features (soft shadows)
  g.fillStyle = 'rgba(30,25,20,0.55)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * hr * 0.36, hy - hr * 0.05, hr * 0.17, hr * 0.09, 0, 0, 6.28); g.fill(); }
  g.fillStyle = 'rgba(40,35,30,0.45)'; g.fillRect(cx - hr * 0.5, hy - hr * 0.28, hr * 0.34, hr * 0.07); g.fillRect(cx + hr * 0.16, hy - hr * 0.28, hr * 0.34, hr * 0.07);
  g.fillStyle = 'rgba(40,35,30,0.35)'; g.beginPath(); g.moveTo(cx + hr * 0.02, hy - hr * 0.02); g.lineTo(cx + hr * 0.16, hy + hr * 0.36); g.lineTo(cx - hr * 0.06, hy + hr * 0.38); g.closePath(); g.fill();
  if (o.mustache) { g.fillStyle = o.hairColor || '#1e1c1a'; g.beginPath(); g.ellipse(cx - hr * 0.2, hy + hr * 0.5, hr * 0.28, hr * 0.1, 0.15, 0, 6.28); g.ellipse(cx + hr * 0.2, hy + hr * 0.5, hr * 0.28, hr * 0.1, -0.15, 0, 6.28); g.fill(); }
  else { g.fillStyle = 'rgba(50,35,30,0.45)'; g.fillRect(cx - hr * 0.25, hy + hr * 0.55, hr * 0.5, hr * 0.06); }
  if (o.beard) { g.fillStyle = o.hairColor || '#1e1c1a'; g.beginPath(); g.ellipse(cx, hy + hr * 0.78, hr * 0.62, hr * 0.48, 0, 0, Math.PI); g.fill(); }
  if (o.glasses) { g.strokeStyle = '#111'; g.lineWidth = hr * 0.05; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * hr * 0.37, hy - hr * 0.04, hr * 0.24, hr * 0.17, 0, 0, 6.28); g.stroke(); } }
  // hats
  const hat = o.hat; g.fillStyle = o.hatColor || '#141414';
  if (hat === 'bowler' || hat === 'homburg') { g.beginPath(); g.ellipse(cx, hy - hr * 0.72, hr * 1.35, hr * 0.2, 0, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(cx, hy - hr * 0.9, hr * 0.92, hr * 0.78, 0, Math.PI, 0); g.fill(); if (hat === 'homburg') { g.fillStyle = '#2c2c2c'; g.fillRect(cx - hr * 0.92, hy - hr * 0.98, hr * 1.84, hr * 0.16); } }
  if (hat === 'cap') { g.beginPath(); g.ellipse(cx, hy - hr * 0.72, hr * 1.06, hr * 0.42, -0.05, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.beginPath(); g.ellipse(cx + hr * 0.25, hy - hr * 0.6, hr * 1.0, hr * 0.14, 0.05, 0, 6.28); g.fill(); }
  if (hat === 'beret') { g.beginPath(); g.ellipse(cx - hr * 0.1, hy - hr * 0.85, hr * 1.12, hr * 0.42, -0.12, 0, 6.28); g.fill(); }
  // rim light
  g.globalCompositeOperation = 'screen'; const rl = g.createLinearGradient(cx - hr * 1.2, 0, cx - hr * 0.6, 0); rl.addColorStop(0, 'rgba(255,255,255,0.25)'); rl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rl; g.beginPath(); g.ellipse(cx, hy, hr * 0.92, hr * 1.18, 0, 0, 6.28); g.fill(); g.globalCompositeOperation = 'source-over';
}
// polaroid / print with a photo inside and a handwritten caption
export function polaroid(g, w, h, photo, o = {}) {
  const b = w * 0.06, bottom = o.caption ? h * 0.2 : b;
  paper(g, w, h, { color: o.frame || '#f4f1ea', seed: o.seed, burn: 0.12 });
  g.drawImage(photo, b, b, w - 2 * b, h - b - bottom);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.strokeRect(b, b, w - 2 * b, h - b - bottom);
  if (o.caption) fitText(g, o.caption, w / 2, h - bottom * 0.38, w - 2 * b, o.capSize || bottom * 0.5, 'Marker', o.capColor || INK, 'center');
}
// sticker cut-out with white border + red/cyan offset edges (as in the reference newspaper look)
export function cutout(src, o = {}) {
  const bw = o.border ?? 7, rgb = o.rgb ?? 5, P = bw + rgb + 4, c = makeCanvas(src.width + 2 * P, src.height + 2 * P), g = c.getContext('2d');
  const tint = (col) => { const t = makeCanvas(src.width, src.height), tg = t.getContext('2d'); tg.drawImage(src, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, t.width, t.height); return t; };
  const red = tint('#e8232a'), cyan = tint('#1ec8e0'), white = tint(o.borderColor || '#f6f4ee');
  g.globalAlpha = 0.9; g.drawImage(red, P - rgb - bw * 0.5, P - 1); g.drawImage(cyan, P + rgb + bw * 0.5, P + 1); g.globalAlpha = 1;
  for (let a = 0; a < 16; a++) g.drawImage(white, P + Math.cos(a / 16 * 6.28) * bw, P + Math.sin(a / 16 * 6.28) * bw);
  g.drawImage(src, P, P);
  return c;
}

// ---------- the painting ----------
const mlCache = new Map();
export function monaLisa(w, h) {
  const key = `${w}x${h}`; if (mlCache.has(key)) return mlCache.get(key);
  const c = makeCanvas(w, h), g = c.getContext('2d'), r = rng(42);
  // sky / landscape
  let lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, '#c2bd8c'); lg.addColorStop(0.25, '#9ea47e'); lg.addColorStop(0.5, '#6e7a5f'); lg.addColorStop(1, '#3d3a28'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.filter = `blur(${w * 0.012}px)`;
  g.fillStyle = '#5d6c5d'; g.beginPath(); g.moveTo(0, h * 0.2); g.bezierCurveTo(w * 0.1, h * 0.12, w * 0.22, h * 0.22, w * 0.3, h * 0.3); g.lineTo(w * 0.3, h * 0.6); g.lineTo(0, h * 0.6); g.fill();
  g.fillStyle = '#6a7866'; g.beginPath(); g.moveTo(w, h * 0.18); g.bezierCurveTo(w * 0.85, h * 0.14, w * 0.78, h * 0.24, w * 0.7, h * 0.3); g.lineTo(w * 0.7, h * 0.6); g.lineTo(w, h * 0.6); g.fill();
  g.fillStyle = '#a8ae8c'; g.beginPath(); g.ellipse(w * 0.86, h * 0.33, w * 0.16, h * 0.025, 0, 0, 6.28); g.fill();
  g.strokeStyle = '#a07a48'; g.lineWidth = w * 0.02; g.beginPath(); g.moveTo(w * 0.05, h * 0.5); g.bezierCurveTo(w * 0.2, h * 0.44, w * 0.08, h * 0.4, w * 0.22, h * 0.36); g.stroke();
  g.filter = 'none';
  // figure — dress (shoulders, low neckline)
  g.filter = `blur(${w * 0.006}px)`;
  const cx = w * 0.49;
  g.fillStyle = '#211810'; g.beginPath(); g.moveTo(w * 0.33, h * 0.44); g.bezierCurveTo(w * 0.2, h * 0.47, w * 0.1, h * 0.56, w * 0.04, h * 1.02); g.lineTo(w * 0.98, h * 1.02); g.bezierCurveTo(w * 0.92, h * 0.6, w * 0.82, h * 0.47, w * 0.66, h * 0.44); g.closePath(); g.fill();
  // hair (behind the face): crown + thin strands falling to the shoulders
  g.fillStyle = '#2a1b0e';
  g.beginPath(); g.ellipse(cx, h * 0.245, w * 0.155, h * 0.125, 0, 0, 6.28); g.fill();
  g.beginPath(); g.moveTo(w * 0.36, h * 0.2); g.bezierCurveTo(w * 0.3, h * 0.3, w * 0.31, h * 0.42, w * 0.27, h * 0.5); g.lineTo(w * 0.36, h * 0.47); g.bezierCurveTo(w * 0.37, h * 0.4, w * 0.37, h * 0.32, w * 0.385, h * 0.26); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(w * 0.62, h * 0.2); g.bezierCurveTo(w * 0.68, h * 0.3, w * 0.67, h * 0.42, w * 0.72, h * 0.5); g.lineTo(w * 0.62, h * 0.47); g.bezierCurveTo(w * 0.61, h * 0.4, w * 0.61, h * 0.32, w * 0.595, h * 0.26); g.closePath(); g.fill();
  // neck + chest (warm skin, light from the left)
  const sk = g.createLinearGradient(w * 0.32, 0, w * 0.68, 0); sk.addColorStop(0, '#e9c98f'); sk.addColorStop(0.6, '#d3a96b'); sk.addColorStop(1, '#a27443');
  g.fillStyle = sk; g.fillRect(w * 0.43, h * 0.34, w * 0.125, h * 0.12);
  g.beginPath(); g.moveTo(w * 0.33, h * 0.445); g.quadraticCurveTo(w * 0.49, h * 0.41, w * 0.66, h * 0.445); g.quadraticCurveTo(w * 0.5, h * 0.565, w * 0.33, h * 0.445); g.fill();
  // face
  const fg = g.createRadialGradient(cx - w * 0.04, h * 0.25, w * 0.01, cx + w * 0.01, h * 0.28, w * 0.16); fg.addColorStop(0, '#f2d8a2'); fg.addColorStop(0.65, '#ddb377'); fg.addColorStop(1, '#a87b45');
  g.fillStyle = fg; g.beginPath(); g.ellipse(cx, h * 0.27, w * 0.122, h * 0.118, 0, 0, 6.28); g.fill();
  g.filter = `blur(${w * 0.0035}px)`;
  // brows/eyes, nose, the smile
  g.fillStyle = 'rgba(70,40,18,0.75)'; for (const ex of [cx - w * 0.048, cx + w * 0.05]) { g.beginPath(); g.ellipse(ex, h * 0.255, w * 0.024, h * 0.0075, 0, 0, 6.28); g.fill(); }
  g.fillStyle = 'rgba(120,80,40,0.25)'; for (const ex of [cx - w * 0.048, cx + w * 0.05]) { g.beginPath(); g.ellipse(ex, h * 0.247, w * 0.04, h * 0.016, 0, 0, 6.28); g.fill(); }
  g.fillStyle = 'rgba(120,75,35,0.35)'; g.beginPath(); g.moveTo(cx + w * 0.004, h * 0.262); g.lineTo(cx + w * 0.022, h * 0.302); g.lineTo(cx - w * 0.012, h * 0.304); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(105,55,30,0.7)'; g.lineWidth = w * 0.0055; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - w * 0.04, h * 0.325); g.bezierCurveTo(cx - w * 0.015, h * 0.333, cx + w * 0.02, h * 0.332, cx + w * 0.042, h * 0.322); g.stroke();
  g.fillStyle = 'rgba(160,100,60,0.18)'; g.beginPath(); g.ellipse(cx, h * 0.355, w * 0.05, h * 0.02, 0, 0, 6.28); g.fill();
  // veil + centre parting
  g.strokeStyle = 'rgba(25,14,6,0.55)'; g.lineWidth = w * 0.004; g.beginPath(); g.ellipse(cx, h * 0.27, w * 0.135, h * 0.135, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
  g.strokeStyle = 'rgba(200,160,110,0.25)'; g.beginPath(); g.moveTo(cx, h * 0.135); g.lineTo(cx, h * 0.17); g.stroke();
  // sleeves and the folded hands
  g.filter = `blur(${w * 0.005}px)`;
  g.fillStyle = '#6e4e24'; g.beginPath(); g.moveTo(w * 0.1, h * 0.66); g.bezierCurveTo(w * 0.3, h * 0.74, w * 0.55, h * 0.78, w * 0.8, h * 0.76); g.lineTo(w * 0.86, h * 0.88); g.bezierCurveTo(w * 0.55, h * 0.92, w * 0.25, h * 0.9, w * 0.06, h * 0.82); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(30,20,8,0.45)'; g.lineWidth = w * 0.006; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(w * (0.12 + i * 0.08), h * (0.7 + i * 0.008)); g.lineTo(w * (0.16 + i * 0.08), h * (0.86 + i * 0.004)); g.stroke(); }
  const hg = g.createLinearGradient(w * 0.4, h * 0.78, w * 0.85, h * 0.88); hg.addColorStop(0, '#efcf98'); hg.addColorStop(1, '#b8874f');
  g.fillStyle = hg; g.beginPath(); g.ellipse(w * 0.6, h * 0.8, w * 0.17, h * 0.03, -0.1, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(w * 0.7, h * 0.835, w * 0.15, h * 0.028, 0.06, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(120,80,40,0.4)'; g.lineWidth = w * 0.004; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(w * (0.72 + i * 0.035), h * 0.818); g.lineTo(w * (0.75 + i * 0.035), h * 0.85); g.stroke(); }
  g.filter = 'none';
  // varnish, craquelure, darkened edges
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(214,190,120,0.45)'; g.fillRect(0, 0, w, h);
  const vg = g.createRadialGradient(w * 0.5, h * 0.42, h * 0.22, w * 0.5, h * 0.5, h * 0.78); vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, 'rgba(70,55,30,1)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(30,20,5,0.12)'; g.lineWidth = Math.max(0.6, w * 0.0015);
  for (let i = 0; i < 260; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * w * 0.06; y += (r() - 0.5) * w * 0.06; g.lineTo(x, y); } g.stroke(); }
  mlCache.set(key, c); return c;
}
export function ornateFrame(g, x, y, w, h, t, o = {}) {
  const gold = g.createLinearGradient(x, y, x + w, y + h); gold.addColorStop(0, '#d9b45a'); gold.addColorStop(0.35, '#8a6420'); gold.addColorStop(0.6, '#e8c770'); gold.addColorStop(1, '#6e4c16');
  g.save(); g.fillStyle = gold; g.beginPath(); g.rect(x, y, w, h); g.rect(x + t, y + t, w - 2 * t, h - 2 * t); g.fill('evenodd');
  g.strokeStyle = 'rgba(60,35,5,0.6)'; g.lineWidth = 2;
  for (let k = 0.18; k < 1; k += 0.27) g.strokeRect(x + t * k, y + t * k, w - 2 * t * k, h - 2 * t * k);
  const r = rng(o.seed || 5); g.fillStyle = 'rgba(255,240,180,0.35)';
  for (let i = 0; i < (w + h) / 9; i++) { const side = r(); let px, py; if (side < 0.25) { px = x + r() * w; py = y + t * 0.5; } else if (side < 0.5) { px = x + r() * w; py = y + h - t * 0.5; } else if (side < 0.75) { px = x + t * 0.5; py = y + r() * h; } else { px = x + w - t * 0.5; py = y + r() * h; } g.beginPath(); g.arc(px, py, t * 0.08, 0, 6.28); g.fill(); }
  g.restore();
}

// ---------- blueprint ----------
export function blueprint(g, w, h, o = {}) {
  const r = rng(o.seed || 9);
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#3577bd'); bg.addColorStop(1, '#245c9c'); g.fillStyle = bg;
  g.beginPath(); g.moveTo(14, 0); g.lineTo(w - 10, 3); g.lineTo(w, h - 12); g.lineTo(6, h); g.closePath(); g.fill(); g.save(); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1.2; const s = o.grid || 40;
  for (let x = 0; x < w; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rad = 60 + r() * 260; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(10,30,70,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  // creases
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2 + 6, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2 - 4); g.stroke();
  g.restore();
}
export function bpStyle(g, lw = 4, a = 0.9) { g.strokeStyle = `rgba(240,248,255,${a})`; g.fillStyle = `rgba(240,248,255,${a})`; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; }

// ---------- vintage map (ref: crackled blue sea, orange land with contour lines) ----------
export function vintageMap(g, w, h, polys, o = {}) {
  const r = rng(o.seed || 21);
  // sea
  const sea = g.createLinearGradient(0, 0, w, h); sea.addColorStop(0, '#6f9fcf'); sea.addColorStop(1, '#4e82b8'); g.fillStyle = sea; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h, rad = 80 + r() * 300, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(20,50,90,0.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
  // crackle network
  const cell = o.cell || 70, cols = Math.ceil(w / cell) + 2, rows = Math.ceil(h / cell) + 2, P = [];
  for (let j = 0; j < rows; j++) { P.push([]); for (let i = 0; i < cols; i++) P[j].push([(i - 0.5 + (r() - 0.5) * 0.8) * cell, (j - 0.5 + (r() - 0.5) * 0.8) * cell]); }
  g.strokeStyle = 'rgba(25,45,75,0.55)'; g.lineWidth = 2.2;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (i < cols - 1 && r() < 0.85) { g.beginPath(); g.moveTo(...P[j][i]); g.lineTo(...P[j][i + 1]); g.stroke(); }
    if (j < rows - 1 && r() < 0.85) { g.beginPath(); g.moveTo(...P[j][i]); g.lineTo(...P[j + 1][i]); g.stroke(); }
  }
  for (let k = 0; k < 40; k++) { const j = 1 + Math.floor(r() * (rows - 2)), i = 1 + Math.floor(r() * (cols - 2)); g.fillStyle = 'rgba(35,60,95,0.45)'; g.beginPath(); g.moveTo(...P[j][i]); g.lineTo(...P[j][i + 1]); g.lineTo(...P[j + 1][i + 1]); g.lineTo(...P[j + 1][i]); g.fill(); }
  // land
  const path = (pts) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
  for (const pts of polys) {
    g.save(); path(pts); g.fillStyle = '#e2b88a'; g.fill(); g.clip();
    const lg = g.createLinearGradient(0, 0, w, h); lg.addColorStop(0, 'rgba(210,110,60,0.35)'); lg.addColorStop(1, 'rgba(240,200,140,0.2)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
    // contour rings (inner strokes of the coast)
    for (let k = 1; k <= 7; k++) { g.strokeStyle = `rgba(150,80,40,${0.22 - k * 0.022})`; g.lineWidth = k * 22; path(pts); g.stroke(); }
    // land crackle
    g.strokeStyle = 'rgba(110,60,30,0.35)'; g.lineWidth = 1.6;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols - 1; i++) if (r() < 0.5) { g.beginPath(); g.moveTo(...P[j][i]); g.lineTo(...P[j][i + 1]); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(70,40,20,0.85)'; g.lineWidth = 3; path(pts); g.stroke();
  }
  // paper sheen + edge burn
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,35,10,0.35)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
}
