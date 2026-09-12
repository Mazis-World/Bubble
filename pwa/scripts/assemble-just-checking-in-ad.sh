#!/usr/bin/env bash
# Assemble FamilyBubble — Just Checking In (45–60s cinematic spot).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BROLL_DIR="${BROLL_DIR:-/tmp/jci}"
OUT="${1:-$ROOT/pwa/public/familybubble-just-checking-in.mp4}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT2="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

need() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "Missing $f" >&2
    exit 1
  fi
}

need "$BROLL_DIR/coffee.mp4"
need "$BROLL_DIR/leaving.mp4"
need "$BROLL_DIR/bus.mp4"
need "$BROLL_DIR/commute.mp4"
need "$BROLL_DIR/desk.mp4"
need "$BROLL_DIR/coffee-shop.mp4"
need "$BROLL_DIR/study-girl.mp4"
need "$BROLL_DIR/soccer2.mp4"
need "$BROLL_DIR/grandma-tea.mp4"
need "$BROLL_DIR/texting.mp4"
need "$BROLL_DIR/car-phone.mp4"
need "$BROLL_DIR/app-ui.mp4"
need "$BROLL_DIR/grandma-phone.mp4"
need "$BROLL_DIR/come-home.mp4"
need "$BROLL_DIR/arrive-school.mp4"
need "$BROLL_DIR/dinner-gp.mp4"
need "$BROLL_DIR/dinner-garden.mp4"
need "$BROLL_DIR/vo.wav"
need "$BROLL_DIR/thinking-about-you.mp3"
need "$FONT"

mkdir -p /tmp/jci/captions
cat > /tmp/jci/captions/cta1.txt <<'EOF'
FamilyBubble
EOF
cat > /tmp/jci/captions/cta2.txt <<'EOF'
Stay connected to the people who matter.
EOF
cat > /tmp/jci/captions/cta3.txt <<'EOF'
familybubble.online
EOF
cat > /tmp/jci/captions/home.txt <<'EOF'
🏠 Grandma is home.
EOF

SCALE="fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p,eq=contrast=1.05:saturation=1.04,settb=1/30,setpts=PTS-STARTPTS"

ffmpeg -y \
  -ss 1.6 -t 3.1 -i "$BROLL_DIR/coffee.mp4" \
  -ss 2.4 -t 2.3 -i "$BROLL_DIR/leaving.mp4" \
  -ss 10.0 -t 2.1 -i "$BROLL_DIR/bus.mp4" \
  -ss 0.6 -t 2.1 -i "$BROLL_DIR/commute.mp4" \
  -ss 1.0 -t 1.45 -i "$BROLL_DIR/desk.mp4" \
  -ss 1.2 -t 1.45 -i "$BROLL_DIR/coffee-shop.mp4" \
  -ss 1.0 -t 1.45 -i "$BROLL_DIR/study-girl.mp4" \
  -ss 4.0 -t 1.45 -i "$BROLL_DIR/soccer2.mp4" \
  -ss 3.0 -t 1.55 -i "$BROLL_DIR/grandma-tea.mp4" \
  -ss 0.4 -t 1.7 -i "$BROLL_DIR/texting.mp4" \
  -ss 4.0 -t 3.9 -i "$BROLL_DIR/car-phone.mp4" \
  -ss 0.4 -t 10.0 -i "$BROLL_DIR/app-ui.mp4" \
  -ss 1.2 -t 3.2 -i "$BROLL_DIR/grandma-phone.mp4" \
  -ss 1.0 -t 2.0 -i "$BROLL_DIR/grandma-tea.mp4" \
  -ss 5.2 -t 2.1 -i "$BROLL_DIR/come-home.mp4" \
  -ss 2.4 -t 2.0 -i "$BROLL_DIR/arrive-school.mp4" \
  -ss 0.4 -t 2.4 -i "$BROLL_DIR/come-home.mp4" \
  -ss 2.0 -t 5.4 -i "$BROLL_DIR/dinner-gp.mp4" \
  -ss 5.0 -t 3.0 -i "$BROLL_DIR/dinner-garden.mp4" \
  -f lavfi -t 5.2 -i "color=c=0x0B1220:s=1920x1080:r=30" \
  -i "$BROLL_DIR/vo.wav" \
  -i "$BROLL_DIR/thinking-about-you.mp3" \
  -filter_complex "
[0:v] ${SCALE} [v0];
[1:v] ${SCALE} [v1];
[2:v] ${SCALE} [v2];
[3:v] ${SCALE} [v3];
[4:v] ${SCALE} [v4];
[5:v] ${SCALE} [v5];
[6:v] ${SCALE} [v6];
[7:v] ${SCALE} [v7];
[8:v] ${SCALE} [v8];
[9:v] ${SCALE},eq=brightness=-0.12:saturation=0.85 [v9];
[10:v] ${SCALE} [v10];
[11:v] fps=30,scale=1920:1080,setsar=1,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v11];
[12:v] ${SCALE} [v12];
[13:v] ${SCALE} [v13];
[14:v] ${SCALE} [v14];
[15:v] ${SCALE} [v15];
[16:v] ${SCALE} [v16];
[17:v] ${SCALE},
drawbox=x=620:y=820:w=680:h=86:color=black@0.55:t=fill:enable='gte(t,1.6)',
drawtext=fontfile=${FONT}:textfile=/tmp/jci/captions/home.txt:fontsize=36:fontcolor=white:x=(w-text_w)/2:y=846:enable='gte(t,1.6)' [v17];
[18:v] ${SCALE} [v18];
[19:v] format=yuv420p,
drawtext=fontfile=${FONT}:textfile=/tmp/jci/captions/cta1.txt:fontsize=84:fontcolor=white:x=(w-text_w)/2:y=390,
drawtext=fontfile=${FONT2}:textfile=/tmp/jci/captions/cta2.txt:fontsize=32:fontcolor=0xC4B5FD:x=(w-text_w)/2:y=510,
drawtext=fontfile=${FONT2}:textfile=/tmp/jci/captions/cta3.txt:fontsize=30:fontcolor=0x86EFAC:x=(w-text_w)/2:y=580,
settb=1/30,setpts=PTS-STARTPTS [v19];
[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12][v13][v14][v15][v16][v17][v18][v19] concat=n=20:v=1:a=0,
fade=t=in:st=0:d=0.35,fade=t=out:st=55.6:d=0.7 [v];
[20:a] volume=1.15,aresample=48000 [vo];
[21:a] volume=0.16,afade=t=in:st=0:d=1.2,afade=t=out:st=54.8:d=1.6,aresample=48000 [bed];
[vo][bed] amix=inputs=2:duration=longest:dropout_transition=2 [a]
" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -shortest -movflags +faststart \
  -r 30 "$OUT"

ls -lh "$OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"
echo "Wrote $OUT"
