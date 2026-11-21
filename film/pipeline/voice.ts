// Voice for films/<slug>/film.json, one clip per scene, then real durations → film.json.
//
// Default: calls the ElevenLabs text-to-speech API directly (the key is injected by the
// environment's network proxy for api.elevenlabs.io — no key in code or variables).
// Alternative: if films/<slug>/voice-urls.json exists ({ "<scene id>": "<content_url>" },
// e.g. from the ElevenLabs connector), those clips are downloaded instead.
//
//   node --no-warnings pipeline/voice.ts <slug>
import fs from "node:fs";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { type FilmSpec, LEAD_IN } from "../src/engine/types.ts";

const run = promisify(execFile);
const VOICE_ID = "GoV1V2hQd1doxcYR2SuA"; // Victor
const MODEL_ID = "eleven_v4";
const GAP = 0.3; // breathing room after each line
const PARALLEL = 4;

const slug = process.argv[2];
const dir = `films/${slug}`;
const spec: FilmSpec = JSON.parse(fs.readFileSync(`${dir}/film.json`, "utf8"));
const urlsPath = `${dir}/voice-urls.json`;
const urls: Record<string, string> | null = fs.existsSync(urlsPath) ? JSON.parse(fs.readFileSync(urlsPath, "utf8")) : null;
fs.mkdirSync(`public/voice/${slug}`, { recursive: true });

const fetchClip = async (id: string, text: string, file: string) => {
  if (fs.existsSync(file) && fs.statSync(file).size > 2000) return;
  const tmp = `${file}.part`;
  if (urls) {
    if (!urls[id]) throw new Error(`no voice url for scene ${id}`);
    await run("curl", ["-sS", "--fail", "--retry", "3", "--retry-all-errors", "-o", tmp, urls[id]]);
  } else {
    const body = JSON.stringify({ text, model_id: MODEL_ID });
    await run("curl", [
      "-sS", "--fail-with-body", "--retry", "3", "--retry-all-errors", "--max-time", "120",
      "-X", "POST", `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      "-H", "xi-api-key: proxy-injected", "-H", "Content-Type: application/json",
      "--data-binary", body, "-o", tmp,
    ]);
  }
  if (fs.statSync(tmp).size < 2000) throw new Error(`clip ${id} too small: ${fs.readFileSync(tmp, "utf8").slice(0, 200)}`);
  fs.renameSync(tmp, file);
};

const queue = spec.scenes.map((s) => s);
const worker = async () => {
  for (let s = queue.shift(); s; s = queue.shift()) {
    await fetchClip(s.id, s.line, `public/voice/${slug}/${s.id}.mp3`);
    process.stdout.write(".");
  }
};
await Promise.all(Array.from({ length: PARALLEL }, worker));
console.log("");

for (const s of spec.scenes) {
  const rel = `voice/${slug}/${s.id}.mp3`;
  const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `public/${rel}`]).toString());
  if (!(dur > 0.3)) throw new Error(`bad audio for ${s.id}`);
  s.audio = rel;
  s.duration = Math.round((LEAD_IN + dur + GAP) * 100) / 100;
}
fs.writeFileSync(`${dir}/film.json`, JSON.stringify(spec, null, 2));
const total = spec.scenes.reduce((a, s) => a + (s.duration ?? 0), 0);
console.log(`voice: ${spec.scenes.length} clips (${urls ? "connector urls" : "ElevenLabs API"}), film ${total.toFixed(1)} s`);
