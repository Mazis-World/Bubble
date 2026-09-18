#!/usr/bin/env bash
# Build the FamilyBubble "Connect with your family at any time" car ad (1920x1080).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/pwa/public"
ASSETS="$PUBLIC/ad-assets/connect-anytime"
OUT="${1:-$PUBLIC/familybubble-connect-anytime-ad.mp4}"
THUMB="${2:-$PUBLIC/connect-anytime-ad-thumbnail.png}"
WORK="${WORK_DIR:-/tmp/connect-anytime}"
DISPLAY_NUM="${DISPLAY_NUM:-98}"
PORT="${PORT:-8768}"

need() {
  [[ -f "$1" ]] || { echo "Missing $1" >&2; exit 1; }
}

need "$ASSETS/connect-anytime-street.png"
need "$ASSETS/connect-anytime-incar.png"
need "$ASSETS/connect-anytime-phone.png"
need "$PUBLIC/connect-anytime-radar.html"
need "$PUBLIC/connect-anytime-end.html"

mkdir -p "$WORK"

kenburns() {
  local src="$1" dest="$2" seconds="$3" zoom_end="$4"
  local frames
  frames="$(python3 - <<PY
print(int(round($seconds * 30)))
PY
)"
  ffmpeg -y -loop 1 -i "$src" \
    -vf "scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,zoompan=z='min(zoom+0.00115,${zoom_end})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,trim=duration=${seconds},setsar=1,format=yuv420p" \
    -an -t "$seconds" -r 30 "$dest"
}

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

echo "Ken Burns stills…"
kenburns "$ASSETS/connect-anytime-street.png" "$WORK/street.mp4" 3.6 1.12
kenburns "$ASSETS/connect-anytime-incar.png" "$WORK/incar.mp4" 4.0 1.10
kenburns "$ASSETS/connect-anytime-phone.png" "$WORK/phone.mp4" 2.5 1.14

echo "Recording radar and end card…"
record_html "connect-anytime-radar.html" "$WORK/radar.mp4" 4.4
record_html "connect-anytime-end.html" "$WORK/end.mp4" 3.8

echo "Cutting the spot…"
ffmpeg -y \
  -i "$WORK/street.mp4" \
  -i "$WORK/incar.mp4" \
  -i "$WORK/phone.mp4" \
  -i "$WORK/radar.mp4" \
  -i "$WORK/end.mp4" \
  -filter_complex "
[0:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v0];
[1:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v1];
[2:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v2];
[3:v] fps=30,scale=1920:1080,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v3];
[4:v] fps=30,scale=1920:1080,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v4];
[v0][v1] xfade=transition=fade:duration=0.32:offset=3.28 [c01];
[c01][v2] xfade=transition=fade:duration=0.28:offset=7.00 [c02];
[c02][v3] xfade=transition=fade:duration=0.36:offset=9.14 [c03];
[c03][v4] xfade=transition=fade:duration=0.40:offset=13.14 [out]
" \
  -map "[out]" -an -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 -movflags +faststart \
  "$OUT"

ffmpeg -y -ss 14.6 -i "$OUT" -update 1 -frames:v 1 "$THUMB"
ls -lh "$OUT" "$THUMB"
echo "Wrote $OUT"
