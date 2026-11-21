// Faces are drawn in 2D on a canvas and wrapped onto the front of the head,
// like the reference: thin dark lines, big readable expressions, rosy cheeks.
import * as THREE from "three";

export type Expression = "neutral" | "smug" | "happy" | "nervous" | "surprised" | "sleepy";

const cache = new Map<string, THREE.CanvasTexture>();

export const faceTexture = (expr: Expression, blink = false): THREE.CanvasTexture => {
  const key = `${expr}-${blink}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, S, S);
  g.strokeStyle = "#2A2233";
  g.fillStyle = "#2A2233";
  g.lineCap = "round";
  g.lineJoin = "round";
  const line = (w: number, pts: [number, number][]) => {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  };
  const curve = (w: number, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) => {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(cx, cy, x1, y1);
    g.stroke();
  };
  const eyeL = 196;
  const eyeR = 316;
  const eyeY = 250;
  const cheeks = () => {
    g.fillStyle = "rgba(240,120,130,0.35)";
    [eyeL - 26, eyeR + 26].forEach((x) => {
      g.beginPath();
      g.ellipse(x, eyeY + 52, 26, 15, 0, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = "#2A2233";
  };

  if (blink || expr === "sleepy") {
    [eyeL, eyeR].forEach((x) => curve(7, x - 20, eyeY, x, eyeY + 8, x + 20, eyeY));
  } else if (expr === "happy") {
    [eyeL, eyeR].forEach((x) => curve(8, x - 22, eyeY + 8, x, eyeY - 18, x + 22, eyeY + 8));
  } else if (expr === "smug") {
    [eyeL, eyeR].forEach((x) => {
      g.beginPath();
      g.ellipse(x, eyeY + 4, 22, 12, 0, 0, Math.PI);
      g.fill();
      line(6, [[x - 26, eyeY + 2], [x + 26, eyeY + 2]]);
    });
  } else if (expr === "surprised") {
    [eyeL, eyeR].forEach((x) => {
      g.beginPath();
      g.ellipse(x, eyeY, 13, 17, 0, 0, Math.PI * 2);
      g.fill();
    });
  } else {
    [eyeL, eyeR].forEach((x) => {
      g.beginPath();
      g.ellipse(x, eyeY, 10, 13, 0, 0, Math.PI * 2);
      g.fill();
    });
  }

  // brows carry most of the emotion
  if (expr === "nervous") {
    curve(6, eyeL - 22, eyeY - 34, eyeL, eyeY - 46, eyeL + 20, eyeY - 52);
    curve(6, eyeR - 20, eyeY - 52, eyeR, eyeY - 46, eyeR + 22, eyeY - 34);
  } else if (expr === "smug") {
    line(6, [[eyeL - 24, eyeY - 30], [eyeL + 22, eyeY - 38]]);
    curve(6, eyeR - 22, eyeY - 44, eyeR, eyeY - 54, eyeR + 24, eyeY - 40);
  } else if (expr === "surprised") {
    [eyeL, eyeR].forEach((x) => curve(6, x - 22, eyeY - 44, x, eyeY - 60, x + 22, eyeY - 44));
  } else if (expr !== "happy") {
    [eyeL, eyeR].forEach((x) => line(6, [[x - 20, eyeY - 40], [x + 20, eyeY - 40]]));
  }

  // mouth
  const my = 338;
  if (expr === "happy") {
    g.beginPath();
    g.moveTo(222, my - 10);
    g.quadraticCurveTo(256, my + 46, 290, my - 10);
    g.closePath();
    g.fill();
    cheeks();
  } else if (expr === "smug") {
    curve(6, 226, my, 262, my + 18, 300, my - 12);
  } else if (expr === "nervous") {
    g.lineWidth = 6;
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = 222 + i * 8.5;
      const y = my + (i % 2 ? -5 : 5);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  } else if (expr === "surprised") {
    g.beginPath();
    g.ellipse(256, my + 4, 14, 18, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    line(6, [[236, my], [276, my]]);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
};
