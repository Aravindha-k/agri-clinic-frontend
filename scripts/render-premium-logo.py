"""
Build a premium digital hero PNG of the existing Kavya Agri Clinic logo.

Preserves artwork, colours, proportions, and text.
Adds soft glass material + studio lighting only.
Output: 4096x4096 transparent PNG.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "assets" / "kavya-agri-clinic-logo.png"
DST = ROOT / "src" / "assets" / "kavya-agri-clinic-logo-premium.png"
SIZE = 4096


def load_circle(src: Path, size: int) -> Image.Image:
    im = Image.open(src).convert("RGBA")
    return im.resize((size, size), Image.Resampling.LANCZOS)


def circle_mask(size: int, radius_ratio: float = 0.498, feather: int = 2) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(m)
    pad = int(size * (0.5 - radius_ratio))
    draw.ellipse([pad, pad, size - pad, size - pad], fill=255)
    if feather > 0:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return m


def soft_glass_grade(im: Image.Image) -> Image.Image:
    """Slight acrylic polish — no hue shift."""
    alpha = im.split()[3]
    rgb = im.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.03)
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.12)
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def fade_alpha(layer: Image.Image, factor: float) -> Image.Image:
    r, g, b, a = layer.split()
    a = a.point(lambda p: int(p * factor))
    return Image.merge("RGBA", (r, g, b, a))


def build_rim_light(alpha: Image.Image, size: int) -> Image.Image:
    outer = alpha.filter(ImageFilter.MaxFilter(9))
    inner = alpha.filter(ImageFilter.MinFilter(7))
    ring = ImageChops.subtract(outer, inner)
    ring = ImageChops.multiply(ring, alpha)
    ring = ring.filter(ImageFilter.GaussianBlur(1.2))
    ring = ImageEnhance.Brightness(ring).enhance(0.42)
    rim = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    rim.putalpha(ring)
    return rim


def build_ambient_occlusion(alpha: Image.Image, size: int) -> Image.Image:
    blur = alpha.filter(ImageFilter.GaussianBlur(18))
    ao = ImageChops.subtract(blur, alpha)
    ao = ImageEnhance.Brightness(ao).enhance(0.28)
    ao = ao.filter(ImageFilter.GaussianBlur(6))
    shadow = Image.new("RGBA", (size, size), (5, 18, 10, 0))
    shadow.putalpha(ao)
    return fade_alpha(shadow, 0.55)


def build_inner_depth(alpha: Image.Image, size: int) -> Image.Image:
    """Very soft acrylic thickness — white lift only, no green wash."""
    depth = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(depth)
    cx = cy = size // 2

    for scale, a, oy in (
        (0.70, 10, -int(size * 0.025)),
        (0.48, 12, -int(size * 0.015)),
        (0.30, 8, -int(size * 0.01)),
    ):
        r = int(size * 0.5 * scale)
        draw.ellipse([cx - r, cy - r + oy, cx + r, cy + r + oy], fill=(255, 255, 255, a))

    # Soft dark ring for contact depth (near-black, not tinted)
    shade = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for scale, a in ((0.97, 22), (0.92, 12)):
        r = int(size * 0.5 * scale)
        sd.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            outline=(0, 0, 0, a),
            width=max(6, size // 220),
        )

    depth = Image.alpha_composite(depth, shade)
    depth = depth.filter(ImageFilter.GaussianBlur(40))
    r, g, b, a = depth.split()
    a = ImageChops.multiply(a, alpha)
    return fade_alpha(Image.merge("RGBA", (r, g, b, a)), 0.50)


def build_studio_specular(alpha: Image.Image, size: int) -> Image.Image:
    spec = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(spec)
    draw.ellipse(
        [int(size * 0.18), int(size * 0.15), int(size * 0.56), int(size * 0.46)],
        fill=90,
    )
    bloom = Image.new("L", (size, size), 0)
    ImageDraw.Draw(bloom).ellipse(
        [int(size * 0.12), int(size * 0.11), int(size * 0.62), int(size * 0.52)],
        fill=28,
    )
    bloom = bloom.filter(ImageFilter.GaussianBlur(52))
    spec = spec.filter(ImageFilter.GaussianBlur(30))
    spec = ImageChops.lighter(spec, bloom)
    spec = ImageChops.multiply(spec, alpha)
    layer = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    layer.putalpha(spec)
    return fade_alpha(layer, 0.70)


def build_edge_bevel(alpha: Image.Image, size: int) -> Image.Image:
    eroded = alpha.filter(ImageFilter.MinFilter(5))
    edge = ImageChops.subtract(alpha, eroded)
    edge = edge.filter(ImageFilter.GaussianBlur(0.9))

    grad = Image.new("L", (size, size), 0)
    ImageDraw.Draw(grad).ellipse(
        [int(size * -0.05), int(size * -0.08), int(size * 0.52), int(size * 0.52)],
        fill=200,
    )
    grad = grad.filter(ImageFilter.GaussianBlur(100))
    bevel_a = ImageChops.multiply(edge, grad)
    bevel_a = ImageEnhance.Brightness(bevel_a).enhance(0.55)
    bevel = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    bevel.putalpha(bevel_a)
    return bevel


def build_micro_highlight_band(alpha: Image.Image, size: int) -> Image.Image:
    strip = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(strip)
    cx = size // 2
    for i, a in enumerate((0, 6, 18, 36, 18, 6, 0)):
        x0 = cx - 80 + i * 26
        d.rectangle([x0, 0, x0 + 26, size], fill=a)
    strip = strip.filter(ImageFilter.GaussianBlur(20))
    strip = strip.rotate(-22, resample=Image.Resampling.BICUBIC, expand=False)
    strip = ImageChops.multiply(strip, alpha)
    layer = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    layer.putalpha(strip)
    return fade_alpha(layer, 0.28)


def main() -> None:
    print(f"Loading {SRC}")
    base = load_circle(SRC, SIZE)
    circle = circle_mask(SIZE)
    alpha = ImageChops.multiply(base.split()[3], circle)
    base.putalpha(alpha)

    # Reference brand green before grading
    src_centre = base.getpixel((SIZE // 2, SIZE // 2))
    print(f"Source centre: {src_centre}")

    result = soft_glass_grade(base)

    # Lighting stack — white/black only for depth; no green wash
    result = Image.alpha_composite(result, build_inner_depth(alpha, SIZE))
    result = Image.alpha_composite(result, build_ambient_occlusion(alpha, SIZE))
    result = Image.alpha_composite(result, build_studio_specular(alpha, SIZE))
    result = Image.alpha_composite(result, build_micro_highlight_band(alpha, SIZE))
    result = Image.alpha_composite(result, build_rim_light(alpha, SIZE))
    result = Image.alpha_composite(result, build_edge_bevel(alpha, SIZE))

    r, g, b, a = result.split()
    a = ImageChops.multiply(a, circle)
    result = Image.merge("RGBA", (r, g, b, a))

    px = result.load()
    for corner in ((0, 0), (SIZE - 1, 0), (0, SIZE - 1), (SIZE - 1, SIZE - 1)):
        assert px[corner][3] == 0, f"Corner not transparent: {corner}={px[corner]}"

    centre = px[SIZE // 2, SIZE // 2]
    print(f"Result centre: {centre}")
    # Brand green must stay close to source (allow tiny lift from specular/depth)
    assert abs(centre[0] - src_centre[0]) < 25, f"Red shifted too far: {centre} vs {src_centre}"
    assert abs(centre[1] - src_centre[1]) < 30, f"Green shifted too far: {centre} vs {src_centre}"
    assert abs(centre[2] - src_centre[2]) < 25, f"Blue shifted too far: {centre} vs {src_centre}"

    result.save(DST, "PNG", optimize=True)
    print(f"Saved {DST}")
    print(f"Size: {result.size[0]}x{result.size[1]}")
    print(f"Bytes: {DST.stat().st_size / (1024 * 1024):.2f} MB")


if __name__ == "__main__":
    main()
