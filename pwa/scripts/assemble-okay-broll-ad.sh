#!/usr/bin/env bash
# Assemble the FamilyBubble "When they're okay, you're okay" check-in advert.
# Life360 Elevator energy: absurd crisis, then a basic check-in, then unearned calm.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BROLL_DIR="${BROLL_DIR:-/tmp/okay}"
PUBLIC="$ROOT/pwa/public"
OUT="${1:-$ROOT/pwa/public/familybubble-okay-broll-ad.mp4}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT2="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

need() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "Missing $f" >&2
    exit 1
  fi
}

need "$PUBLIC/ad-assets/okay/shelf-panic.png"
need "$PUBLIC/ad-assets/okay/shelf-chill.png"
need "$BROLL_DIR/arrive-home.mp4"
need "$BROLL_DIR/tap-phone.mp4"
need "$BROLL_DIR/app-checkin.mp4"
need "$BROLL_DIR/lock-note.mp4"
need "$BROLL_DIR/dance-kitchen.mp4"
need "$FONT"

mkdir -p "$BROLL_DIR/captions"
cat > "$BROLL_DIR/captions/cta1.txt" <<'EOF'
When they're okay, you're okay.
EOF
cat > "$BROLL_DIR/captions/cta2.txt" <<'EOF'
FamilyBubble
EOF
cat > "$BROLL_DIR/captions/cta3.txt" <<'EOF'
familybubble.online
EOF
cat > "$BROLL_DIR/captions/dog.txt" <<'EOF'
He also fed the dog.
EOF

# Ken Burns stills
ffmpeg -y -loop 1 -i "$PUBLIC/ad-assets/okay/shelf-panic.png" \
  -vf "scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,zoompan=z='min(zoom+0.0011,1.14)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=1920x1080:fps=30,trim=duration=4.0,setsar=1,format=yuv420p" \
  -an -t 4.0 -r 30 "$BROLL_DIR/panic.mp4"

ffmpeg -y -loop 1 -i "$PUBLIC/ad-assets/okay/shelf-chill.png" \
  -vf "scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,zoompan=z='min(zoom+0.0009,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=110:s=1920x1080:fps=30,trim=duration=3.4,setsar=1,format=yuv420p,drawtext=fontfile=${FONT}:textfile=${BROLL_DIR}/captions/dog.txt:fontsize=42:fontcolor=white:x=(w-text_w)/2:y=h-120:shadowcolor=black@0.7:shadowx=0:shadowy=2" \
  -an -t 3.4 -r 30 "$BROLL_DIR/chill.mp4"

SCALE="fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p,eq=contrast=1.08:saturation=1.04,settb=1/30,setpts=PTS-STARTPTS"

ffmpeg -y \
  -i "$BROLL_DIR/panic.mp4" \
  -ss 1.0 -t 3.0 -i "$BROLL_DIR/arrive-home.mp4" \
  -ss 0.6 -t 2.6 -i "$BROLL_DIR/tap-phone.mp4" \
  -ss 0.5 -t 12.0 -i "$BROLL_DIR/app-checkin.mp4" \
  -ss 0.4 -t 4.2 -i "$BROLL_DIR/lock-note.mp4" \
  -i "$BROLL_DIR/chill.mp4" \
  -ss 2.0 -t 3.2 -i "$BROLL_DIR/dance-kitchen.mp4" \
  -f lavfi -t 4.2 -i "color=c=0x0B1220:s=1920x1080:r=30" \
  -filter_complex "
[0:v] fps=30,setsar=1,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v0];
[1:v] ${SCALE} [v1];
[2:v] ${SCALE} [v2];
[3:v] fps=30,scale=1920:1080,setsar=1,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v3];
[4:v] fps=30,scale=1920:1080,setsar=1,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v4];
[5:v] fps=30,setsar=1,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [v5];
[6:v] ${SCALE} [v6];
[7:v] format=yuv420p,
drawtext=fontfile=${FONT}:textfile=${BROLL_DIR}/captions/cta1.txt:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=340,
drawtext=fontfile=${FONT}:textfile=${BROLL_DIR}/captions/cta2.txt:fontsize=72:fontcolor=white:x=(w-text_w)/2:y=470,
drawtext=fontfile=${FONT2}:textfile=${BROLL_DIR}/captions/cta3.txt:fontsize=32:fontcolor=0x86EFAC:x=(w-text_w)/2:y=580,
settb=1/30,setpts=PTS-STARTPTS [v7];
[v0][v1] xfade=transition=fade:duration=0.28:offset=3.70 [c01];
[c01][v2] xfade=transition=fade:duration=0.24:offset=6.42 [c02];
[c02][v3] xfade=transition=fade:duration=0.28:offset=8.78 [c03];
[c03][v4] xfade=transition=fade:duration=0.28:offset=20.50 [c04];
[c04][v5] xfade=transition=fade:duration=0.28:offset=24.42 [c05];
[c05][v6] xfade=transition=fade:duration=0.28:offset=27.54 [c06];
[c06][v7] xfade=transition=fade:duration=0.28:offset=30.46 [vcat];
[vcat] fade=t=in:st=0:d=0.22,fade=t=out:st=33.8:d=0.5 [v]
" \
  -map "[v]" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart \
  -r 30 "$OUT"

ls -lh "$OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"
echo "Wrote $OUT"
