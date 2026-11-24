# DAILY RUNBOOK — one Razgon 2D "What if…?" film per day, fully automatic

You were started by the daily schedule (00:00 Asia/Tashkent). Nobody is watching.
**Rule: a new idea and a new script every day.** Make today's film, send it to the owner's
Telegram, update the history, and stop. Read `CLAUDE.md` first. Never upload to YouTube.

The studio is `razgon-2d-studio/` (the owner's Razgon 2D plugin). Its rules are in
`razgon-2d-studio/references/` — `PIPELINE.md`, `style-bible.md`, `director-pass.md`,
`story-breakdown.md`, `engine-api.md`, `sound-design.md`, `render-qc.md`. Read them in step 4.
The reference projects to learn the API from: `examples/reaction-time` and `projects/style-demo`.

If any step fails and you cannot fix it in 2 tries:
`(cd film && pipeline/notify.sh "❌ Daily film failed at <step>: <short reason>")` and stop.

Time budget: about 2.5 hours in total (final render ≈ 25 min for 150 s).

## 0. Setup
```bash
cd razgon-2d-studio
npm ci --no-audit --no-fund
python3 -c "import numpy, scipy" 2>/dev/null || pip install --quiet numpy scipy
TODAY=$(TZ=Asia/Tashkent date +%F)
[ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || echo "STOP: Telegram variables missing"
```
Self-test (10 s): `node render.mjs --project examples/reaction-time --sheet --scale 0.3`.

## 1. History (never repeat an idea)
```bash
(cd ../film && pipeline/history.sh get)      # → film/films/history.json, prints every past film
```
If `$TODAY` is already in the list, stop (the film was already made today).

## 2. Researcher — today's idea (must feel NEW)
The owner's complaint to avoid: "the topics are starting to look the same". So:
- Read `docs/topics.md` fully: the **category rotation**, the **already made** list and the
  **scoring table**.
- Work out the category of each of the last 3 films (history titles start with `[CATEGORY]`;
  for older entries use the "Already made" list). **Today's category must be different from all 3.**
- Write 3 candidate ideas in that category (from the bank or your own), score each on
  Hook / Visual / Stakes / Twist / Fresh (1–5). Pick the best one with total ≥ 20 and no score
  below 4. Prefer big, dramatic, visual scenarios over quiet lectures.
- It must differ from every history entry in idea, setting and kind of twist.
- Verify with WebSearch: 4–6 concrete facts/numbers the story will use, from reliable sources
  (papers, NASA/NIH/USGS/university pages, encyclopaedias). **Only use facts you found; never
  invent numbers or quotes.** Keep 2–4 sources (title + URL).
- Choose the palette by topic: `dusk` (default, curious), `midnight` (space, night, mystery,
  danger), `golden` (warm, hopeful, human, history), `neon` (tech, future, the internet),
  `storybook` (gentle, nature, animals). Choose a music plan from: mystery, tension, action,
  wonder, hopeful, sad, triumph, playful, calm, dark, epic.

## 3. Writer — narration
Write `voice_work/<slug>-lines.txt`: **one narration line per line, 26–36 lines,
330–420 words in total** (≈ 2–2.5 min). Second person ("you"). Arc:
cold-open hook (2–3 lines, a vivid moment) → the title line ("What if you…?") → normal life
and the change → escalation with concrete numbers → the cost or twist → climax → resolution →
"Is any of this real?" short science segment (the facts) → a closing question to the viewer.
No line longer than ~25 words. Plain spoken English, no symbols the voice would misread.

## 4. Voice + project + story
```bash
node tools/eleven_voice.mjs --name <slug> --lines voice_work/<slug>-lines.txt --title "<Title>" --style <palette>
python3 tools/beats.py --project projects/<slug>
cp templates/cast.js projects/<slug>/scenes/cast.js           # YOU = amber hoodie, hood up — always
cp templates/sets/*.js projects/<slug>/scenes/sets/ 2>/dev/null || true   # reuse sets if they fit
```
**Subtitles are always on**: `eleven_voice.mjs` sets `captions: true` (word-by-word, amber highlight).
In `shots.json` set `"captions": false` only on the title card and the end screen (they already show text).
Keep on-screen labels/data cards out of the bottom 25% of the frame so they don't collide with subtitles.
Voice is Victor (`GoV1V2hQd1doxcYR2SuA`, `eleven_v4`) through the ElevenLabs API; the key is
injected by the network proxy. Clips are cached in `voice_work/<slug>/`, so re-running after a
line edit only pays for changed lines. Duration must be 110–200 s.

Then follow `references/PIPELINE.md` **stage 4** (story breakdown): `story/bible.md` (start it with
the 3 scored candidates and today's category), rewrite
`story/shots.json` (contiguous shots, median 2–3.5 s, 15–25 shots per minute, a concrete
`scene` per shot, designed transitions, `bars`, `sfx`, `amb`, and the `music` plan).
The hero is always `YOU` from cast.js; side characters only from cast.js (SAM, DR) or plain
ink extras. Write `story/meta.json`:
```json
{ "titles": ["5 options, curiosity, no lies"], "description": "2–3 sentences",
  "tags": ["6–12"], "pinnedComment": "one question to the viewers",
  "thumb": { "l1": "white line", "l2": "yellow key words", "tag": "red sticker hook" },
  "sources": [{ "title": "…", "url": "…" }] }
```

## 5. Build every shot (stage 6 of PIPELINE.md)
Read `references/engine-api.md`, `director-pass.md`, `style-bible.md` and the example scenes once.
Write `scenes/sets/<location>.js` and `scenes/shots/NN_<name>.js` in batches of 8–12 shots.
After each batch:
```bash
node render.mjs --project projects/<slug> --sheet --scale 0.5
```
Open every `build/sheets/sheet_XX.png` and fix MISSING shots, red error text, empty or
unreadable frames, faces covered by foregrounds. Use `--stills t1,t2` to check transitions.
Non-negotiables: rim light on every lit figure, colours from `mood()`/`S()`, a motivated camera
move in every shot, weight on arrivals, graphics synced with `wordTime()`, no Math.random/Date.now.

## 6. Check, render, mix
```bash
python3 tools/check.py <slug>                                   # fix every ERROR first
node render.mjs --project projects/<slug> --crf 22 > build.log 2>&1   # background; ~25 min
python3 audio/mix.py --project projects/<slug>                  # music + SFX + voice → out/<Title>.mp4
```

## 7. QA + thumbnail (formula: `docs/THUMBNAILS.md`)
```bash
ffmpeg -loglevel error -y -i projects/<slug>/out/*.mp4 -vf "fps=1/8,scale=480:-1,tile=4x5:padding=4" -frames:v 1 projects/<slug>/build/final_contact.png
tools/thumb_project.sh <slug>
# write projects/<slug>-thumb/scenes/shots/thumb.js: registerShot('t001', …) — dark bg, ONE giant subject on the
# right (exaggerated YOU face or giant thing + tiny YOU), nothing on the left 40%. Examples: projects/thumbs/.
node render.mjs --project projects/<slug>-thumb --stills 0.6 --scale 1
node tools/thumbnail2.mjs --still projects/<slug>-thumb/build/stills/0.6s_0.60.png \
     --l1 "<meta.thumb.l1>" --l2 "<meta.thumb.l2>" --tag "<meta.thumb.tag>" --out projects/<slug>/out/thumbnail.jpg
python3 tools/check.py <slug> --final
```
Look at `final_contact.png` and `thumbnail.jpg` (is the text readable when tiny? one clear
subject?). If something is clearly broken, fix and re-render once.

## 8. Deliver + history
```bash
tools/deliver.sh <slug>                                         # video + thumbnail + titles/description/tags
(cd ../film && pipeline/history.sh add "$TODAY" <slug> "[<CATEGORY>] <meta.titles[0]>")
(cd ../film && pipeline/notify.sh "✅ $TODAY: <title> — sent")
```
Do not commit or push anything.
