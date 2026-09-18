#!/usr/bin/env bash
# Record the FamilyBubble "Connect with your family at any time" car ad.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/pwa/public"
OUT="${1:-$ROOT/pwa/public/familybubble-connect-anytime-ad.mp4}"
THUMB="${2:-$ROOT/pwa/public/connect-anytime-ad-thumbnail.png}"
DISPLAY_NUM="${DISPLAY_NUM:-98}"
PORT="${PORT:-8768}"

if [[ ! -f "$PUBLIC/connect-anytime-ad.html" ]]; then
  echo "Missing connect-anytime-ad.html" >&2
  exit 1
fi

cleanup() {
  pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
  pkill -f "chrome-connect-anytime" 2>/dev/null || true
  pkill -f "http.server ${PORT}" 2>/dev/null || true
}
cleanup
sleep 0.3

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PUBLIC" >/tmp/connect-anytime-http.log 2>&1 &
sleep 0.4

Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac +extension GLX +extension RANDR >/tmp/connect-anytime-xvfb.log 2>&1 &
sleep 0.8

PROFILE="/tmp/chrome-connect-anytime"
rm -rf "$PROFILE"
mkdir -p "$PROFILE"

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
  "http://127.0.0.1:${PORT}/connect-anytime-ad.html" \
  >/tmp/connect-anytime-chrome.log 2>&1 &
CHROME_PID=$!
sleep 1.4

ffmpeg -y \
  -f x11grab -draw_mouse 0 -video_size 1920x1080 -framerate 30 -i ":${DISPLAY_NUM}" \
  -t 16 \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 -movflags +faststart \
  "$OUT"

kill "$CHROME_PID" 2>/dev/null || true
cleanup
wait "$CHROME_PID" 2>/dev/null || true

ffmpeg -y -ss 13.4 -i "$OUT" -update 1 -frames:v 1 "$THUMB"
ls -lh "$OUT" "$THUMB"
echo "Recorded connect-anytime ad to $OUT"
