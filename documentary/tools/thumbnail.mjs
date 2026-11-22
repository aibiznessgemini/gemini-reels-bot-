// thumbnail.mjs — 1280×720 YouTube thumbnail from a rendered still + one huge word + a yellow tag.
//   node tools/thumbnail.mjs --still <jpg> --word "STOLEN" [--tag "1911"] [--side left|right] --out <jpg>
// Same look as the films: Anton red word with a dark outline, yellow tag, vignette. Local fonts only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; { const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; args[k] = v; } }
if (!args.still || !args.word || !args.out) { console.error('usage: node tools/thumbnail.mjs --still <jpg> --word W [--tag T] [--side left|right] --out <jpg>'); process.exit(1); }
if ((`${args.word} ${args.tag || ''}`).trim().split(/\s+/).length > 3) { console.error('thumbnail text must be ≤ 3 words'); process.exit(1); }
const b64 = f => fs.readFileSync(f).toString('base64');
const anton = b64(path.join(ROOT, 'node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2'));
const img = b64(path.resolve(args.still));
const side = args.side === 'right' ? 'right' : 'left';
const html = `<!doctype html><html><head><style>
@font-face{font-family:A;src:url(data:font/woff2;base64,${anton}) format('woff2')}
html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#111}
.bg{position:absolute;inset:0;background:url(data:image/jpeg;base64,${img}) center/cover;transform:scale(1.08)}
.v{position:absolute;inset:0;background:radial-gradient(ellipse at ${side === 'left' ? '70%' : '30%'} 50%,rgba(0,0,0,0) 30%,rgba(0,0,0,.65) 100%)}
.t{position:absolute;${side}:56px;top:50%;transform:translateY(-55%) rotate(-3deg);text-align:${side}}
.w{font:190px/0.95 A;color:#e3261b;letter-spacing:2px;-webkit-text-stroke:6px #1a0c08;paint-order:stroke fill;text-shadow:0 10px 30px rgba(0,0,0,.6)}
.g{display:inline-block;margin-top:14px;font:96px/1 A;background:#ffd600;color:#17140f;padding:6px 26px;box-shadow:0 8px 20px rgba(0,0,0,.5)}
</style></head><body><div class="bg"></div><div class="v"></div><div class="t"><div class="w">${args.word}</div>${args.tag ? `<div class="g">${args.tag}</div>` : ''}</div></body></html>`;
const CHROME = process.env.CHROMIUM || (fs.existsSync(chromium.executablePath()) ? null : '/opt/pw-browsers/chromium');
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.setContent(html); await page.evaluate(() => document.fonts.ready);
fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
await page.screenshot({ path: path.resolve(args.out), type: 'jpeg', quality: 92 });
await browser.close(); console.log('thumbnail ->', args.out);
