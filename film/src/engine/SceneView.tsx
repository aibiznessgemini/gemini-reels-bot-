// Turns one Scene from film.json into a 3D shot: places the cast, extras and
// camera for the chosen shot type, and splits sharp/blurred layers for DOF.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { Character, CharacterProps, Hair } from "../style3d/Character";
import { CameraRig, Lights } from "../style3d/Set";
import { Expression } from "../style3d/face";
import { SET_BG, SetPiece } from "./sets";
import { Action, CastMember, parseExpression, Scene } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const HOODIES = ["#5DA06F", "#D9667A", "#6C8FD9", "#E07B3C", "#9A7BD1", "#4FB3B0", "#C9C3B8", "#7C5C9E", "#3E8E7E", "#C04F5A"];
const HAIRS: Hair[] = ["none", "bowl", "beanie", "bob", "cap", "none"];
const HAIR_COLORS = ["#3B2A20", "#6B4A2E", "#1E1E24", "#B98A4A", "#2F6B4F", "#8E3B3B"];
const EXTRA_EXPR: Expression[] = ["neutral", "sleepy", "neutral", "smug", "happy"];

type V3 = [number, number, number];
type Placed = CharacterProps & { key: string; layer: "fg" | "bg"; label?: string };
export type Cam = { pos: V3; target: V3; fov: number };

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Project a world point to screen pixels for HTML overlays (name tags). */
export const project = (p: V3, cam: Cam, w: number, h: number): [number, number] => {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 0.1, 200);
  c.position.set(...cam.pos);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
};

const actionProps = (a: Action | undefined, f: number, t: number, i: number): Partial<CharacterProps> => {
  switch (a) {
    case "walk":
      return { walk: f * 0.32 };
    case "wave": {
      const on = interpolate(t, [0.15, 0.3], [0, 1], clamp);
      return { wave: on, wavePhase: f * 0.55 };
    }
    case "cheer":
      return { cheer: interpolate(t, [0.1, 0.25], [0, 1], clamp), wavePhase: f * 0.5 + i };
    case "nod":
      return { headTilt: Math.sin(f * 0.25) * 0.08, sway: f * 0.08 + i };
    case "jump":
      return { position: [0, Math.abs(Math.sin(f * 0.22)) * 0.6, 0] };
    default:
      return { sway: f * 0.08 + i };
  }
};

export const SceneView: React.FC<{ scene: Scene; cast: Record<string, CastMember>; frames: number; seed: number }> = ({ scene, cast, frames, seed }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = Math.min(1, f / Math.max(1, frames - 1));
  const subjectKey = scene.subject ?? "you";
  const others = scene.others ?? [];
  const exprOf = (k: string): Expression => parseExpression(scene.expression?.[k], t);

  const member = (k: string, pos: V3, rotY: number, layer: "fg" | "bg", i: number): Placed => {
    const m = cast[k] ?? { hoodie: "#F2A541" };
    const act = actionProps(scene.action?.[k], f, t, i);
    const basePos = act.position ? add(pos, act.position as V3) : pos;
    return {
      key: k,
      layer,
      hoodie: m.hoodie,
      hair: m.hair,
      hairColor: m.hairColor,
      expression: exprOf(k),
      blink: (f + i * 23) % 120 < 4,
      ...act,
      position: basePos,
      rotationY: rotY,
      label: m.name ?? k.toUpperCase(),
    };
  };

  const S: V3 = [0, 0, 3.2];
  let cam: Cam;
  let blur = 0;
  const people: Placed[] = [];
  const rowExtras: Placed[] = [];
  const walkZ = scene.action?.[subjectKey] === "walk" ? interpolate(t, [0, 1], [2.2, -2.2]) : 0;

  switch (scene.shot) {
    case "follow": {
      const z = 7.5 - t * 4.3;
      people.push(member(subjectKey, [0, 0, z], Math.PI, "fg", 0));
      cam = { pos: [interpolate(t, [0, 1], [-1.2, 0.4]), 3.3, z + 5.2], target: [0, 2.6, z - 4], fov: 40 };
      break;
    }
    case "overhead":
      people.push(member(subjectKey, [S[0], 0, S[2] + walkZ], Math.PI, "bg", 0));
      others.forEach((k, i) => people.push(member(k, [S[0] + 2.2 * (i + 1), 0, S[2] - 3], 0.4, "bg", i + 1)));
      cam = { pos: [interpolate(t, [0, 1], [-6, -4.5]), 13, 13], target: [0, 0, -4], fov: 42 };
      break;
    case "dolly": {
      const x = interpolate(t, [0, 1], [-6.5, 3.0], { ...clamp, easing: ease });
      people.push(member(subjectKey, [x + 9, 0, S[2]], 0.3, "fg", 0));
      cam = { pos: [x, 3.4, 5.5], target: [x + 0.5, 3.0, -4], fov: 30 };
      blur = 3;
      break;
    }
    case "closeup": {
      people.push(member(subjectKey, S, 0.15, "fg", 0));
      const z = interpolate(t, [0, 1], [9.4, 8.6], { ...clamp, easing: ease });
      cam = { pos: [0.4, 3.5, z], target: [0, 3.05, S[2]], fov: 30 };
      blur = 9;
      break;
    }
    case "ots": {
      const sub: V3 = [-0.7, 0, 3.2];
      const other = others[0];
      people.push(member(subjectKey, sub, Math.PI - 0.2, "fg", 0));
      if (other) people.push(member(other, add(sub, [1.7, 0, -4.8]), -0.25, "fg", 1));
      cam = { pos: add(sub, [3.7, 3.5, 4.4]), target: add(sub, [1.1, 2.9, -4.8]), fov: 32 };
      blur = interpolate(t, [0, 0.12], [4, 0], clamp);
      break;
    }
    case "twoshot": {
      const other = others[0];
      people.push(member(subjectKey, [-1.15, 0, S[2]], 0.55, "fg", 0));
      if (other) people.push(member(other, [1.15, 0, S[2]], -0.55, "fg", 1));
      cam = { pos: [0, 3.3, S[2] + interpolate(t, [0, 1], [8.2, 7.6])], target: [0, 2.8, S[2]], fov: 32 };
      blur = 6;
      break;
    }
    case "lineup": {
      const keys = [subjectKey, ...others];
      const n = Math.max(keys.length, Math.min(15, keys.length + (scene.crowd ?? 0)));
      const gap = n > 8 ? 1.25 : 2.4;
      const center = Math.floor((n - 1) / 2);
      const order = [center];
      for (let d = 1; order.length < n; d++) {
        if (center - d >= 0) order.push(center - d);
        if (center + d < n && order.length < n) order.push(center + d);
      }
      order.forEach((slot, j) => {
        const x = (slot - (n - 1) / 2) * gap;
        if (j < keys.length) {
          people.push(member(keys[j], [x, 0, 0], 0, "fg", j));
        } else {
          rowExtras.push({
            key: `l${slot}`,
            layer: "fg",
            position: [x, 0, 0],
            rotationY: 0,
            hoodie: HOODIES[(slot + seed) % HOODIES.length],
            hair: HAIRS[(slot + seed) % HAIRS.length],
            hairColor: HAIR_COLORS[(slot * 5 + seed) % HAIR_COLORS.length],
            expression: EXTRA_EXPR[(slot + seed) % EXTRA_EXPR.length],
            sway: f * 0.08 + slot,
            blink: (f + slot * 23) % 120 < 4,
          });
        }
      });
      const dist = Math.max(14, n * gap * 1.25);
      cam = { pos: [0, 2.6, dist], target: [0, 2.35, 0], fov: 26 };
      break;
    }
    case "wide":
    default:
      people.push(member(subjectKey, [S[0], 0, S[2] + walkZ], scene.action?.[subjectKey] === "walk" ? Math.PI : 0.2, "fg", 0));
      others.forEach((k, i) => people.push(member(k, [S[0] + (i % 2 ? -1 : 1) * 2.4 * (Math.floor(i / 2) + 1), 0, S[2] - 1.5], i % 2 ? 0.5 : -0.5, "fg", i + 1)));
      cam = { pos: [interpolate(t, [0, 1], [-1.0, 1.0]), 3.6, 13.5], target: [0, 2.4, 0], fov: 38 };
      break;
  }

  // anonymous extras, scattered behind/around the cast (not in lineup or void diagrams)
  const extras: Placed[] = [];
  const nCrowd = scene.shot === "lineup" ? 0 : Math.min(60, scene.crowd ?? 0);
  for (let i = 0; i < nCrowd; i++) {
    let x = (hash(i + seed) - 0.5) * 22;
    if (Math.abs(x) < 1.8) x += x < 0 ? -2.2 : 2.2;
    const z = -1 - hash(i + 40 + seed) * 10;
    const near = people.some((p) => Math.hypot((p.position?.[0] ?? 0) - x, (p.position?.[2] ?? 0) - z) < 1.6);
    if (near) continue;
    const layer: "fg" | "bg" = scene.shot === "dolly" && z >= -4 ? "fg" : "bg";
    extras.push({
      key: `x${i}`,
      layer,
      position: [x, 0, z],
      rotationY: (hash(i + 7 + seed) - 0.5) * 2.4,
      hoodie: HOODIES[(i + seed) % HOODIES.length],
      hair: HAIRS[(i + seed) % HAIRS.length],
      hairColor: HAIR_COLORS[(i * 7 + seed) % HAIR_COLORS.length],
      expression: EXTRA_EXPR[(i + seed) % EXTRA_EXPR.length],
      sway: f * 0.08 + i,
      blink: (f + i * 17) % 110 < 4,
      ...(scene.action?.crowd ? actionProps(scene.action.crowd, f, t, i) : {}),
    });
  }

  const all = [...people, ...rowExtras, ...extras];
  // without blur everything can live in one canvas (faster)
  const split = blur > 0.2;
  const bgList = split ? all.filter((p) => p.layer === "bg") : all;
  const fgList = split ? all.filter((p) => p.layer === "fg") : [];
  const render = (list: Placed[]) => list.map(({ key, layer: _l, label: _lb, ...p }) => <Character key={key} {...p} />);
  const bg = SET_BG[scene.set];

  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill style={{ filter: split ? `blur(${blur}px)` : undefined, scale: split ? "1.02" : undefined }}>
        <ThreeCanvas width={width} height={height} gl={{ antialias: true }}>
          <color attach="background" args={[bg]} />
          {scene.set === "void" && <fog attach="fog" args={[bg, 18, 60]} />}
          <CameraRig {...cam} />
          <Lights />
          <SetPiece name={scene.set} />
          {render(bgList)}
        </ThreeCanvas>
      </AbsoluteFill>
      {split && (
        <AbsoluteFill>
          <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true }}>
            <CameraRig {...cam} />
            <Lights />
            {render(fgList)}
          </ThreeCanvas>
        </AbsoluteFill>
      )}
      {scene.nameTags &&
        people.map((p) => {
          const [x, y] = project([p.position?.[0] ?? 0, -0.15, p.position?.[2] ?? 0], cam, width, height);
          return (
            <div key={`tag-${p.key}`} style={{ position: "absolute", left: x, top: y, translate: "-50% 0", fontFamily: "Cormorant Garamond", fontSize: 40, letterSpacing: 5, color: "#FBEFD9", fontVariant: "small-caps", opacity: interpolate(f, [6, 14], [0, 1], clamp) }}>
              {p.label?.toLowerCase()}
            </div>
          );
        })}
    </AbsoluteFill>
  );
};
