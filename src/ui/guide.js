import { GUIDE as G } from "../config.js";
import { isDialogOpen } from "../systems/dialog.js";

// Guide arrows ("ui" layer): point at where the player has to go next.
// A target on screen gets a bobbing arrow above it; one off screen gets an arrow at the
// screen edge, pointing towards it.
//
//   addGuide(k, player, () => [vec2 world positions])

export function addGuide(k, player, targets) {
    return k.add([
        k.layer("ui"),
        k.fixed(),
        k.z(40),
        {
            draw() {
                if (player.busy || isDialogOpen()) return;
                const w = k.width(), h = k.height();
                const pulse = 0.75 + 0.25 * Math.sin(k.time() * 5);
                for (const world of targets()) {
                    const s = k.toScreen(world);
                    const onScreen = s.x > G.edge && s.x < w - G.edge && s.y > G.edgeTop && s.y < h - G.edge;
                    if (onScreen) {
                        // pointing down at the target
                        const tip = s.add(0, -26 - Math.abs(Math.sin(k.time() * 4)) * G.bob);
                        arrow(k, tip, Math.PI / 2, pulse);
                        continue;
                    }
                    // off screen: from the centre towards the target, clamped to the edge box
                    const c = k.vec2(w / 2, h / 2);
                    const d = s.sub(c);
                    const ang = Math.atan2(d.y, d.x);
                    const sx = d.x > 0 ? (w - G.edge - c.x) / d.x : d.x < 0 ? (G.edge - c.x) / d.x : Infinity;
                    const sy = d.y > 0 ? (h - G.edge - c.y) / d.y : d.y < 0 ? (G.edgeTop - c.y) / d.y : Infinity;
                    const t = Math.min(sx, sy);
                    arrow(k, c.add(d.scale(t)), ang, pulse);
                }
            },
        },
    ]);
}

/** Arrow with a dark outline; `tip` = point, `ang` = direction it points to. */
function arrow(k, tip, ang, opacity) {
    const L = G.size;
    const dir = k.vec2(Math.cos(ang), Math.sin(ang));
    const side = k.vec2(-dir.y, dir.x);
    const base = tip.sub(dir.scale(L * 1.4));
    const pts = [tip, base.add(side.scale(L)), base.sub(dir.scale(-L * 0.35)), base.sub(side.scale(L))];
    const shadow = pts.map((p) => p.add(dir.scale(-2)).add(2, 3));
    k.drawPolygon({ pts: shadow, color: k.rgb(0, 0, 0), opacity: 0.45 * opacity });
    k.drawPolygon({ pts, color: k.rgb(...G.color), opacity, outline: { width: 3, color: k.rgb(40, 30, 10) } });
}
