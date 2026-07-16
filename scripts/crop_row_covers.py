"""
Generate 16:9 row-cover images for portrait project photos.

Focal priority: manual override -> OpenCV face detection -> gradient saliency centroid.

Run from repo root:
  python scripts/crop_row_covers.py
"""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS = os.path.join(ROOT, "assets", "projects")

TARGET_W = 1200
TARGET_H = 675
TARGET_AR = TARGET_W / TARGET_H
JPEG_QUALITY = 90

# Normalized focal overrides (fx, fy). Set to None to auto-detect.
FOCAL_OVERRIDES: dict[str, tuple[float, float] | None] = {
    "g34l-programming.jpg": (0.42, 0.58),
    "beehive-farm.jpg": None,
}

JOBS = [
    ("g34l-programming.jpg", "g34l-row-cover.jpg"),
    ("beehive-farm.jpg", "beehive-row-cover.jpg"),
]


def load_image(path: str) -> Image.Image:
    img = Image.open(path)
    return ImageOps.exif_transpose(img).convert("RGB")


def detect_face_focal(img: Image.Image) -> tuple[float, float] | None:
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None

    arr = np.array(img)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        return None

    # Largest face wins.
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    fx = (x + w / 2) / img.width
    fy = (y + h / 2) / img.height
    return (fx, fy)


def detect_saliency_focal(img: Image.Image) -> tuple[float, float]:
    small = img.copy()
    small.thumbnail((320, 320), Image.Resampling.LANCZOS)
    gray = small.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    px = edges.load()
    sw, sh = small.size

    total = 0.0
    sum_x = 0.0
    sum_y = 0.0
    for y in range(sh):
        for x in range(sw):
            w = px[x, y]
            total += w
            sum_x += x * w
            sum_y += y * w

    if total <= 0:
        return (0.5, 0.5)

    return (sum_x / total / sw, sum_y / total / sh)


def resolve_focal(img: Image.Image, source_name: str) -> tuple[float, float]:
    override = FOCAL_OVERRIDES.get(source_name)
    if override is not None:
        return override

    face = detect_face_focal(img)
    if face is not None:
        print(f"  focal: face at ({face[0]:.3f}, {face[1]:.3f})")
        return face

    sal = detect_saliency_focal(img)
    print(f"  focal: saliency at ({sal[0]:.3f}, {sal[1]:.3f})")
    return sal


def crop_to_aspect(img: Image.Image, fx: float, fy: float) -> Image.Image:
    w, h = img.size
    src_ar = w / h

    if src_ar > TARGET_AR:
        crop_h = h
        crop_w = int(round(h * TARGET_AR))
    else:
        crop_w = w
        crop_h = int(round(w / TARGET_AR))

    center_x = fx * w
    center_y = fy * h
    left = int(round(center_x - crop_w / 2))
    top = int(round(center_y - crop_h / 2))
    left = max(0, min(left, w - crop_w))
    top = max(0, min(top, h - crop_h))

    box = (left, top, left + crop_w, top + crop_h)
    cropped = img.crop(box)
    if cropped.size != (TARGET_W, TARGET_H):
        cropped = cropped.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    return cropped


def process_job(source: str, dest: str) -> None:
    src_path = os.path.join(PROJECTS, source)
    dest_path = os.path.join(PROJECTS, dest)
    if not os.path.isfile(src_path):
        print(f"skip (missing): {source}")
        return

    img = load_image(src_path)
    print(f"{source} ({img.width}x{img.height})")
    focal = resolve_focal(img, source)
    if FOCAL_OVERRIDES.get(source) is not None:
        print(f"  focal: override ({focal[0]:.3f}, {focal[1]:.3f})")

    out = crop_to_aspect(img, focal[0], focal[1])
    out.save(dest_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
    print(f"  wrote {dest} ({out.width}x{out.height})")


def main() -> int:
    os.chdir(ROOT)
    for source, dest in JOBS:
        process_job(source, dest)
    return 0


if __name__ == "__main__":
    sys.exit(main())
