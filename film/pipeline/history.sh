#!/usr/bin/env bash
# Film history kept in ONE pinned bot message in the owner's Telegram chat, so it
# survives between fresh daily sessions without any other storage.
#   pipeline/history.sh get                      → films/history.json
#   pipeline/history.sh add <date> <slug> <title>
set -euo pipefail
cd "$(dirname "$0")/.."
: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is not set}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID is not set}"
API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
HEADER="📚 FILM HISTORY (do not unpin)"
CHAT=$(curl -sS --fail --retry 3 "$API/getChat?chat_id=$TELEGRAM_CHAT_ID")
read_pinned() {
  printf '%s' "$CHAT" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d).result?.pinned_message;
if(p&&p.text&&p.text.startsWith('📚 FILM HISTORY'))console.log(JSON.stringify({id:p.message_id,text:p.text}));else console.log('{}');});"
}
PIN=$(read_pinned)
case "${1:-}" in
  get)
    printf '%s' "$PIN" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d);
const rows=(p.text??'').split('\n').slice(1).map(l=>l.split(' | ')).filter(r=>r.length>=3).map(([date,slug,...t])=>({date,slug,title:t.join(' | ')}));
require('fs').writeFileSync('films/history.json',JSON.stringify(rows,null,2));console.log('history: '+rows.length+' films');rows.forEach(r=>console.log(r.date+' '+r.slug+' — '+r.title));});"
    ;;
  add)
    DATE=$2; SLUG=$3; TITLE=$4
    TEXT=$(printf '%s' "$PIN" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d);
let lines=(p.text??'').split('\n').slice(1).filter(Boolean);
lines.push(process.argv[1]+' | '+process.argv[2]+' | '+process.argv[3]);
let out=process.argv[4]+'\n'+lines.join('\n');
while(out.length>4000){lines.shift();out=process.argv[4]+'\n'+lines.join('\n');}
console.log(out);});" "$DATE" "$SLUG" "$TITLE" "$HEADER")
    MID=$(printf '%s' "$PIN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id??''))")
    if [ -n "$MID" ]; then
      curl -sS --fail --retry 3 -X POST "$API/editMessageText" --form-string "chat_id=$TELEGRAM_CHAT_ID" \
        --form-string "message_id=$MID" --form-string "text=$TEXT" > /dev/null
    else
      MID=$(curl -sS --fail --retry 3 -X POST "$API/sendMessage" --form-string "chat_id=$TELEGRAM_CHAT_ID" \
        --form-string "text=$TEXT" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).result.message_id))")
      curl -sS --fail --retry 3 -X POST "$API/pinChatMessage" --form-string "chat_id=$TELEGRAM_CHAT_ID" \
        --form-string "message_id=$MID" --form-string "disable_notification=true" > /dev/null
    fi
    echo "history: added $SLUG"
    ;;
  *) echo "usage: history.sh get | add <date> <slug> <title>"; exit 1 ;;
esac
