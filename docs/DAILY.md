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
[ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] || echo "WARNING: Telegram variables missing"
```

## 1. History (never repeat a story)
Google Drive archive folder: **`1OTtd9yEUQuRM0kivIKE2N-zItR4eYU2D`** ("Daily Films (YouTube agent)").
- `search_files` with `parentId = '1OTtd9yEUQuRM0kivIKE2N-zItR4eYU2D'` → every sub-folder title is
  `YYYY-MM-DD — <slug> — <topic>`. Collect them all (paginate).
- Write them to `films/history.json` as `[{ "date", "slug", "title" }]` so `validate.ts` can block repeats.
- If today's date already has a folder, stop (the film was already made).

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

## 5. Voice (ElevenLabs connector — voice only)
- `creative_create_flow` (name `<slug> voice`).
- For every scene: `creative_generate_speech` with that `flow_id`, `prompt` = the line,
  `voice_id` **`GoV1V2hQd1doxcYR2SuA`** (Victor), `model_id` `eleven_v4`, `generations_count` 1.
  Send 7 calls in parallel per message. Never re-call to retry a running generation.
- Poll `creative_get_flow_run_status` (≤ 14 session ids per call) until all completed.
- Write `films/<slug>/voice-urls.json` = `{ "<scene id>": "<content_url>" }`, then:
```bash
node --no-warnings pipeline/voice.ts <slug>
node --no-warnings pipeline/validate.ts <slug> --timed   # must be 110–200 s
```
If too long/short, edit lines and regenerate only those scenes.

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

## 9. Archive to Google Drive
The Drive connector only uploads files ≤ 10 MB, so the video itself lives in Telegram.
- `create_file` folder `"<TODAY> — <slug> — <short topic>"` (mimeType folder) with
  `parentId` = archive folder. **This folder is the history record — always create it.**
- Upload into it with file references (never paste base64 yourself):
  `base64Content` = `sha256:<sha256sum>:<absolute path>`, `disableConversionToGoogleType: true`
  - `out/<slug>/thumbnail.jpg` (`image/jpeg`)
  - `films/<slug>/film.json` (`application/json`)

## 10. Done
`pipeline/notify.sh "✅ <TODAY>: <title> — sent and archived"` and stop.
Do not commit or push anything.
