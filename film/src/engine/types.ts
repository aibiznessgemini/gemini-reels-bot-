// film.json — the only thing the daily Writer agent has to produce.
// Timings (audio, duration) are filled in by scripts/pipeline, never guessed.
import type { Hair } from "../style3d/Character";
import type { Expression } from "../style3d/face";

export type SetName = "hall" | "classroom" | "street" | "bedroom" | "void";
export type ShotType = "wide" | "follow" | "overhead" | "dolly" | "closeup" | "ots" | "twoshot" | "lineup";
export type Action = "idle" | "walk" | "wave" | "turn" | "nod" | "jump" | "cheer";
export type Sfx = "whoosh" | "pop" | "chime" | "thud" | "tick" | "riser" | "sparkle";
export type Mood = "curious" | "tense" | "warm" | "sad" | "wonder";

export type CastMember = { hoodie: string; hair?: Hair; hairColor?: string; name?: string };

export type Scene = {
  id: string;
  /** narration spoken during this scene (one or two sentences) */
  line: string;
  /** filled by scripts: staticFile path of the voice clip, and scene length in seconds */
  audio?: string;
  duration?: number;
  set: SetName;
  shot: ShotType;
  /** cast key in the centre of the shot (default "you") */
  subject?: string;
  /** other cast members in the shot (ots/twoshot use the first one) */
  others?: string[];
  /** number of anonymous extras (0–60) */
  crowd?: number;
  /** per cast key; "nervous>happy" switches at ~55% of the scene */
  expression?: Record<string, string>;
  action?: Record<string, Action>;
  /** big centred number/word pill, e.g. "100 STRANGERS" */
  badge?: string;
  /** small-caps title at the top (diagram scenes), e.g. "THE BRIDGE EXPERIMENT" */
  label?: string;
  /** show name tags under cast members (lineup shots) */
  nameTags?: boolean;
  counter?: { label: string; value: number | string };
  sfx?: Sfx[];
};

export type FilmSpec = {
  slug: string;
  title: string;
  mood?: Mood;
  cast: Record<string, CastMember>;
  scenes: Scene[];
  /** thumbnail: which scene to use and up to 3 words of text */
  thumbnail?: { scene: string; text: string };
  /** YouTube packaging written by the Packager agent */
  titles?: string[];
  description?: string;
  /** a question for the viewers, to pin as the first comment */
  pinnedComment?: string;
  tags?: string[];
  sources?: { title: string; url: string }[];
};

export const FPS = 30;
export const LEAD_IN = 0.35; // seconds of picture before the first word of each scene
export const TAIL = 1.2; // seconds after the last scene
export const sceneSeconds = (s: Scene) => s.duration ?? 3;

export const parseExpression = (v: string | undefined, t: number): Expression => {
  if (!v) return "neutral";
  const [a, b] = v.split(">");
  return ((b && t > 0.55 ? b : a) as Expression) ?? "neutral";
};

/** Frame where each scene starts (+ total at the end). Shared by Film.tsx and the audio scripts. */
export const sceneStarts = (spec: FilmSpec): number[] => {
  const out: number[] = [];
  let acc = 0;
  for (const s of spec.scenes) {
    out.push(acc);
    acc += Math.round(sceneSeconds(s) * FPS);
  }
  out.push(acc);
  return out;
};
export const filmFrames = (spec: FilmSpec) => sceneStarts(spec)[spec.scenes.length] + Math.round(TAIL * FPS);
