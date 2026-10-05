#!/usr/bin/env bash
# Record FamilyBubble Just Checking In app plates (Xvfb + Chrome kiosk).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/pwa/public"
HTML="$PUBLIC/just-checking-in-ad.html"
OUT="${1:-/tmp/jci/app-ui.mp4}"
DISPLAY_NUM="${DISPLAY_NUM:-96}"
DURATION="${DURATION:-11}"
PORT="${PORT:-8766}"

pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
pkill -f "chrome-jci-ad" 2>/dev/null || true
pkill -f "http.server ${PORT}" 2>/dev/null || true
sleep 0.3

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PUBLIC" >/tmp/jci-ad-http.log 2>&1 &
HTTP_PID=$!
sleep 0.4

Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac +extension GLX +extension RANDR >/tmp/jci-ad-xvfb.log 2>&1 &
XVFB_PID=$!
sleep 0.7

PROFILE="/tmp/chrome-jci-ad"
rm -rf "$PROFILE"
mkdir -p "$PROFILE" "$(dirname "$OUT")"

DISPLAY=":${DISPLAY_NUM}" google-chrome \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-sandbox \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --window-position=0,0 \
  --window-size=1920,1080 \
  --start-fullscreen \
  --kiosk \
  --force-device-scale-factor=1 \
  "http://127.0.0.1:${PORT}/just-checking-in-ad.html" \
  >/tmp/jci-ad-chrome.log 2>&1 &
CHROME_PID=$!
sleep 2.2

ffmpeg -y \
  -f x11grab -draw_mouse 0 -video_size 1920x1080 -framerate 30 -i ":${DISPLAY_NUM}" \
  -t "$DURATION" \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 -movflags +faststart \
  "$OUT"

kill "$CHROME_PID" 2>/dev/null || true
kill "$XVFB_PID" 2>/dev/null || true
kill "$HTTP_PID" 2>/dev/null || true
wait "$CHROME_PID" 2>/dev/null || true
wait "$XVFB_PID" 2>/dev/null || true
wait "$HTTP_PID" 2>/dev/null || true

ls -lh "$OUT"
echo "Wrote $OUT"
