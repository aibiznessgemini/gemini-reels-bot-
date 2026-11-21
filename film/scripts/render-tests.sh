#!/usr/bin/env bash
# Render the 10-second style test in every style, add the code-made audio,
# normalise loudness (-16 LUFS, peaks < -1 dBTP) and build a side-by-side grid.
set -euo pipefail
cd "$(dirname "$0")/.."
STYLES=${STYLES:-"paper woodcut pixel chalk puppet"}
mkdir -p out/silent out/audio out/tests
for s in $STYLES; do
  echo "== $s"
  npx remotion render "Test-$s" "out/silent/$s.mp4" --is-production=false --log=error
  node --no-warnings scripts/make-audio.ts "$s" "out/audio/$s.wav"
  ffmpeg -loglevel error -y -i "out/silent/$s.mp4" -i "out/audio/$s.wav" \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11" -shortest "out/tests/test-$s.mp4"
done
# 3 + 2 comparison grid (960x540 tiles), audio from the first style
if [ "$STYLES" = "paper woodcut pixel chalk puppet" ]; then
  ffmpeg -loglevel error -y \
    -i out/tests/test-paper.mp4 -i out/tests/test-woodcut.mp4 -i out/tests/test-pixel.mp4 \
    -i out/tests/test-chalk.mp4 -i out/tests/test-puppet.mp4 \
    -filter_complex "color=c=#111111:s=2880x1080:d=10[bg];\
[0:v]scale=960:540[a];[1:v]scale=960:540[b];[2:v]scale=960:540[c];[3:v]scale=960:540[d];[4:v]scale=960:540[e];\
[bg][a]overlay=0:0[t1];[t1][b]overlay=960:0[t2];[t2][c]overlay=1920:0[t3];[t3][d]overlay=480:540[t4];[t4][e]overlay=1440:540:shortest=1[v]" \
    -map "[v]" -map 0:a -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a copy out/tests/all-5-styles.mp4
fi
ls -la out/tests
