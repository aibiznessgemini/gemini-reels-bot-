# CLAUDE.md — The You Experiment: daily "What if…?" film agent

> **O'zbekcha qisqacha:** Har kuni avtomatik ravishda yangi g'oya va yangi ssenariy bo'yicha
> 2–3 daqiqalik **Razgon 2D** uslubidagi "What if…?" animatsion film (16:9, ingliz tilida)
> tayyorlanadi va Telegram bot orqali egasiga yuboriladi. YouTube'ga egasi o'zi yuklaydi.
> Barcha ish Claude ichida. ElevenLabs FAQAT ovoz uchun.

This file is the rule book. Read it fully before doing any work in this repo.

---

## 0. Status

| Item | State |
|---|---|
| Phase | **PRODUCTION** — daily automation (`docs/DAILY.md`) |
| Channel | **The You Experiment** — "What if…? Starring you." (`docs/CHANNEL.md`, art in `docs/brand/`) |
| Engine | **Razgon 2D Studio** (owner's plugin) in `razgon-2d-studio/` |
| Hero | **YOU** — black stick figure, **amber hoodie `#F2A541`, hood up** (`razgon-2d-studio/templates/cast.js`) |
| Palette | Chosen per topic by the agent; `dusk` is the default |
| Niche | **"What if…?"** in any field, told to "you" (`docs/topics.md`) |
| Voice | ElevenLabs API with character timestamps, Victor `GoV1V2hQd1doxcYR2SuA`, `eleven_v4` |
| Length | 2–3 minutes (110–200 s) |
| Telegram | Owner's personal chat. `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` are environment variables |
| History | One pinned bot message in the owner's Telegram chat (`film/pipeline/history.sh`) |
| Schedule | Every day ~00:10 Asia/Tashkent, fresh cloud session, runs `docs/DAILY.md` |

The first two films (2026-11-21/22) were made with the older 3D engine in `film/`; that engine
is kept for reference. `film/pipeline/history.sh` and `notify.sh` are still used.

---

## 1. Owner's decisions (do not change without asking)

- **Rule: every day a new idea and a new script.** Never repeat an idea or a close variant.
- **Topics must feel different every day** (owner's feedback: "they start to look the same"):
  rotate categories (SPACE, EARTH, BODY, POWER, TIME, SURVIVE, FUTURE, ANIMAL, MIND — never the
  same as the last 3 films), prefer big dramatic visual scenarios, score candidates (`docs/topics.md`).
- **Style:** Razgon 2D (cinematic stick figures, rim light, moody 2.5D sets, giant faces,
  freeze-frames, data cards, blueprints, low-poly 3D) — **but the hero is always our own
  character YOU** (amber hoodie, hood up). Side characters: SAM, DR from cast.js, or ink extras.
- **Palette:** the agent picks it per topic (dusk default; midnight, golden, neon, storybook).
- **Format:** 16:9, 1080p, 24 fps, **2–3 minutes**, English narration to "you".
- **Music + SFX:** generated in code by the studio (`audio/`). No stock audio.
- **Visuals:** drawn by code. No AI images or video.
- **ElevenLabs only for voice.**
- **Fully automatic.** The film goes to Telegram as soon as it is ready. **Never upload to YouTube.**

## 2. Originality and facts

- Every film is a new "what if" scenario with new sets, new actions and new pictures; only the
  style and the hero stay the same. Repetitive template videos risk YouTube's "inauthentic
  content" policy.
- Every factual claim must come from a source found online that day. Never invent numbers,
  percentages or quotes. Sources go in `story/meta.json` → `sources`.
- Do not copy other channels' characters, titles or branding.

## 3. How a film is made (roles)

The full step-by-step runbook is **`docs/DAILY.md`**; the studio's own rules are in
`razgon-2d-studio/references/` (PIPELINE, style-bible, director-pass, story-breakdown,
engine-api, sound-design, render-qc).

| # | Role | Does | Tool / output |
|---|---|---|---|
| 1 | **Researcher** | Reads history, picks a new "what if", verifies facts online | WebSearch → sources |
| 2 | **Writer** | 26–36 narration lines, 330–420 words, hook → title → … → science → question | `voice_work/<slug>-lines.txt` |
| 3 | **Voice** | One ElevenLabs call per line with exact word timings → voiceover + timeline | `tools/eleven_voice.mjs` |
| 4 | **Director** | Story bible, shot list with scenes/transitions/sound, meta.json | `story/bible.md`, `story/shots.json`, `story/meta.json` |
| 5 | **Animator** | Writes sets and shots in code, checks contact sheets in batches | `scenes/sets/*.js`, `scenes/shots/*.js` |
| 6 | **Auditor** | Mechanical checks before and after render | `tools/check.py` |
| 7 | **Render + Sound** | Final render (~25 min for 150 s), music + SFX + voice mix | `render.mjs`, `audio/mix.py` |
| 8 | **Packager** | Thumbnail (≤ 3 words), Telegram delivery, history update | `tools/thumbnail.mjs`, `tools/deliver.sh` |

**Hybrid rule:** timings, word sync, audio, encoding and delivery are scripts; the LLM decides,
writes, directs and judges.

## 4. Project layout

```
CLAUDE.md                     this rule book
docs/DAILY.md                 daily runbook (what the scheduled session does)
docs/topics.md                "What if…?" topic bank (+ already made)
docs/CHANNEL.md               YouTube channel setup guide (Uzbek) + copy
docs/brand/                   avatar, banner, watermark, description footer, palette grid
razgon-2d-studio/             the Razgon 2D studio (owner's plugin kit, installed)
  references/                 the plugin's rules (read before building shots)
  templates/cast.js           YOU / SAM / DR — copy into every project
  templates/sets/             reusable sets we made (street.js …)
  tools/eleven_voice.mjs      our add-on: ElevenLabs voice + exact word timings
  tools/thumbnail.mjs         our add-on: 1280×720 thumbnail from a still + ≤ 3 words
  tools/check.py              our add-on: mechanical audit
  tools/deliver.sh            our add-on: Telegram delivery (≤ 48 MB, size metadata)
  projects/style-demo/        reference project (time-freeze demo)
  projects/brand/             channel art project
film/                         the older 3D engine (reference) + history.sh / notify.sh
```

## 5. Environment notes (cloud session)

- Scheduled sessions start **without the repository and without connectors**: the trigger
  prompt clones the repo first. Nothing in the daily run may depend on connector tools.
- Chromium: Playwright 1.56's own browser is absent; `render.mjs` and `thumbnail.mjs` fall
  back to `/opt/pw-browsers/chromium` (local patch, override with `RAZGON_CHROMIUM`).
- Whisper's model host is blocked, so timings come from ElevenLabs `/with-timestamps`
  (`tools/eleven_voice.mjs`), which is exact.
- ElevenLabs key: a network secret injected for `api.elevenlabs.io` (send `xi-api-key: proxy-injected`).
- `api.telegram.org` is allowed; the bot token is an environment variable.
- Python needs numpy + scipy for `audio/` (`pip install numpy scipy`).
- Render speed here: ~2.5 frames/s at 1080p (150 s film ≈ 25 min). Sheets/stills take seconds.

## 6. Safety

- Secrets only in environment variables or network secrets (never in code, chat or commits).
- Do not post, upload or message anyone other than the owner's Telegram chat.
