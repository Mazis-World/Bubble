#!/usr/bin/env bash
# 15s Family Bubble Check-In spot.
# App UI is warped onto the real device screens — no floating phone mockups.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="${BROLL_DIR:-/tmp/famcheck}"
STILLS="$ROOT/pwa/public/ad-assets/family-checkin"
OUT="${1:-$ROOT/pwa/public/familybubble-family-checkin-spot.mp4}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT2="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

need() { [[ -f "$1" ]] || { echo "Missing $1" >&2; exit 1; }; }
need "$STILLS/family_walk_venue.png"
need "$STILLS/family_phone_closeup.png"
need "$STILLS/family_kids_run_in.png"
need "$STILLS/family_endcard_hero.png"
need "$DIR/app-phone.mp4"
need "$DIR/app-checkin.mp4"
need "$DIR/app-home.png"
need "$DIR/app-done.png"
need "$DIR/vo1.wav"
need "$DIR/vo2.wav"
need "$DIR/vo3.wav"
need "$DIR/vo4.wav"
need "$DIR/vo5.wav"
need "$FONT"

mkdir -p "$DIR/captions"
printf '%s\n' "Checking in with the whole family?" > "$DIR/captions/c1.txt"
printf '%s\n' "One check-in. Everyone included." > "$DIR/captions/c2.txt"
printf '%s\n' "Select your family → Check in" > "$DIR/captions/c3.txt"
printf '%s\n' "Less time checking in. More time together." > "$DIR/captions/c4.txt"
printf '%s\n' "FAMILY BUBBLE CHECK-IN" > "$DIR/captions/e1.txt"
printf '%s\n' "One family. One simple check-in." > "$DIR/captions/e2.txt"

python3 "$ROOT/pwa/scripts/composite-family-checkin-screens.py" \
  --stills "$STILLS" \
  --app-phone "$DIR/app-phone.mp4" \
  --app-home "$DIR/app-home.png" \
  --app-done "$DIR/app-done.png" \
  --out-dir "$DIR"

# Ken Burns stills. Frame count must be an integer (zoompan d=).
kenburns() {
  local img="$1" dest="$2" dur="$3" frames="$4"
  ffmpeg -y -loop 1 -i "$img" \
    -vf "scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,zoompan=z='min(zoom+0.0009,1.10)':x='iw/2-(iw/zoom/2)+on*0.6':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,trim=duration=${dur},setsar=1,format=yuv420p" \
    -an -t "$dur" -r 30 "$dest"
}

# Shot 1: walk — UI already on the phone in her hand.
kenburns "$DIR/walk-comp.png" "$DIR/s1-walk.mp4" 3.0 90

# Shot 2: close-up — locked so the warped UI stays on the glass.
cp "$DIR/close-comp.mp4" "$DIR/s2-phone.mp4"

# Shot 3a: full-frame device mockup (the recorded phone, not a sticker).
ffmpeg -y -ss 5.55 -t 2.0 -i "$DIR/app-checkin.mp4" \
  -vf "fps=30,scale=1920:1080,setsar=1,format=yuv420p,setpts=PTS-STARTPTS" \
  -an -r 30 -t 2.0 "$DIR/s3-app.mp4"

# Shot 3b: cut back to the family (same walk plate, UI still in-hand).
kenburns "$DIR/walk-comp.png" "$DIR/s3-family.mp4" 2.0 60

# Shot 4: kids through the gate — no overlay gimmicks.
kenburns "$STILLS/family_kids_run_in.png" "$DIR/s4-kids.mp4" 3.0 90

# Shot 5: end card — UI on the hero device.
ffmpeg -y -loop 1 -i "$DIR/end-comp.png" \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p,trim=duration=2.0" \
  -an -t 2.0 -r 30 "$DIR/s5-hero.mp4"

BOX="box=1:boxcolor=black@0.42:boxborderw=18"
CAP1="drawtext=fontfile=${FONT}:textfile=${DIR}/captions/c1.txt:fontsize=46:fontcolor=white:x=(w-text_w)/2:y=58:shadowcolor=black@0.7:shadowx=0:shadowy=2:${BOX}"
CAP2="drawtext=fontfile=${FONT}:textfile=${DIR}/captions/c2.txt:fontsize=44:fontcolor=white:x=(w-text_w)/2:y=58:shadowcolor=black@0.7:shadowx=0:shadowy=2:${BOX}"
CAP3="drawtext=fontfile=${FONT}:textfile=${DIR}/captions/c3.txt:fontsize=42:fontcolor=white:x=(w-text_w)/2:y=54:shadowcolor=black@0.7:shadowx=0:shadowy=2:${BOX}"
CAP4="drawtext=fontfile=${FONT}:textfile=${DIR}/captions/c4.txt:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-108:shadowcolor=black@0.7:shadowx=0:shadowy=2:${BOX}"
END="drawtext=fontfile=${FONT}:textfile=${DIR}/captions/e1.txt:fontsize=36:fontcolor=white:x=72:y=868:shadowcolor=black@0.75:shadowx=0:shadowy=2,drawtext=fontfile=${FONT2}:textfile=${DIR}/captions/e2.txt:fontsize=26:fontcolor=0xBBF7D0:x=72:y=922:shadowcolor=black@0.75:shadowx=0:shadowy=2"

ffmpeg -y \
  -i "$DIR/s1-walk.mp4" \
  -i "$DIR/s2-phone.mp4" \
  -i "$DIR/s3-app.mp4" \
  -i "$DIR/s3-family.mp4" \
  -i "$DIR/s4-kids.mp4" \
  -i "$DIR/s5-hero.mp4" \
  -i "$DIR/vo1.wav" \
  -i "$DIR/vo2.wav" \
  -i "$DIR/vo3.wav" \
  -i "$DIR/vo4.wav" \
  -i "$DIR/vo5.wav" \
  -filter_complex "
[0:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS,${CAP1} [v1];
[1:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS,${CAP2} [v2];
[2:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS,${CAP3} [v3a];
[3:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS,${CAP3} [v3b];
[4:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS,${CAP4} [v4];
[5:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS,${END} [v5];
[v1][v2][v3a][v3b][v4][v5] concat=n=6:v=1:a=0 [vcat];
[vcat] fade=t=in:st=0:d=0.12,fade=t=out:st=14.72:d=0.26,format=yuv420p [v];
[6:a] aresample=48000,adelay=160|160,volume=1.12 [a1];
[7:a] aresample=48000,adelay=3080|3080,volume=1.10 [a2];
[8:a] aresample=48000,adelay=6080|6080,volume=1.10 [a3];
[9:a] aresample=48000,atempo=1.12,adelay=10080|10080,volume=1.10 [a4];
[10:a] aresample=48000,adelay=13040|13040,volume=1.16 [a5];
[a1][a2][a3][a4][a5] amix=inputs=5:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.89,atrim=0:15.0,asetpts=PTS-STARTPTS [a]
" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -r 30 -t 15 \
  "$OUT"

ls -lh "$OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"
echo "Wrote $OUT"
