"""Builds character sprite sheets in public/sprites/ from the art in tiles/.

    python scripts/make-sprites.py

player.png  : tiles/character_base_16x16.png coloured (hair, hoodie, jeans) and
              scaled x2 with nearest neighbour -> 128x128, 4x4 frames of 32x32.
              Rows: 0 down, 1 up, 2 right, 3 left. Columns: idle, step, idle, step.
teacher.png : tiles/Characters/office_worker/office_worker.png as is (32x32 frames,
              rows idle_down, idle_left, idle_right, idle_up, walk_down, walk_left, walk_right, walk_up).
mieciu.png  : the same sheet recoloured into Pan Mieciu, the janitor (grey hair, blue-grey
              overalls). Same layout as teacher.png.
"""
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TILES = ROOT / "tiles"
OUT = ROOT / "public" / "sprites"

OUTLINE = (20, 20, 26, 255)
SKIN = (246, 187, 148, 255)
HAIR = (78, 50, 32, 255)
HOODIE = (46, 120, 72, 255)
HOODIE_DARK = (30, 84, 50, 255)
JEANS = (52, 64, 104, 255)

DOWN, UP, RIGHT, LEFT = 0, 1, 2, 3


def colour_frame(src, ox, oy, direction):
    """Recolour one 16x16 frame (outline + skin only) into the player."""
    frame = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    rows = [y for y in range(16) if any(src.getpixel((ox + x, oy + y))[3] for x in range(16))]
    top = rows[0]  # frames bob by 1 px, so work relative to the head top
    for y in range(16):
        for x in range(16):
            p = src.getpixel((ox + x, oy + y))
            if p[3] == 0:
                continue
            if p[:3] == (0, 0, 0):
                frame.putpixel((x, y), OUTLINE)
                continue
            ry = y - top
            if ry <= 7:  # head
                hair = ry <= 2
                if direction == UP:
                    hair = True
                elif direction == RIGHT:
                    hair = ry <= 2 or (ry <= 5 and x <= 5)
                elif direction == LEFT:
                    hair = ry <= 2 or (ry <= 5 and x >= 10)
                frame.putpixel((x, y), HAIR if hair else SKIN)
            elif ry <= 11:  # hoodie, darker sides
                side = x in (2, 3, 12, 13)
                frame.putpixel((x, y), HOODIE_DARK if side else HOODIE)
            else:  # legs
                frame.putpixel((x, y), JEANS)
    return frame


def make_player():
    src = Image.open(TILES / "character_base_16x16.png").convert("RGBA")
    sheet = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for row in range(4):
        for col in range(4):
            sheet.paste(colour_frame(src, col * 16, row * 16, row), (col * 16, row * 16))
    sheet = sheet.resize((128, 128), Image.NEAREST)
    sheet.save(OUT / "player.png")


def make_teacher():
    shutil.copy(TILES / "Characters" / "office_worker" / "office_worker.png", OUT / "teacher.png")


# office worker colour -> Pan Mieciu colour
MIECIU = {
    (107, 68, 41): (156, 156, 162),  # hair -> grey
    (84, 55, 48): (112, 112, 120),
    (58, 44, 38): (78, 78, 86),
    (244, 244, 240): (82, 102, 136),  # white shirt -> overalls
    (193, 190, 195): (62, 78, 106),
    (61, 114, 196): (46, 58, 82),  # tie -> overall strap
    (62, 68, 88): (70, 88, 118),  # trousers -> overalls
    (55, 57, 80): (54, 68, 94),
    (52, 51, 75): (48, 60, 84),
}


def make_mieciu():
    src = Image.open(TILES / "Characters" / "office_worker" / "office_worker.png").convert("RGBA")
    px = src.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in MIECIU:
                px[x, y] = (*MIECIU[(r, g, b)], a)
    src.save(OUT / "mieciu.png")


if __name__ == "__main__":
    make_player()
    make_teacher()
    make_mieciu()
    print("sprites written to", OUT)
