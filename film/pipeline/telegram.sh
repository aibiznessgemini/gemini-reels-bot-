#!/usr/bin/env bash
# Send the finished film to the owner's Telegram chat.
# Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (environment variables set by the owner).
#   pipeline/telegram.sh <slug>
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG=$1
OUT=out/$SLUG
: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is not set}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID is not set}"
API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
CAPTION=$(node -e "const s=require('./films/$SLUG/film.json');console.log('🎬 '+(s.titles?.[0]??s.title))")
META=$(node -e "
const s=require('./films/$SLUG/film.json');
const t=(s.titles??[s.title]).map((x,i)=>(i+1)+'. '+x).join('\n');
const src=(s.sources??[]).map(x=>'• '+x.title+' — '+x.url).join('\n');
console.log('📝 TITLES\n'+t+'\n\n📄 DESCRIPTION\n'+(s.description??'')+'\n\n🏷 TAGS\n'+(s.tags??[]).join(', ')+(src?'\n\n🔎 SOURCES\n'+src:''));
")
send() { curl -sS --fail --retry 3 --retry-all-errors "$@" > /dev/null; }
# Telegram needs the real size, or it may show the player in the wrong shape;
# its video thumbnail must be a JPEG ≤ 320 px and ≤ 200 KB.
read W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$OUT/$SLUG.mp4" | tr x ' ')
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$SLUG.mp4" | cut -d. -f1)
ffmpeg -loglevel error -y -i "$OUT/thumbnail.jpg" -vf scale=320:-2 -q:v 3 "$OUT/tg-thumb.jpg"
echo "sending video (${W}x${H}, ${DUR}s)..."
RESP=$(curl -sS --fail --retry 3 --retry-all-errors -X POST "$API/sendVideo" --form-string "chat_id=$TELEGRAM_CHAT_ID" \
  --form-string "caption=$CAPTION" --form-string "supports_streaming=true" \
  --form-string "width=$W" --form-string "height=$H" --form-string "duration=$DUR" \
  -F "video=@$OUT/$SLUG.mp4;type=video/mp4" -F "thumbnail=@$OUT/tg-thumb.jpg;type=image/jpeg")
printf '%s' "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const v=JSON.parse(d).result?.video;console.log('telegram stored video: '+(v?v.width+'x'+v.height+', '+v.duration+'s':'(sent as document)'));})"
echo "sending thumbnail..."
send -X POST "$API/sendPhoto" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "caption=Thumbnail 1280x720" -F "photo=@$OUT/thumbnail.jpg"
echo "sending titles + description..."
send -X POST "$API/sendMessage" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "text=${META:0:4000}"
echo "telegram: done"
