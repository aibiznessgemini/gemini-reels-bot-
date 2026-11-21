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
echo "sending video..."
send -X POST "$API/sendVideo" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "caption=$CAPTION" \
  --form-string "supports_streaming=true" -F "video=@$OUT/$SLUG.mp4" -F "thumbnail=@$OUT/thumbnail.jpg"
echo "sending thumbnail..."
send -X POST "$API/sendPhoto" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "caption=Thumbnail 1280x720" -F "photo=@$OUT/thumbnail.jpg"
echo "sending titles + description..."
send -X POST "$API/sendMessage" --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "text=${META:0:4000}"
echo "telegram: done"
