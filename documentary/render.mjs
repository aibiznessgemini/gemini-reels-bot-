// render.mjs — headless Chromium frame renderer → ffmpeg.
//   node render.mjs --project projects/<slug>                    full silent video  -> build/video_silent.mp4
//   node render.mjs --project P --sheet                          one still per beat -> build/sheet/sheet_*.jpg
//   node render.mjs --project P --stills 3.5,12,40               stills at times     -> build/stills
//   node render.mjs --project P --seq 40:44:0.25                 camera sequence      -> build/seq
//   node render.mjs --project P --table                          beats.md + cues.json
// Options: --workers N  --from s --to s  --crf 16
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = {}; { const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; args[k] = v; } }
if (!args.project) { console.error('usage: node render.mjs --project projects/<slug> [--sheet|--stills ..|--seq a:b:s|--table]'); process.exit(1); }
const PHOTOS = path.resolve(ROOT, '..', 'photos');
const PROJECT = path.resolve(args.project), BUILD = path.join(PROJECT, 'build'); fs.mkdirSync(BUILD, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const p = url.startsWith('/project/') ? path.join(PROJECT, url.slice(9)) : url.startsWith('/photos/') ? path.join(PHOTOS, url.slice(8)) : path.join(ROOT, url);
  if (!(p.startsWith(ROOT) || p.startsWith(PROJECT) || p.startsWith(PHOTOS)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(res);
}).listen(0);
const PORT = server.address().port;
const CHROME = process.env.CHROMIUM || (fs.existsSync(chromium.executablePath()) ? null : '/opt/pw-browsers/chromium');
const LAUNCH = { ...(CHROME ? { executablePath: CHROME } : {}), args: ['--disable-dev-shm-usage', '--disable-gpu-vsync', '--force-color-profile=srgb'] };
const FPS = 30;

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); });
  await page.goto(`http://localhost:${PORT}/player.html`);
  await page.waitForFunction('window.READY === true || !!window.BOOT_ERROR', null, { timeout: 300000 });
  const err = await page.evaluate('window.BOOT_ERROR'); if (err) throw new Error(err);
  return page;
}
const grab = async (page, f) => { const d = await page.evaluate(i => { window.renderFrame(i); return window.grab(0.92); }, f); return Buffer.from(d.split(',')[1], 'base64'); };
const fmt = s => `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s`;
function sheet(dir, files, labels, out, cols = 4) {
  // contact sheet with labels via ffmpeg
  const tmp = path.join(dir, '_lab'); fs.mkdirSync(tmp, { recursive: true });
  files.forEach((f, i) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f, '-vf', `scale=480:270,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${labels[i].replace(/[':\\]/g, ' ')}':x=6:y=6:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.6`, path.join(tmp, `${String(i).padStart(3, '0')}.jpg`)]));
  const rows = Math.ceil(files.length / cols);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, '%03d.jpg'), '-vf', `tile=${cols}x${rows}:padding=4:color=0x111111`, '-frames:v', '1', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function stills(times, sub, labels) {
  const dir = path.join(BUILD, sub); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch(LAUNCH), page = await open(browser);
  const errs = await page.evaluate('window.ERRORS'); if (errs.length) console.log('TIMELINE ERRORS:\n  ' + errs.join('\n  '));
  if (typeof times === 'function') ({ times, labels } = await times(page));
  const files = [];
  for (let i = 0; i < times.length; i++) { const f = path.join(dir, `${String(i).padStart(3, '0')}_${times[i].toFixed(2)}.jpg`); fs.writeFileSync(f, await grab(page, Math.round(times[i] * FPS))); files.push(f); }
  await browser.close();
  const per = 16; for (let i = 0; i < files.length; i += per) sheet(dir, files.slice(i, i + per), (labels || times.map(t => t.toFixed(2) + 's')).slice(i, i + per), path.join(dir, `sheet_${String(i / per + 1).padStart(2, '0')}.jpg`));
  console.log(`${files.length} stills -> ${dir}`);
}

async function video() {
  const b0 = await chromium.launch(LAUNCH), p0 = await open(b0);
  const total = await p0.evaluate('window.TOTAL_FRAMES'); const errs = await p0.evaluate('window.ERRORS'); await b0.close();
  if (errs.length) console.log('TIMELINE ERRORS:\n  ' + errs.join('\n  '));
  const f0 = Math.round((+args.from || 0) * FPS), f1 = args.to ? Math.min(total, Math.round(+args.to * FPS)) : total;
  const N = +(args.workers || Math.max(1, os.cpus().length - 1)), chunk = Math.ceil((f1 - f0) / N);
  const parts = path.join(BUILD, 'parts'); fs.rmSync(parts, { recursive: true, force: true }); fs.mkdirSync(parts, { recursive: true });
  let done = 0; const t0 = Date.now();
  console.log(`rendering frames ${f0}..${f1} (${((f1 - f0) / FPS).toFixed(2)} s) with ${N} workers`);
  const work = async k => {
    const a = f0 + k * chunk, b = Math.min(f1, a + chunk); if (a >= b) return null;
    const browser = await chromium.launch(LAUNCH), page = await open(browser), out = path.join(parts, `p${String(k).padStart(2, '0')}.mp4`);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 16), '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      const img = await grab(page, f); if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
      if (++done % 90 === 0) { const el = (Date.now() - t0) / 1000; console.log(`  ${done}/${f1 - f0}  ${(done / el).toFixed(1)} fps  eta ${fmt(el / done * (f1 - f0 - done))}`); }
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close(); return out;
  };
  const outs = (await Promise.all([...Array(N)].map((_, k) => work(k)))).filter(Boolean);
  fs.writeFileSync(path.join(parts, 'list.txt'), outs.map(p => `file '${p}'`).join('\n'));
  const out = path.join(BUILD, args.from || args.to ? 'preview.mp4' : 'video_silent.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(parts, 'list.txt'), '-c', 'copy', out]);
  console.log(`done ${out} in ${fmt((Date.now() - t0) / 1000)}`);
}

async function table() {
  const browser = await chromium.launch(LAUNCH), page = await open(browser);
  const [beats, cues, errs, dur] = await page.evaluate('[window.BEATS, window.CUES, window.ERRORS, window.DURATION]'); await browser.close();
  fs.writeFileSync(path.join(PROJECT, 'cues.json'), JSON.stringify({ duration: dur, cues }, null, 1));
  fs.writeFileSync(path.join(PROJECT, 'beats.json'), JSON.stringify({ duration: dur, errors: errs, beats }, null, 1));
  const esc = s => String(s).replace(/\|/g, '\\|');
  const md = ['# Beat table', '', `Duration: ${dur.toFixed(2)} s · ${beats.length} beats · one continuous camera move on one board`, '',
    '| # | time | narration | main object (focus) | on-screen text | word-synced fx |', '|---|---|---|---|---|---|',
    ...beats.map(b => `| ${b.line + 1} | ${b.start.toFixed(2)}–${b.end.toFixed(2)} | ${esc(b.text)} | ${esc(b.focus.join(', '))} | ${esc(b.onscreen.join(' · ') || '—')} | ${esc(b.fx.join(', ') || '—')} |`)];
  fs.writeFileSync(path.join(PROJECT, 'beats.md'), md.join('\n') + '\n');
  if (errs.length) console.log('TIMELINE ERRORS:\n  ' + errs.join('\n  '));
  console.log(`beats.md (${beats.length} beats) + cues.json (${cues.length} cues)`);
}

try {
  if (args.table) await table();
  else if (args.sheet) await stills(async page => { const b = await page.evaluate('window.BEATS'); const cam = await page.evaluate(() => window.BEATS); return { times: b.map(x => Math.min(x.end - 0.05, x.start + (x.end - x.start) * 0.8)), labels: b.map(x => `${x.line + 1} ${x.start.toFixed(1)}s ${x.focus.join(',').slice(0, 30)}`) }; }, 'sheet');
  else if (args.stills) await stills(String(args.stills).split(',').map(Number), 'stills');
  else if (args.seq) { const [a, b, s] = String(args.seq).split(':').map(Number); const ts = []; for (let t = a; t <= b + 1e-6; t += s) ts.push(+t.toFixed(3)); await stills(ts, 'seq'); }
  else await video();
} catch (e) { console.error('RENDER FAILED:', e.message); process.exitCode = 1; }
finally { server.close(); setTimeout(() => process.exit(process.exitCode || 0), 500); }
