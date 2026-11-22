#!/usr/bin/env bash
# make.sh — full pipeline for one documentary board film.
#   ./make.sh projects/<YYYY-MM-DD>_<slug>
# Needs: <project>/script.txt (one line = one beat) and <project>/film.js (board objects + beats).
# Produces ../output/<YYYY-MM-DD>_<slug>.mp4 (1920x1080, 30 fps, length == voiceover length).
set -euo pipefail
cd "$(dirname "$0")"
P="${1:?usage: ./make.sh projects/<date>_<slug>}"
NAME="$(basename "$P")"
[ -f "$P/timings.json" ] || node tools/voice.mjs --project "$P"          # 1) voice + exact word timings
node render.mjs --project "$P" --table                                    # 2) beat table + sfx cues
node render.mjs --project "$P" --sheet                                    # 3) QC contact sheet (look at it!)
node render.mjs --project "$P" --workers "${WORKERS:-3}"                  # 4) frames -> silent video
python3 audio/mix.py --project "$P" --out "../output/${NAME}.mp4"         # 5) voice + music + sfx, mux
python3 tools/check.py --project "$P" --video "../output/${NAME}.mp4"     # 6) mechanical checks
