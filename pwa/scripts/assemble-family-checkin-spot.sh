#!/usr/bin/env bash
# 15s Family Bubble Check-In spot from the shot list (VO + captions + stills + app).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="${BROLL_DIR:-/tmp/famcheck}"
STILLS="$ROOT/pwa/public/ad-assets/family-checkin"
OUT="${1:-$ROOT/pwa/public/familybubble-family-checkin-spot.mp4}"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT2="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
LOGO="$ROOT/pwa/public/familybubble-logo-icon-only-256x256.png"

need() { [[ -f "$1" ]] || { echo "Missing $1" >&2; exit 1; }; }
need "$STILLS/family_walk_venue.png"
need "$STILLS/family_phone_closeup.png"
need "$STILLS/family_kids_run_in.png"
need "$STILLS/family_endcard_hero.png"
need "$DIR/app-phone.mp4"
need "$DIR/vo1.wav"
need "$DIR/vo2.wav"
need "$DIR/vo3.wav"
need "$DIR/vo4.wav"
need "$DIR/vo5.wav"
need "$FONT"
need "$LOGO"

mkdir -p "$DIR/captions"
printf '%s\n' "Checking in with the whole family?" > "$DIR/captions/c1.txt"
printf '%s\n' "One check-in. Everyone included." > "$DIR/captions/c2.txt"
printf '%s\n' "Select your family → Check in" > "$DIR/captions/c3.txt"
printf '%s\n' "Less time checking in. More time together." > "$DIR/captions/c4.txt"
printf '%s\n' "FAMILY BUBBLE CHECK-IN" > "$DIR/captions/e1.txt"
printf '%s\n' "One family. One simple check-in." > "$DIR/captions/e2.txt"

# Ken Burns stills. Frame count must be an integer (zoompan d=).
kenburns() {
  local img="$1" dest="$2" dur="$3" frames="$4" extra="${5:-}"
  ffmpeg -y -loop 1 -i "$img" \
    -vf "scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,zoompan=z='min(zoom+0.0009,1.10)':x='iw/2-(iw/zoom/2)+on*0.6':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,trim=duration=${dur},setsar=1,format=yuv420p${extra}" \
    -an -t "$dur" -r 30 "$dest"
}

# Shot 2 must stay locked so the UI overlay tracks the phone.
ffmpeg -y -loop 1 -i "$STILLS/family_phone_closeup.png" \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p,trim=duration=3.0" \
  -an -t 3.0 -r 30 "$DIR/s2-phone.mp4"

kenburns "$STILLS/family_walk_venue.png" "$DIR/s1-walk.mp4" 3.0 90
kenburns "$STILLS/family_walk_venue.png" "$DIR/s3-family.mp4" 2.0 60
kenburns "$STILLS/family_kids_run_in.png" "$DIR/s4-kids.mp4" 3.0 90
ffmpeg -y -loop 1 -i "$STILLS/family_endcard_hero.png" \
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
  -ss 0.25 -t 3.0 -i "$DIR/app-phone.mp4" \
  -i "$DIR/s2-phone.mp4" \
  -ss 2.55 -t 3.0 -i "$DIR/app-phone.mp4" \
  -ss 5.55 -t 2.0 -i "$DIR/app-phone.mp4" \
  -i "$DIR/s3-family.mp4" \
  -i "$DIR/s4-kids.mp4" \
  -i "$DIR/s5-hero.mp4" \
  -ss 9.2 -t 2.0 -i "$DIR/app-phone.mp4" \
  -i "$LOGO" \
  -i "$DIR/vo1.wav" \
  -i "$DIR/vo2.wav" \
  -i "$DIR/vo3.wav" \
  -i "$DIR/vo4.wav" \
  -i "$DIR/vo5.wav" \
  -filter_complex "
[1:v] fps=30,scale=236:494,setsar=1 [p1];
[0:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [b1];
[b1][p1] overlay=x=1518:y=292,${CAP1} [v1];

[3:v] fps=30,scale=430:900,setsar=1 [p2];
[2:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [b2];
[b2][p2] overlay=x=1085:y=95,${CAP2} [v2];

[4:v] fps=30,scale=430:900,setsar=1 [p3];
[p3] pad=1920:1080:(ow-iw)/2:(oh-ih)/2:0x020617,${CAP3},settb=1/30,setpts=PTS-STARTPTS [v3a];

[5:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS,${CAP3} [v3b];

[9:v] fps=30,scale=72:72,format=rgba [lg];
[6:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [b4];
[b4][lg] overlay=x=1768:y=948,${CAP4} [v4];

[8:v] fps=30,scale=360:754,setsar=1 [p5];
[7:v] fps=30,format=yuv420p,settb=1/30,setpts=PTS-STARTPTS [b5];
[b5][p5] overlay=x=1420:y=150,${END} [v5];

[v1][v2][v3a][v3b][v4][v5] concat=n=6:v=1:a=0 [vcat];
[vcat] fade=t=in:st=0:d=0.12,fade=t=out:st=14.72:d=0.26,format=yuv420p [v];

[10:a] aresample=48000,adelay=160|160,volume=1.12 [a1];
[11:a] aresample=48000,adelay=3080|3080,volume=1.10 [a2];
[12:a] aresample=48000,adelay=6080|6080,volume=1.10 [a3];
[13:a] aresample=48000,atempo=1.12,adelay=10080|10080,volume=1.10 [a4];
[14:a] aresample=48000,adelay=13040|13040,volume=1.16 [a5];
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
