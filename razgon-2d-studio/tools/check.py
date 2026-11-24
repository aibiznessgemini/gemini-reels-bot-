"""The You Experiment add-on: mechanical audit of a daily Razgon film before render / delivery.

  python3 tools/check.py <slug> [--final]

Checks: narration length, shots.json coverage and timing, transitions/sfx/music names, cast file,
meta.json (5 titles, description, tags, pinned comment, sources, thumbnail text), history repeats.
--final also checks the rendered MP4 + thumbnail.
Exit code 1 on any ERROR.
"""
import json, os, re, subprocess, sys

slug = sys.argv[1]
final = "--final" in sys.argv
P = os.path.join("projects", slug)
err, warn = [], []
load = lambda p: json.load(open(p, encoding="utf-8"))

SFX = {"applause", "blip", "buzz", "carpass", "cheer", "city", "clock", "counter", "ding", "flash", "footstep", "freeze", "glitch",
       "heartbeat", "hit", "hum", "impact", "kick", "murmur", "phonebuzz", "phonering", "pop", "powerup", "rain", "riser",
       "roomtone", "shimmer", "slowmo", "stinger", "swish", "thunder", "tick", "whistle", "whoosh", "wind"}
MOODS = {"mystery", "tension", "action", "wonder", "hopeful", "sad", "triumph", "playful", "calm", "dark", "epic"}
INS = {"cut", "fade", "dip", "dipWhite", "flash", "zoom", "whip", "push", "iris", "match", "smash"}
STYLES = {"dusk", "midnight", "golden", "neon", "storybook"}

cfg = load(os.path.join(P, "config.json"))
if cfg.get("style") not in STYLES: err.append(f"config.style '{cfg.get('style')}' not one of {sorted(STYLES)}")
if not cfg.get("captions"): err.append("config.captions must be true (owner wants subtitles on every film)")
dur = cfg.get("duration", 0)
if not 110 <= dur <= 200: err.append(f"voiceover {dur:.1f}s (need 110–200 s)")

words = load(os.path.join(P, "timeline", "words.json")) if os.path.exists(os.path.join(P, "timeline", "words.json")) else []
nw = len(words.get("words", words) if isinstance(words, dict) else words)
if nw and not 300 <= nw <= 460: warn.append(f"{nw} spoken words (aim 330–420)")

S = load(os.path.join(P, "story", "shots.json"))
shots = S["shots"]
if not 30 <= len(shots) <= 80: warn.append(f"{len(shots)} shots (aim 15–25 per minute)")
prev = 0.0
for s in shots:
    sid = s.get("id", "?")
    if abs(s["start"] - prev) > 0.02: err.append(f"{sid}: starts at {s['start']} but previous ended at {prev} (shots must be contiguous)")
    prev = s["end"]
    if not s.get("scene"): err.append(f"{sid}: missing 'scene' description")
    t = (s.get("in") or {}).get("type", "cut")
    if t not in INS: err.append(f"{sid}: unknown transition '{t}'")
    for c in s.get("sfx", []):
        if c.get("name") not in SFX: err.append(f"{sid}: unknown sfx '{c.get('name')}'")
    if s.get("amb") and s["amb"].get("name") not in SFX: err.append(f"{sid}: unknown ambience '{s['amb'].get('name')}'")
for m in S.get("music", []):
    if m.get("mood") not in MOODS: err.append(f"music mood '{m.get('mood')}' not one of {sorted(MOODS)}")
if not S.get("music"): warn.append("no music plan in shots.json (default 'mystery' will be used)")

# every shot id must be registered somewhere in scenes/shots/*.js
code = ""
for root, _, files in os.walk(os.path.join(P, "scenes")):
    for f in files:
        if f.endswith(".js") and not f.startswith("_"): code += open(os.path.join(root, f), encoding="utf-8").read()
for s in shots:
    if not re.search(r"registerShot\(\s*['\"]%s['\"]" % re.escape(s["id"]), code): err.append(f"{s['id']}: no registerShot('{s['id']}') in scenes/")
if "#F2A541" not in open(os.path.join(P, "scenes", "cast.js"), encoding="utf-8").read(): err.append("scenes/cast.js must contain YOU with the amber hoodie #F2A541 (copy templates/cast.js)")
if re.search(r"Math\.random|Date\.now", code): err.append("scenes use Math.random/Date.now (breaks determinism)")

meta_p = os.path.join(P, "story", "meta.json")
if not os.path.exists(meta_p): err.append("story/meta.json missing")
else:
    m = load(meta_p)
    if len(m.get("titles", [])) != 5: err.append("meta.titles must have 5 options")
    if not m.get("description"): err.append("meta.description missing")
    if not 6 <= len(m.get("tags", [])) <= 12: err.append("meta.tags: need 6–12")
    if not m.get("pinnedComment"): err.append("meta.pinnedComment missing")
    if not m.get("sources"): warn.append("meta.sources empty (fine only if the film states no facts)")
    th = m.get("thumb") or {}
    words = f"{th.get('l1', '')} {th.get('l2', '')}".split()
    if not th.get("l1") or not 2 <= len(words) <= 5: err.append("meta.thumb: l1 + l2 must be 2–5 words in total (docs/THUMBNAILS.md)")
    if not th.get("tag") or len(th["tag"].split()) > 4: err.append("meta.thumb.tag: a 1–4 word red-sticker hook")

hist_p = os.path.join("..", "film", "films", "history.json")
if os.path.exists(hist_p):
    if any(h.get("slug") == slug for h in load(hist_p)): err.append(f"slug '{slug}' already in history")

if final:
    outs = [f for f in os.listdir(os.path.join(P, "out")) if f.endswith(".mp4") and not f.endswith(".tg.mp4")]
    if not outs: err.append("no final mp4 in out/ (run audio/mix.py)")
    else:
        f = os.path.join(P, "out", outs[0])
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout or 0)
        a = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip()
        if abs(d - dur) > 3: err.append(f"final mp4 is {d:.1f}s, voiceover {dur:.1f}s")
        if not a: err.append("final mp4 has no audio")
    if not os.path.exists(os.path.join(P, "out", "thumbnail.jpg")): err.append("out/thumbnail.jpg missing")

for w in warn: print("warn:", w)
for e in err: print("ERROR:", e)
print("OK" if not err else f"{len(err)} error(s)")
sys.exit(1 if err else 0)
