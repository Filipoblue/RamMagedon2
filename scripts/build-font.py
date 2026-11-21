"""Builds the game font public/fonts/HandPixies-PL.ttf from Handpixies-Gzdm.ttf.

    python scripts/build-font.py

HandPixies (by HeavenCastro, public domain, fontspace.com) has no Polish letters
except ó. This script:
  1. adds ą ć ę ł ń ś ź ż Ą Ć Ę Ł Ń Ś Ź Ż: base letter + a diacritic drawn on the
     font's pixel grid (1 pixel = 64 font units), decomposed into simple glyphs;
  2. sets the vertical metrics so text is drawn where it is placed (ascender = tallest
     glyph) and nothing is cut off by KAPLAY's glyph atlas;
  3. sets unitsPerEm to 1536, so the font sizes used in the game code stay the same
     as with the old Minecraftia (glyphs about half the size given) and size 48 / 96
     map to exactly 2 / 4 screen px per font pixel.
"""
from pathlib import Path

from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "fonts" / "Handpixies-Gzdm.ttf"
OUT = ROOT / "public" / "fonts" / "HandPixies-PL.ttf"
PX = 64  # font units per pixel
UPM = 1536
# KAPLAY draws glyphs with textBaseline "top" (top = ascender), so the ascender sits just
# above the tallest glyph (accented capitals, Ó = 829): text lands where it is placed.
ASC, DESC = 832, 256


def rect(pen, x0, y0, x1, y1):
    """Clockwise rectangle contour (TrueType outer contour)."""
    pen.moveTo((x0, y0))
    pen.lineTo((x0, y1))
    pen.lineTo((x1, y1))
    pen.lineTo((x1, y0))
    pen.closePath()


def main():
    font = TTFont(SRC)
    glyf, hmtx = font["glyf"], font["hmtx"]
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    acute = glyf["acute"]
    acute_cx = (acute.xMin + acute.xMax) // 2

    def snap(v):
        return int(round(v / PX)) * PX

    def make(base_char, kind):
        base = cmap[ord(base_char)]
        g = glyf[base]
        g.recalcBounds(glyf)
        adv, lsb = hmtx[base]
        pen = TTGlyphPen(gs)
        shift = 0
        if kind == "stroke":
            shift = PX if base_char == "l" else 0  # room for the stroke on the left
        gs[base].draw(TransformPen(pen, (1, 0, 0, 1, shift, 0)))
        cx = (g.xMin + g.xMax) // 2 + shift
        # accents sit 1 px above lowercase letters, directly on capitals (stays under ASC)
        top = g.yMax if base_char.isupper() else g.yMax + PX
        if kind == "acute":
            gs["acute"].draw(TransformPen(pen, (1, 0, 0, 1, snap(cx - acute_cx), top - acute.yMin)))
        elif kind == "dot":
            x = snap(cx - PX)
            rect(pen, x, top, x + 2 * PX, top + 2 * PX)
        elif kind == "ogonek":
            x = g.xMax + shift - 2 * PX
            rect(pen, x, -PX, x + PX, 0)
            rect(pen, x + PX, -2 * PX, x + 3 * PX, -PX)
        elif kind == "stroke":
            stem = g.xMin + shift
            rect(pen, stem - PX, 4 * PX, stem, 5 * PX)
            rect(pen, stem + PX, 6 * PX, stem + 2 * PX, 7 * PX)
            adv = max(adv + shift, stem + 3 * PX)
        new = pen.glyph()
        new.recalcBounds(glyf)
        return new, adv

    letters = {
        "ą": ("a", "ogonek"), "ć": ("c", "acute"), "ę": ("e", "ogonek"), "ł": ("l", "stroke"),
        "ń": ("n", "acute"), "ś": ("s", "acute"), "ź": ("z", "acute"), "ż": ("z", "dot"),
        "Ą": ("A", "ogonek"), "Ć": ("C", "acute"), "Ę": ("E", "ogonek"), "Ł": ("L", "stroke"),
        "Ń": ("N", "acute"), "Ś": ("S", "acute"), "Ź": ("Z", "acute"), "Ż": ("Z", "dot"),
    }
    order = font.getGlyphOrder()
    for ch, (base, kind) in letters.items():
        name = f"uni{ord(ch):04X}"
        glyph, adv = make(base, kind)
        glyf[name] = glyph
        hmtx[name] = (adv, glyph.xMin if glyph.numberOfContours else 0)
        if name not in order:
            order.append(name)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[ord(ch)] = name
    font.setGlyphOrder(order)
    font["maxp"].numGlyphs = len(order)

    # metrics: bigger em (smaller glyphs) + room for accents
    font["head"].unitsPerEm = UPM
    font["hhea"].ascent, font["hhea"].descent, font["hhea"].lineGap = ASC, -DESC, 0
    os2 = font["OS/2"]
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = ASC, -DESC, 0
    os2.usWinAscent, os2.usWinDescent = ASC, DESC
    font.save(OUT)
    print("written", OUT)


if __name__ == "__main__":
    main()
