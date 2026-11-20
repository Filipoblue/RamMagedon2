import { FLASHLIGHT, DARKNESS, COLORS, EXTRACTION } from "../config.js";
import { visibilityFan } from "./raycast.js";

const DEG = Math.PI / 180;

/**
 * Darkness / fog of war. Everything on layers below "dark" is hidden except
 * the flashlight cone and a small radius around the player.
 * Layers above "dark" ("glow", "ui") are always visible (LEDs, sound rings, HUD).
 */
export function addLighting(k, level, player) {
    const state = {
        enabled: true, // debug toggle (F2)
        cone: [],
        near: [],
    };

    const toVecs = (pts) => pts.map((p) => k.vec2(p.x, p.y));

    k.add([
        k.layer("dark"),
        k.pos(0, 0),
        {
            update() {
                const { x, y } = player.pos;
                // While extracting RAM the view shrinks almost to zero (GDD 2.2).
                const nearR = player.busy ? EXTRACTION.viewRadius : FLASHLIGHT.nearRadius;
                state.near = visibilityFan(x, y, 0, Math.PI * 2, nearR, FLASHLIGHT.nearRays, level.segments);
                state.cone = player.flashlightOn && !player.busy
                    ? visibilityFan(x, y, player.aimAngle, FLASHLIGHT.fov * DEG, FLASHLIGHT.range, FLASHLIGHT.rays, level.segments)
                    : [];
            },
            draw() {
                if (!state.enabled) return;
                const cone = toVecs(state.cone);
                const near = toVecs(state.near);
                k.drawSubtracted(
                    () => {
                        k.drawRect({
                            pos: k.vec2(-2000, -2000),
                            width: level.width + 4000,
                            height: level.height + 4000,
                            color: k.rgb(0, 0, 0),
                            opacity: DARKNESS.opacity,
                        });
                    },
                    () => {
                        if (cone.length > 2) k.drawPolygon({ pts: cone });
                        if (near.length > 2) k.drawPolygon({ pts: near });
                    },
                );
                // warm tint inside the beam
                if (cone.length > 2) {
                    k.drawPolygon({ pts: cone, color: k.rgb(...COLORS.flashlight), opacity: 0.08 });
                }
            },
        },
    ]);

    k.onKeyPress("f2", () => (state.enabled = !state.enabled));

    /** Is a world point inside the player's light (flashlight cone or the small circle)? */
    state.isLit = (x, y) => !state.enabled || inPolygon(state.cone, x, y) || inPolygon(state.near, x, y);

    return state;
}

// even-odd point-in-polygon test (pts: [{x, y}, ...])
function inPolygon(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}
