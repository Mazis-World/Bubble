#!/usr/bin/env bash
# Record the 10s SOS app plates from sos-ad-app.html (Xvfb + Chrome kiosk).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HTML="$ROOT/pwa/public/sos-ad-app.html"
OUT="${1:-/tmp/broll/app-sos.mp4}"
DISPLAY_NUM="${DISPLAY_NUM:-98}"
DURATION="${DURATION:-11}"

if [[ ! -f "$HTML" ]]; then
  echo "Missing $HTML" >&2
  exit 1
fi

pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
pkill -f "chrome-sos-ad" 2>/dev/null || true
sleep 0.4

Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac +extension RANDR >/tmp/sos-ad-xvfb.log 2>&1 &
XVFB_PID=$!
sleep 0.8

PROFILE="/tmp/chrome-sos-ad"
rm -rf "$PROFILE"
mkdir -p "$PROFILE" "$(dirname "$OUT")"

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
  >/tmp/sos-ad-chrome.log 2>&1 &
CHROME_PID=$!
sleep 2.2

ffmpeg -y \
  -f x11grab -draw_mouse 0 -video_size 1920x1080 -framerate 30 -i ":${DISPLAY_NUM}" \
  -t "$DURATION" \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 -movflags +faststart \
  "$OUT"

# Stills for the end card / thumbnail
ffmpeg -y -ss 1.8 -i "$OUT" -update 1 -frames:v 1 /tmp/broll/app-hold.png
ffmpeg -y -ss 5.5 -i "$OUT" -update 1 -frames:v 1 /tmp/broll/app-confirm.png
ffmpeg -y -ss 8.2 -i "$OUT" -update 1 -frames:v 1 /tmp/broll/app-alert.png

kill "$CHROME_PID" 2>/dev/null || true
kill "$XVFB_PID" 2>/dev/null || true
wait "$CHROME_PID" 2>/dev/null || true
wait "$XVFB_PID" 2>/dev/null || true

ls -lh "$OUT"
echo "Wrote $OUT"
