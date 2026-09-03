from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path.cwd()
OUTPUT_PATH = ROOT / "public" / "social" / "meeras-profile-picture.png"
MARK_PATH = ROOT / "public" / "social" / "meeras-cake-mark.png"
FONT_PATH = ROOT / "src" / "app" / "fonts" / "Nunito-Variable.ttf"

BG = "#fff4e8"
RED = "#9a1e1e"
SCALE = 2
SIZE = 1080


def px(value: int | float) -> int:
    return round(value * SCALE)


def font(size: int, weight: int = 950) -> ImageFont.FreeTypeFont:
    loaded = ImageFont.truetype(str(FONT_PATH), px(size))
    if hasattr(loaded, "set_variation_by_axes"):
        try:
            loaded.set_variation_by_axes([weight])
        except (AttributeError, OSError, ValueError):
            pass
    return loaded


def arc_text(
    canvas: Image.Image,
    text: str,
    radius: int,
    center_angle: float,
    text_font: ImageFont.FreeTypeFont,
    tracking: int,
    direction: int,
) -> None:
    draw = ImageDraw.Draw(canvas)
    advances = [draw.textlength(char, font=text_font) for char in text]
    total_width = sum(advances) + px(tracking) * (len(text) - 1)
    span = total_width / px(radius)
    start = math.radians(center_angle) - direction * span / 2
    cursor = 0.0
    center = px(SIZE / 2)
    for char, advance in zip(text, advances):
        char_center = cursor + advance / 2
        angle = start + direction * char_center / px(radius)
        glyph_box = draw.textbbox((0, 0), char, font=text_font)
        glyph_width = glyph_box[2] - glyph_box[0]
        glyph_height = glyph_box[3] - glyph_box[1]
        padding = px(14)
        glyph = Image.new("RGBA", (glyph_width + padding * 2, glyph_height + padding * 2), (0, 0, 0, 0))
        glyph_draw = ImageDraw.Draw(glyph)
        glyph_draw.text((padding - glyph_box[0], padding - glyph_box[1]), char, font=text_font, fill=RED)
        if direction == 1:
            rotation = math.degrees(angle) + 90
        else:
            rotation = math.degrees(angle) - 90
        rotated = glyph.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
        x = round(center + px(radius) * math.cos(angle) - rotated.width / 2)
        y = round(center + px(radius) * math.sin(angle) - rotated.height / 2)
        canvas.alpha_composite(rotated, (x, y))
        cursor += advance + px(tracking)


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (px(SIZE), px(SIZE)), BG)
    draw = ImageDraw.Draw(canvas)
    inset = 34
    draw.ellipse((px(inset), px(inset), px(SIZE - inset), px(SIZE - inset)), outline=RED, width=px(7))

    arc_text(canvas, "MEERA'S", 438, -90, font(84, 950), 8, 1)
    arc_text(canvas, "COZY KITCHEN", 438, 90, font(74, 950), 8, -1)

    mark = Image.open(MARK_PATH).convert("RGBA")
    bbox = mark.getbbox()
    if bbox:
        mark = mark.crop(bbox)
    mark.thumbnail((px(540), px(540)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, ((px(SIZE) - mark.width) // 2, (px(SIZE) - mark.height) // 2))

    final = canvas.convert("RGB").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    final.save(OUTPUT_PATH, optimize=True, dpi=(300, 300))
    print(f"Rendered profile picture to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
