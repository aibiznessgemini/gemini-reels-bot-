# Thumbnail formula — The You Experiment (owner-approved)

A mix of the best "what if" thumbnails the owner showed (giant eye with a tiny figure inside,
terrified close-up with a red sticker, two-colour text, thick hand-drawn lettering):

1. **Dark background**, almost black, with ONE strong coloured glow behind the subject.
2. **ONE giant subject on the right ~60%**, drawn in the Razgon style with our hero YOU:
   - an **exaggerated face** (`bigFace`: shocked / scared / awe), or
   - **scale contrast**: something huge (an eye, the Moon, a wave, a monster) + tiny YOU.
   No small details, no clutter, no letterbox bars, no subtitles.
3. **Big text on the left**: 2 lines, 2–5 words total — line 1 **white**, line 2 **yellow
   `#FFD23F`** (the key word), chunky cartoon caps (Luckiest Guy), thick black outline + hard
   shadow, tilted −2.5°. It must be readable on a phone at 160 px wide.
4. **Red sticker** top-left (Anton, white on `#E8322B`, black border): a 2–4 word curiosity hook
   ("Would you survive?", "For 1 second", "Your brain is wrong"). Don't repeat the title.
5. The thumbnail must make the viewer ask a question the title doesn't answer.

Tools: `tools/thumb_project.sh <slug>` → write `scenes/shots/thumb.js` → render still →
`tools/thumbnail2.mjs --l1 --l2 --tag`. Examples: `razgon-2d-studio/projects/thumbs/`,
results in `docs/brand/thumbs/`.
