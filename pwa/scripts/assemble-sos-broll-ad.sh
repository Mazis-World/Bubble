#!/usr/bin/env bash
# Assemble the FamilyBubble SOS B-roll advert.
# Requires Mixkit clips in BROLL_DIR (downloaded separately) plus a 10s
# recording of pwa/public/sos-ad-app.html (see record-sos-ad-app.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BROLL_DIR="${BROLL_DIR:-/tmp/broll}"
OUT="${1:-$ROOT/pwa/public/familybubble-sos-broll-ad.mp4}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT2="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

need() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "Missing $f" >&2
    exit 1
  fi
}

need "$BROLL_DIR/night-walk.mp4"
need "$BROLL_DIR/walk-phone.mp4"
need "$BROLL_DIR/app-sos.mp4"
need "$BROLL_DIR/family-call.mp4"
need "$FONT"

mkdir -p /tmp/broll/captions
cat > /tmp/broll/captions/c1.txt <<'EOF'
When something feels wrong…
EOF
cat > /tmp/broll/captions/c2.txt <<'EOF'
You shouldn’t have to wait.
EOF
cat > /tmp/broll/captions/c4.txt <<'EOF'
Your family sees it. Instantly.
EOF
cat > /tmp/broll/captions/cta1.txt <<'EOF'
FamilyBubble
EOF
cat > /tmp/broll/captions/cta2.txt <<'EOF'
Hold 3 seconds. Your family is notified.
EOF
cat > /tmp/broll/captions/cta3.txt <<'EOF'
familybubble.online
EOF

caption() {
  local file="$1"
  echo "drawbox=x=0:y=ih-130:w=iw:h=130:color=black@0.55:t=fill,drawbox=x=0:y=ih-134:w=iw:h=4:color=0xEF4444@0.95:t=fill,drawtext=fontfile=${FONT}:textfile=${file}:fontsize=46:fontcolor=white:x=(w-text_w)/2:y=h-82:shadowcolor=black@0.75:shadowy=3"
}

SCALE="fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS"

ffmpeg -y \
  -ss 2 -t 4.4 -i "$BROLL_DIR/night-walk.mp4" \
  -ss 0 -t 4.2 -i "$BROLL_DIR/walk-phone.mp4" \
  -ss 0.3 -t 10 -i "$BROLL_DIR/app-sos.mp4" \
  -ss 1.2 -t 4.5 -i "$BROLL_DIR/family-call.mp4" \
  -f lavfi -t 5.2 -i "color=c=0x0B1220:s=1920x1080:r=30" \
  -filter_complex "
[0:v] ${SCALE},eq=contrast=1.08:saturation=0.9,$(caption /tmp/broll/captions/c1.txt) [v0];
[1:v] ${SCALE},$(caption /tmp/broll/captions/c2.txt) [v1];
[2:v] fps=30,scale=1920:1080,setsar=1,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v2];
[3:v] ${SCALE},$(caption /tmp/broll/captions/c4.txt) [v3];
[4:v] format=yuv420p,
drawtext=fontfile=${FONT}:textfile=/tmp/broll/captions/cta1.txt:fontsize=84:fontcolor=white:x=(w-text_w)/2:y=360,
drawtext=fontfile=${FONT2}:textfile=/tmp/broll/captions/cta2.txt:fontsize=34:fontcolor=0xFECACA:x=(w-text_w)/2:y=500,
drawtext=fontfile=${FONT2}:textfile=/tmp/broll/captions/cta3.txt:fontsize=32:fontcolor=0x93C5FD:x=(w-text_w)/2:y=580,
settb=1/30,setpts=PTS-STARTPTS [v4];
[v0][v1][v2][v3][v4] concat=n=5:v=1:a=0,fade=t=in:st=0:d=0.3,fade=t=out:st=27.7:d=0.5 [v]
" \
  -map "[v]" \
  -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart \
  -r 30 "$OUT"

ls -lh "$OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"
echo "Wrote $OUT"
