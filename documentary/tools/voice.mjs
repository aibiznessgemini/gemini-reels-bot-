// voice.mjs — narration from ElevenLabs with exact word timings (one TTS call per line).
//   node tools/voice.mjs --project projects/<slug> [--voice ID] [--model eleven_v4] [--gap 0.45]
// Reads   <project>/script.txt   (one narration line per row = one beat)
// Writes  <project>/build/voice/NNN.mp3|json (cache), <project>/build/voiceover.wav,
//         <project>/timings.json  { duration, lines:[{i,text,start,end,words:[{w,start,end}]}] }
// The API key is injected by the network proxy for api.elevenlabs.io — never stored here.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = {};
{ const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; args[k] = v; } }
if (!args.project) { console.error('usage: node tools/voice.mjs --project projects/<slug>'); process.exit(1); }
const P = path.resolve(args.project);
const VOICE = args.voice || 'GoV1V2hQd1doxcYR2SuA';   // Victor — calm documentary narrator
const MODEL = args.model || 'eleven_v4';
const GAP = +(args.gap ?? 0.45);   // pause between lines
const LEAD = 0.6;                  // silence before the first word
const TAIL = 1.6;                  // silence after the last word (lets the camera settle)
const work = path.join(P, 'build', 'voice'); fs.mkdirSync(work, { recursive: true });
const lines = fs.readFileSync(path.join(P, 'script.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const SR = 44100;
const probe = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

function tts(text, i) {
  const id = String(i).padStart(3, '0'), mp3 = path.join(work, `${id}.mp3`), js = path.join(work, `${id}.json`);
  if (fs.existsSync(mp3) && fs.existsSync(js)) { const r = JSON.parse(fs.readFileSync(js, 'utf8')); if (r.text === text && r.voice === VOICE) return r; }
  const body = JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true } });
  const out = execFileSync('curl', ['-sS', '--fail-with-body', '--retry', '3', '--retry-all-errors', '--max-time', '180', '-X', 'POST',
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`,
    '-H', 'xi-api-key: proxy-injected', '-H', 'Content-Type: application/json', '--data-binary', body], { maxBuffer: 1 << 28 }).toString();
  const d = JSON.parse(out);
  fs.writeFileSync(mp3, Buffer.from(d.audio_base64, 'base64'));
  const a = d.alignment || d.normalized_alignment;
  const words = []; let cur = null;
  a.characters.forEach((ch, k) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { w: '', start: a.character_start_times_seconds[k], end: a.character_end_times_seconds[k] };
    cur.w += ch; cur.end = a.character_end_times_seconds[k];
  });
  if (cur) words.push(cur);
  const rec = { text, voice: VOICE, words };
  fs.writeFileSync(js, JSON.stringify(rec));
  return rec;
}

const recs = lines.map((t, i) => { process.stdout.write(`voice ${i + 1}/${lines.length}\r`); return tts(t, i); });
console.log('');
const sil = (sec, f) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=${SR}:cl=mono`, '-t', String(sec), '-c:a', 'pcm_s16le', f]);
const lead = path.join(work, 'lead.wav'), gap = path.join(work, 'gap.wav'), tail = path.join(work, 'tail.wav');
sil(LEAD, lead); sil(GAP, gap); sil(TAIL, tail);
const list = [`file '${lead}'`], outLines = []; let t = LEAD;
recs.forEach((r, i) => {
  const wav = path.join(work, `${String(i).padStart(3, '0')}.wav`);
  // trim leading/trailing silence of each clip so pauses are exactly GAP
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(work, `${String(i).padStart(3, '0')}.mp3`), '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  const d = probe(wav);
  const words = r.words.map(w => ({ w: w.w, start: +(t + w.start).toFixed(3), end: +(t + w.end).toFixed(3) }));
  outLines.push({ i, text: r.text, start: words[0].start, end: words[words.length - 1].end, clipStart: +t.toFixed(3), clipEnd: +(t + d).toFixed(3), words });
  list.push(`file '${wav}'`); t += d;
  if (i < recs.length - 1) { list.push(`file '${gap}'`); t += GAP; }
});
list.push(`file '${tail}'`); t += TAIL;
fs.writeFileSync(path.join(work, 'list.txt'), list.join('\n'));
const voice = path.join(P, 'build', 'voiceover.wav');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt'), '-c:a', 'pcm_s16le', voice]);
const duration = probe(voice);
fs.writeFileSync(path.join(P, 'timings.json'), JSON.stringify({ duration, voice: VOICE, model: MODEL, lines: outLines }, null, 1));
console.log(`voice: ${lines.length} lines, ${duration.toFixed(2)} s -> ${voice}`);
