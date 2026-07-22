"""Extract circular logo onto transparent background. Does not recolor artwork."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "src" / "assets" / "kavya-agri-clinic-logo.png"
DST = SRC


def is_near_white(r: int, g: int, b: int, a: int, thresh: int = 245) -> bool:
    return a > 200 and r >= thresh and g >= thresh and b >= thresh


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    pixels = im.load()

    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if not is_near_white(r, g, b, a):
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0
    radius = max(max_x - min_x, max_y - min_y) / 2.0 + 1.0
    feather = 1.5

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_px = out.load()

    for y in range(h):
        for x in range(w):
            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            dist = math.hypot(dx, dy)
            r, g, b, a = pixels[x, y]
            if dist <= radius - feather:
                out_px[x, y] = (r, g, b, a)
            elif dist <= radius + feather:
                t = (radius + feather - dist) / (2 * feather)
                t = max(0.0, min(1.0, t))
                out_px[x, y] = (r, g, b, int(a * t))

    pad = 2
    left = max(0, int(math.floor(cx - radius - pad)))
    top = max(0, int(math.floor(cy - radius - pad)))
    right = min(w, int(math.ceil(cx + radius + pad)))
    bottom = min(h, int(math.ceil(cy + radius + pad)))
    cropped = out.crop((left, top, right, bottom))

    cw, ch = cropped.size
    cp = cropped.load()
    print(f"size={w}x{h} bbox=({min_x},{min_y})-({max_x},{max_y})")
    print(f"center=({cx:.1f},{cy:.1f}) radius={radius:.1f} cropped={cw}x{ch}")
    for corner in ((0, 0), (cw - 1, 0), (0, ch - 1), (cw - 1, ch - 1)):
        print(f"corner {corner}: {cp[corner]}")

    cropped.save(DST, "PNG", optimize=True)
    print(f"saved {DST}")


if __name__ == "__main__":
    main()
