// Auditor's mechanical checks for films/<slug>/film.json (the LLM Auditor judges the rest).
//   node --no-warnings pipeline/validate.ts <slug> [--timed]
import fs from "node:fs";
import { type FilmSpec, sceneSeconds } from "../src/engine/types.ts";

const slug = process.argv[2];
const timed = process.argv.includes("--timed");
const spec: FilmSpec = JSON.parse(fs.readFileSync(`films/${slug}/film.json`, "utf8"));
const errors: string[] = [];
const warn: string[] = [];
const SETS = ["hall", "classroom", "street", "bedroom", "void"];
const SHOTS = ["wide", "follow", "overhead", "dolly", "closeup", "ots", "twoshot", "lineup"];
const ACTIONS = ["idle", "walk", "wave", "turn", "nod", "jump", "cheer"];
const EXPR = ["neutral", "smug", "happy", "nervous", "surprised", "sleepy"];
const SFX = ["whoosh", "pop", "chime", "thud", "tick", "riser", "sparkle"];
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

if (spec.slug !== slug) errors.push(`slug "${spec.slug}" != folder "${slug}"`);
if (!spec.cast?.you) errors.push(`cast must contain "you"`);
if (spec.scenes.length < 18 || spec.scenes.length > 45) errors.push(`scenes: ${spec.scenes.length} (need 18–45)`);
const ids = new Set<string>();
spec.scenes.forEach((s, i) => {
  const at = `scene ${s.id ?? i}`;
  if (!s.id || ids.has(s.id)) errors.push(`${at}: missing or duplicate id`);
  ids.add(s.id);
  if (!s.line || words(s.line) < 3) errors.push(`${at}: narration line missing`);
  if (words(s.line) > 32) errors.push(`${at}: line has ${words(s.line)} words (max 32)`);
  if (!SETS.includes(s.set)) errors.push(`${at}: unknown set "${s.set}"`);
  if (!SHOTS.includes(s.shot)) errors.push(`${at}: unknown shot "${s.shot}"`);
  for (const k of [s.subject ?? "you", ...(s.others ?? [])]) if (!spec.cast[k]) errors.push(`${at}: cast "${k}" not defined`);
  if ((s.shot === "ots" || s.shot === "twoshot") && !s.others?.length) errors.push(`${at}: ${s.shot} needs others[0]`);
  for (const [k, v] of Object.entries(s.expression ?? {})) for (const e of v.split(">")) if (!EXPR.includes(e)) errors.push(`${at}: expression "${e}" for ${k}`);
  for (const [k, v] of Object.entries(s.action ?? {})) if (!ACTIONS.includes(v)) errors.push(`${at}: action "${v}" for ${k}`);
  for (const e of s.sfx ?? []) if (!SFX.includes(e)) errors.push(`${at}: sfx "${e}"`);
  if (s.badge && words(s.badge) > 4) errors.push(`${at}: badge "${s.badge}" > 4 words`);
  if (s.label && words(s.label) > 6) errors.push(`${at}: label > 6 words`);
  if ((s.crowd ?? 0) > 60) errors.push(`${at}: crowd > 60`);
  if (timed && (!s.audio || !s.duration)) errors.push(`${at}: no audio/duration (run voice.ts)`);
  if (i > 0 && spec.scenes[i - 1].shot === s.shot && spec.scenes[i - 1].set === s.set) warn.push(`${at}: same set+shot as previous scene`);
});
if (spec.thumbnail && words(spec.thumbnail.text) > 3) errors.push(`thumbnail text > 3 words`);
if (spec.thumbnail && !ids.has(spec.thumbnail.scene)) errors.push(`thumbnail scene "${spec.thumbnail.scene}" not found`);
if (timed) {
  const total = spec.scenes.reduce((a, s) => a + sceneSeconds(s), 0);
  if (total < 110 || total > 200) errors.push(`total ${total.toFixed(1)} s (need 110–200 s)`);
  console.log(`total: ${total.toFixed(1)} s`);
}
// never repeat a story
const histPath = "films/history.json";
if (fs.existsSync(histPath)) {
  const hist: { slug: string; title: string }[] = JSON.parse(fs.readFileSync(histPath, "utf8"));
  if (hist.some((h) => h.slug === slug)) errors.push(`slug "${slug}" already in history.json`);
}
warn.forEach((w) => console.log(`warn: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.log(`ERROR: ${e}`));
  process.exit(1);
}
console.log(`OK: ${spec.scenes.length} scenes`);
