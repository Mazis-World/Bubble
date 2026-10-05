#!/usr/bin/env bash
# Record Family Bubble Check-In app plates (Xvfb + Chrome kiosk).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/pwa/public"
OUT="${1:-/tmp/famcheck/app-checkin.mp4}"
DISPLAY_NUM="${DISPLAY_NUM:-98}"
DURATION="${DURATION:-12}"
PORT="${PORT:-8767}"

pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
pkill -f "chrome-famcheck-ad" 2>/dev/null || true
pkill -f "http.server ${PORT}" 2>/dev/null || true
sleep 0.3

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PUBLIC" >/tmp/famcheck-http.log 2>&1 &
HTTP_PID=$!
sleep 0.4

Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac +extension GLX +extension RANDR >/tmp/famcheck-xvfb.log 2>&1 &
XVFB_PID=$!
sleep 0.7

PROFILE="/tmp/chrome-famcheck-ad"
rm -rf "$PROFILE"
mkdir -p "$PROFILE" "$(dirname "$OUT")" /tmp/famcheck

DISPLAY=":${DISPLAY_NUM}" google-chrome \
  --user-data-dir="$PROFILE" \
  --no-first-run --no-sandbox \
  --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader \
  --ignore-gpu-blocklist --enable-webgl \
  --disable-infobars --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --window-position=0,0 --window-size=1920,1080 --start-fullscreen --kiosk \
  --force-device-scale-factor=1 \
  "http://127.0.0.1:${PORT}/family-checkin-ad-app.html" \
  >/tmp/famcheck-chrome.log 2>&1 &
CHROME_PID=$!
sleep 0.8

ffmpeg -y \
  -f x11grab -draw_mouse 0 -video_size 1920x1080 -framerate 30 -i ":${DISPLAY_NUM}" \
  -t "$DURATION" \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 -movflags +faststart \
  "$OUT"

# Crop the phone from the 1920x1080 stage (430x900, centered).
ffmpeg -y -i "$OUT" -vf "crop=430:900:745:90" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
  /tmp/famcheck/app-phone.mp4

ffmpeg -y -ss 1.4 -i /tmp/famcheck/app-phone.mp4 -update 1 -frames:v 1 /tmp/famcheck/app-home.png
ffmpeg -y -ss 6.4 -i /tmp/famcheck/app-phone.mp4 -update 1 -frames:v 1 /tmp/famcheck/app-select.png
ffmpeg -y -ss 10.0 -i /tmp/famcheck/app-phone.mp4 -update 1 -frames:v 1 /tmp/famcheck/app-done.png

kill "$CHROME_PID" 2>/dev/null || true
kill "$XVFB_PID" 2>/dev/null || true
kill "$HTTP_PID" 2>/dev/null || true
wait "$CHROME_PID" 2>/dev/null || true
wait "$XVFB_PID" 2>/dev/null || true
wait "$HTTP_PID" 2>/dev/null || true

ls -lh "$OUT" /tmp/famcheck/app-phone.mp4 /tmp/famcheck/app-*.png
echo "Recorded Family Bubble Check-In plates"
