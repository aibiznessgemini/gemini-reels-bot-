# Styles

Pick **one** style per reel. 2D styles (1, 3–8) share one drawing language, so a 2D reel may
change weather or time of day between blocks (that is how the mood moves). Never mix 2D and 3D.

Each style gives: when to use it, the **prompt prefix** (paste at the start of every image prompt),
palette, the `look` / `captions` settings for `plan.json`, and fitting `fx` and `grade` values.

## Choosing

| Topic / mood of the talk | Style |
|---|---|
| Blessings of daily life, rizq, work, family, gratitude | 1 Akvarel qishloq |
| A thought experiment, measurement, scale, eternity vs. this world, "imagine a rope/ocean/number" | 2 Kinematik 3D oqshom |
| Endings, death, the hereafter, time passing, regret, old age | 3 Oltin shom |
| Night worship, tahajjud, loneliness, duo, Laylat al-Qadr, inner fear and hope | 4 Tungi oy |
| Sabr, trials, poverty, cold hearts, waiting | 5 Qishki qor |
| Hadith stories, the Sahaba era, Hajj, the desert, history | 6 Choʻl va qadimiy shahar |
| Lessons of scholars, thinking, knowledge, a parable told as a story | 7 Qalam eskiz |
| Countless blessings, hope, youth, repentance, renewal, mercy | 8 Bahor bogʻi |

---

## 1. Akvarel qishloq (watercolor Uzbek village) — the house style

The reference look. Default when unsure.

**Prefix**
```
hand-drawn watercolor and ink illustration on textured paper, thin dark ink outlines, soft
transparent washes, muted earthy palette of sand, ochre, sage green and dusty peach sky,
rural Uzbekistan village, poplar trees and distant hills, calm and sincere storybook mood,
gentle natural light
```
- Places: fields (pumpkin, melon, cotton), ariq channels, mud-brick walls, courtyards with a
  soʻri, mosque with teal dome, village street, bazaar, orchard, kitchen with a tandir.
- Hero line (reuse verbatim): `a middle-aged Uzbek man in a white doʻppi skullcap, plain grey-blue jacket and grey trousers, seen from behind`
- `look`: `{"paper": true, "vignette": 0.18}` · `captions`: `{"mode": "frosted"}`
- fx: `dust` (sun), `rain` + `ripples` + grade `storm` (trial), `birds` (open sky), `leaves`,
  `sun_rays` (morning), `heat` (road at noon).

## 2. Kinematik 3D oqshom (cinematic 3D dusk)

**Prefix**
```
stylized 3D render, cinematic dusk lighting, deep green-teal sky fading to warm peach horizon,
warm sodium street lamps, soft long shadows, Uzbek mahalla of flat-roofed houses and high walls,
clean simple geometry, subtle volumetric haze, high detail, shallow depth of field on close-ups
```
- Shots: aerial over the mahalla grid, a single object in macro on grass/asphalt (rope, coin,
  hourglass, drop of water), a street with one lamp, a gate, an endless road to the horizon.
- People are rare and small; the object is the "character".
- `look`: `{"paper": false, "vignette": 0.3, "grain_amount": 0.8}` · `captions`: `{"mode": "plain"}`
- Use `labels` for numbers and measurements ("10 sm", "70 yil", "∞"); `fireflies` at night,
  `fog` low over the district, `dust` in lamp light. Longer shots (4–6 s), long moves
  (`pull_out`, `crane_up`), crossfades allowed between scales.

## 3. Oltin shom (golden dusk)

**Prefix**
```
hand-drawn watercolor and ink illustration on textured paper, golden hour, low warm sun,
long soft shadows, amber and rose sky, quiet Uzbek village or graveyard edge at dusk,
nostalgic and reflective mood, thin ink outlines, soft washes
```
- Places: an old man on a bench, an empty road at sunset, a graveyard with poplars (no
  inscriptions), a clock on a wall, an old house with an open door, a tapchan under a grapevine.
- `look`: `{"paper": true, "vignette": 0.25}` · `captions`: `{"mode": "frosted"}`
- fx: `dust`, `light_leak`, `birds`; grade `golden`; end on `pull_out` to the horizon.

## 4. Tungi oy (moonlit night)

**Prefix**
```
hand-drawn watercolor and ink illustration on textured paper, deep blue night, full moon,
soft silver moonlight, warm lamp glow from a single window, Uzbek courtyard and mosque at night,
peaceful and intimate mood, thin ink outlines, deep indigo and teal washes
```
- Places: a prayer mat by a window at night, a lit mosque under stars, a man raising hands in duo
  (from behind), an empty street with one lamp, a lantern on a soʻri.
- `look`: `{"paper": true, "vignette": 0.32}` · `captions`: `{"mode": "frosted"}`
- fx: `stars` (sky in frame), `fireflies` (garden), `fog`; grade `night` only to darken a day image.

## 5. Qishki qor (winter snow)

**Prefix**
```
hand-drawn watercolor and ink illustration on textured paper, quiet winter, soft falling snow,
pale grey-blue sky, white roofs and bare trees, Uzbek village street in winter, warm light in
windows, still and patient mood, thin ink outlines, cool muted washes
```
- Places: footprints in snow to a mosque, a man clearing snow, a samovar steaming indoors, a bare
  mulberry tree, a frozen ariq.
- `look`: `{"paper": true, "vignette": 0.2}` · `captions`: `{"mode": "frosted"}`
- fx: `snow`, `fog`; grade `cool`. Snow layered over a warm interior = hope in hardship.

## 6. Choʻl va qadimiy shahar (desert and old city)

For hadith and history. **No people's faces; no prophets or Companions shown at all** — tell it
with places, objects, animals, footprints, hands, silhouettes far away.

**Prefix**
```
hand-drawn watercolor and ink illustration on textured paper, warm desert light, sand dunes and
palm trees, simple ancient mud-brick town, clay jugs, wooden doors, soft ochre and terracotta
washes, pale sky, timeless and reverent mood, thin ink outlines
```
- Pictures: a date palm well, a clay jug pouring water, a tent at dawn, camel footprints,
  a simple mosque of palm trunks, a lamp in a niche, an open old book (no readable script).
- `look`: `{"paper": true, "vignette": 0.2}` · `captions`: `{"mode": "frosted"}`
- fx: `heat`, `dust`, `sun_rays`; grade `warm`.

## 7. Qalam eskiz (ink sketch)

**Prefix**
```
loose pen and ink sketch on cream paper with light watercolor tint, expressive hatching,
sparse composition, lots of empty paper, a few muted color accents of sage and ochre,
thoughtful and wise mood, Uzbek setting
```
- For parables and lessons: a scholar's table with books (no readable text), a teacher and
  student from behind, a path splitting in two, a seed and a tree, scales of balance.
- `look`: `{"paper": true, "vignette": 0.12, "grain_amount": 0.6}` · `captions`: `{"mode": "frosted"}`
- fx: mostly none; `leaves`, `dust` sparingly. Slow moves only (`push_in_slow`, `drift`).

## 8. Bahor bogʻi (spring orchard)

**Prefix**
```
hand-drawn watercolor and ink illustration on textured paper, spring orchard in full pink and
white blossom, fresh green grass, soft bright overcast light, Uzbek courtyard and garden,
hopeful and tender mood, thin ink outlines, pastel washes
```
- Places: blossoming apricot and cherry trees, a man counting blossoms (from behind), a prayer mat
  facing a window with blossoms outside, a stream with petals, a child running in the garden.
- `look`: `{"paper": true, "vignette": 0.15}` · `captions`: `{"mode": "frosted"}`
- fx: `petals`, `birds`, `ripples` (petals on water), soft `rain` for spring rain.

---

## Shared rules for every prompt

- Always end with: `vertical 9:16 composition, main subject in the upper two thirds, quiet
  lower third, no text, no letters, no watermark, no logo`.
- Same hero line and same place description in every prompt of a block; pass the hero/place
  reference image when the model supports references.
- Faces: small, simple, calm, or not visible. Never a recognisable real person.
- Avoid: photorealism in 2D styles, bright saturated colours, neon, comic exaggeration, Western
  churches or crosses, alcohol, dogs inside homes, immodest clothing, written signs.
