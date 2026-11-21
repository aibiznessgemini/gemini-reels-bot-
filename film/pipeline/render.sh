#!/usr/bin/env bash
# Render a film end to end: picture (+voice) → music/SFX → mix → thumbnail.
#   pipeline/render.sh <slug>
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG=$1
OUT=out/$SLUG
mkdir -p "$OUT"
node --no-warnings pipeline/validate.ts "$SLUG" --timed
node -e "const s=require('./films/$SLUG/film.json');require('fs').writeFileSync('$OUT/props.json',JSON.stringify({spec:s}))"
echo "== picture"
npx remotion render Film "$OUT/picture.mp4" --props="$OUT/props.json" --concurrency=${CONCURRENCY:-4} --log=error ${EXTRA_RENDER_FLAGS:-}
echo "== music + sfx"
node --no-warnings pipeline/music.ts "$SLUG"
echo "== mix"
# voice (from the render) stays on top; music ducks under it; SFX are added clean
ffmpeg -loglevel error -y -i "$OUT/picture.mp4" -i "$OUT/bed.wav" -i "$OUT/sfx.wav" -filter_complex \
  "[0:a]aformat=channel_layouts=stereo,asplit=2[v][sc];\
[1:a]volume=0.5[m];[m][sc]sidechaincompress=threshold=0.025:ratio=10:attack=12:release=400[duck];\
[2:a]volume=0.8[fx];\
[v][duck][fx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT/$SLUG.mp4"
SIZE=$(stat -c%s "$OUT/$SLUG.mp4")
if [ "$SIZE" -gt 48000000 ]; then
  echo "== too big for Telegram ($SIZE bytes), re-encoding"
  ffmpeg -loglevel error -y -i "$OUT/$SLUG.mp4" -c:v libx264 -preset medium -crf 27 -pix_fmt yuv420p -c:a copy -movflags +faststart "$OUT/$SLUG.small.mp4"
  mv "$OUT/$SLUG.small.mp4" "$OUT/$SLUG.mp4"
fi
echo "== thumbnail"
npx remotion still Thumbnail "$OUT/thumb-full.png" --props="$OUT/props.json" --log=error ${EXTRA_RENDER_FLAGS:-}
ffmpeg -loglevel error -y -i "$OUT/thumb-full.png" -vf scale=1280:720 -q:v 2 "$OUT/thumbnail.jpg"
echo "== QA stills (every 10 s)"
mkdir -p "$OUT/qa"
ffmpeg -loglevel error -y -i "$OUT/$SLUG.mp4" -vf "fps=1/10,scale=640:-1,tile=4x5:padding=4" -frames:v 1 "$OUT/qa/contact.png"
ffmpeg -hide_banner -i "$OUT/$SLUG.mp4" -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:" || true
ls -la "$OUT"
