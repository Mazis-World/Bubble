#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HTML="$ROOT/pwa/public/youtube-promo.html"
OUT="${1:-$ROOT/pwa/public/familybubble-youtube-promo.mp4}"
DISPLAY_NUM="${DISPLAY_NUM:-99}"
DURATION="${DURATION:-46}"

if [[ ! -f "$HTML" ]]; then
  echo "Missing $HTML" >&2
  exit 1
fi

pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
pkill -f "chrome-youtube-promo" 2>/dev/null || true
sleep 0.5

Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac +extension RANDR >/tmp/youtube-promo-xvfb.log 2>&1 &
XVFB_PID=$!
sleep 0.8

PROFILE="/tmp/chrome-youtube-promo"
rm -rf "$PROFILE"
mkdir -p "$PROFILE"

DISPLAY=":${DISPLAY_NUM}" google-chrome \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --disable-gpu \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --window-position=0,0 \
  --window-size=1920,1080 \
  --start-fullscreen \
  --kiosk \
  --force-device-scale-factor=1 \
  "file://${HTML}" \
  >/tmp/youtube-promo-chrome.log 2>&1 &
CHROME_PID=$!
sleep 2.2

mkdir -p "$(dirname "$OUT")"
ffmpeg -y \
  -f x11grab -draw_mouse 0 -video_size 1920x1080 -framerate 30 -i ":${DISPLAY_NUM}" \
  -t "$DURATION" \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 -movflags +faststart \
  "$OUT"

kill "$CHROME_PID" 2>/dev/null || true
kill "$XVFB_PID" 2>/dev/null || true
wait "$CHROME_PID" 2>/dev/null || true
wait "$XVFB_PID" 2>/dev/null || true

ls -lh "$OUT"
echo "Wrote $OUT"
