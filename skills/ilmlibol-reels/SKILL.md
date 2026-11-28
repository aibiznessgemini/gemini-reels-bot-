---
name: ilmlibol-reels
description: Turn one Uzbek voice-over audio (nasihat, hadith, reminder about blessings, shukr, duo, the hereafter) into a finished 9:16 4K reel in the ilmlibol style - soft watercolor Uzbek village or cinematic 3D scenes, a new picture for every phrase that shows exactly what is being said, slow camera moves, word-by-word subtitles with the key word in amber, and the "ilmlibol" signature on every frame. Use this whenever the user sends or mentions an audio/voice file and wants a video, reel, short or "rolik" from it, says "video qil", "shu audiodan video", "reels tayyorla", "ilmlibol uslubida", "nasihat video", or wants pictures that match the narration, even if they do not name the style.
---

# ilmlibol reels — one audio in, one finished 4K reel out

> **Oʻzbekcha qisqacha:** Foydalanuvchi bitta audio tashlaydi. Sen uni tinglaysan, har gapga mos
> kadr oʻylab topasan, rasmlarni chizasan, skript esa 4K (2160×3840) videoni yigʻadi: sekin kamera
> harakati, yomgʻir/barg/qor effektlari, soʻzma-soʻz subtitr va har kadrda **ilmlibol** yozuvi.
> Audio oʻzgarmaydi — musiqa va tovushlar audioning oʻzida boʻladi.

The look comes from four reference reels (Uzbek Islamic reminders). Read
`references/style-dna.md` once to understand *why* they feel the way they do before you plan.

## What you produce

- `work/final.mp4` — 2160×3840, 30 fps, H.264 + the user's audio untouched (no music or SFX added:
  the user's audio already contains everything).
- The **ilmlibol** signature sits under the subtitles on every frame. The renderer draws it and it
  cannot be turned off; never draw any other name, logo or watermark (never copy the reference
  channel's `bashar.uz` or its logo).
- Hand the MP4 back as a file. Nothing is posted anywhere.

## Tools you need

You (the model) must be able to: listen to audio, generate images, run Python.

```bash
pip install pillow numpy imageio-ffmpeg     # imageio-ffmpeg ships its own ffmpeg binary
python -c "import PIL, numpy, imageio_ffmpeg; print('ok')"
```

If a system `ffmpeg` exists it is used; otherwise the bundled one. If you cannot run Python at all,
stop after step 5 and give the user `plan.json`, `words.json` and the images, with the exact
render command, so they can render it on a computer.

All scripts live in `scripts/` next to this file. Work in a folder `work/`:

```
work/
  audio.<ext>        the user's file, copied unchanged
  phrases.json       step 1 (you write it)
  words.json         step 2 (script writes it)
  plan.json          step 4 (you write it)
  images/s01.png …   step 5 (you generate them)
  sheet.jpg          step 6 (script)
  final.mp4          step 7 (script)
```

---

## Step 1 — Listen and transcribe (`phrases.json`)

Listen to the whole audio twice: once for meaning, once for exact words and times.

Write every spoken phrase (a breath group, usually 1–7 words, split at natural pauses) with its
approximate start/end in seconds and its key word(s):

```json
{"phrases": [
  {"text": "Ha, musulmon boy boʻlgani", "start": 0.2, "end": 2.1, "keys": ["boy"]},
  {"text": "kambagʻal boʻlmagani uchun emas,", "start": 2.3, "end": 4.0, "keys": []}
]}
```

Spelling matters because it is burned into the video:
- Uzbek Latin with **ʻ** (U+02BB) in oʻ / gʻ and **ʼ** (U+02BC) for the tutuq belgisi (neʼmat, maʼno).
  Never a plain apostrophe `'`.
- Write exactly what is said — no paraphrase, no added words. Keep the speaker's punctuation
  feel: commas at short pauses, a full stop or `?` at the end of a sentence.
- Religious phrases in their common Uzbek spelling: *sollallohu alayhi va sallam*, *Alloh taolo*,
  *Parvardigor*, *alhamdulillah*, *roziyallohu anhu*.
- If a quotation is spoken (hadith, dua), open it with « and close it with ».
- **Key words** (shown in amber): the one word per phrase that carries the meaning — Alloh, shukr,
  neʼmat, hamd, rozi, tavfiq, duo, jannat, sabr, cheksiz, a number. Many phrases have none; in all,
  about 1 word in 8–12.

Every second of speech must be covered by some phrase; leave silences out.

## Step 2 — Exact word timings (`words.json`)

Your clock is close but not exact. This script finds the real speech in the waveform, snaps each
phrase onto it, and spreads the words:

```bash
python scripts/build_timings.py --audio work/audio.mp3 --phrases work/phrases.json --out work/words.json
```

Read its report. "speech with no words" = you missed a phrase → listen to that range again and add
it. "phrase moved Xs" > 0.6 s = your time was wrong → check that phrase. Rerun until clean.
(`--segments` prints the detected speech ranges if you want to see them first.)

## Step 3 — Understand the talk and choose the world

Before any picture, write down for yourself (3–6 lines):
1. **The one message** of the talk (e.g. "we forget everyday blessings until we lose them").
2. **The mood arc** — where it is calm, where it darkens (misfortune, warning), where it opens
   up (hope, hamd).
3. **The style** — pick one from `references/styles.md` by topic and mood. One style for the
   whole reel; the 2D styles may borrow another 2D style's weather or time of day for a block,
   because that is how the references move the mood (sun → storm → harvest).
4. **The cast** — usually one hero: a man in a white doʻppi, muted jacket, seen mostly from
   behind or the side (the viewer steps into his place). Add a woman (modest dress, headscarf), a
   child or an elder only when the words need them. Write a fixed one-line description of each
   and reuse it word for word in every prompt.
5. **The places** — 2–5 locations that carry the story (field, mosque yard, house, street,
   orchard…). The references stay in one place for several shots, changing angle and weather,
   instead of jumping to a new place every shot. That is what makes them feel like a film.

Content rules for this genre (non-negotiable):
- Never depict the Prophet ﷺ, any prophet, the Companions, angels, or Allah, and never show a face
  for a person in a hadith story. When the words narrate a hadith or a Companion, show the place,
  objects, nature or hands only (the reference shows a clay jug, a garden and a stream for a hadith).
- No Qurʼan text or Arabic calligraphy generated inside images (models misspell it).
- People modest and dignified; no mockery; no blood or gore — loss is shown by weather, emptiness,
  a broken object.
- No text, letters, numbers, logos or watermarks inside the images — all text comes from the
  renderer.

## Step 4 — Shot list (`plan.json`)

Read `references/shot-library.md` (how a phrase becomes a picture) and
`references/plan-format.md` (every field). Then write the plan.

Rules that make it feel like the references:
- **One picture per phrase**, a new picture whenever the meaning changes. Long phrases (> 5 s)
  get two pictures. Target average shot length **3.0–3.5 s** for 2D styles, **3.5–4.5 s** for 3D;
  about 17–20 shots per minute. The first picture changes within 3 s.
- **Literal first.** If the words name a thing, show that thing doing that thing ("mashinangizni
  yuvasiz" → the hero washing a white car). If the words are abstract, find the everyday picture
  of it (neʼmat → shoes waiting in the mosque rack, water pouring from a jug).
- **"Imagine…" means change the world.** "Piyoda ketishni tasavvur qiling" → the same hero now
  walking alone on a hot empty road.
- **Mood follows the words** through weather and light: storm + rain for musibat, soft sun and
  petals for neʼmat, golden dusk or sunrise for hamd and dua at the end.
- **Blocks of 2–4 shots per place**: wide establishing → medium on the hero → close detail →
  back to wide when the thought ends.
- **Camera always drifts**; never two identical moves in a row. Push-in on emphasis, pull-out at
  the end of a thought, pans across rows/fields, tilt up to the sky for Alloh/duo.
- **Cuts**: the 2D references use plain cuts (the motion and the subtitle carry the flow); use a
  `crossfade` only for time passing and `dip_white` only for the very last shot. The 3D style uses
  fewer, longer shots with long continuous moves, and `labels` for measurements ("10 sm", "∞").
- Each shot keeps `says` (the words it covers) and `prompt` (the exact image prompt) so it can be
  regenerated.

Shot `start`/`end` should sit on phrase boundaries from `words.json`; the first shot starts at 0
and the last ends at the audio end; no gaps.

## Step 5 — Images

Read `references/styles.md` → your style's **prompt prefix**. For every shot:

```
<style prefix>, <the scene: who, doing what, where, weather, light>, <framing: wide/medium/close,
camera height>, vertical 9:16 composition, main subject in the upper two thirds, calm empty area
in the lower third for subtitles, no text, no letters, no watermark, no logo
```

- Generate at the **largest size the image model allows, 9:16** (ideally ≥ 1440×2560; 4K output
  upscales smaller images and they look soft).
- **Consistency**: first make one reference image of the hero (and each recurring place). Pass it
  as a reference image to every later generation of that character/place, and keep the same
  wording. Shots in the same block should look like one camera in one location.
- Keep the lower 25 % of the frame quiet (ground, grass, table, floor) — the subtitle sits there.
- Look at every image before you accept it. Regenerate if: any text or pseudo-letters appear, faces
  where there should be none, wrong number of limbs/fingers, the hero's clothes changed, the style
  drifted (photo-real in a watercolor reel), or it does not show what `says` says.
- Save as `work/images/sNN.png` (PNG or JPG).

## Step 6 — Check and look

```bash
python scripts/check.py  --plan work/plan.json          # fix every ERROR, read every WARN
python scripts/render.py --plan work/plan.json --sheet work/sheet.jpg   # seconds
```

Open `sheet.jpg` (one frame per shot, with subtitles and signature) and judge it as a viewer:
does every picture match its words? Is the hero the same person? Is the mood arc visible? Is any
subtitle sitting on a busy area? Fix the plan or regenerate images, then sheet again.
Optional: `--preview --out work/preview.mp4` renders 540×960 in well under a minute.

## Step 7 — Final 4K render

```bash
python scripts/render.py --plan work/plan.json --out work/final.mp4
```

Expect roughly 8 minutes per minute of video on 4 CPU cores (it prints an ETA). It uses all
cores but one; `--jobs 1` if memory is tight. Then take 3–4 stills from the final
(`--still 12.5` etc.) or play it, confirm the audio is in sync and the signature is visible, and
give the user `final.mp4` with a short note: style used, number of shots, length.

---

## When something goes wrong

| Problem | Fix |
|---|---|
| `ffmpeg not found` | `pip install imageio-ffmpeg` |
| Subtitles early/late | phrase times off → rerun step 2 after fixing `phrases.json`; check "moved" lines |
| A word in amber that should not be | remove it from that phrase's `keys`, rerun step 2 |
| Caption covers the subject | regenerate the image with the subject higher, or `captions.y` lower (0.80) |
| Image soft in 4K | generate larger; avoid `push_in_fast` on small images |
| Render killed (memory) | `--jobs 2` or `--jobs 1` |
| Audio has a long music intro | let the first shot run over it (an establishing wide) — no captions there |

## Files

- `references/style-dna.md` — what the four reference reels do, measured (pace, framing, text, colour).
- `references/styles.md` — 8 styles with prompt prefixes, palettes, effects, caption mode.
- `references/shot-library.md` — phrase → picture recipes, with examples taken from the references.
- `references/plan-format.md` — every field of `phrases.json`, `words.json`, `plan.json`.
- `examples/plan-example.json` — a complete plan for a 30-second excerpt.
- `scripts/build_timings.py`, `scripts/check.py`, `scripts/render.py` — run them, do not rewrite them.
