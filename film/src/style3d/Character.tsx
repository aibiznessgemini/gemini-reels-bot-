// Round-headed 3D character: huge sphere head, thin neck, hoodie body,
// noodle arms with ball hands, thin legs with ball feet.
// Everything is driven by props (which come from useCurrentFrame), never by useFrame.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Expression, faceTexture } from "./face";

export type Hair = "none" | "bowl" | "cap" | "beanie" | "bob";

export type CharacterProps = {
  position?: [number, number, number];
  rotationY?: number;
  hoodie: string;
  hair?: Hair;
  hairColor?: string;
  expression?: Expression;
  blink?: boolean;
  /** walk cycle phase in radians; undefined = standing */
  walk?: number;
  /** 0..1 idle sway amount, phase */
  sway?: number;
  /** head turn (radians, y) and tilt (z) */
  headYaw?: number;
  headTilt?: number;
  /** right arm raise 0..1 (wave) and wave phase */
  wave?: number;
  wavePhase?: number;
  scale?: number;
};

export const SKIN = "#F1ECE4";
const LEG = "#E4DED5";

const Std: React.FC<{ color: string; rough?: number }> = ({ color, rough = 0.62 }) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0} />
);

export const Character: React.FC<CharacterProps> = ({
  position = [0, 0, 0],
  rotationY = 0,
  hoodie,
  hair = "none",
  hairColor = "#4A3426",
  expression = "neutral",
  blink = false,
  walk,
  sway = 0,
  headYaw = 0,
  headTilt = 0,
  wave = 0,
  wavePhase = 0,
  scale = 1,
}) => {
  const tex = useMemo(() => faceTexture(expression, blink), [expression, blink]);
  const walking = walk !== undefined;
  const w = walk ?? 0;
  const legSwing = walking ? Math.sin(w) * 0.5 : 0;
  const armSwing = walking ? Math.sin(w) * 0.45 : Math.sin(sway * 1.3) * 0.04;
  const bob = walking ? Math.abs(Math.cos(w)) * 0.06 : Math.sin(sway) * 0.015;
  const lean = walking ? 0.06 : 0;

  // dimensions (character is ~3.4 units tall)
  const legLen = 1.0;
  const hipY = legLen + 0.12;
  const torsoY = hipY + 0.55;
  const neckY = torsoY + 0.62;
  const headR = 0.82;
  const headY = neckY + 0.2 + headR;

  const leg = (side: number, swing: number) => (
    <group position={[side * 0.2, hipY, 0]} rotation={[swing, 0, 0]}>
      <mesh position={[0, -legLen / 2, 0]}>
        <cylinderGeometry args={[0.075, 0.075, legLen, 12]} />
        <Std color={LEG} />
      </mesh>
      <mesh position={[0, -legLen - 0.02, 0.09]} scale={[1, 0.62, 1.35]}>
        <sphereGeometry args={[0.15, 20, 14]} />
        <Std color={SKIN} />
      </mesh>
    </group>
  );

  const arm = (side: number, rotX: number, rotZ: number) => (
    <group position={[side * 0.47, torsoY + 0.35, 0]} rotation={[rotX, 0, rotZ]}>
      <mesh position={[0, -0.36, 0]}>
        <capsuleGeometry args={[0.13, 0.5, 6, 12]} />
        <Std color={hoodie} />
      </mesh>
      <mesh position={[0, -0.8, 0]}>
        <sphereGeometry args={[0.17, 20, 14]} />
        <Std color={SKIN} />
      </mesh>
    </group>
  );

  // rotating +z swings the right arm outward/up; -z swings the left arm outward
  const rightZ = 0.12 + wave * 2.35 + Math.sin(wavePhase) * 0.3 * wave;

  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={[0, rotationY, 0]} scale={scale}>
      {/* soft contact shadow (cheaper than shadow maps, works across layers) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015 - bob, 0]}>
        <circleGeometry args={[0.62, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <group rotation={[lean, 0, 0]}>
        {leg(-1, legSwing)}
        {leg(1, -legSwing)}
        {/* hoodie body */}
        <mesh position={[0, torsoY, 0]} scale={[1, 1, 0.78]}>
          <capsuleGeometry args={[0.46, 0.5, 8, 20]} />
          <Std color={hoodie} rough={0.8} />
        </mesh>
        {/* hood folded at the back of the neck */}
        <mesh position={[0, neckY - 0.08, -0.2]} scale={[1, 0.55, 0.8]}>
          <torusGeometry args={[0.24, 0.12, 10, 20]} />
          <Std color={hoodie} rough={0.8} />
        </mesh>
        {/* drawstrings + pocket */}
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, torsoY + 0.3, 0.37]}>
            <cylinderGeometry args={[0.018, 0.018, 0.32, 6]} />
            <Std color="#FFFFFF" />
          </mesh>
        ))}
        <mesh position={[0, torsoY - 0.22, 0.34]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.52, 0.2, 0.04]} />
          <Std color={new THREE.Color(hoodie).multiplyScalar(0.85).getStyle()} rough={0.85} />
        </mesh>
        {arm(-1, armSwing, -0.12)}
        {arm(1, wave > 0 ? 0 : -armSwing, rightZ)}
        {/* neck */}
        <mesh position={[0, neckY + 0.1, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.4, 10]} />
          <Std color={LEG} />
        </mesh>
        {/* head */}
        <group position={[0, headY, 0]} rotation={[0, headYaw, headTilt]}>
          <mesh scale={1.025}>
            <sphereGeometry args={[headR, 32, 24]} />
            <meshBasicMaterial color="#1E1A24" side={THREE.BackSide} />
          </mesh>
          <mesh>
            <sphereGeometry args={[headR, 48, 36]} />
            <meshStandardMaterial color={SKIN} roughness={0.45} metalness={0} />
          </mesh>
          {/* face decal: a slightly larger spherical patch on the front */}
          <mesh>
            <sphereGeometry args={[headR * 1.004, 32, 24, Math.PI / 2 - 0.75, 1.5, Math.PI / 2 - 0.75, 1.5]} />
            <meshStandardMaterial map={tex} transparent roughness={0.45} depthWrite={false} />
          </mesh>
          {hair === "bowl" && (
            <mesh rotation={[-0.25, 0, 0]}>
              <sphereGeometry args={[headR * 1.04, 40, 20, 0, Math.PI * 2, 0, 1.0]} />
              <Std color={hairColor} rough={0.7} />
            </mesh>
          )}
          {hair === "beanie" && (
            <mesh rotation={[-0.1, 0, 0]}>
              <sphereGeometry args={[headR * 1.05, 40, 20, 0, Math.PI * 2, 0, 1.15]} />
              <Std color={hairColor} rough={0.95} />
            </mesh>
          )}
          {hair === "bob" && (
            <group>
              <mesh rotation={[-0.25, 0, 0]}>
                <sphereGeometry args={[headR * 1.05, 40, 20, 0, Math.PI * 2, 0, 1.05]} />
                <Std color={hairColor} rough={0.7} />
              </mesh>
              {/* back half of the head, down to the jaw */}
              <mesh>
                <sphereGeometry args={[headR * 1.055, 40, 24, Math.PI, Math.PI, 0, 2.05]} />
                <Std color={hairColor} rough={0.7} />
              </mesh>
            </group>
          )}
          {hair === "cap" && (
            <group>
              <mesh rotation={[-0.35, 0, 0]}>
                <sphereGeometry args={[headR * 1.045, 40, 20, 0, Math.PI * 2, 0, 1.05]} />
                <Std color={hairColor} rough={0.8} />
              </mesh>
              {/* brim: a flat disc pushed forward, its back half hidden inside the head */}
              <mesh position={[0, headR * 0.66, headR * 0.5]} rotation={[0.32, 0, 0]} scale={[1, 0.07, 1]}>
                <cylinderGeometry args={[0.6, 0.6, 0.6, 32]} />
                <Std color={hairColor} rough={0.8} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  );
};
