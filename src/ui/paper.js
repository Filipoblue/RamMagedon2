import { PAPER } from "../config.js";

// "Torn notebook page" look for the UI (in the spirit of The Binding of Isaac):
// cream paper with blue ruled lines and a red margin, jagged torn edges, a soft
// shadow and optional sticky tape. Text on paper uses the INK colours.

export const INK = {
    text: [44, 40, 58], // pencil / dark ink
    soft: [104, 98, 112], // faded notes
    blue: [40, 70, 150], // ballpoint
    red: [180, 40, 40], // red pen (warnings)
    green: [30, 110, 60], // green pen (good things)
};

// Torn edges are random but must not flicker: cache the outline per panel size + seed.
const cache = new Map();

function tornOutline(w, h, seed) {
    const key = `${w}x${h}:${seed}`;
    if (cache.has(key)) return cache.get(key);
    let s = seed * 9301 + 49297;
    const rnd = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
    const step = PAPER.tearStep, d = PAPER.tearDepth;
    const pts = [];
    // clockwise: top edge (torn), right side, bottom edge (torn), left side
    for (let x = 0; x <= w; x += step) pts.push([Math.min(x, w), rnd() * d]);
    for (let y = step; y < h; y += step * 2) pts.push([w - rnd() * d * 0.4, y]);
    for (let x = w; x >= 0; x -= step) pts.push([Math.max(x, 0), h - rnd() * d]);
    for (let y = h - step; y > 0; y -= step * 2) pts.push([rnd() * d * 0.4, y]);
    cache.set(key, pts);
    return pts;
}

/**
 * Draw a torn notebook page.
 * The paper itself is always opaque (a see-through fan polygon shows seams between
 * its triangles): `opacity` fades the shadow and the lines, below 0.3 nothing is drawn.
 * @param {object} [o] { seed, lines = true, margin = true, tape = false, opacity = 1, color = PAPER.color }
 */
export function drawPaper(k, pos, w, h, o = {}) {
    const { seed = 1, lines = true, margin = true, tape = false, opacity = 1, color = PAPER.color } = o;
    if (opacity < 0.3) return;
    w = Math.round(w);
    h = Math.round(h);
    const outline = tornOutline(w, h, seed);
    const poly = (dx, dy) => [k.vec2(pos.x + w / 2 + dx, pos.y + h / 2 + dy), ...outline.map(([x, y]) => k.vec2(pos.x + x + dx, pos.y + y + dy)), k.vec2(pos.x + outline[0][0] + dx, pos.y + outline[0][1] + dy)];
    // shadow, then the paper (triangle fan from the centre: the torn shape is star-shaped)
    k.drawPolygon({ pts: poly(4, 5), color: k.rgb(0, 0, 0), opacity: 0.35 * opacity });
    k.drawPolygon({ pts: poly(0, 0), color: k.rgb(...color) });
    // ruled lines + red margin, kept inside the torn edges
    const inset = PAPER.tearDepth + 2;
    if (lines) {
        for (let y = PAPER.lineGap; y < h - inset; y += PAPER.lineGap) {
            k.drawRect({ pos: k.vec2(pos.x + 3, pos.y + y), width: w - 6, height: 2, color: k.rgb(...PAPER.line), opacity: opacity * 0.7 });
        }
    }
    if (margin && w > 120) {
        k.drawRect({ pos: k.vec2(pos.x + PAPER.marginX, pos.y + inset), width: 2, height: h - inset * 2, color: k.rgb(...PAPER.margin), opacity: opacity * 0.7 });
    }
    if (tape) {
        const tw = Math.min(90, w * 0.4);
        k.drawRect({ pos: k.vec2(pos.x + w / 2 - tw / 2, pos.y - 10), width: tw, height: 22, color: k.rgb(...PAPER.tape), opacity: 0.75 * opacity });
    }
}

/** Hand-drawn style underline (a slightly wobbly pen stroke). */
export function scribble(k, x, y, w, color = INK.red, opacity = 1) {
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push(k.vec2(x + (w * i) / 8, y + Math.sin(i * 1.7) * 2));
    k.drawLines({ pts, width: 3, color: k.rgb(...color), opacity });
}
