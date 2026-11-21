// 11.6-second test of the 3D "round heads" style, cut to the ElevenLabs voice take.
// Voice timing (from silencedetect on public/voice/test3d.mp3, +0.2 s offset):
//   0.20–3.15  "Imagine walking into a room full of strangers."
//   3.59–4.71  "A hundred people..."
//   5.40–7.20  "and not one of them knows your name."
//   7.88–9.16  "But give it ten seconds..."
//   9.79–11.0  "and someone waves."
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { Character, CharacterProps, Hair } from "./Character";
import { CameraRig, Hall, LOOK, Lights } from "./Set";
import { Expression } from "./face";
import { FONTS } from "../fonts";

export const TEST3D_FRAMES = 348;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const HOODIES = ["#5DA06F", "#D9667A", "#6C8FD9", "#E07B3C", "#9A7BD1", "#4FB3B0", "#C9C3B8", "#7C5C9E", "#3E8E7E", "#C04F5A"];
const HAIRS: Hair[] = ["none", "bowl", "beanie", "bob", "cap", "none"];
const HAIR_COLORS = ["#3B2A20", "#6B4A2E", "#1E1E24", "#B98A4A", "#2F6B4F", "#8E3B3B"];
const EXPR: Expression[] = ["neutral", "sleepy", "neutral", "smug", "happy"];

const HERO = "#F2A541"; // our lead character always wears amber

type Extra = CharacterProps & { key: string };

/** Deterministic crowd spread over the hall, leaving the centre aisle open. */
const useCrowd = (f: number): Extra[] =>
  useMemo(() => {
    const out: Extra[] = [];
    for (let i = 0; i < 46; i++) {
      let x = (hash(i) - 0.5) * 22;
      if (Math.abs(x) < 1.6) x += x < 0 ? -2 : 2;
      const z = -1 - hash(i + 40) * 10;
      out.push({
        key: `c${i}`,
        position: [x, 0, z],
        rotationY: (hash(i + 7) - 0.5) * 2.4,
        hoodie: HOODIES[i % HOODIES.length],
        hair: HAIRS[i % HAIRS.length],
        hairColor: HAIR_COLORS[(i * 7) % HAIR_COLORS.length],
        expression: EXPR[i % EXPR.length],
        sway: 0,
      });
    }
    return out;
  }, []).map((c, i) => ({ ...c, sway: f * 0.08 + i, blink: (f + i * 17) % 110 < 4 }));

/**
 * One shot = two stacked canvases sharing a camera: background (crowd + set)
 * can be blurred for a depth-of-field look, the foreground stays sharp.
 */
const Shot: React.FC<{
  cam: { pos: [number, number, number]; target: [number, number, number]; fov?: number };
  bgBlur?: number;
  bg: React.ReactNode;
  fg?: React.ReactNode;
}> = ({ cam, bgBlur = 0, bg, fg }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined, scale: bgBlur > 0 ? "1.02" : undefined }}>
        <ThreeCanvas width={width} height={height} gl={{ antialias: true }}>
          <color attach="background" args={[LOOK.bg]} />
          <CameraRig {...cam} />
          <Lights />
          <Hall />
          {bg}
        </ThreeCanvas>
      </AbsoluteFill>
      {fg && (
        <AbsoluteFill>
          <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true }}>
            <CameraRig {...cam} />
            <Lights />
            {fg}
          </ThreeCanvas>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------- overlays ----------
const Badge: React.FC<{ text: string; from: number; to: number; f: number; x: string; y: string }> = ({ text, from, to, f, x, y }) => {
  const p = interpolate(f, [from, from + 7], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });
  if (p <= 0 || f >= to) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: String(0.6 + 0.4 * p), opacity: Math.min(1, p * 1.5) }}>
      <div style={{ fontFamily: FONTS.cormorant, fontSize: 64, letterSpacing: 6, color: "#FBEFD9", background: "rgba(14,24,38,0.88)", border: "3px solid #F2A541", borderRadius: 999, padding: "10px 44px", boxShadow: "0 12px 40px rgba(0,0,0,0.45)", fontVariant: "small-caps" }}>
        {text}
      </div>
    </div>
  );
};

const Counter: React.FC<{ f: number }> = ({ f }) => {
  const known = f >= 300 ? 1 : 0;
  const pop = interpolate(f, [300, 305, 312], [1, 1.35, 1], clamp);
  const o = interpolate(f, [150, 160, TEST3D_FRAMES - 12, TEST3D_FRAMES], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 70, top: 110, opacity: o, display: "flex", alignItems: "center", gap: 16, fontFamily: FONTS.cormorant, color: "#FBEFD9", background: "rgba(14,24,38,0.7)", border: "2px solid rgba(242,165,65,0.8)", borderRadius: 999, padding: "8px 26px" }}>
      <span style={{ fontSize: 30, letterSpacing: 4, fontVariant: "small-caps" }}>names known</span>
      <span style={{ fontSize: 44, color: "#F2A541", scale: String(pop), display: "inline-block" }}>{known}</span>
    </div>
  );
};

const Frame: React.FC<{ f: number }> = ({ f }) => {
  const fadeIn = interpolate(f, [0, 10], [1, 0], clamp);
  const fadeOut = interpolate(f, [TEST3D_FRAMES - 14, TEST3D_FRAMES - 1], [0, 1], clamp);
  return (
    <>
      {/* soft vignette + cinematic bars */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(5,8,14,0.55) 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 64, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 64, background: "#000" }} />
      <AbsoluteFill style={{ background: "#000", opacity: Math.max(fadeIn, fadeOut) }} />
    </>
  );
};

// ---------- the five shots ----------
const S1_END = 102;
const S2_END = 160;
const S3_END = 230;
const S4_END = 287;

export const Test3D: React.FC = () => {
  const f = useCurrentFrame();
  const crowd = useCrowd(f);
  const extras = (filter?: (c: Extra) => boolean) => crowd.filter(filter ?? (() => true)).map(({ key, ...c }) => <Character key={key} {...c} />);

  // Shot 1: hero walks into the hall (we follow from behind)
  const s1 = f / S1_END;
  const heroZ1 = interpolate(f, [0, S1_END], [7.5, 3.2], clamp);
  // Shot 4/5 shared: the waver
  const waveOn = interpolate(f, [292, 300], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: LOOK.bg }}>
      <Audio src={staticFile("voice/test3d.mp3")} from={6} />

      <Sequence durationInFrames={S1_END} layout="none">
        <Shot
          cam={{ pos: [interpolate(s1, [0, 1], [-1.2, 0.4]), interpolate(s1, [0, 1], [3.4, 3.0]), heroZ1 + 5.2], target: [0, 2.6, heroZ1 - 4], fov: 40 }}
          bg={extras()}
          fg={<Character position={[0, 0, heroZ1]} rotationY={Math.PI} hoodie={HERO} walk={f * 0.32} expression="nervous" />}
        />
      </Sequence>

      <Sequence from={S1_END} durationInFrames={S2_END - S1_END} layout="none">
        <Shot
          cam={{ pos: [interpolate(f, [S1_END, S2_END], [-6, -4.5]), 13, 13], target: [0, 0, -4], fov: 42 }}
          bg={
            <>
              {extras()}
              <Character position={[0, 0, 3.2]} rotationY={Math.PI} hoodie={HERO} expression="nervous" sway={f * 0.08} />
            </>
          }
        />
      </Sequence>

      <Sequence from={S2_END} durationInFrames={S3_END - S2_END} layout="none">
        {/* slow lateral dolly across indifferent faces */}
        <Shot
          cam={{ pos: [interpolate(f, [S2_END, S3_END], [-6.5, 3.0], { ...clamp, easing: ease }), 3.4, 5.5], target: [interpolate(f, [S2_END, S3_END], [-6.0, 2.5], { ...clamp, easing: ease }), 3.0, -4], fov: 30 }}
          bgBlur={3}
          bg={extras((c) => (c.position?.[2] ?? 0) < -4)}
          fg={extras((c) => (c.position?.[2] ?? 0) >= -4)}
        />
      </Sequence>

      <Sequence from={S3_END} durationInFrames={S4_END - S3_END} layout="none">
        {/* close-up: our hero, nervous; crowd melts into bokeh */}
        <Shot
          cam={{ pos: [0.4, 3.5, interpolate(f, [S3_END, S4_END], [9.4, 8.6], { ...clamp, easing: ease })], target: [0, 3.05, 3.2], fov: 30 }}
          bgBlur={9}
          bg={extras()}
          fg={<Character position={[0, 0, 3.2]} rotationY={0.15} hoodie={HERO} expression="nervous" blink={f > 262 && f < 266} sway={f * 0.08} headTilt={interpolate(f, [S3_END, S4_END], [0, -0.06])} />}
        />
      </Sequence>

      <Sequence from={S4_END} durationInFrames={TEST3D_FRAMES - S4_END} layout="none">
        {/* over the shoulder: someone in the crowd turns and waves */}
        <Shot
          cam={{ pos: [3.0, 3.5, 7.6], target: [0.4, 2.9, -1.6], fov: 32 }}
          bgBlur={interpolate(f, [S4_END, S4_END + 14], [4, 0], clamp)}
          bg={extras((c) => Math.hypot((c.position?.[0] ?? 0) - 1.0, (c.position?.[2] ?? 0) + 1.6) > 1.8)}
          fg={
            <>
              <Character position={[-0.7, 0, 3.2]} rotationY={Math.PI - 0.2} hoodie={HERO} expression="surprised" sway={f * 0.08} headTilt={interpolate(f, [296, 312], [0, 0.12], clamp)} />
              <Character
                position={[1.0, 0, -1.6]}
                rotationY={interpolate(f, [S4_END + 2, S4_END + 12], [2.4, -0.25], { ...clamp, easing: ease })}
                hoodie="#D9667A"
                hair="bob"
                hairColor="#6B4A2E"
                expression={waveOn > 0.5 ? "happy" : "neutral"}
                wave={waveOn}
                wavePhase={f * 0.55}
              />
            </>
          }
        />
      </Sequence>

      <Badge text="100 strangers" from={110} to={S2_END} f={f} x="50%" y="24%" />
      <Counter f={f} />
      <Frame f={f} />
    </AbsoluteFill>
  );
};
