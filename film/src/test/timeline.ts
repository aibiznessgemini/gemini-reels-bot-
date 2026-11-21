// Shared timeline for the 10-second style test.
// Pure math, no imports: used by the Remotion scene AND by scripts/make-audio.ts,
// so picture and sound always line up on the exact same frame.

export const FPS = 30;
export const DURATION = 300; // 10 s
export const W = 1920;
export const H = 1080;
export const GROUND_Y = 860;

export const WALK_SPEED = 9; // px per frame while walking
export const DECEL_START = 170;
export const DECEL_FRAMES = 30;
export const STOP_FRAME = DECEL_START + DECEL_FRAMES; // 200

/** How far the world has scrolled (px) at frame f. */
export const scrollAt = (f: number): number => {
  if (f <= DECEL_START) return WALK_SPEED * Math.max(0, f);
  const t = Math.min(f - DECEL_START, DECEL_FRAMES);
  return WALK_SPEED * DECEL_START + WALK_SPEED * (t - (t * t) / (2 * DECEL_FRAMES));
};

export const FINAL_SCROLL = scrollAt(STOP_FRAME);

/** Walk cycle phase grows with distance travelled, so legs never "skate". */
export const STRIDE = 0.035; // radians per px
export const walkPhase = (f: number): number => scrollAt(f) * STRIDE;

export const DOG_X = 640; // dog stays here; the world moves
export const HOUSE_SCREEN_X = 1290; // where the house ends up when the walk stops
export const HOUSE_WORLD_X = HOUSE_SCREEN_X + FINAL_SCROLL;

export const SNOW_FROM = 80;
export const SNOW_TO = 190;
export const DOOR_OPEN = 204;
export const DOOR_OPEN_FRAMES = 10;
export const JUMP_FROM = 214;
export const JUMP_FRAMES = 18;
export const PUSH_IN_FROM = 176;
export const TITLE_FROM = 244;
export const TITLE_WORD = "HOME";
export const TITLE_LETTER_FRAMES = 4;
export const FADE_OUT_FROM = 290;

export const MILES_START = 2551;

/** Miles counter: counts down with distance walked. */
export const milesLeft = (f: number): number =>
  Math.max(0, Math.round(MILES_START * (1 - scrollAt(f) / FINAL_SCROLL)));

export type Line = { from: number; to: number; text: string };
export const LINES: Line[] = [
  { from: 12, to: 84, text: "1923. Lost 2,551 miles from home." },
  { from: 94, to: 168, text: "He walked through the winter." },
  { from: 178, to: 238, text: "Six months later..." },
];

/** Frames where a paw hits the ground (for footstep SFX). */
export const footstepFrames = (): number[] => {
  const out: number[] = [];
  let last = 0;
  for (let f = 1; f <= STOP_FRAME; f++) {
    const k = Math.floor(walkPhase(f) / Math.PI);
    if (k > last) {
      out.push(f);
      last = k;
    }
  }
  return out;
};

/** Frames where each title letter appears. */
export const titleLetterFrames = (): number[] =>
  TITLE_WORD.split("").map((_, i) => TITLE_FROM + 6 + i * TITLE_LETTER_FRAMES);
