// Shared 3D set pieces: camera rig, lighting, and a simple room.
import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type Look = {
  bg: string;
  wall: string;
  floor: string;
  floorLine: string;
  key: string;
  rim: string;
  hemiSky: string;
  hemiGround: string;
  bulb: string;
};

// Our own palette: deep teal night + warm amber practical lights.
export const LOOK: Look = {
  bg: "#16202F",
  wall: "#3A4D6B",
  floor: "#9A6A45",
  floorLine: "#E9DCC6",
  key: "#FFD9A8",
  rim: "#86B6FF",
  hemiSky: "#9DB4E0",
  hemiGround: "#5A3B2A",
  bulb: "#FFC56B",
};

export const CameraRig: React.FC<{ pos: [number, number, number]; target: [number, number, number]; fov?: number }> = ({ pos, target, fov = 35 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pos);
  camera.fov = fov;
  camera.near = 0.1;
  camera.far = 200;
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
  return null;
};

export const Lights: React.FC<{ look?: Look }> = ({ look = LOOK }) => (
  <>
    <hemisphereLight args={[look.hemiSky, look.hemiGround, 1.1]} />
    <directionalLight position={[6, 10, 8]} intensity={2.0} color={look.key} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
    <directionalLight position={[-8, 6, -10]} intensity={1.6} color={look.rim} />
  </>
);

const windowTexture = () => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, "#1F2E5A");
  grd.addColorStop(0.6, "#C9736B");
  grd.addColorStop(1, "#FFC98A");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** A hall: wooden floor with court lines, back wall with dusk windows, string lights. */
export const Hall: React.FC<{ look?: Look }> = ({ look = LOOK }) => {
  const win = useMemo(windowTexture, []);
  const bulbs = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 40; i++) {
      const x = -20 + i;
      out.push([x, 7.2 - Math.sin(((i % 10) / 10) * Math.PI) * 0.9, -11.6]);
    }
    return out;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color={look.floor} roughness={0.55} />
      </mesh>
      {/* court lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[3.0, 3.08, 64]} />
        <meshBasicMaterial color={look.floorLine} transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.08, 30]} />
        <meshBasicMaterial color={look.floorLine} transparent opacity={0.7} />
      </mesh>
      {/* back wall + windows */}
      <mesh position={[0, 6, -12]}>
        <planeGeometry args={[60, 12]} />
        <meshStandardMaterial color={look.wall} roughness={0.9} emissive={look.wall} emissiveIntensity={0.35} />
      </mesh>
      {[-12, -6, 0, 6, 12].map((x) => (
        <mesh key={x} position={[x, 5.2, -11.95]}>
          <planeGeometry args={[3.2, 4.2]} />
          <meshBasicMaterial map={win} />
        </mesh>
      ))}
      {/* string lights */}
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshBasicMaterial color={look.bulb} />
        </mesh>
      ))}
      <pointLight position={[0, 6.5, -9]} intensity={30} distance={22} color={look.bulb} />
    </group>
  );
};
