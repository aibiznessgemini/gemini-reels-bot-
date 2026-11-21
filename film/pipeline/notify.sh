#!/usr/bin/env bash
# Send a short text to the owner's Telegram (used for errors and status).
#   pipeline/notify.sh "message"
set -euo pipefail
: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is not set}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID is not set}"
curl -sS --fail --retry 3 --retry-all-errors -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --form-string "chat_id=$TELEGRAM_CHAT_ID" --form-string "text=${1:0:4000}" > /dev/null
echo "notified"
