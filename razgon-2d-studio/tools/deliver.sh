#!/usr/bin/env bash
# The You Experiment add-on: package + send a finished Razgon film to the owner's Telegram.
#   tools/deliver.sh <slug>
# Needs: projects/<slug>/out/*.mp4 (from audio/mix.py), projects/<slug>/out/thumbnail.jpg,
#        projects/<slug>/story/meta.json  { titles[5], description, tags[], pinnedComment, sources[{title,url}] }
#        TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID environment variables.
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG=$1; P=projects/$SLUG; OUT=$P/out
: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is not set}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID is not set}"
API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
VIDEO=$(ls -t "$OUT"/*.mp4 | grep -v '\.tg\.mp4$' | head -1)
[ -f "$VIDEO" ] || { echo "no mp4 in $OUT"; exit 1; }
[ -f "$OUT/thumbnail.jpg" ] || { echo "no thumbnail.jpg in $OUT"; exit 1; }

# Telegram bots can send up to 50 MB: re-encode a copy if needed (quality steps down until it fits)
TG="$OUT/$SLUG.tg.mp4"; cp "$VIDEO" "$TG"
for CRF in 24 27 30; do
  [ "$(stat -c%s "$TG")" -le 48000000 ] && break
  echo "size $(stat -c%s "$TG") > 48 MB, re-encoding at crf $CRF"
  ffmpeg -loglevel error -y -i "$VIDEO" -c:v libx264 -preset medium -crf $CRF -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$TG"
done
read W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$TG" | tr x ' ')
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TG" | cut -d. -f1)
ffmpeg -loglevel error -y -i "$OUT/thumbnail.jpg" -vf scale=320:-2 -q:v 3 "$OUT/tg-thumb.jpg"

FOOT=../docs/brand/footer.txt
CAPTION=$(node -e "const m=require('./$P/story/meta.json');console.log('🎬 '+(m.titles?.[0]??''))")
META=$(node -e "
const fs=require('fs');const m=require('./$P/story/meta.json');
const footer=fs.existsSync('$FOOT')?fs.readFileSync('$FOOT','utf8').trim():'';
const t=(m.titles??[]).map((x,i)=>(i+1)+'. '+x).join('\n');
const src=(m.sources??[]).map(x=>'• '+x.title+' — '+x.url).join('\n');
const desc=[m.description??'',src?'Sources:\n'+src:'',footer].filter(Boolean).join('\n\n');
console.log('📝 TITLES (pick one)\n'+t+'\n\n📄 DESCRIPTION (copy all)\n'+desc+'\n\n🏷 TAGS\n'+(m.tags??[]).join(', ')+(m.pinnedComment?'\n\n📌 PINNED COMMENT\n'+m.pinnedComment:''));
")
send() { curl -sS --fail --retry 3 --retry-all-errors "$@" > /dev/null; }
echo "sending video (${W}x${H}, ${DUR}s, $(stat -c%s "$TG") bytes)..."
send -X POST "$API/sendVideo" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "caption=$CAPTION" \
  --form-string "supports_streaming=true" --form-string "width=$W" --form-string "height=$H" --form-string "duration=$DUR" \
  -F "video=@$TG;type=video/mp4" -F "thumbnail=@$OUT/tg-thumb.jpg;type=image/jpeg"
echo "sending thumbnail..."
send -X POST "$API/sendDocument" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "caption=🖼 Thumbnail 1280×720" -F "document=@$OUT/thumbnail.jpg;type=image/jpeg"
echo "sending titles + description..."
send -X POST "$API/sendMessage" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "text=${META:0:4000}"
echo "delivered: $SLUG"
