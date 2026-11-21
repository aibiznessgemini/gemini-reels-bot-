// One-frame probe used to check look and render speed of the 3D style.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Character } from "./Character";
import { CameraRig, Hall, LOOK, Lights } from "./Set";

const HOODIES = ["#E2B33C", "#5DA06F", "#D9667A", "#6C8FD9", "#E07B3C", "#9A7BD1", "#4FB3B0", "#C9C3B8"];

export const Probe: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: LOOK.bg }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true }}>
        <color attach="background" args={[LOOK.bg]} />
        <CameraRig pos={[0, 3.2, 9]} target={[0, 2.4, 0]} fov={38} />
        <Lights />
        <Hall />
        <Character position={[-1.6, 0, 1]} rotationY={0.35} hoodie="#3F7FD6" expression="nervous" walk={f * 0.3} />
        <Character position={[1.8, 0, 0]} rotationY={-0.4} hoodie="#E2B33C" hair="cap" hairColor="#2F6B4F" expression="smug" sway={f * 0.1} />
        <Character position={[0.2, 0, -3]} rotationY={0.1} hoodie="#D9667A" hair="bob" hairColor="#5A3A2A" expression="happy" wave={1} wavePhase={f * 0.4} />
        {Array.from({ length: 18 }).map((_, i) => (
          <Character key={i} position={[-9 + (i % 9) * 2.2, 0, -6 - Math.floor(i / 9) * 2.5]} rotationY={(i % 3) * 0.3 - 0.3} hoodie={HOODIES[i % HOODIES.length]} hair={(["none", "bowl", "beanie", "bob"] as const)[i % 4]} expression={(["neutral", "happy", "sleepy"] as const)[i % 3]} sway={f * 0.1 + i} />
        ))}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
