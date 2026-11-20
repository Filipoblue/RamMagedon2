import { FLASHLIGHT, DARKNESS, COLORS } from "../config.js";
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
                state.near = visibilityFan(x, y, 0, Math.PI * 2, FLASHLIGHT.nearRadius, FLASHLIGHT.nearRays, level.segments);
                // TODO(P2): during RAM extraction the view should shrink almost to zero
                state.cone = player.flashlightOn
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
                            pos: k.vec2(-50, -50),
                            width: level.width + 100,
                            height: level.height + 100,
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

    return state;
}
