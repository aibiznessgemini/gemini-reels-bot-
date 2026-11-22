// The You Experiment add-on: narration from ElevenLabs with exact word timings.
// Replaces Whisper (its model host is blocked in the cloud sessions):
//   one TTS call per line with /with-timestamps → per-character timing → words,
//   then all clips are joined with short pauses into one voiceover.
//
//   node tools/eleven_voice.mjs --name <slug> --lines <lines.txt> --title "<title>" [--gap 0.35]
//
// lines.txt: one narration line per line (a sentence or two). Then it runs
//   new_project.py (voice + words.json) and parse_script.py, so the project is ready for beats.py.
// The API key is injected by the network proxy for api.elevenlabs.io (never stored here).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = {};
{ const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; args[k] = v; } }
if (!args.name || !args.lines) { console.error('usage: node tools/eleven_voice.mjs --name <slug> --lines <file> [--title t] [--gap 0.35]'); process.exit(1); }

const VOICE = args.voice || 'GoV1V2hQd1doxcYR2SuA'; // Victor
const MODEL = args.model || 'eleven_v4';
const GAP = +(args.gap ?? 0.35);
const LEAD = 0.25; // silence before the first word
const work = path.resolve('voice_work', args.name);
fs.mkdirSync(work, { recursive: true });
const lines = fs.readFileSync(args.lines, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

const tts = (text, i) => {
  const mp3 = path.join(work, `${String(i).padStart(3, '0')}.mp3`), js = path.join(work, `${String(i).padStart(3, '0')}.json`);
  if (fs.existsSync(mp3) && fs.existsSync(js) && JSON.parse(fs.readFileSync(js, 'utf8')).text === text) return JSON.parse(fs.readFileSync(js, 'utf8'));
  const out = execFileSync('curl', ['-sS', '--fail-with-body', '--retry', '3', '--retry-all-errors', '--max-time', '180', '-X', 'POST',
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`,
    '-H', 'xi-api-key: proxy-injected', '-H', 'Content-Type: application/json',
    '--data-binary', JSON.stringify({ text, model_id: MODEL })], { maxBuffer: 1 << 28 }).toString();
  const d = JSON.parse(out);
  fs.writeFileSync(mp3, Buffer.from(d.audio_base64, 'base64'));
  const a = d.alignment;
  const words = []; let cur = null;
  a.characters.forEach((ch, k) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { word: '', start: a.character_start_times_seconds[k], end: a.character_end_times_seconds[k] };
    cur.word += ch; cur.end = a.character_end_times_seconds[k];
  });
  if (cur) words.push(cur);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString());
  const rec = { text, words, dur };
  fs.writeFileSync(js, JSON.stringify(rec));
  return rec;
};

// 1) clips + timings
const recs = lines.map((t, i) => { process.stdout.write(`voice ${i + 1}/${lines.length}\r`); return tts(t, i); });
console.log('');
// 2) join: LEAD silence, clip, GAP silence, clip, ...
const SR = 44100;
const silence = (sec, file) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=${SR}:cl=mono`, '-t', String(sec), '-c:a', 'pcm_s16le', file]);
const lead = path.join(work, 'lead.wav'), gap = path.join(work, 'gap.wav');
silence(LEAD, lead); silence(GAP, gap);
const list = [], words = []; let t = LEAD;
list.push(`file '${lead}'`);
recs.forEach((r, i) => {
  const wav = path.join(work, `${String(i).padStart(3, '0')}.wav`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(work, `${String(i).padStart(3, '0')}.mp3`), '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  const d = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString());
  r.words.forEach(w => words.push({ word: w.word, start: +(t + w.start).toFixed(3), end: +(t + w.end).toFixed(3) }));
  list.push(`file '${wav}'`); t += d;
  if (i < recs.length - 1) { list.push(`file '${gap}'`); t += GAP; }
});
fs.writeFileSync(path.join(work, 'list.txt'), list.join('\n'));
const voice = path.join(work, 'voiceover.wav');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt'), '-c:a', 'pcm_s16le', voice]);
const wordsFile = path.join(work, 'words.json');
fs.writeFileSync(wordsFile, JSON.stringify({ words }, null, 1));
console.log(`voice: ${lines.length} lines, ${words.length} words, ${t.toFixed(1)} s`);

// 3) project + timeline
const py = process.env.PYTHON || 'python3';
execFileSync(py, ['tools/new_project.py', '--name', args.name, '--voice', voice, '--script', wordsFile, '--aspect', args.aspect || '16:9',
  '--resolution', args.resolution || '1080p', '--title', args.title || args.name, '--style', args.style || 'dusk'], { stdio: 'inherit' });
execFileSync(py, ['tools/parse_script.py', '--project', `projects/${args.name}`, '--script', `projects/${args.name}/input/script.json`], { stdio: 'inherit' });
// Owner's decision: burned-in word-by-word subtitles on every film (amber = the word being spoken).
const cfgPath = `projects/${args.name}/config.json`;
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.captions = args.captions !== 'off';
cfg.captionStyle = { max: 4, size: 60, hi: '#F2A541' };
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 1));
console.log(`captions: ${cfg.captions ? 'on' : 'off'}`);
