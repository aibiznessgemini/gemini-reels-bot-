# Director pass: motion, weight, optics, transitions, kinetic type

The "director pass" sits on top of the Razgon 2D look. The style bible decides **what** the picture looks like; this file decides **how it moves**. The API lives in `engine/motion.js` and in the transition types in `engine/player.js`. Read this before writing shots (Stage 6) and use it in every batch.

## 1. Camera: speed waves, not linear zooms
A single linear push `z: 1 + 0.06 * ease.inOut(t / dur)` on a flat composition is the default failure. Instead:
- **Motivate the move.** The camera follows something (a scent ribbon, a falling object, a look), discovers something (starts on the clock, flows to the face), or reacts (pushes in on the key word, flinches on an impact).
- **Flow through keys.** `camPath(t, [[0,{z,x,y,r}], [tWord,{…}], [dur,{…}]])` passes through middle keys without stopping (continuous velocity). Put a middle key on the key word.
- **Accelerate short, brake long.** `travel(t, t0, t1, {accel: 0.2, brake: 0.55})` for cranes, dollies and reveals. Add a tiny landing settle with `spring` when a big move ends.
- **Readable holds breathe.** Dialogue and data holds get `camAdd(base, drift(t, 4, seed))` instead of a frozen frame or noise shake.
- **Parallax you can feel.** Most medium shots get a soft foreground (`fg(g, cam, fn, {depth: 1.7–1.9, blur: 12–20})`): a chair back, a lamp, a door edge, a bedpost. Place it in the frame by computing its screen position (layer depth multiplies `cam.x` and zoom); a foreground that never enters the frame does nothing. It must never cover a face, a prop the line is about, or text.
- Within one scene keep the camera direction consistent across cuts (if A drifts left, B starts drifting left).

## 2. Weight and inertia
Every meaningful action has preparation → action → contact → reaction → settle.
- `spring(t, t0, {freq, damp})` for anything that arrives: cards, pins, doors, bottles, bars. A door that hits its stop: `open = sp <= 1 ? sp : 2 - sp`.
- `posesSpring(t, keys)` instead of `posesAt` for gestures that should snap (point, cheer, recoil). Keep `posesAt` for slow, soft changes.
- `impact(t, tHit, {amp, decay})` → `{x, y, r, sq}`. Add x/y/r to the camera (or a group transform) on contact: a slammed word, a pin landing, faders hitting max, a toaster popping. `squashAt` for the object itself.
- Secondary reactions: a character recoils when light floods in, the board shakes when the pin lands, the face is knocked by the word that slams next to it.
- Don't use repeating flashes or constant shake as a substitute for energy.

## 3. Optics
- **Shot motion blur:** `"mb": 3` (or `{ "n": 4, "shutter": 0.5 }`) in shots.json averages sub-frames. Use only on fast shots (cranes, slams, shakes, whips). Cost = n × render time of that shot.
- **Element smear:** `smear(g, dx, dy, fn)` blurs one fast element along its screen motion (falling pin, slammed fader). Compute dx/dy from the element's position one frame earlier.
- Depth of field stays as in the style bible (`blurLayer`, `veil`). Never blur the hero or the text the narrator is reading.

## 4. Transitions designed with both shots
Pick the transition while planning both shots, not after. Types (`"in"` in shots.json):
- `cut` stays the default (80%+).
- `whip` (`dir`, `vertical`, `dur` ≈ 0.35): a real camera pan from A to B with directional sub-frame blur. Use for energetic jumps between places; `vertical: true` for "two floors down".
- `push` (`dir`, `dur` ≈ 0.45–0.6): a calmer pan, for returning to a location.
- `iris` (`at: [fx, fy]`, `dur` ≈ 0.6): B opens inside a growing circle from a point of A. Use when B literally is a round view (microscope, lens, eye, porthole, clock face).
- `match` (`from: [fx, fy]`, `to: [fx, fy]`, `scale`, `dur` ≈ 0.6–0.7): the anchor of A slides/scales onto the anchor of B while they cross. Use for shape rhymes: a face → a head profile, a carton → a diagram, a moon → a ball. Line up silhouette, scale and direction.
- `smash` (`dur` ≈ 0.45): hard cut + 1-frame white + decaying shake. For shocks and overloads; at most 1–2 per video.
- `flash`, `dip`, `fade`, `zoom` as before.

## 5. Kinetic typography
`kText(g, t, 'ONE RULE', x, y, {start, mode, stagger, size, font, weight, color, glow, align})` animates letters and settles into a clean readable line.
- `slam` for warnings and verdicts (TODAY, ONE RULE) — pair with `impact` on the camera and a `hit`/`impact` SFX.
- `drop` for the main title line; `rise` for labels, timestamps and secondary lines; `spread` for wide reveals.
- Start 0.05–0.25 s before the word. One kinetic line at a time; the max-two-labels rule still holds.

## 6. Plan the key shots with options
For the hook, the title card, each freeze and the climax, write 3–4 genuinely different options (action, composition, transition — not just colour) in `story/bible.md` and pick one with a one-line reason. Ordinary shots don't need this.

## 7. Sound follows the picture
Every new visual event (door hits its stop, word slams, pin lands, faders max out, smash cut) gets its SFX at the same moment (`hit`, `impact`, `swish`, `pop`). After changing an event's timing, move its cue. Don't double every hit, and keep the voice clear.

## 8. QC in motion
Contact sheets are not enough for this pass:
- Render `--stills` at 2–3 moments inside every non-cut transition and every impact, and look at them.
- Watch the preview and the final MP4 at normal speed; check seams, readable holds and that no foreground covers faces or text.
- Check the final file's duration, audio, and that SFX land on the visual events.
