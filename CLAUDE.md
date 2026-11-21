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
| Phase | **SETUP** (one-time choices with the owner) |
| Animation style | **Chosen: 3D "round heads"** (owner's reference video, our own palette). Test: `film/src/style3d/Test3D.tsx` |
| Voice | ElevenLabs narrator. Test voice: Victor `GoV1V2hQd1doxcYR2SuA`, model `eleven_v4` (waiting for the owner's OK) |
| Niche | Open. Animal stories no longer fit human characters; options sent to the owner |
| Telegram bot | Not created yet |
| Daily schedule | Not created yet. Target: every day at 00:00 Asia/Tashkent |

When the owner picks a style, rewrite section 3 around that style only,
delete the other styles from the rules, and set Phase to **PRODUCTION**.

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
- Every film must be a genuinely different story. Keep `film/history.json`
  (topic, date, slug, title) and never repeat a story or a close variant.
  Mass-produced, repetitive videos risk YouTube's "inauthentic content" policy.
- True stories must be fact-checked online before writing. Record sources in
  the film's `story.json`.

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
- Smooth motion on every frame (except deliberate "on twos" stop-motion styles).
- Squash and stretch, locked camera, slow push-ins on emotional moments,
  hard cuts to close-ups. Calm shots hold 4–8 s, montage shots ~1 s.
- On-screen text: top centre, ≤ 8 words, fades in and out.
- A small story counter top-left (e.g. "MILES TO HOME", "DAYS ALONE") that
  counts as the story progresses.
- Title card in the last ~2–12 s: the film's one word types on letter by
  letter, wavy accent underline, one short line ("A true story."), fade to black.

Style tokens live in `film/src/test/themes.ts`.

## 4. Daily pipeline (multi-agent)

| # | Agent | Does | Output |
|---|---|---|---|
| 1 | **Researcher** | Picks today's story in the niche, checks `history.json`, verifies facts online | `story.json` (facts + sources) |
| 2 | **Writer** | Turns the story into a scene list: 25–40 scenes, timings, on-screen lines (≤ 8 words), counter values | `scenes.json` |
| 3 | **Auditor** | Checks scenes against these rules: length 120–180 s, text limits, facts match sources, not a repeat. Sends back to Writer if it fails (max 2 rounds) | pass / fix list |
| 4 | **Animator** | Writes the Remotion code for the film in `film/src/films/<slug>/` using the chosen style | composition |
| 5 | **Sound** | Builds music + SFX from the same timeline (script, not LLM) | `audio.wav` |
| 6 | **QA** | Renders stills every ~5 s, looks at them, fixes overflow, tiny text, overlaps, off-screen elements (max 3 rounds) | QA notes |
| 7 | **Packager** | Final render + loudness (-16 LUFS, peaks < -1.5 dBTP), 1 thumbnail 1280×720 (≤ 3 words), 5 titles, description, tags | `out/<date>/` |
| 8 | **Messenger** | Sends the MP4, thumbnail, titles and description to Telegram | message |

**Hybrid rule:** numbers, timings, frame cues, file handling and loudness are
done by scripts. The LLM only decides, writes and judges.

## 5. Project layout

```
CLAUDE.md                  this rule book
docs/reference/            analysis of the reference tutorial
film/                      Remotion project
  src/fonts.ts             fonts bundled locally (public/fonts)
  src/test/                10-second style test (timeline, themes, scene)
  scripts/make-audio.ts    code-synthesised music + SFX
  scripts/render-tests.sh  renders all style tests + comparison grid
  out/                     renders (git-ignored)
.env.example               secrets template (.env is git-ignored)
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
- `api.telegram.org` is still blocked; it must be allowed in the environment
  before the Messenger can work.
- Run TypeScript scripts with `node --no-warnings scripts/<name>.ts`.
- Test renders: add `--is-production=false`.

## 7. Safety

- Secrets only in `.env` (never in code, never in chat, never committed).
- Do not post, upload or message anyone other than the owner's Telegram chat.
