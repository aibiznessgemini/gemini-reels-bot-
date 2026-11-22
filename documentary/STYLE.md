# Style parameters (from `../referenslar/`)

Three reference clips (736×414, 30 fps) were analysed frame by frame.

| Clip | What it shows | Taken into the engine |
|---|---|---|
| `uslub_1.mp4` | Aged beige paper, red date tag, big bold serif headline with a yellow marker sweep, gray body text, a rule line with a blackletter masthead, a B&W cut-out photo with red/cyan offset edges | board colour `#d6cab0` with fibres and stains; `tag` fx (red box, dark serif text); `highlight` fx (yellow multiply sweep); `cutout()` with white border + red/cyan offsets; Old Standard TT bold headlines; UnifrakturMaguntia mastheads |
| `uslub_2.mp4` | Crackled blue vintage map, orange land with contour lines, a hand-drawn red circle, tilt-shift blur at the top/bottom, heavy vignette, slow push-in | `vintageMap()`; `circle` fx (wobbly marker ellipse drawn over ~0.55 s); tilt-shift bands (`tilt` per beat, 0.8 on maps); strong vignette |
| `uslub_3.mp4` | Huge red condensed "MAY" + yellow "1946" tag, B&W polaroids dropping in with marker captions, camera tilts down to a desk, taped blueprint paper | Anton for big words; `drop` physics for every paper (falls from above, oversized, lands with a soft settle and a tightening shadow); polaroids with Permanent Marker captions; `blueprint()` with tape |

## Palette
- board `#d6cab0` · paper `#efe6d2` · ink `#17140f`
- accent red `#d42a1f` (dates, circles, stamps) · marker yellow `#ffd600` (highlights, tags)
- blueprint `#3577bd → #245c9c` · map sea `#6f9fcf` · map land `#e2b88a`

## Type
- **Anton** — big words and numbers (≥ 120 px world size at focus zoom)
- **Old Standard TT 700** — headlines and document titles
- **Permanent Marker** — handwritten captions and labels
- **Special Elite** — typed fields on cards and court papers
- **UnifrakturMaguntia** — newspaper mastheads only
- Secondary document text is never real words: light gray rounded bars (`lines()`).

## Camera rhythm
- one continuous move for the whole film; no cuts
- arrive at a beat 0.4–0.9 s after the line starts, leave 0.15–0.75 s before it ends (longer moves leave earlier)
- long moves rise (zoom out) and dive back in; the board becomes sharper while travelling
- during a hold the camera keeps pushing in (≈ 4 % per 4 s) and leans toward the next object
- handheld drift ≈ 2–3 px, ±0.08°; stamp hits add a short shake
- motion blur from camera speed (capped at 46 px); film grain 9 %; soft glow 16 %; vignette; warm soft-light grade
