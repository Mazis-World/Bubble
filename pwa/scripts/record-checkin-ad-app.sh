#!/usr/bin/env bash
# Record the Check-in globe + overlay plates from checkin-ad-app.html (Xvfb + Chrome kiosk).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/pwa/public"
HTML="$PUBLIC/checkin-ad-app.html"
OUT="${1:-/tmp/checkin/app-checkin.mp4}"
DISPLAY_NUM="${DISPLAY_NUM:-97}"
DURATION="${DURATION:-16}"
PORT="${PORT:-8765}"

if [[ ! -f "$HTML" ]]; then
  echo "Missing $HTML" >&2
  exit 1
fi
if [[ ! -f "$PUBLIC/ad-assets/globe.gl.min.js" ]]; then
  echo "Missing globe.gl assets. Copy them into pwa/public/ad-assets/" >&2
  exit 1
fi

pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
pkill -f "chrome-checkin-ad" 2>/dev/null || true
pkill -f "http.server ${PORT}" 2>/dev/null || true
sleep 0.4

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PUBLIC" >/tmp/checkin-ad-http.log 2>&1 &
HTTP_PID=$!
sleep 0.4

Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac +extension GLX +extension RANDR >/tmp/checkin-ad-xvfb.log 2>&1 &
XVFB_PID=$!
sleep 0.8

PROFILE="/tmp/chrome-checkin-ad"
rm -rf "$PROFILE"
mkdir -p "$PROFILE" "$(dirname "$OUT")"

DISPLAY=":${DISPLAY_NUM}" google-chrome \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-sandbox \
  --enable-unsafe-swiftshader \
  --use-gl=angle \
  --use-angle=swiftshader \
  --ignore-gpu-blocklist \
  --enable-webgl \
  --enable-webgl2 \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --window-position=0,0 \
  --window-size=1920,1080 \
  --start-fullscreen \
  --kiosk \
  --force-device-scale-factor=1 \
  "http://127.0.0.1:${PORT}/checkin-ad-app.html" \
  >/tmp/checkin-ad-chrome.log 2>&1 &
CHROME_PID=$!
sleep 5.5

ffmpeg -y \
  -f x11grab -draw_mouse 0 -video_size 1920x1080 -framerate 30 -i ":${DISPLAY_NUM}" \
  -t "$DURATION" \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 -movflags +faststart \
  "$OUT"

ffmpeg -y -ss 1.0 -i "$OUT" -update 1 -frames:v 1 /tmp/checkin/app-idle.png
ffmpeg -y -ss 4.4 -i "$OUT" -update 1 -frames:v 1 /tmp/checkin/app-busy.png
ffmpeg -y -ss 8.6 -i "$OUT" -update 1 -frames:v 1 /tmp/checkin/app-done.png

kill "$CHROME_PID" 2>/dev/null || true
kill "$XVFB_PID" 2>/dev/null || true
kill "$HTTP_PID" 2>/dev/null || true
wait "$CHROME_PID" 2>/dev/null || true
wait "$XVFB_PID" 2>/dev/null || true
wait "$HTTP_PID" 2>/dev/null || true

ls -lh "$OUT" /tmp/checkin/app-idle.png /tmp/checkin/app-busy.png /tmp/checkin/app-done.png
echo "Wrote $OUT"
