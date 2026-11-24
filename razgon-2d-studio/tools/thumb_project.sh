#!/usr/bin/env bash
# The You Experiment add-on: create the thumbnail-art project for a film.
#   tools/thumb_project.sh <slug>
# Makes projects/<slug>-thumb (one silent 1.2 s shot "t001", no bars/captions) with the film's cast
# and sets copied in. Then write projects/<slug>-thumb/scenes/shots/thumb.js
# (registerShot('t001', …), see projects/thumbs/scenes/shots/thumbs.js for 5 examples) and run:
#   node render.mjs --project projects/<slug>-thumb --stills 0.6 --scale 1
#   node tools/thumbnail2.mjs --still projects/<slug>-thumb/build/stills/0.6s_0.60.png \
#        --l1 "<meta.thumb.l1>" --l2 "<meta.thumb.l2>" --tag "<meta.thumb.tag>" --out projects/<slug>/out/thumbnail.jpg
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG=$1; T=$SLUG-thumb
mkdir -p voice_work
[ -f voice_work/silence1.wav ] || ffmpeg -loglevel error -y -f lavfi -i anullsrc=r=44100:cl=mono -t 1.2 voice_work/silence1.wav
echo '{"segments":[{"start":0,"end":1.1,"text":"thumb"}]}' > voice_work/thumb.json
python3 tools/new_project.py --name "$T" --voice voice_work/silence1.wav --script voice_work/thumb.json --resolution 1080p --title "$T" >/dev/null
python3 tools/parse_script.py --project "projects/$T" --script "projects/$T/input/script.json" >/dev/null
python3 - "$T" "$SLUG" <<'PY'
import json, sys
t, slug = sys.argv[1], sys.argv[2]
json.dump({"title": t, "duration": 1.2, "shots": [{"id": "t001", "start": 0, "end": 1.2, "line": "thumb", "scene": "thumbnail art",
  "set": "void", "in": {"type": "cut"}, "bars": "none", "captions": False}], "music": []}, open(f"projects/{t}/story/shots.json", "w"), indent=1)
c = json.load(open(f"projects/{t}/config.json")); c["captions"] = False; c["bars"] = "none"
try: c["style"] = json.load(open(f"projects/{slug}/config.json"))["style"]
except Exception: pass
json.dump(c, open(f"projects/{t}/config.json", "w"), indent=1)
PY
cp "projects/$SLUG/scenes/cast.js" "projects/$T/scenes/cast.js" 2>/dev/null || cp templates/cast.js "projects/$T/scenes/cast.js"
cp projects/$SLUG/scenes/sets/*.js "projects/$T/scenes/sets/" 2>/dev/null || true
echo "thumbnail project ready: projects/$T  → write scenes/shots/thumb.js with registerShot('t001', …)"
