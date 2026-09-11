#!/usr/bin/env python3
"""Warp Family Bubble Check-In UI onto the photorealistic device screens.

The app recording is a 430x900 phone mockup. Overlaying that whole mockup on a
photo creates a second floating device. This script crops the inner screen and
perspective-warps it onto the glass of the stills so the UI lives in-device.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

# Destination quads (TL, TR, BR, BL) in 1920x1080 still space.
QUADS = {
    "walk": np.array(
        [
            [1373.00, 303.63],
            [1465.64, 324.64],
            [1415.02, 542.38],
            [1323.34, 521.36],
        ],
        np.float32,
    ),
    "close": np.array(
        [
            [1135.78, 106.74],
            [1522.85, 175.04],
            [1383.38, 965.35],
            [996.31, 897.05],
        ],
        np.float32,
    ),
    "end": np.array(
        [
            [1226.19, 138.37],
            [1576.81, 138.37],
            [1576.81, 954.63],
            [1226.19, 954.63],
        ],
        np.float32,
    ),
}


def inner_screen(frame: np.ndarray) -> np.ndarray:
    """Drop the recorded phone chrome; keep the glass contents."""
    h, w = frame.shape[:2]
    ix, iy = int(w * 0.055), int(h * 0.04)
    return frame[iy : h - iy, ix : w - ix]


def rounded_rgba(bgr: np.ndarray, radius_frac: float = 0.085) -> np.ndarray:
    h, w = bgr.shape[:2]
    r = max(10, int(min(h, w) * radius_frac))
    mask = np.zeros((h, w), np.uint8)
    cv2.rectangle(mask, (r, 0), (w - r, h), 255, -1)
    cv2.rectangle(mask, (0, r), (w, h - r), 255, -1)
    for cx, cy in ((r, r), (w - 1 - r, r), (r, h - 1 - r), (w - 1 - r, h - 1 - r)):
        cv2.circle(mask, (cx, cy), r, 255, -1)
    rgba = cv2.cvtColor(bgr, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = mask
    return rgba


def warp_ui(bg: np.ndarray, ui_bgr: np.ndarray, quad: np.ndarray) -> np.ndarray:
    ui = rounded_rgba(inner_screen(ui_bgr))
    uh, uw = ui.shape[:2]
    src = np.array([[0, 0], [uw - 1, 0], [uw - 1, uh - 1], [0, uh - 1]], np.float32)
    matrix = cv2.getPerspectiveTransform(src, quad)
    warped = cv2.warpPerspective(ui, matrix, (bg.shape[1], bg.shape[0]))
    alpha = cv2.GaussianBlur(warped[:, :, 3].astype(np.float32) / 255.0, (5, 5), 0)
    a = alpha[..., None]
    return (warped[:, :, :3].astype(np.float32) * a + bg.astype(np.float32) * (1.0 - a)).astype(
        np.uint8
    )


def load_bgr(path: Path) -> np.ndarray:
    im = cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)
    if im is None:
        raise SystemExit(f"Cannot read {path}")
    if im.shape[1] != 1920 or im.shape[0] != 1080:
        im = cv2.resize(im, (1920, 1080), interpolation=cv2.INTER_AREA)
    return im


def write_png(path: Path, im: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), im, [cv2.IMWRITE_PNG_COMPRESSION, 3])


def composite_still(bg_path: Path, ui_path: Path, quad: np.ndarray, out_path: Path) -> None:
    bg = load_bgr(bg_path)
    ui = cv2.imread(str(ui_path))
    if ui is None:
        raise SystemExit(f"Cannot read {ui_path}")
    write_png(out_path, warp_ui(bg, ui, quad))


def composite_video(
    bg_path: Path,
    app_path: Path,
    quad: np.ndarray,
    out_path: Path,
    start: float,
    duration: float,
    fps: float = 30.0,
) -> None:
    bg = load_bgr(bg_path)
    cap = cv2.VideoCapture(str(app_path))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open {app_path}")
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    start_frame = int(round(start * src_fps))
    n_frames = int(round(duration * fps))
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    tmp = out_path.with_suffix(".tmp.avi")
    writer = cv2.VideoWriter(
        str(tmp), cv2.VideoWriter_fourcc(*"MJPG"), fps, (1920, 1080)
    )
    if not writer.isOpened():
        raise SystemExit(f"Cannot write {tmp}")

    last = None
    for _ in range(n_frames):
        ok, frame = cap.read()
        if ok:
            last = frame
        if last is None:
            raise SystemExit(f"No frames from {app_path} at {start}s")
        writer.write(warp_ui(bg, last, quad))
    writer.release()
    cap.release()
    print(f"Wrote {tmp} ({n_frames} frames)", file=sys.stderr)
    # Encode to h264 for ffmpeg concat.
    import subprocess

    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp),
            "-vf",
            "fps=30,format=yuv420p,setsar=1",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-an",
            str(out_path),
        ]
    )
    tmp.unlink(missing_ok=True)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--stills", required=True)
    p.add_argument("--app-phone", required=True)
    p.add_argument("--app-home", required=True)
    p.add_argument("--app-done", required=True)
    p.add_argument("--out-dir", required=True)
    args = p.parse_args()

    stills = Path(args.stills)
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    composite_still(
        stills / "family_walk_venue.png",
        Path(args.app_home),
        QUADS["walk"],
        out / "walk-comp.png",
    )
    composite_still(
        stills / "family_endcard_hero.png",
        Path(args.app_done),
        QUADS["end"],
        out / "end-comp.png",
    )
    composite_video(
        stills / "family_phone_closeup.png",
        Path(args.app_phone),
        QUADS["close"],
        out / "close-comp.mp4",
        start=3.85,
        duration=3.0,
    )
    print(f"Composited screens into {out}")


if __name__ == "__main__":
    main()
