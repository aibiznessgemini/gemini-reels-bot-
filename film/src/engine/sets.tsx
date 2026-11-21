// Sets for the daily films. All built from simple shapes, our teal/amber palette.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Hall, LOOK } from "../style3d/Set";
import { SetName } from "./types";

const gradientTex = (stops: [number, string][], w = 64, h = 256) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const windowsTex = (seed: number) => {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1B2638";
  g.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 4; x++) {
      const r = Math.abs(Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed) * 43758.5453) % 1;
      g.fillStyle = r > 0.55 ? "#FFC56B" : r > 0.35 ? "#3A4D6B" : "#243248";
      g.fillRect(10 + x * 29, 10 + y * 24, 18, 14);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const Std: React.FC<{ color: string; rough?: number; emissive?: string; ei?: number }> = ({ color, rough = 0.8, emissive, ei = 0 }) => (
  <meshStandardMaterial color={color} roughness={rough} emissive={emissive ?? "#000000"} emissiveIntensity={ei} />
);

const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; c: string; rough?: number }> = ({ p, s, c, rough }) => (
  <mesh position={p}>
    <boxGeometry args={s} />
    <Std color={c} rough={rough} />
  </mesh>
);

const Classroom: React.FC = () => {
  const win = useMemo(() => gradientTex([[0, "#1F2E5A"], [0.6, "#C9736B"], [1, "#FFC98A"]]), []);
  const desks: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = -3; c <= 3; c++) desks.push([c * 2.4, -1.5 - r * 2.6]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 40]} />
        <Std color="#7A5A44" rough={0.6} />
      </mesh>
      <mesh position={[0, 6, -13]}>
        <planeGeometry args={[60, 12]} />
        <Std color="#4A6078" emissive="#4A6078" ei={0.3} />
      </mesh>
      <Box p={[0, 4.2, -12.9]} s={[9, 3.2, 0.1]} c="#24453A" />
      {[-12, 12].map((x) => (
        <mesh key={x} position={[x, 5, -12.9]}>
          <planeGeometry args={[4, 4.5]} />
          <meshBasicMaterial map={win} />
        </mesh>
      ))}
      {desks.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Box p={[0, 1.55, 0]} s={[1.7, 0.1, 1.0]} c="#E2C27A" rough={0.5} />
          {[-0.75, 0.75].map((dx) => (
            <Box key={dx} p={[dx, 0.77, 0]} s={[0.07, 1.55, 0.07]} c="#2A2F38" />
          ))}
        </group>
      ))}
      <pointLight position={[0, 7, -6]} intensity={25} distance={22} color="#FFE2B8" />
    </group>
  );
};

const Street: React.FC = () => {
  const texes = useMemo(() => [1, 2, 3, 4].map(windowsTex), []);
  const blocks: [number, number, number, number][] = [
    [-16, 9, 6, 0],
    [-9, 13, 5, 1],
    [-2, 10, 6, 2],
    [5, 15, 5, 3],
    [12, 11, 6, 0],
    [18, 8, 5, 1],
  ];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 60]} />
        <Std color="#2B3340" rough={0.9} />
      </mesh>
      <Box p={[0, 0.06, -6]} s={[80, 0.12, 4]} c="#59647A" />
      {blocks.map(([x, h, w, t], i) => (
        <mesh key={i} position={[x, h / 2, -12]}>
          <boxGeometry args={[w, h, 5]} />
          <meshStandardMaterial map={texes[t]} emissiveMap={texes[t]} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.9} />
        </mesh>
      ))}
      {[-10, 0, 10].map((x) => (
        <group key={x} position={[x, 0, -4.6]}>
          <Box p={[0, 2.6, 0]} s={[0.12, 5.2, 0.12]} c="#1E242E" />
          <mesh position={[0, 5.25, 0.3]}>
            <sphereGeometry args={[0.28, 12, 10]} />
            <meshBasicMaterial color="#FFD38A" />
          </mesh>
          <pointLight position={[0, 5, 0.6]} intensity={14} distance={10} color="#FFC56B" />
        </group>
      ))}
    </group>
  );
};

const Bedroom: React.FC = () => {
  const night = useMemo(() => windowsTex(9), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <Std color="#6E5446" rough={0.7} />
      </mesh>
      <mesh position={[0, 6, -7]}>
        <planeGeometry args={[40, 12]} />
        <Std color="#34465F" emissive="#34465F" ei={0.25} />
      </mesh>
      <mesh position={[-4, 4.6, -6.95]}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial map={night} />
      </mesh>
      {/* bed */}
      <Box p={[3.5, 0.6, -4]} s={[4.2, 1.2, 5]} c="#3F5F8F" />
      <Box p={[3.5, 1.35, -6]} s={[3.2, 0.5, 1]} c="#EDE6DA" />
      {/* desk + lamp */}
      <Box p={[-4, 1.6, -5.6]} s={[3, 0.12, 1.4]} c="#C9A877" />
      <mesh position={[-3.2, 2.3, -5.6]}>
        <coneGeometry args={[0.35, 0.5, 16, 1, true]} />
        <meshBasicMaterial color="#FFD38A" side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[-3.2, 2.4, -5.2]} intensity={18} distance={9} color="#FFC56B" />
    </group>
  );
};

/** Dark diagram space for "explainer" moments. */
const Void: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[80, 60]} />
      <Std color="#1C2A3D" rough={0.95} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <circleGeometry args={[7, 64]} />
      <meshBasicMaterial color="#F2A541" transparent opacity={0.06} />
    </mesh>
    <pointLight position={[0, 9, 4]} intensity={30} distance={25} color="#FFE2B8" />
  </group>
);

export const SET_BG: Record<SetName, string> = {
  hall: LOOK.bg,
  classroom: "#1E2A3C",
  street: "#121A2A",
  bedroom: "#18202E",
  void: "#0F1724",
};

export const SetPiece: React.FC<{ name: SetName }> = ({ name }) => {
  switch (name) {
    case "hall":
      return <Hall />;
    case "classroom":
      return <Classroom />;
    case "street":
      return <Street />;
    case "bedroom":
      return <Bedroom />;
    case "void":
      return <Void />;
  }
};
