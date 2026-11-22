#!/usr/bin/env bash
# deliver.sh — send a finished documentary film to the owner's Telegram chat.
#   tools/deliver.sh projects/<YYYY-MM-DD>_<slug>
# Needs ../output/<name>.mp4, <project>/thumbnail.jpg, <project>/meta.json {titles[], description, tags[], sources[]}
# and TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID environment variables. The token never leaves this process.
set -euo pipefail
cd "$(dirname "$0")/.."
P=${1:?usage: tools/deliver.sh projects/<date>_<slug>}; NAME=$(basename "$P")
: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is not set}"; : "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID is not set}"
API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
VIDEO=../output/$NAME.mp4; THUMB=$P/thumbnail.jpg; TG=$P/build/$NAME.tg.mp4
[ -f "$VIDEO" ] || { echo "no $VIDEO"; exit 1; }; [ -f "$THUMB" ] || { echo "no $THUMB"; exit 1; }
# Telegram bots may upload ≤ 50 MB: two-pass encode to ~46 MB, 1080p kept
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
VB=$(python3 -c "print(int((46e6*8/$DUR - 160e3)/1000))")
if [ "$(stat -c%s "$VIDEO")" -gt 48000000 ]; then
  echo "re-encoding for Telegram at ${VB} kb/s"
  (cd "$P/build" && ffmpeg -v error -y -i "../../../$VIDEO" -c:v libx264 -preset slow -b:v ${VB}k -pass 1 -an -f mp4 /dev/null && \
   ffmpeg -v error -y -i "../../../$VIDEO" -c:v libx264 -preset slow -b:v ${VB}k -pass 2 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$NAME.tg.mp4"; rm -f ffmpeg2pass-0.log*)
else cp "$VIDEO" "$TG"; fi
read W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$TG" | tr x ' ')
ffmpeg -v error -y -i "$THUMB" -vf scale=320:-2 -q:v 3 "$P/build/tg-thumb.jpg"
CAPTION=$(python3 -c "import json;m=json.load(open('$P/meta.json'));print('🎬 '+(m.get('titles') or [m.get('title','')])[0])")
META=$(python3 - "$P/meta.json" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))
t = '\n'.join(f'{i+1}. {x}' for i, x in enumerate(m.get('titles', [])))
src = '\n'.join('• ' + s for s in m.get('sources', []))
print(f"📝 TITLES (pick one)\n{t}\n\n📄 DESCRIPTION\n{m.get('description','')}\n\nSources:\n{src}\n\n🏷 TAGS\n{', '.join(m.get('tags', []))}")
PY
)
send() { curl -sS --fail --retry 3 --retry-all-errors "$@" > /dev/null; }
echo "sending video (${W}x${H}, ${DUR%.*}s, $(stat -c%s "$TG") bytes)..."
send -X POST "$API/sendVideo" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "caption=$CAPTION" --form-string "supports_streaming=true" \
  --form-string "width=$W" --form-string "height=$H" --form-string "duration=${DUR%.*}" -F "video=@$TG;type=video/mp4" -F "thumbnail=@$P/build/tg-thumb.jpg;type=image/jpeg"
send -X POST "$API/sendDocument" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "caption=🖼 Thumbnail 1280×720" -F "document=@$THUMB;type=image/jpeg"
send -X POST "$API/sendMessage" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "text=${META:0:4000}"
echo "delivered: $NAME"
