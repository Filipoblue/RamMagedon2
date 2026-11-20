# Minecraftia-Regular.ttf ships with broken vertical metrics (positive descender,
# glyphs taller than the em box). Browsers then place glyphs above the "top"
# baseline and KAPLAY's font atlas cuts off their upper half.
# This rewrites the metrics so every glyph sits inside the em box.
# Side effect: glyphs render at ~half size, so use 2x font sizes (16/32/48/64).
# Usage: python scripts/fix-font.py public/fonts/Minecraftia-Regular.ttf
import struct, sys

path = sys.argv[1]
f = bytearray(open(path, "rb").read())
n = struct.unpack(">H", f[4:6])[0]
tabs = {}
for i in range(n):
    rec = 12 + 16 * i
    tag = bytes(f[rec:rec + 4]).decode("latin1")
    _, off, length = struct.unpack(">III", f[rec + 4:rec + 16])
    tabs[tag] = (rec, off, length)

def put(fmt, off, *v):
    f[off:off + struct.calcsize(fmt)] = struct.pack(fmt, *v)

UPM, ASC, DESC = 3072, 2688, 384
o = tabs["head"][1]
put(">H", o + 18, UPM)       # unitsPerEm
put(">h", o + 38, -576)      # yMin (was positive)
o = tabs["hhea"][1]
put(">hhh", o + 4, ASC, -DESC, 0)
o = tabs["OS/2"][1]
put(">hhh", o + 68, ASC, -DESC, 0)  # typo ascender/descender/lineGap
put(">HH", o + 74, ASC, DESC)        # win ascent/descent

def csum(b):
    b = b + b"\0" * ((4 - len(b) % 4) % 4)
    return sum(struct.unpack(">%dI" % (len(b) // 4), b)) & 0xFFFFFFFF

put(">I", tabs["head"][1] + 8, 0)
for tag, (rec, off, length) in tabs.items():
    put(">I", rec + 4, csum(bytes(f[off:off + length])))
put(">I", tabs["head"][1] + 8, (0xB1B0AFBA - csum(bytes(f))) & 0xFFFFFFFF)
open(path, "wb").write(f)
print("fixed", path)
