// The You Experiment thumbnail formula v2 (owner-approved mix of top "what if" thumbnails):
//  • dark background, ONE giant subject on the right (exaggerated face, or scale contrast: giant thing + tiny YOU)
//  • left: 2 lines of huge chunky cartoon caps — line 1 white, line 2 yellow — black outline + hard shadow, slight tilt
//  • a small red "sticker" label top-left with a curiosity hook
//   node tools/thumbnail2.mjs --still <png> --l1 "THE MOON" --l2 "IS GONE" --tag "WHAT IF?" --out <jpg> [--side left|right]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = {};
{ const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; args[k] = v; } }
if (!args.still || !args.l1 || !args.out) { console.error('usage: node tools/thumbnail2.mjs --still <png> --l1 "LINE 1" [--l2 "LINE 2"] [--tag "STICKER"] --out <jpg> [--side left|right]'); process.exit(1); }
const words = `${args.l1} ${args.l2 || ''}`.trim().split(/\s+/);
if (words.length > 5) { console.error('keep the big text to ≤ 5 words'); process.exit(1); }
const b64 = (p) => fs.readFileSync(path.resolve(p)).toString('base64');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const side = args.side === 'right' ? 'right' : 'left';
const html = `<!doctype html><html><head><style>
@font-face { font-family: Lucky; src: url(data:font/woff2;base64,${b64('fonts/LuckiestGuy.woff2')}) format('woff2'); }
@font-face { font-family: Anton; src: url(data:font/woff2;base64,${b64('fonts/Anton.woff2')}) format('woff2'); }
html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#07060b}
.bg{position:absolute;inset:0;background:url(data:image/png;base64,${b64(args.still)}) center/cover no-repeat}
.shade{position:absolute;inset:0;background:linear-gradient(${side === 'left' ? '90deg' : '270deg'},rgba(4,3,8,.88) 0%,rgba(4,3,8,.55) 34%,rgba(4,3,8,0) 58%)}
.box{position:absolute;${side}:46px;top:0;bottom:0;width:600px;display:flex;flex-direction:column;justify-content:center;transform:rotate(-2.5deg);text-align:${side}}
.l{display:inline-block;align-self:${side === 'left' ? 'flex-start' : 'flex-end'};font-family:Lucky;line-height:.95;letter-spacing:1px;-webkit-text-stroke:12px #000;paint-order:stroke fill;text-shadow:8px 9px 0 #000}
.l1{color:#fff}.l2{color:#FFD23F}
.tag{position:absolute;${side}:40px;top:40px;background:#E8322B;color:#fff;font:400 34px/1 Anton;letter-spacing:1.5px;padding:10px 18px 12px;transform:rotate(-4deg);
     box-shadow:5px 6px 0 #000;border:3px solid #000;text-transform:uppercase}
</style></head><body><div class="bg"></div><div class="shade"></div>
${args.tag ? `<div class="tag">${esc(args.tag)}</div>` : ''}
<div class="box"><div class="l l1" id="a">${esc(String(args.l1).toUpperCase())}</div>${args.l2 ? `<div class="l l2" id="b">${esc(String(args.l2).toUpperCase())}</div>` : ''}</div>
<script>
  // fit each line: as big as possible, ≤ 560 px wide, ≤ 170 px tall
  for (const el of document.querySelectorAll('.l')) { let s = 190; el.style.fontSize = s + 'px'; el.style.whiteSpace = 'nowrap';
    while (el.getBoundingClientRect().width > 600 && s > 60) { s -= 4; el.style.fontSize = s + 'px'; } }
</script></body></html>`;
const exe = process.env.RAZGON_CHROMIUM || (fs.existsSync(chromium.executablePath()) ? undefined : '/opt/pw-browsers/chromium');
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(100);
fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
await page.screenshot({ path: path.resolve(args.out), type: 'jpeg', quality: 92 });
await browser.close();
console.log(`thumbnail: ${args.out}`);
