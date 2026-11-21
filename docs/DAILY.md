# DAILY RUNBOOK — one film per day, fully automatic

You were started by the daily schedule (00:00 Asia/Tashkent). Nobody is watching.
Make today's film, send it to the owner's Telegram, archive it, and stop.
Read `CLAUDE.md` first. Work in `film/`. Never upload anything to YouTube.

If any step fails and you cannot fix it in 2 tries: run
`pipeline/notify.sh "❌ Daily film failed at <step>: <short reason>"` and stop.

## 0. Setup (2 min)
```bash
cd film
[ -d node_modules ] || npm ci --no-audit --no-fund
TODAY=$(TZ=Asia/Tashkent date +%F)
[ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || echo "STOP: Telegram variables missing (owner must set them)"
```

## 1. History (never repeat a story)
The history lives in ONE pinned bot message in the owner's Telegram chat:
```bash
pipeline/history.sh get        # → films/history.json, prints every past film
```
- If today's date (`$TODAY`) is already in the list, stop (the film was already made).
- (Optional) If Google Drive tools are available, the archive folder
  `1OTtd9yEUQuRM0kivIKE2N-zItR4eYU2D` holds one sub-folder per film as a backup.

## 2. Researcher — pick today's topic
Niche: **"What if…" + psychology**, told to the viewer as "you", grounded in real research.
- Pick from `docs/topics.md` (first unused idea that fits), or a new idea of the same kind.
- It must be different from every history entry (not just a new slug for the same study).
- Verify with WebSearch: the study/phenomenon, authors, year, journal, and 3–5 concrete findings.
  Prefer the paper itself, PubMed, university news. **Only use facts you found. Never invent
  numbers, percentages or quotes.** If a number is not in a source, don't say it.
- Keep 2–4 sources (title + URL) for `film.json` → `sources`.

## 3. Writer — `films/<slug>/film.json`
Copy the structure of `films/the-liking-gap/film.json` (schema: `src/engine/types.ts`).
- `slug`: lowercase-with-dashes, new. `mood`: curious | tense | warm | sad | wonder.
- Cast: always `you` (amber hoodie `#F2A541`); 1–3 named friends, each a different hoodie
  colour + hair (`bowl`, `bob`, `cap`, `beanie`, `none`). Do not reuse maya/jake every day.
- **24–32 scenes, 330–420 words total**, each `line` 6–30 words (one or two sentences).
- Arc: hook ("Imagine… / What if you…", 2–3 scenes) → the everyday feeling → the study
  (who, when, what they did) → the surprising finding → why it happens → what it means for you
  → a closing question to the viewer.
- Pictures follow the words. Vary shots: no set+shot repeated more than twice in a row; use
  each shot type at least once; `lineup` on `void` for "explainer" beats with a `label`.
  Badges only for real numbers/names from sources (≤ 4 words). Counter only when it tells the story.
- `thumbnail`: a close-up scene + ≤ 3 words. `titles`: 5 options (curiosity, no clickbait lies).
  `description`: 2–3 sentences + the study citation. `tags`: 6–10.

## 4. Auditor
```bash
node --no-warnings pipeline/validate.ts <slug>
```
Fix every ERROR. Then re-read the script against the sources: every factual claim must be
in a source. Max 2 rounds.

## 5. Voice (ElevenLabs — voice only)
The ElevenLabs API key is injected by the environment's network proxy for
`api.elevenlabs.io` (never put a key anywhere). One take per scene, Victor
(`GoV1V2hQd1doxcYR2SuA`), `eleven_v4`:
```bash
node --no-warnings pipeline/voice.ts <slug>              # downloads clips, writes durations
node --no-warnings pipeline/validate.ts <slug> --timed   # must be 110–200 s
```
If too long/short, edit those lines, delete only their `public/voice/<slug>/<id>.mp3`
and run `voice.ts` again (existing clips are kept, so credits are not wasted).

## 6. Render (~60–70 min) — run in the background and wait
```bash
pipeline/render.sh <slug>
```
Output: `out/<slug>/<slug>.mp4` (≤ 48 MB), `thumbnail.jpg`, `qa/contact.png`.

## 7. QA
Look at `out/<slug>/qa/contact.png` and `out/<slug>/thumbnail.jpg`. Check: no black/empty
frames, characters in frame, text readable and not overlapping heads, thumbnail text readable.
If something is clearly broken, fix `film.json` and re-render once.

## 8. Send to Telegram
```bash
pipeline/telegram.sh <slug>
```

## 9. History + archive
```bash
pipeline/history.sh add "$TODAY" <slug> "<titles[0]>"
```
(Optional, only if Google Drive tools are available) create folder
`"<TODAY> — <slug> — <short topic>"` in `1OTtd9yEUQuRM0kivIKE2N-zItR4eYU2D` and upload
`out/<slug>/thumbnail.jpg` + `films/<slug>/film.json` with file references
(`base64Content` = `sha256:<sha256sum>:<absolute path>`, `disableConversionToGoogleType: true`).
The Drive connector cannot upload files over 10 MB, so the video lives in Telegram.

## 10. Done
`pipeline/notify.sh "✅ <TODAY>: <title> — sent and archived"` and stop.
Do not commit or push anything.
