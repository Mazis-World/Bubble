#!/usr/bin/env bash
# Assemble the FamilyBubble Check-in B-roll advert (no on-screen script captions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BROLL_DIR="${BROLL_DIR:-/tmp/checkin}"
OUT="${1:-$ROOT/pwa/public/familybubble-checkin-broll-ad.mp4}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT2="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

need() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "Missing $f" >&2
    exit 1
  fi
}

need "$BROLL_DIR/arrive-home.mp4"
need "$BROLL_DIR/tap-phone.mp4"
need "$BROLL_DIR/app-checkin.mp4"
need "$BROLL_DIR/come-home.mp4"
need "$FONT"

mkdir -p /tmp/checkin/captions
cat > /tmp/checkin/captions/cta1.txt <<'EOF'
FamilyBubble
EOF
cat > /tmp/checkin/captions/cta2.txt <<'EOF'
One tap. You’re on the map.
EOF
cat > /tmp/checkin/captions/cta3.txt <<'EOF'
familybubble.online
EOF

SCALE="fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p,eq=contrast=1.06:saturation=1.05,settb=1/30,setpts=PTS-STARTPTS"

ffmpeg -y \
  -ss 1.2 -t 4.2 -i "$BROLL_DIR/arrive-home.mp4" \
  -ss 1.0 -t 3.6 -i "$BROLL_DIR/tap-phone.mp4" \
  -ss 0.4 -t 12.5 -i "$BROLL_DIR/app-checkin.mp4" \
  -ss 5.2 -t 4.2 -i "$BROLL_DIR/come-home.mp4" \
  -f lavfi -t 5.0 -i "color=c=0x0B1220:s=1920x1080:r=30" \
  -filter_complex "
[0:v] ${SCALE} [v0];
[1:v] ${SCALE} [v1];
[2:v] fps=30,scale=1920:1080,setsar=1,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v2];
[3:v] ${SCALE} [v3];
[4:v] format=yuv420p,
drawtext=fontfile=${FONT}:textfile=/tmp/checkin/captions/cta1.txt:fontsize=84:fontcolor=white:x=(w-text_w)/2:y=360,
drawtext=fontfile=${FONT2}:textfile=/tmp/checkin/captions/cta2.txt:fontsize=34:fontcolor=0x93C5FD:x=(w-text_w)/2:y=500,
drawtext=fontfile=${FONT2}:textfile=/tmp/checkin/captions/cta3.txt:fontsize=32:fontcolor=0x86EFAC:x=(w-text_w)/2:y=580,
settb=1/30,setpts=PTS-STARTPTS [v4];
[v0][v1] xfade=transition=fade:duration=0.28:offset=3.92 [c01];
[c01][v2] xfade=transition=fade:duration=0.32:offset=7.20 [c02];
[c02][v3] xfade=transition=fade:duration=0.28:offset=19.42 [c03];
[c03][v4] xfade=transition=fade:duration=0.28:offset=23.34 [vcat];
[vcat] fade=t=in:st=0:d=0.25,fade=t=out:st=26.8:d=0.5 [v]
" \
  -map "[v]" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart \
  -r 30 "$OUT"

ls -lh "$OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"
echo "Wrote $OUT"
