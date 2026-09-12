#!/usr/bin/env bash
# Capture the extracted FamilyBubble check-in plate and key magenta to alpha.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/pwa/public"
HTML="$PUBLIC/just-checking-in-overlay.html"
PNG="$PUBLIC/just-checking-in-overlay.png"
DISPLAY_NUM="${DISPLAY_NUM:-97}"
PORT="${PORT:-8768}"
RAW="/tmp/jci/checkin-card-raw.png"

mkdir -p /tmp/jci
need() { [[ -f "$1" ]] || { echo "Missing $1" >&2; exit 1; }; }
need "$HTML"

pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
pkill -f "chrome-jci-overlay" 2>/dev/null || true
pkill -f "http.server ${PORT}" 2>/dev/null || true
sleep 0.3

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PUBLIC" >/tmp/jci-overlay-http.log 2>&1 &
HTTP_PID=$!
sleep 0.4

Xvfb ":${DISPLAY_NUM}" -screen 0 1920x1080x24 -ac +extension GLX +extension RANDR >/tmp/jci-overlay-xvfb.log 2>&1 &
XVFB_PID=$!
sleep 0.7

PROFILE="/tmp/chrome-jci-overlay"
rm -rf "$PROFILE"
mkdir -p "$PROFILE"

DISPLAY=":${DISPLAY_NUM}" google-chrome \
  --user-data-dir="$PROFILE" \
  --no-first-run --no-sandbox --disable-infobars \
  --disable-session-crashed-bubble --disable-features=TranslateUI \
  --window-position=0,0 --window-size=1920,1080 --start-fullscreen --kiosk \
  --force-device-scale-factor=1 \
  "http://127.0.0.1:${PORT}/just-checking-in-overlay.html" \
  >/tmp/jci-overlay-chrome.log 2>&1 &
CHROME_PID=$!
sleep 2.4

ffmpeg -y -f x11grab -draw_mouse 0 -video_size 1920x1080 -i ":${DISPLAY_NUM}" \
  -frames:v 1 -update 1 "$RAW"

kill "$CHROME_PID" 2>/dev/null || true
kill "$XVFB_PID" 2>/dev/null || true
kill "$HTTP_PID" 2>/dev/null || true
wait "$CHROME_PID" 2>/dev/null || true
wait "$XVFB_PID" 2>/dev/null || true
wait "$HTTP_PID" 2>/dev/null || true

python3 - "$RAW" "$PNG" <<'PY'
import sys
import numpy as np
from PIL import Image, ImageFilter

src_path, dst_path = sys.argv[1], sys.argv[2]
img = Image.open(src_path).convert("RGBA")
arr = np.array(img).astype(np.float32)
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
# Magenta stage (#FF00FF). Soft-key so the phone bezel stays crisp.
magenta = np.minimum(r, b) - g
key = np.clip((magenta - 40.0) / 80.0, 0.0, 1.0)
alpha = (1.0 - key) * 255.0
# Xvfb/Chrome leaves a 1px black window edge — drop it, not the dark phone UI.
alpha[:4, :] = 0
alpha[-4:, :] = 0
alpha[:, :4] = 0
alpha[:, -4:] = 0
# Despill leftover magenta on edges.
spill = np.clip((np.minimum(r, b) - g - 8.0) / 180.0, 0.0, 1.0)
r = r - spill * (r - g)
b = b - spill * (b - g)
arr[:, :, 0] = np.clip(r, 0, 255)
arr[:, :, 1] = np.clip(g, 0, 255)
arr[:, :, 2] = np.clip(b, 0, 255)
arr[:, :, 3] = np.clip(alpha, 0, 255)
keyed = Image.fromarray(arr.astype(np.uint8), "RGBA")

alpha_ch = keyed.split()[-1]
bbox = alpha_ch.point(lambda p: 255 if p > 40 else 0).getbbox()
if not bbox:
    raise SystemExit("chroma key produced an empty plate")
pad = 36
l, t, rgt, bot = bbox
l = max(0, l - pad)
t = max(0, t - pad)
rgt = min(keyed.width, rgt + pad)
bot = min(keyed.height, bot + pad)
crop = keyed.crop((l, t, rgt, bot))

# Soft drop shadow behind the phone fragment.
shadow = Image.new("RGBA", crop.size, (0, 0, 0, 0))
mask = crop.split()[-1]
shadow_layer = Image.new("RGBA", crop.size, (0, 0, 0, 160))
shadow.paste(shadow_layer, (0, 12), mask)
shadow = shadow.filter(ImageFilter.GaussianBlur(20))
out = Image.alpha_composite(shadow, crop)
out.save(dst_path)
print(f"wrote {dst_path} {out.size}")
PY

ls -lh "$PNG"
echo "Wrote $PNG"
