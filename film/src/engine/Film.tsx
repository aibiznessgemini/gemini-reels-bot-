// The daily film: one <Sequence> per scene, voice clips on top, overlays last.
// Music + SFX are mixed afterwards by scripts (see pipeline/music.ts).
import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { FONTS } from "../fonts";
import { SceneView } from "./SceneView";
import { FilmSpec, filmFrames, FPS, LEAD_IN, sceneSeconds, sceneStarts, TAIL } from "./types";

export { filmFrames, sceneStarts };

export type FilmProps = { spec: FilmSpec };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const calculateFilmMetadata: CalculateMetadataFunction<FilmProps> = ({ props }) => ({
  durationInFrames: Math.max(30, filmFrames(props.spec)),
  fps: FPS,
});

const Badge: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [8, 15], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });
  const out = interpolate(f, [frames - 5, frames], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: "50%", top: "24%", translate: "-50% -50%", scale: String(0.6 + 0.4 * p), opacity: Math.min(1, p * 1.5) * out }}>
      <div style={{ fontFamily: FONTS.cormorant, fontSize: 64, letterSpacing: 6, whiteSpace: "nowrap", color: "#FBEFD9", background: "rgba(14,24,38,0.88)", border: "3px solid #F2A541", borderRadius: 999, padding: "10px 44px", boxShadow: "0 12px 40px rgba(0,0,0,0.45)", fontVariant: "small-caps" }}>
        {text.toLowerCase()}
      </div>
    </div>
  );
};

const Label: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", fontFamily: FONTS.cormorant, fontSize: 46, letterSpacing: 10, color: "#F2C27A", fontVariant: "small-caps", opacity: interpolate(f, [4, 12], [0, 1], clamp) }}>
      {text.toLowerCase()}
    </div>
  );
};

const Counter: React.FC<{ label: string; value: string; changed: boolean }> = ({ label, value, changed }) => {
  const f = useCurrentFrame();
  const pop = changed ? interpolate(f, [6, 11, 18], [1, 1.35, 1], clamp) : 1;
  return (
    <div style={{ position: "absolute", left: 70, top: 110, display: "flex", alignItems: "center", gap: 16, fontFamily: FONTS.cormorant, color: "#FBEFD9", background: "rgba(14,24,38,0.7)", border: "2px solid rgba(242,165,65,0.8)", borderRadius: 999, padding: "8px 26px" }}>
      <span style={{ fontSize: 30, letterSpacing: 4, fontVariant: "small-caps" }}>{label.toLowerCase()}</span>
      <span style={{ fontSize: 44, color: "#F2A541", scale: String(pop), display: "inline-block" }}>{value}</span>
    </div>
  );
};

const Frame: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fade = Math.max(interpolate(f, [0, 10], [1, 0], clamp), interpolate(f, [durationInFrames - 20, durationInFrames - 1], [0, 1], clamp));
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(5,8,14,0.55) 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 64, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 64, background: "#000" }} />
      <AbsoluteFill style={{ background: "#000", opacity: fade }} />
    </>
  );
};

export const Film: React.FC<FilmProps> = ({ spec }) => {
  const starts = sceneStarts(spec);
  return (
    <AbsoluteFill style={{ background: "#0F1724" }}>
      {spec.scenes.map((s, i) => {
        const frames = starts[i + 1] - starts[i] + (i === spec.scenes.length - 1 ? Math.round(TAIL * FPS) : 0);
        const prev = spec.scenes[i - 1]?.counter;
        return (
          <Sequence key={s.id} from={starts[i]} durationInFrames={frames} name={s.id}>
            <SceneView scene={s} cast={spec.cast} frames={frames} seed={i * 13} />
            {s.audio && <Audio src={staticFile(s.audio)} from={Math.round(LEAD_IN * FPS)} />}
            {s.label && <Label text={s.label} />}
            {s.badge && <Badge text={s.badge} frames={frames} />}
            {s.counter && <Counter label={s.counter.label} value={String(s.counter.value)} changed={!prev || String(prev.value) !== String(s.counter.value)} />}
          </Sequence>
        );
      })}
      <Frame />
    </AbsoluteFill>
  );
};

/** Thumbnail, rendered at 1920x1080 and downscaled to 1280x720: one scene frame + up to 3 big words. */
export const Thumbnail: React.FC<FilmProps> = ({ spec }) => {
  const idx = Math.max(0, spec.scenes.findIndex((s) => s.id === spec.thumbnail?.scene));
  const s = spec.scenes[idx];
  const frames = Math.round(sceneSeconds(s) * FPS);
  return (
    <AbsoluteFill style={{ background: "#0F1724" }}>
      <Sequence from={-Math.round(frames * 0.6)}>
        <SceneView scene={{ ...s, badge: undefined, counter: undefined }} cast={spec.cast} frames={frames} seed={idx * 13} />
      </Sequence>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,12,20,0.8) 0%, rgba(8,12,20,0.15) 62%)" }} />
      <div style={{ position: "absolute", left: 84, bottom: 100, width: 1050, fontFamily: FONTS.fredoka, fontSize: 178, lineHeight: 1.0, color: "#FBEFD9", textTransform: "uppercase", WebkitTextStroke: "4px #0B1220", textShadow: "0 12px 0 #F2A541" }}>
        {spec.thumbnail?.text ?? spec.title}
      </div>
    </AbsoluteFill>
  );
};
