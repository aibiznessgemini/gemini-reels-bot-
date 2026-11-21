// Channel branding stills for "The You Experiment", drawn with the same 3D characters.
//   npx remotion still Avatar out/brand/avatar.png      (800x800)
//   npx remotion still Banner out/brand/banner.png      (2560x1440, safe area 1546x423 in the middle)
//   npx remotion still Watermark out/brand/watermark.png (150x150, transparent)
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Character } from "../style3d/Character";
import { CameraRig, Lights } from "../style3d/Set";
import { FONTS } from "../fonts";

export const CHANNEL = {
  name: "The You Experiment",
  tagline: "Psychology experiments, starring you.",
  amber: "#F2A541",
  teal: "#16202F",
  cream: "#FBEFD9",
};

const Bg: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #2B3F5C 0%, ${CHANNEL.teal} 62%, #0B111C 100%)` }} />
);

export const Avatar: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 46%, rgba(242,165,65,0.35) 0%, rgba(242,165,65,0) 45%)" }} />
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true }}>
        <CameraRig pos={[0, 3.35, 5.4]} target={[0, 3.05, 0]} fov={32} />
        <Lights />
        <Character position={[0, 0, 0]} rotationY={0.18} hoodie={CHANNEL.amber} expression="happy" headTilt={-0.06} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const HOODIES = ["#5DA06F", "#D9667A", "#6C8FD9", "#9A7BD1", "#4FB3B0", "#E07B3C"];
export const Banner: React.FC = () => {
  const { width, height } = useVideoConfig();
  const crowd = [-7.6, -6.3, 4.6, 5.9, 7.2, -5.0];
  return (
    <AbsoluteFill>
      <Bg />
      {/* characters sit in the middle band so every device crop shows them */}
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true }}>
        <CameraRig pos={[0, 2.4, 19]} target={[0, 2.2, 0]} fov={24} />
        <Lights />
        {crowd.map((x, i) => (
          <Character key={x} position={[x, 0, -0.4 - (i % 2) * 0.6]} rotationY={x < 0 ? 0.4 : -0.4} hoodie={HOODIES[i]} hair={(["bowl", "bob", "cap", "beanie", "none", "bob"] as const)[i]} hairColor={["#3B2A20", "#6B4A2E", "#2F6B4F", "#1E1E24", "#000", "#B98A4A"][i]} expression={(["smug", "happy", "neutral", "sleepy", "happy", "neutral"] as const)[i]} />
        ))}
        <Character position={[-4.0, 0, 1.2]} rotationY={0.45} hoodie={CHANNEL.amber} expression="happy" wave={1} wavePhase={1.2} />
      </ThreeCanvas>
      {/* text inside the 1546x423 safe area */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 600, textAlign: "center" }}>
        <div style={{ display: "inline-block", fontFamily: FONTS.cormorant, fontSize: 40, letterSpacing: 12, color: "#F2C27A", fontVariant: "small-caps", background: "rgba(14,24,38,0.75)", border: `3px solid ${CHANNEL.amber}`, borderRadius: 999, padding: "6px 40px" }}>
          new film every day
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 680, textAlign: "center", fontFamily: FONTS.fredoka, fontSize: 112, color: CHANNEL.cream, textTransform: "uppercase", letterSpacing: 4, WebkitTextStroke: "3px #0B1220", textShadow: `0 10px 0 ${CHANNEL.amber}` }}>
        {CHANNEL.name}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 818, textAlign: "center", fontFamily: FONTS.cormorant, fontSize: 44, color: CHANNEL.cream, letterSpacing: 2 }}>
        {CHANNEL.tagline}
      </div>
    </AbsoluteFill>
  );
};

export const Watermark: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", width: 140, height: 140, borderRadius: 999, background: CHANNEL.amber, border: "5px solid #0B1220" }} />
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true }}>
        <CameraRig pos={[0, 3.35, 5.2]} target={[0, 3.25, 0]} fov={30} />
        <Lights />
        <Character position={[0, 0, 0]} hoodie={CHANNEL.amber} expression="happy" />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
