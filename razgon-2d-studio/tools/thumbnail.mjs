// The You Experiment add-on: YouTube thumbnail (1280x720 JPEG) from a rendered still + up to 3 big words.
//   node tools/thumbnail.mjs --still projects/<slug>/build/stills/<file>.png --text "STOP TIME" --out projects/<slug>/out/thumbnail.jpg
// Uses the local Fredoka font (no network) and the same Chromium as render.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = {};
{ const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; args[k] = v; } }
if (!args.still || !args.text || !args.out) { console.error('usage: node tools/thumbnail.mjs --still <png> --text "<≤3 words>" --out <jpg> [--side left|right]'); process.exit(1); }
const words = String(args.text).trim().split(/\s+/);
if (words.length > 3) { console.error('thumbnail text must be ≤ 3 words'); process.exit(1); }

const font = fs.readFileSync(path.resolve('node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff2')).toString('base64');
const img = fs.readFileSync(path.resolve(args.still)).toString('base64');
const side = args.side === 'right' ? 'right' : 'left';
const zoom = +(args.zoom ?? 1.3); // hides the letterbox bars of the still
const html = `<!doctype html><html><head><style>
@font-face { font-family: F; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 700; }
html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#0e0b12}
.bg{position:absolute;inset:0;background:url(data:image/png;base64,${img}) center/${zoom * 100}% auto no-repeat}
.shade{position:absolute;inset:0;background:linear-gradient(${side === 'left' ? '90deg' : '270deg'},rgba(10,8,16,.82) 0%,rgba(10,8,16,.35) 48%,rgba(10,8,16,0) 70%)}
.t{position:absolute;${side}:56px;bottom:64px;width:640px;font:700 112px/0.98 F;color:#fff1dc;text-transform:uppercase;letter-spacing:2px;
   -webkit-text-stroke:4px #0b0812;paint-order:stroke fill;text-shadow:0 8px 0 #F2A541,0 0 40px rgba(242,165,65,.55);text-align:${side}}
.tag{position:absolute;${side}:60px;top:44px;padding:6px 18px;border-radius:999px;background:#F2A541;color:#0b0812;font:700 28px F;letter-spacing:3px}
</style></head><body><div class="bg"></div><div class="shade"></div><div class="tag">WHAT IF?</div><div class="t">${words.join(' ')}</div></body></html>`;

const exe = process.env.RAZGON_CHROMIUM || (fs.existsSync(chromium.executablePath()) ? undefined : '/opt/pw-browsers/chromium');
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
await page.screenshot({ path: path.resolve(args.out), type: 'jpeg', quality: 90 });
await browser.close();
console.log(`thumbnail: ${args.out}`);
