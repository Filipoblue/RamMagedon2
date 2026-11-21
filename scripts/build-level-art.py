"""Builds the PNG art of a level from its ASCII map and the tiles in tiles/.

    python scripts/build-level-art.py jammed       -> public/sprites/level_jammed.png

The map is read from src/level/rooms.js (by `id`, through node). Run it again after
changing the map. Look matches public/sprites/level2.png (level 1): grey wall tops,
light wall faces, carpet floor; safe floor (",") uses light vinyl with a green edge.

Map chars -> art:
    #  wall (top, or light face when there is floor below it)
    S  filing cabinet (a tall bookcase when 3+ tiles high)
    =  desk (runs of 2) or a plant (single tile)
    1 2  desk with a computer (+ chair below)
    T  ping-pong table   O  round pillar   B  sofa   Y  wooden table   H  chair (faces its table)
    D  door frame (the door itself is drawn in game)     K  nothing (keypad drawn in game)
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
TILES = ROOT / "tiles"
T = 32

WALL_TOP = (129, 127, 131)
WALL_FACE = (211, 206, 203)
WALL_LINE = (77, 76, 79)
FACE_LINE = (94, 90, 94)
SAFE_EDGE = (110, 190, 140)

WALLISH = set("#K")

# per level look
STYLES = {
    "jammed": {"floor": "carpet", "desk_pcs": True},
    # closed_doors: (x, y0, y1) decorative closed doors in a vertical wall
    "lounge": {"floor": "wood", "desk_pcs": False, "closed_doors": [(28, 1, 2)]},
}


def components(at, cols, rows, ch):
    """Bounding boxes (x0, y0, x1, y1) of the connected areas of `ch` tiles."""
    seen, out = set(), []
    for y in range(rows):
        for x in range(cols):
            if at(x, y) != ch or (x, y) in seen:
                continue
            stack, box = [(x, y)], [x, y, x, y]
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                box = [min(box[0], cx), min(box[1], cy), max(box[2], cx), max(box[3], cy)]
                for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                    n = (cx + dx, cy + dy)
                    if n not in seen and at(*n) == ch:
                        seen.add(n)
                        stack.append(n)
            out.append(tuple(box))
    return out


def furniture(ch, w, h, seed):
    """Procedural pixel-art pieces (w, h in px) for things the tile packs do not have."""
    img = Image.new("RGBA", (w, h + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([3, 8, w - 1, h + 7], fill=(0, 0, 0, 70))  # shadow
    if ch == "T":  # ping-pong table: blue-green top, white lines, net across the middle
        d.rectangle([0, 0, w - 4, h - 4], fill=(30, 86, 112), outline=(20, 40, 52), width=2)
        d.rectangle([4, 4, w - 8, h - 8], outline=(235, 240, 240), width=2)
        d.line([4, (h - 4) // 2, w - 8, (h - 4) // 2], fill=(235, 240, 240), width=1)
        mx = (w - 4) // 2
        d.rectangle([mx - 2, -0, mx + 2, h - 4], fill=(60, 64, 70))
        d.rectangle([mx - 1, 0, mx + 1, h - 4], fill=(225, 228, 230))
        d.rectangle([0, h - 6, w - 4, h - 1], fill=(22, 60, 80))  # front edge
    elif ch == "O":  # round pillar, hatched like on the sketch
        d.ellipse([2, 2, w - 4, h - 4], fill=(168, 166, 174), outline=(60, 58, 66), width=2)
        for i in range(-h, w, 7):
            d.line([i, h - 6, i + h - 8, 4], fill=(120, 118, 128), width=1)
        d.ellipse([2, 2, w - 4, h - 4], outline=(60, 58, 66), width=2)
        # cut the hatch outside the circle
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).ellipse([2, 2, w - 4, h - 4], fill=255)
        mask.paste(255, (0, h - 4, w, h + 8))
        img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", img.size, 0), mask))
    elif ch == "B":  # sofa against the bottom wall: backrest at the bottom, armrests
        d.rounded_rectangle([0, 0, w - 4, h - 2], 6, fill=(214, 120, 48), outline=(120, 60, 24), width=2)
        d.rectangle([2, h - 14, w - 6, h - 4], fill=(176, 92, 34))
        d.rectangle([2, 2, 12, h - 4], fill=(186, 98, 38))
        d.rectangle([w - 16, 2, w - 6, h - 4], fill=(186, 98, 38))
        n = max(2, (w - 32) // 64)
        for i in range(1, n):
            x = 14 + (w - 32) * i // n
            d.line([x, 6, x, h - 16], fill=(160, 84, 30), width=2)
    elif ch == "Y":  # wooden table
        d.rectangle([0, 0, w - 4, h - 4], fill=(156, 104, 62), outline=(90, 56, 30), width=2)
        for y in range(10, h - 8, 10):
            d.line([3, y, w - 7, y], fill=(140, 92, 54), width=1)
        d.rectangle([0, h - 8, w - 4, h - 3], fill=(112, 72, 40))
    elif ch == "S":  # tall bookcase with book spines
        d.rectangle([0, 0, w - 4, h - 2], fill=(110, 74, 44), outline=(64, 40, 22), width=2)
        rnd = seed
        colors = [(170, 50, 50), (50, 90, 160), (60, 140, 80), (210, 170, 60), (120, 70, 140), (220, 220, 210)]
        for sy in range(6, h - 12, 26):
            d.rectangle([4, sy + 20, w - 8, sy + 22], fill=(64, 40, 22))
            x = 6
            while x < w - 12:
                rnd = (rnd * 9301 + 49297) % 233280
                bw = 3 + rnd % 4
                bh = 12 + rnd % 7
                d.rectangle([x, sy + 20 - bh, x + bw, sy + 19], fill=colors[rnd % len(colors)])
                x += bw + 1
    return img
FLOOR_UNDER = set(".,PSD=12") | set("abcdefghijklmnopqrstuvwxyz")


def load_map(level_id):
    js = (
        "import('./src/level/rooms.js').then(m => {"
        f"const l = m.LEVELS.find(l => l.id === '{level_id}');"
        "if (!l) { console.error('no level ' + process.argv[1]); process.exit(1); }"
        "console.log(JSON.stringify(l.map)); })"
    )
    out = subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def atlas(name):
    meta = json.loads((TILES / "Props" / "_Atlases" / f"{name}.json").read_text())
    img = Image.open(TILES / "Props" / "_Atlases" / meta["image"]).convert("RGBA")
    return img, meta["frames"]


class Props:
    def __init__(self):
        self.sheets = {}
        for n in ["props_desks", "props_tech", "props_seating", "props_storage", "props_decor"]:
            img, frames = atlas(n)
            for key, f in frames.items():
                self.sheets[key] = (img, f)

    def frame(self, key):
        img, f = self.sheets[key]
        return img.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), f["anchor"]


def build(level_id):
    style = STYLES.get(level_id, STYLES["jammed"])
    grid = [list(r) for r in load_map(level_id)]
    # the player start inside a safe zone is safe floor too (same rule as src/level/level.js)
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == "P" and any(0 <= y + dy < len(grid) and 0 <= x + dx < len(row) and grid[y + dy][x + dx] == ","
                                 for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]):
                grid[y][x] = ","
    rows, cols = len(grid), len(grid[0])
    at = lambda x, y: grid[y][x] if 0 <= y < rows and 0 <= x < cols else "#"
    out = Image.new("RGBA", (cols * T, rows * T), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)

    floors = Image.open(TILES / "Tilesets" / "Floors" / "office_floors_tileset.png").convert("RGBA")
    wood = floors.crop((0, 0, 32, 32))
    carpet = floors.crop((32, 0, 64, 32))
    vinyl = floors.crop((64, 0, 96, 32))
    base_floor = wood if style["floor"] == "wood" else carpet

    # ---- floor ----
    for y in range(rows):
        for x in range(cols):
            ch = at(x, y)
            if ch in WALLISH:
                continue
            out.paste(vinyl if ch == "," else base_floor, (x * T, y * T))
    # green edge where safe floor meets the open floor (teachers stop here)
    for y in range(rows):
        for x in range(cols):
            if at(x, y) != ",":
                continue
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                n = at(x + dx, y + dy)
                if not (n == "." or n.islower()):  # only towards the open floor
                    continue
                x0, y0 = x * T, y * T
                if dx == 1:
                    draw.rectangle([x0 + T - 3, y0, x0 + T - 1, y0 + T - 1], fill=SAFE_EDGE)
                if dx == -1:
                    draw.rectangle([x0, y0, x0 + 2, y0 + T - 1], fill=SAFE_EDGE)
                if dy == 1:
                    draw.rectangle([x0, y0 + T - 3, x0 + T - 1, y0 + T - 1], fill=SAFE_EDGE)
                if dy == -1:
                    draw.rectangle([x0, y0, x0 + T - 1, y0 + 2], fill=SAFE_EDGE)

    # ---- walls: grey top, light face when floor is below ----
    for y in range(rows):
        for x in range(cols):
            if at(x, y) not in WALLISH:
                continue
            x0, y0 = x * T, y * T
            face = at(x, y + 1) in FLOOR_UNDER
            if face:
                top_band = 10 if at(x, y - 1) not in WALLISH else 0
                draw.rectangle([x0, y0, x0 + T - 1, y0 + T - 1], fill=WALL_FACE)
                if top_band:
                    draw.rectangle([x0, y0, x0 + T - 1, y0 + top_band - 1], fill=WALL_TOP)
                draw.rectangle([x0, y0 + T - 2, x0 + T - 1, y0 + T - 1], fill=FACE_LINE)
            else:
                draw.rectangle([x0, y0, x0 + T - 1, y0 + T - 1], fill=WALL_TOP)
            # outlines towards the floor on the sides / top
            if at(x - 1, y) not in WALLISH:
                draw.rectangle([x0, y0, x0 + 1, y0 + T - 1], fill=WALL_LINE)
            if at(x + 1, y) not in WALLISH:
                draw.rectangle([x0 + T - 2, y0, x0 + T - 1, y0 + T - 1], fill=WALL_LINE)
            if at(x, y - 1) not in WALLISH:
                draw.rectangle([x0, y0, x0 + T - 1, y0 + 1], fill=WALL_LINE)

    # door frames (the sliding door is drawn by the game)
    for y in range(rows):
        for x in range(cols):
            if at(x, y) != "D":
                continue
            if y == 0 or y == rows - 1:
                # door in a top / bottom wall: dark doorway, frame at both ends of the door
                draw.rectangle([x * T, y * T, x * T + T - 1, y * T + T - 1], fill=(52, 50, 58))
                if at(x - 1, y) != "D":
                    draw.rectangle([x * T, y * T, x * T + 3, y * T + T - 1], fill=WALL_LINE)
                if at(x + 1, y) != "D":
                    draw.rectangle([x * T + T - 4, y * T, x * T + T - 1, y * T + T - 1], fill=WALL_LINE)
            else:
                draw.rectangle([x * T, y * T, x * T + 3, y * T + T - 1], fill=WALL_LINE)
                draw.rectangle([x * T + T - 4, y * T, x * T + T - 1, y * T + T - 1], fill=WALL_LINE)

    # decorative closed doors (the way the player came in)
    for (x, y0, y1) in style.get("closed_doors", []):
        x0, top, bottom = x * T + 8, y0 * T + 4, (y1 + 1) * T - 4
        draw.rectangle([x0, top, x0 + 20, bottom], fill=(128, 86, 52), outline=WALL_LINE, width=2)
        draw.rectangle([x0 + 4, top + 6, x0 + 16, (top + bottom) // 2 - 4], outline=(96, 62, 36), width=2)
        draw.rectangle([x0 + 4, (top + bottom) // 2 + 4, x0 + 16, bottom - 6], outline=(96, 62, 36), width=2)
        draw.rectangle([x0 + 15, (top + bottom) // 2 - 2, x0 + 18, (top + bottom) // 2 + 2], fill=(220, 190, 90))

    # ---- props, collected then drawn top to bottom ----
    props = Props()
    items = []  # (sort_y, sort_x, key, x_px, y_px)

    def place(key, tx, ty, dy=0, order=0.0):
        img, anchor = props.frame(key)
        items.append((ty + order, tx, img, tx * T - anchor["x"], ty * T - anchor["y"] + dy))

    used = set()
    plants = ["office_plant_front", "tall_plant_front"]

    def tall_s(x, y):
        """Part of a vertical run of 3+ cabinets (drawn as one bookcase)."""
        run = 1
        for dy in (-1, 1):
            yy = y + dy
            while at(x, yy) == "S":
                run += 1
                yy += dy
        return run >= 3
    for y in range(rows):
        x = 0
        while x < cols:
            ch = at(x, y)
            if ch in "=12" and (x, y) not in used:
                # horizontal run of desk-like tiles
                run = []
                while at(x + len(run), y) in "=12":
                    run.append(x + len(run))
                i = 0
                while i < len(run):
                    if i + 1 < len(run):
                        a, b = run[i], run[i + 1]
                        place("office_desk_front", a, y)
                        for c in (a, b):
                            if at(c, y) in "12":
                                place("computer_front", c, y, dy=-14, order=0.1)
                                if at(c, y + 1) not in WALLISH:
                                    place("office_chair_back", c, y + 1, dy=-6, order=0.2)
                        if style["desk_pcs"] and not any(at(c, y) in "12" for c in (a, b)) and y > 2:
                            # classroom desk: a computer on the left
                            place("computer_front", a, y, dy=-14, order=0.1)
                        used.update({(a, y), (b, y)})
                        i += 2
                    else:
                        place(plants[(run[i] + y) % 2], run[i], y)
                        used.add((run[i], y))
                        i += 1
                x += len(run)
                continue
            if ch == "S" and not tall_s(x, y):
                place("filing_cabinet_front", x, y)
            elif ch == "H":
                # chairs face their table, chairs by a wall face the room
                if at(x, y + 1) in "YT=":
                    key = "office_chair_front"
                elif at(x, y - 1) in "YT=":
                    key = "office_chair_back"
                elif at(x + 1, y) in "YT=" or at(x + 1, y) == "#":
                    key = "office_chair_left" if at(x + 1, y) == "#" else "office_chair_right"
                elif at(x - 1, y) in "YT=":
                    key = "office_chair_left"
                else:
                    key = "office_chair_back"
                place(key, x, y)
            x += 1

    # bigger procedural pieces (one image per connected area)
    for ch in "TOBYS":
        for (x0, y0, x1, y1) in components(at, cols, rows, ch):
            if ch == "S" and y1 - y0 < 2:
                continue  # short cabinets use the filing cabinet sprite above
            img = furniture(ch, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T, x0 * 31 + y0)
            items.append((y1 + 0.5, x0, img, x0 * T, y0 * T))

    for _, _, img, px, py in sorted(items, key=lambda it: (it[0], it[1])):
        out.alpha_composite(img, (px, py)) if px >= 0 and py >= 0 else out.paste(img, (px, py), img)

    dest = ROOT / "public" / "sprites" / f"level_{level_id}.png"
    out.save(dest)
    print("written", dest, out.size)


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "jammed")
