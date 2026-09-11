#!/usr/bin/env bash
# Record FamilyBubble check-in plates + lock-screen notification for the "okay" ad.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/pwa/public"
OUT_DIR="${OUT_DIR:-/tmp/okay}"
DISPLAY_NUM="${DISPLAY_NUM:-97}"
PORT="${PORT:-8766}"

mkdir -p "$OUT_DIR"

if [[ ! -f "$PUBLIC/okay-ad-app.html" || ! -f "$PUBLIC/okay-lock.html" ]]; then
  echo "Missing okay-ad-app.html or okay-lock.html" >&2
  exit 1
fi
if [[ ! -f "$PUBLIC/ad-assets/globe.gl.min.js" || ! -f "$PUBLIC/ad-assets/earth-blue-marble.jpg" ]]; then
  echo "Missing globe ad-assets" >&2
  exit 1
fi

cleanup() {
  pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
  pkill -f "chrome-okay-ad" 2>/dev/null || true
  pkill -f "http.server ${PORT}" 2>/dev/null || true
}
cleanup
sleep 0.3

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PUBLIC" >/tmp/okay-ad-http.log 2>&1 &
HTTP_PID=$!
sleep 0.4

Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac +extension GLX +extension RANDR >/tmp/okay-ad-xvfb.log 2>&1 &
XVFB_PID=$!
sleep 0.8

PROFILE="/tmp/chrome-okay-ad"
rm -rf "$PROFILE"
mkdir -p "$PROFILE"

start_chrome() {
  local url="$1"
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
    "$url" \
    >/tmp/okay-ad-chrome.log 2>&1 &
  echo $!
}

record() {
  local out="$1"
  local seconds="$2"
  ffmpeg -y \
    -f x11grab -draw_mouse 0 -video_size 1920x1080 -framerate 30 -i ":${DISPLAY_NUM}" \
    -t "$seconds" \
    -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 -movflags +faststart \
    "$out"
}

CHROME_PID="$(start_chrome "http://127.0.0.1:${PORT}/okay-ad-app.html")"
sleep 5.5
record "$OUT_DIR/app-checkin.mp4" 16
kill "$CHROME_PID" 2>/dev/null || true
wait "$CHROME_PID" 2>/dev/null || true
sleep 0.4

CHROME_PID="$(start_chrome "http://127.0.0.1:${PORT}/okay-lock.html")"
sleep 1.2
record "$OUT_DIR/lock-note.mp4" 5
kill "$CHROME_PID" 2>/dev/null || true
wait "$CHROME_PID" 2>/dev/null || true

kill "$XVFB_PID" 2>/dev/null || true
kill "$HTTP_PID" 2>/dev/null || true
wait "$XVFB_PID" 2>/dev/null || true
wait "$HTTP_PID" 2>/dev/null || true

ffmpeg -y -ss 1.0 -i "$OUT_DIR/app-checkin.mp4" -update 1 -frames:v 1 "$OUT_DIR/app-idle.png"
ffmpeg -y -ss 7.2 -i "$OUT_DIR/app-checkin.mp4" -update 1 -frames:v 1 "$OUT_DIR/app-busy.png"
ffmpeg -y -ss 11.5 -i "$OUT_DIR/app-checkin.mp4" -update 1 -frames:v 1 "$OUT_DIR/app-done.png"
ffmpeg -y -ss 2.2 -i "$OUT_DIR/lock-note.mp4" -update 1 -frames:v 1 "$OUT_DIR/lock-note.png"

ls -lh "$OUT_DIR"/app-checkin.mp4 "$OUT_DIR"/lock-note.mp4 "$OUT_DIR"/app-*.png "$OUT_DIR"/lock-note.png
echo "Recorded okay-ad plates into $OUT_DIR"
