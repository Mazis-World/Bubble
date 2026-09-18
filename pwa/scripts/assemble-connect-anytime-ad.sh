#!/usr/bin/env bash
# Build the FamilyBubble "Connect with your family at any time" car ad
# from Mixkit B-roll (woman gets in on a busy street, then looks at her phone).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/pwa/public"
OUT="${1:-$PUBLIC/familybubble-connect-anytime-ad.mp4}"
THUMB="${2:-$PUBLIC/connect-anytime-ad-thumbnail.png}"
WORK="${WORK_DIR:-/tmp/connect-anytime}"
DISPLAY_NUM="${DISPLAY_NUM:-98}"
PORT="${PORT:-8768}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT2="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

need() {
  [[ -f "$1" ]] || { echo "Missing $1" >&2; exit 1; }
}

need "$PUBLIC/connect-anytime-radar.html"
need "$PUBLIC/connect-anytime-end.html"
need "$FONT"

mkdir -p "$WORK/broll" "$WORK/captions"

download() {
  local id="$1" dest="$2"
  if [[ -f "$dest" ]]; then
    return 0
  fi
  for res in 1080 720; do
    local url="https://assets.mixkit.co/videos/${id}/${id}-${res}.mp4"
    if curl -fsSL -o "$dest" "$url"; then
      echo "Downloaded Mixkit ${id} (${res}p)"
      return 0
    fi
  done
  echo "Could not download Mixkit ${id}" >&2
  exit 1
}

download 73 "$WORK/broll/get-in.mp4"
download 22544 "$WORK/broll/phone.mp4"

cat > "$WORK/captions/line.txt" <<'EOF'
Connect with your family at any time.
EOF

SCALE="fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p,eq=contrast=1.06:saturation=1.05,settb=1/30,setpts=PTS-STARTPTS"

# Mixkit 73: she opens the door with traffic passing, then sits.
ffmpeg -y -ss 1.6 -t 5.2 -i "$WORK/broll/get-in.mp4" \
  -vf "$SCALE" -an -r 30 "$WORK/get-in.mp4"

# Mixkit 22544: she looks down at her phone; the line comes up as we leave the street.
ffmpeg -y -ss 8.2 -t 4.0 -i "$WORK/broll/phone.mp4" \
  -vf "${SCALE},drawtext=fontfile=${FONT}:textfile=${WORK}/captions/line.txt:fontsize=52:fontcolor=white:x=(w-text_w)/2:y=h-140:shadowcolor=black@0.75:shadowx=0:shadowy=3:enable='gte(t,1.5)'" \
  -an -r 30 "$WORK/phone.mp4"

cleanup() {
  pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
  pkill -f "chrome-connect-anytime" 2>/dev/null || true
  pkill -f "http.server ${PORT}" 2>/dev/null || true
}

record_html() {
  local page="$1" dest="$2" seconds="$3"
  cleanup
  sleep 0.2
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PUBLIC" >/tmp/connect-anytime-http.log 2>&1 &
  sleep 0.4
  Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac >/tmp/connect-anytime-xvfb.log 2>&1 &
  sleep 0.7
  local profile="/tmp/chrome-connect-anytime"
  rm -rf "$profile"
  mkdir -p "$profile"
  DISPLAY=":${DISPLAY_NUM}" google-chrome \
    --user-data-dir="$profile" \
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
    "http://127.0.0.1:${PORT}/${page}" \
    >/tmp/connect-anytime-chrome.log 2>&1 &
  local chrome_pid=$!
  sleep 1.6
  ffmpeg -y \
    -f x11grab -draw_mouse 0 -video_size 1920x1080 -framerate 30 -i ":${DISPLAY_NUM}" \
    -t "$seconds" \
    -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
    "$dest"
  kill "$chrome_pid" 2>/dev/null || true
  cleanup
  wait "$chrome_pid" 2>/dev/null || true
}

record_html "connect-anytime-radar.html" "$WORK/radar.mp4" 3.6
record_html "connect-anytime-end.html" "$WORK/end.mp4" 3.4

# get-in 5.2 + phone 4.0 - 0.32 = 8.88
# + radar 3.6 - 0.40 = 12.08
# + end 3.4 - 0.40 = 15.08
ffmpeg -y \
  -i "$WORK/get-in.mp4" \
  -i "$WORK/phone.mp4" \
  -i "$WORK/radar.mp4" \
  -i "$WORK/end.mp4" \
  -filter_complex "
[0:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v0];
[1:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v1];
[2:v] fps=30,scale=1920:1080,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v2];
[3:v] fps=30,scale=1920:1080,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v3];
[v0][v1] xfade=transition=fade:duration=0.32:offset=4.88 [c01];
[c01][v2] xfade=transition=fade:duration=0.40:offset=8.48 [c02];
[c02][v3] xfade=transition=fade:duration=0.40:offset=11.68 [out]
" \
  -map "[out]" -an -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 -movflags +faststart \
  "$OUT"

ffmpeg -y -ss 13.2 -i "$OUT" -update 1 -frames:v 1 "$THUMB"
ls -lh "$OUT" "$THUMB"
echo "Wrote $OUT"
