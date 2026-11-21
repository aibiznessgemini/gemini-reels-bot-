// Downloads the ElevenLabs takes listed in films/<slug>/voice-urls.json
// ({ "<scene id>": "<content_url>" }), measures them and writes audio + duration
// into film.json. Timing comes from the real audio, never from a guess.
//   node --no-warnings pipeline/voice.ts <slug>
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { type FilmSpec, LEAD_IN } from "../src/engine/types.ts";

const GAP = 0.3; // breathing room after each line
const slug = process.argv[2];
const dir = `films/${slug}`;
const spec: FilmSpec = JSON.parse(fs.readFileSync(`${dir}/film.json`, "utf8"));
const urls: Record<string, string> = JSON.parse(fs.readFileSync(`${dir}/voice-urls.json`, "utf8"));
fs.mkdirSync(`public/voice/${slug}`, { recursive: true });
for (const s of spec.scenes) {
  const url = urls[s.id];
  if (!url) throw new Error(`no voice url for scene ${s.id}`);
  const rel = `voice/${slug}/${s.id}.mp3`;
  const file = `public/${rel}`;
  if (!fs.existsSync(file)) execFileSync("curl", ["-sS", "--fail", "--retry", "3", "--retry-all-errors", "-o", file, url]);
  const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  if (!(dur > 0.3)) throw new Error(`bad audio for ${s.id}`);
  s.audio = rel;
  s.duration = Math.round((LEAD_IN + dur + GAP) * 100) / 100;
}
fs.writeFileSync(`${dir}/film.json`, JSON.stringify(spec, null, 2));
const total = spec.scenes.reduce((a, s) => a + (s.duration ?? 0), 0);
console.log(`voice: ${spec.scenes.length} clips, film ${total.toFixed(1)} s`);
