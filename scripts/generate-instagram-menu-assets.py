from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path.cwd()
OUTPUT_DIR = ROOT / "public" / "social"
FONT_PATH = ROOT / "src" / "app" / "fonts" / "Nunito-Variable.ttf"
LOGO_PATH = ROOT / "public" / "meeras-logo.jpg"
MARK_PATH = Path(
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


def font(size: int, weight: int = 700) -> ImageFont.FreeTypeFont:
    loaded = ImageFont.truetype(str(FONT_PATH), size)
    if hasattr(loaded, "set_variation_by_axes"):
        try:
            loaded.set_variation_by_axes([weight])
        except (AttributeError, OSError, ValueError):
            pass
    return loaded


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def tracking(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.FreeTypeFont, fill: str, spacing: int = 2) -> None:
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=fnt, fill=fill)
        x += text_size(draw, char, fnt)[0] + spacing


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill: str, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def add_background(canvas: Image.Image) -> ImageDraw.ImageDraw:
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((775, 260, 1385, 870), fill=WARM + "5c")
    draw.ellipse((-410, 1440, -50, 1800), fill=WARM + "4d")
    draw.rounded_rectangle((92, 88, 242, 96), radius=4, fill=RED)
    return draw


def place_brand(draw: ImageDraw.ImageDraw, logo: Image.Image, mark: Image.Image) -> None:
    logo_small = logo.resize((55, 55), Image.Resampling.LANCZOS).convert("RGB")
    mask = Image.new("L", (55, 55), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 54, 54), fill=255)
    # The caller composites the small logo before drawing text.
    draw._brand_logo = (logo_small, mask)  # type: ignore[attr-defined]
    draw.text((165, 174), "Meera's Cozy Kitchen", font=font(24, 900), fill=MUTED)
    mark_small = mark.copy()
    mark_small.thumbnail((132, 132), Image.Resampling.LANCZOS)
    draw._brand_mark = mark_small  # type: ignore[attr-defined]


def composite_brand(canvas: Image.Image, draw: ImageDraw.ImageDraw, logo: Image.Image, mark: Image.Image) -> None:
    logo_small = logo.resize((55, 55), Image.Resampling.LANCZOS).convert("RGB")
    mask = Image.new("L", (55, 55), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 54, 54), fill=255)
    canvas.paste(logo_small, (92, 145), mask)
    mark_small = mark.copy()
    mark_small.thumbnail((132, 132), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark_small, (880, 114))
    draw.text((165, 158), "Meera's Cozy Kitchen", font=font(24, 900), fill=MUTED)


def draw_header(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    logo: Image.Image,
    mark: Image.Image,
    title: list[str],
    lede: str,
    lede_y: int | None = None,
) -> None:
    composite_brand(canvas, draw, logo, mark)
    y = 270
    for line in title:
        draw.text((92, y), line, font=font(86, 950), fill=RED, spacing=0)
        y += 82
    draw.text((92, lede_y if lede_y is not None else y + 26), lede, font=font(31, 750), fill=MUTED)


def section_label(draw: ImageDraw.ImageDraw, x: int, y: int, value: str) -> None:
    tracking(draw, (x, y), value.upper(), font(22, 950), RED, 3)


def price_card(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, price: str) -> None:
    rounded(draw, (x, y, x + 280, y + 172), 26, WARM, MUTED, 2)
    draw.text((x + 24, y + 25), label, font=font(23, 900), fill=MUTED)
    draw.text((x + 24, y + 80), price, font=font(44, 950), fill=RED)


def list_row(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, name: str, meta: str, name_size: int = 25) -> None:
    draw.line((x, y + 50, x + width, y + 50), fill=WARM, width=1)
    draw.text((x, y + 9), name, font=font(name_size, 900), fill=INK)
    meta_font = font(20, 950)
    meta_width = text_size(draw, meta, meta_font)[0]
    draw.text((x + width - meta_width, y + 12), meta, font=meta_font, fill=RED)


def draw_panel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    rounded(draw, box, 28, BG, WARM, 2)


def footer(draw: ImageDraw.ImageDraw, left: str, page: str) -> None:
    draw.text((92, 1800), left, font=font(21, 800), fill=MUTED)
    tracking(draw, (882, 1798), page, font(20, 950), RED, 2)


def make_slide_one(logo: Image.Image, mark: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (1080, 1920), BG)
    draw = add_background(canvas)
    draw_header(canvas, draw, logo, mark, ["THE MENU"], "Warm celebration cakes, planned with care.", lede_y=460)

    section_label(draw, 92, 600, "Starting prices")
    price_card(draw, 92, 640, "4-inch cake", "$35")
    price_card(draw, 400, 640, "6-inch cake", "$60")
    price_card(draw, 708, 640, "8-inch cake", "$75")

    draw_panel(draw, (92, 880, 988, 1460))
    section_label(draw, 126, 914, "Cake flavours")
    section_label(draw, 570, 914, "Frosting flavours")
    flavour_rows = ["Chocolate", "Vanilla", "Almond", "Lemon", "Coconut"]
    for index, name in enumerate(flavour_rows):
        list_row(draw, 126, 962 + index * 58, 360, name, "Included")
    frosting_rows = [
        ("Chocolate", "Included"),
        ("Vanilla", "Included"),
        ("Almond", "Included"),
        ("Lemon", "Included"),
        ("Coconut", "Included"),
        ("Oreo Crunch", "+$5"),
        ("Dark Chocolate Ganache", "+$10"),
    ]
    for index, (name, meta) in enumerate(frosting_rows):
        list_row(draw, 570, 962 + index * 58, 384, name, meta, 23)
    list_row(draw, 570, 962 + 7 * 58, 384, "White Chocolate Ganache", "+$10", 23)

    footer(draw, "@meerascozykitchen  |  Brampton, Ontario", "01 / 02")
    return canvas.convert("RGB")


def make_slide_two(logo: Image.Image, mark: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (1080, 1920), BG)
    draw = add_background(canvas)
    draw_header(canvas, draw, logo, mark, ["MAKE IT", "YOURS"], "Choose your fillings, toppings, and final design details.")

    draw_panel(draw, (92, 600, 988, 1100))
    section_label(draw, 126, 634, "Fillings")
    section_label(draw, 570, 634, "Toppings")
    for index, name in enumerate(["Raspberry", "Blueberry", "Cherry", "Strawberry", "Apricot"]):
        list_row(draw, 126, 682 + index * 58, 360, name, "+$5")
    toppings = [
        "Dark Chocolate Ganache Drip",
        "White Chocolate Ganache Drip",
        "Fresh Raspberry",
        "Fresh Blueberry",
        "Fresh Strawberry",
        "Chopped Pistachio",
        "Chopped Almonds",
    ]
    for index, name in enumerate(toppings):
        list_row(draw, 570, 682 + index * 58, 384, name, "+$5", 22)

    rounded(draw, (92, 1160, 988, 1410), 22, WARM)
    note = "Starting prices include the selected cake size and any frosting marked Included. Paid frosting upgrades, fillings, toppings, and design complexity are added before Meera confirms the final quote."
    words = note.split()
    lines: list[str] = []
    current = ""
    note_font = font(22, 750)
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_size(draw, candidate, note_font)[0] > 850 and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    for index, line in enumerate(lines):
        draw.text((124, 1195 + index * 33), line, font=note_font, fill=MUTED)

    footer(draw, "@meerascozykitchen  |  DM to order", "02 / 02")
    return canvas.convert("RGB")


def make_highlight() -> Image.Image:
    canvas = Image.new("RGBA", (1080, 1080), BG)
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((54, 54, 1026, 1026), outline=RED, width=12)
    menu_font = font(160, 950)
    menu_box = draw.textbbox((0, 0), "MENU", font=menu_font)
    menu_width = menu_box[2] - menu_box[0]
    menu_height = menu_box[3] - menu_box[1]
    menu_x = (1080 - menu_width) // 2 - menu_box[0]
    menu_y = (1080 - menu_height) // 2 - menu_box[1]
    draw.text((menu_x, menu_y), "MENU", font=menu_font, fill=RED)
    return canvas.convert("RGB")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logo = Image.open(LOGO_PATH).convert("RGB")
    mark = Image.open(MARK_PATH).convert("RGBA")
    make_slide_one(logo, mark).save(OUTPUT_DIR / "meeras-menu-story-1.png", optimize=True)
    make_slide_two(logo, mark).save(OUTPUT_DIR / "meeras-menu-story-2.png", optimize=True)
    make_highlight().save(OUTPUT_DIR / "meeras-menu-highlight.png", optimize=True)
    shutil.copy2(MARK_PATH, OUTPUT_DIR / "meeras-cake-mark.png")
    print(f"Rendered assets to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
