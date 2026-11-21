# CLAUDE.md — Daily Animated Film Agent

> **O'zbekcha qisqacha:** Bu loyiha har kuni avtomatik ravishda 2–3 daqiqalik
> animatsion film (16:9, ingliz tilida) tayyorlab, Telegram bot orqali egasiga
> yuboradi. Videoni YouTube'ga egasi o'zi yuklaydi. Barcha ish Claude ichida
> bajariladi. ElevenLabs FAQAT ovoz uchun ishlatiladi.

This file is the rule book. Read it fully before doing any work in this repo.

---

## 0. Status

| Item | State |
|---|---|
| Phase | **PRODUCTION** — daily automation (`docs/DAILY.md`) |
| Animation style | 3D "round heads", our own palette (section 3) |
| Voice | ElevenLabs, Victor `GoV1V2hQd1doxcYR2SuA`, model `eleven_v4`, one take per scene |
| Niche | **"What if…" + psychology**, told to "you", grounded in real studies (`docs/topics.md`) |
| Length | 2–3 minutes (110–200 s) |
| Telegram | Owner's personal chat. `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` are environment variables the owner sets |
| Archive | Google Drive folder `1OTtd9yEUQuRM0kivIKE2N-zItR4eYU2D` ("Daily Films (YouTube agent)") = history |
| Schedule | Every day 00:00 Asia/Tashkent, fresh cloud session, runs `docs/DAILY.md` |

---

## 1. Owner's decisions (do not change without asking)

- **Format:** 16:9, 1920×1080, 30 fps, **2–3 minutes** per film.
- **Language:** English.
- **Storytelling:** an English **narrator voiceover** from ElevenLabs, talking
  to the viewer as "you" (like the owner's style reference). On screen: only
  short labels, number badges and a small counter — no full subtitles.
  ElevenLabs is used **only for voice**, never for images, video or music.
- **Music:** written in code and matched to the film. **SFX:** synthesised in
  code. No stock or sample audio (so Content ID cannot claim anything).
- **Visuals:** everything drawn in code in Remotion. No AI video, no stock footage.
- **Topics:** chosen by the agent.
- **Automation:** fully automatic. The film is sent to Telegram as soon as it
  is ready. **Never upload to YouTube** — the owner uploads manually.

## 2. Originality rules

- Learn the *format* from the reference tutorial
  (`docs/reference/tutorial-breakdown.md`), never copy another channel's
  characters, palette, title cards or branding one-for-one.
- Every film must be a genuinely different topic. History lives in the Google
  Drive archive (one sub-folder per film); `validate.ts` blocks repeats via
  `films/history.json`. Mass-produced, repetitive videos risk YouTube's
  "inauthentic content" policy.
- Every factual claim must come from a source found online that day. Never
  invent numbers, percentages or quotes. Sources go in `film.json` → `sources`.

## 3. Visual style: 3D "round heads"

Learned from the owner's style reference, made our own:
- Real 3D in Remotion (`@remotion/three`), rendered with SwiftShader (`swangle`).
- Characters (`film/src/style3d/Character.tsx`): huge sphere head with a thin
  dark outline, face drawn as a 2D decal (dot eyes, line brows, simple mouth,
  rosy cheeks when happy), thin neck, hoodie body with drawstrings, noodle
  arms with ball hands, thin legs with ball feet, soft contact shadow.
- **Our lead character always wears an amber hoodie (`#F2A541`).**
- **Our palette:** deep teal night + warm amber practical lights
  (`film/src/style3d/Set.tsx` → `LOOK`). Do NOT use the reference's
  purple/pink look, pink "laser" lines or heart counter.
- Depth of field: each shot is two canvases sharing one camera; the background
  canvas gets a CSS blur in close-ups.
- Overlays: thin black cinematic bars, soft vignette, cream serif small-caps
  badges on a dark pill with an amber border, a small counter top-left.
- Music: soft felt piano + warm pad, synthesised in code, ducked under the
  voice (ffmpeg sidechain), final mix -16 LUFS.
- Render speed here: ~26 s of rendering per 1 s of film (4 CPU cores).

Older 2D samples (paper, woodcut, pixel, chalk, puppet) stay in
`film/src/test/` for reference only.

Shared rules:
- Shots hold 3–8 s (one narration line each); hard cuts between shots.
- On-screen text only as: `label` (small-caps title, ≤ 6 words), `badge`
  (number/name pill, ≤ 4 words), `counter` (top-left), `nameTags` (lineups).
- Thumbnail: a close-up frame + ≤ 3 big words (Fredoka, cream with amber shadow).

## 4. Daily pipeline (multi-agent)

The full step-by-step runbook is **`docs/DAILY.md`**. The agents are roles the
daily session plays in order; everything mechanical is a script.

| # | Agent | Does | Tool / output |
|---|---|---|---|
| 1 | **Researcher** | Reads history from Drive, picks a new topic, verifies facts online | WebSearch → sources |
| 2 | **Writer** | Writes the whole film as data: 24–32 scenes (line, set, shot, cast, expressions, badges) | `films/<slug>/film.json` |
| 3 | **Auditor** | Mechanical checks + fact check against sources (max 2 rounds) | `pipeline/validate.ts` |
| 4 | **Voice** | One ElevenLabs take per scene, real durations measured | connector + `pipeline/voice.ts` |
| 5 | **Animator** | The engine turns film.json into 3D shots — no new code per film | `src/engine/*` → `pipeline/render.sh` |
| 6 | **Sound** | Mood-based music + SFX on cuts/badges, ducked under the voice, -16 LUFS | `pipeline/music.ts` (inside render.sh) |
| 7 | **QA** | Looks at the contact sheet + thumbnail, fixes and re-renders once if broken | `out/<slug>/qa/contact.png` |
| 8 | **Messenger** | Video + thumbnail + 5 titles/description/tags to Telegram; archive to Drive | `pipeline/telegram.sh`, Drive connector |

**Hybrid rule:** numbers, timings, frame cues, file handling and loudness are
done by scripts. The LLM only decides, writes and judges.

## 5. Project layout

```
CLAUDE.md                    this rule book
docs/DAILY.md                daily runbook (what the scheduled session does)
docs/topics.md               topic bank
docs/reference/              analysis of the reference tutorial
film/                        Remotion project
  films/<slug>/film.json     one film = one data file (+ voice-urls.json)
  src/engine/                film engine: types, sets, SceneView (shots), Film + Thumbnail
  src/style3d/               characters, faces, lights, the 3D style test
  src/test/                  old 2D style samples (reference only)
  pipeline/                  validate, voice, music, render.sh, telegram.sh, notify.sh
  public/voice/<slug>/       downloaded voice clips
  out/                       renders (git-ignored)
```

## 6. Environment notes (cloud session)

- `remotion.media` is blocked, so Remotion cannot download its browser.
  `film/remotion.config.ts` uses `/opt/pw-browsers/chromium_headless_shell`.
- The headless browser has no network: **all fonts must be local files** in
  `film/public/fonts/` loaded via `@remotion/fonts`.
- Voice: generate with the ElevenLabs connector (`creative_generate_speech`,
  1 take), then download the mp3 from `elevenlabsusercontent.com` (allowed in
  this environment). Find sentence pauses with ffmpeg `silencedetect` and cut
  shots on them.
- `api.telegram.org` is allowed. The bot token sits in the URL, so it must be an
  environment variable (network secrets only inject headers).
- Google Drive uploads of big files: pass `base64Content` as a file reference
  `sha256:<hex>:<absolute path>` — never paste base64.
- WebGL runs on SwiftShader (`Config.setChromiumOpenGlRenderer("swangle")`).
- Run TypeScript scripts with `node --no-warnings pipeline/<name>.ts`
  (use `import { type X }` for type-only imports).
- Test renders: add `--is-production=false`.

## 7. Safety

- Secrets only in environment variables (never in code, never in chat, never committed).
- Do not post, upload or message anyone other than the owner's Telegram chat.
