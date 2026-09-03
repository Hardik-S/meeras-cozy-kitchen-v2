from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path.cwd()
OUTPUT_DIR = ROOT / "public" / "social"
FONT_PATH = ROOT / "src" / "app" / "fonts" / "Nunito-Variable.ttf"
MARK_PATH = ROOT / "public" / "social" / "meeras-cake-mark.png"
GENERATED_MARK_PATH = Path(
    os.environ.get(
        "CODEX_GENERATED_MARK_PATH",
        r"C:\Users\buybt\.codex\generated_images\01a0211d-72e9-7161-b0ab-4e92f63dc485\exec-45235b36-36e0-4e72-9688-09c49dcea726.png",
    )
)

BG = "#fff4e8"
INK = "#3b2f2f"
WARM = "#e7d3c1"
MUTED = "#60442e"
RED = "#9a1e1e"
SCALE = 2
WIDTH = 1050
HEIGHT = 600


def px(value: int | float) -> int:
    return round(value * SCALE)


def font(size: int, weight: int = 700) -> ImageFont.FreeTypeFont:
    loaded = ImageFont.truetype(str(FONT_PATH), px(size))
    if hasattr(loaded, "set_variation_by_axes"):
        try:
            loaded.set_variation_by_axes([weight])
        except (AttributeError, OSError, ValueError):
            pass
    return loaded


def text_width(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> int:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0]


def tracking(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.FreeTypeFont, fill: str, spacing: int = 2) -> None:
    x, y = px(xy[0]), px(xy[1])
    for char in text:
        draw.text((x, y), char, font=fnt, fill=fill)
        x += text_width(draw, char, fnt) + px(spacing)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill: str, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(tuple(px(value) for value in box), radius=px(radius), fill=fill, outline=outline, width=px(width))


def line(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: str, width: int = 1) -> None:
    draw.line(tuple(px(value) for value in xy), fill=fill, width=px(width))


def draw_instagram(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color: str) -> None:
    left, top = px(x), px(y)
    right, bottom = px(x + size), px(y + size)
    draw.rounded_rectangle((left, top, right, bottom), radius=px(7), outline=color, width=px(3))
    draw.ellipse((px(x + 7), px(y + 7), px(x + size - 7), px(y + size - 7)), outline=color, width=px(3))
    draw.ellipse((px(x + size - 11), px(y + 6), px(x + size - 5), px(y + 12)), fill=color)


def draw_globe(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color: str) -> None:
    draw.ellipse((px(x), px(y), px(x + size), px(y + size)), outline=color, width=px(3))
    draw.ellipse((px(x + size * 0.29), px(y), px(x + size * 0.71), px(y + size)), outline=color, width=px(2))
    line(draw, (x + 3, y + size // 2, x + size - 3, y + size // 2), color, 2)


def draw_envelope(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, height: int, color: str) -> None:
    draw.rounded_rectangle((px(x), px(y), px(x + width), px(y + height)), radius=px(3), outline=color, width=px(3))
    line(draw, (x + 3, y + 3, x + width // 2, y + height // 2 + 2), color, 2)
    line(draw, (x + width - 3, y + 3, x + width // 2, y + height // 2 + 2), color, 2)


def draw_pin(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color: str) -> None:
    draw.ellipse((px(x + size * 0.2), px(y), px(x + size * 0.8), px(y + size * 0.6)), outline=color, width=px(3))
    draw.polygon(
        [
            (px(x + size * 0.2), px(y + size * 0.35)),
            (px(x + size * 0.5), px(y + size)),
            (px(x + size * 0.8), px(y + size * 0.35)),
        ],
        outline=color,
        fill=None,
    )
    draw.ellipse((px(x + size * 0.42), px(y + size * 0.22), px(x + size * 0.58), px(y + size * 0.38)), fill=color)


def crop_mark() -> Image.Image:
    source = Image.open(MARK_PATH if MARK_PATH.exists() else GENERATED_MARK_PATH).convert("RGBA")
    bbox = source.getbbox()
    return source.crop(bbox) if bbox else source


def place_mark(canvas: Image.Image, mark: Image.Image, x: int, y: int, size: int) -> None:
    icon = mark.copy()
    icon.thumbnail((px(size), px(size)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, (px(x) + (px(size) - icon.width) // 2, px(y) + (px(size) - icon.height) // 2))


def finish(canvas: Image.Image, output_path: Path) -> None:
    final = canvas.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    final.save(output_path, optimize=True, dpi=(300, 300))


def make_front(mark: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (px(WIDTH), px(HEIGHT)), BG)
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((px(720), px(-135), px(1280), px(425)), outline=RED, width=px(6))
    draw.ellipse((px(740), px(65), px(990), px(315)), fill=WARM + "70")
    draw.rounded_rectangle((px(78), px(65), px(238), px(71)), radius=px(3), fill=RED)
    draw.text((px(80), px(165)), "MEERA'S", font=font(62, 950), fill=RED)
    draw.text((px(82), px(235)), "COZY KITCHEN", font=font(34, 900), fill=MUTED)
    draw.text((px(82), px(315)), "Warm celebration cakes,", font=font(23, 750), fill=MUTED)
    draw.text((px(82), px(347)), "planned with care.", font=font(23, 750), fill=MUTED)
    tracking(draw, (82, 492), "CUSTOM CAKES + CELEBRATIONS", font(15, 950), RED, 2)
    place_mark(canvas, mark, 765, 92, 190)
    return canvas


def contact_row(draw: ImageDraw.ImageDraw, icon: str, y: int, label: str, value: str) -> None:
    icon_x = 94
    if icon == "instagram":
        draw_instagram(draw, icon_x, y + 2, 28, RED)
    elif icon == "globe":
        draw_globe(draw, icon_x, y + 2, 28, RED)
    elif icon == "email":
        draw_envelope(draw, icon_x, y + 5, 29, 22, RED)
    else:
        draw_pin(draw, icon_x, y + 1, 29, RED)
    draw.text((px(145), px(y - 1)), label.upper(), font=font(13, 950), fill=MUTED)
    draw.text((px(145), px(y + 17)), value, font=font(21, 850), fill=INK)


def make_back() -> Image.Image:
    canvas = Image.new("RGBA", (px(WIDTH), px(HEIGHT)), WARM)
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((px(825), px(-205), px(1260), px(230)), fill=RED + "20")
    rounded(draw, (55, 42, 995, 558), 24, BG, MUTED, 2)
    draw.rounded_rectangle((px(55), px(42), px(69), px(558)), radius=px(7), fill=RED)
    tracking(draw, (94, 83), "CONTACT", font(16, 950), RED, 2)
    draw.text((px(94), px(115)), "Let's make something sweet.", font=font(37, 950), fill=INK)
    tracking(draw, (94, 173), "CUSTOM CAKES + CELEBRATIONS", font(14, 950), MUTED, 2)
    contact_row(draw, "instagram", 228, "Instagram", "@meerascozykitchen")
    contact_row(draw, "globe", 304, "Website", "meerascozykitchen.ca")
    contact_row(draw, "email", 380, "Email", "meerascozykitchen@gmail.com")
    contact_row(draw, "pin", 456, "Location", "Brampton, Ontario")
    return canvas


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    mark = crop_mark()
    finish(make_front(mark), OUTPUT_DIR / "meeras-business-card-front.png")
    finish(make_back(), OUTPUT_DIR / "meeras-business-card-back.png")
    if not MARK_PATH.exists() and GENERATED_MARK_PATH.exists():
        shutil.copy2(GENERATED_MARK_PATH, MARK_PATH)
    print(f"Rendered business card assets to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
