# File formats

Paths inside `plan.json` are relative to the folder that holds `plan.json`.

## phrases.json (you write it, step 1)

```json
{"phrases": [
  {"text": "Piyoda ketishni tasavvur qiling-da hozir.", "start": 9.2, "end": 12.0, "keys": ["tasavvur"]}
]}
```
- `text`: exact spoken words, Uzbek Latin, ʻ and ʼ, punctuation as spoken.
- `start` / `end`: seconds, your best estimate (the script corrects ±0.6 s).
- `keys`: words of this phrase to show in amber (the word as written in `text`; a prefix such as
  "shukr" also matches "shukrini").

You may instead give word-level timings: `{"words": [{"w": "Piyoda", "start": 9.2, "end": 9.6, "key": false}, …]}`.

## words.json (written by build_timings.py, step 2)

```json
{"duration": 75.88, "words": [{"w": "Piyoda", "start": 9.49, "end": 9.81, "key": false}, …]}
```
`brk: true` on a word ends a subtitle there (set automatically at each phrase end). You can edit
it by hand: fix a spelling, move a `brk`, toggle `key`.

Subtitle grouping: a subtitle ends at a `brk`, after `, . ? ! : ;`, at a pause > 0.45 s, or when
it would not fit (frosted: 1 line, plain: 2 lines).

## plan.json (you write it, step 4)

```json
{
  "audio": "audio.mp3",
  "words": "words.json",
  "size": [2160, 3840],
  "fps": 30,
  "style": "akvarel-qishloq",
  "hero": "a middle-aged Uzbek man in a white doʻppi skullcap, plain grey-blue jacket and grey trousers, seen from behind",
  "look": {"paper": true, "vignette": 0.18, "grain": true, "grain_amount": 1.0},
  "captions": {"mode": "frosted"},
  "defaults": {"transition": "cut", "xfade": 0.6},
  "shots": [
    {
      "id": "s01",
      "start": 0.0, "end": 2.83,
      "says": "Mana hozir har joydan",
      "image": "images/s01.png",
      "prompt": "<full image prompt used>",
      "move": "push_in",
      "focus": [0.5, 0.45],
      "fx": ["dust"],
      "grade": "none",
      "transition": "cut"
    }
  ]
}
```

### Top level
| Field | Meaning |
|---|---|
| `audio` | the user's audio, used unchanged as the soundtrack |
| `words` | path to words.json |
| `size` | `[2160, 3840]` (4K, default). `[1080, 1920]` if the user asks for HD |
| `fps` | 30 (default) |
| `style`, `hero` | notes for you and for regeneration; the renderer ignores them |
| `look.paper` | watercolor paper texture (2D styles: true; 3D: false) |
| `look.vignette` | 0–0.4 edge darkening |
| `look.grain`, `look.grain_amount` | film grain on/off, 0.5–1.5 |
| `captions.mode` | `frosted` (2D: dark text on frosted pill) or `plain` (3D: white text with shadow) |
| `captions.y` | vertical centre of the subtitle, 0–1 (default 0.785 frosted / 0.745 plain) |
| `captions.size` | font size at 4K (default 74 frosted / 96 plain) |
| `captions.color`, `key_color` | hex colours (defaults: #1F3A2C / #D9822B frosted, #FFFFFF / #F2B263 plain) |
| `captions.off` | `[[t0, t1], …]` ranges with no subtitles (the signature stays) |
| `defaults.transition`, `defaults.xfade` | used by shots that do not set their own |

The signature text is fixed to **ilmlibol** inside the renderer.

### Shot
| Field | Meaning |
|---|---|
| `id` | `s01`, `s02`, … |
| `start`, `end` | seconds; shots must touch (no gaps); first starts at 0; last is extended to the audio end |
| `says` | the words this picture illustrates (required — it keeps the picture honest) |
| `image` | the generated image (PNG/JPG, 9:16 best; other ratios are centre-cropped around `focus`) |
| `prompt` | the exact prompt, for regeneration |
| `move` | camera move (below) |
| `zoom` | `[from, to]` override, e.g. `[1.0, 1.2]` |
| `focus` | `[x, y]` 0–1 point of the image the camera centres on (default `[0.5, 0.5]`) |
| `from`, `to` | `[x, y]` exact start/end centre, overriding the move's offsets |
| `easing` | `inout` (default) or `linear` (for one continuous move across several shots) |
| `fx` | list of effects; each a name or `{"type": name, "strength": 0.5–2, …}` |
| `grade` | colour grade (below) |
| `transition` | how this shot comes in: `cut` (default), `crossfade`, `dip_black`, `dip_white`, `flash` |
| `xfade` | transition length in seconds (0.3–1.0), centred on the cut point |
| `labels` | on-screen marks (below) |

### Moves
| Move | What it does |
|---|---|
| `push_in` | slow zoom in 1.04 → 1.16 |
| `push_in_slow` | gentle 1.04 → 1.09 (stillness, questions) |
| `push_in_fast` | 1.02 → 1.30 (punch, key word) |
| `pull_out` | 1.18 → 1.04 (end of thought) |
| `pull_out_fast` | 1.34 → 1.02 (reveal) |
| `pan_left`, `pan_right` | horizontal travel at zoom 1.14 |
| `tilt_up`, `tilt_down` | vertical travel at zoom 1.14 (`tilt_up` to the sky for duo) |
| `crane_up`, `crane_down` | vertical travel with a small zoom |
| `drift` | slight diagonal float |
| `static` | almost still (use rarely) |

### Effects (`fx`)
| Name | Use | Options |
|---|---|---|
| `rain` | storm, trial, mercy rain | `strength`, `slant` (0–0.4) |
| `snow` | winter, patience | `strength` |
| `petals` | blossoms, blessings | `strength` |
| `leaves` | autumn, wind, time | `strength` |
| `dust` | sunbeams, warm interiors | `strength` |
| `fireflies` | night garden | `strength` |
| `stars` | night sky (top 45 % of frame) | `strength` |
| `ripples` | rain or drops on water | `region: [x0, y0, x1, y1]` (0–1), `strength` |
| `birds` | open sky, freedom, morning | `strength` |
| `fog` | mist, mystery, morning | `height` (0–1 band centre), `strength` |
| `sun_rays` | light breaking through, hope | `origin: [x, y]`, `strength` |
| `light_leak` | warm nostalgic glow | `strength` |
| `heat` | hot road, desert (gentle shimmer) | `strength` |

Effects add motion and mood; they must agree with the picture (rain only if the sky is stormy).

### Grades
`none`, `storm` (desaturate, darken, cool), `warm`, `cool`, `night`, `faded`, `golden`.
Use them to push an existing image into the block's weather. A fresh image with the right
weather is better than a heavy grade.

### Labels
```json
"labels": [{"text": "10 sm", "x": 0.5, "y": 0.40, "t0": 0.5, "t1": 3.0, "size": 64,
            "bracket": [0.35, 0.65, 0.45]}]
```
`x`, `y` = label centre (0–1); `t0` / `t1` = seconds from the shot start (fade in/out);
`bracket` = `[x0, x1, y]` measurement line with end ticks. Use them in the 3D style for numbers,
sizes and "∞"; in 2D styles only when the words state a number that matters.
