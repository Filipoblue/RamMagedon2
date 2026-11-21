// Tiny pixel-art factory: sprites written as strings in code, turned into PNGs
// at load time. One character = one pixel, "." = transparent.
// Drawn crisp because KAPLAY runs with texFilter "nearest" (see main.js).

/**
 * @param {string} name sprite name for k.sprite / drawSprite
 * @param {string[][]} frames one or more frames, each a list of rows
 * @param {Object<string, number[]>} palette char -> [r, g, b] (or [r, g, b, a])
 * @param {object} [opt] extra loadSprite options (anims ...)
 */
export function loadPixelArt(k, name, frames, palette, opt = {}) {
    const w = Math.max(...frames.flat().map((r) => r.length));
    const h = Math.max(...frames.map((f) => f.length));
    const canvas = document.createElement("canvas");
    canvas.width = w * frames.length;
    canvas.height = h;
    const g = canvas.getContext("2d");
    frames.forEach((rows, fi) => {
        rows.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                const c = palette[row[x]];
                if (!c) continue;
                g.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(c[3] ?? 255) / 255})`;
                g.fillRect(fi * w + x, y, 1, 1);
            }
        });
    });
    return k.loadSprite(name, canvas.toDataURL(), { sliceX: frames.length, ...opt });
}
