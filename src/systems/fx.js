// Screen effects that are visible even in the dark and on fixed UI.
//
// k.shake() only moves the camera. Fixed UI (HUD, mini-game) does not move and
// the world is mostly black, so the shake was invisible. screenShake() also
// shakes the fixed UI (via uiShakeOffset) and can flash the screen red.

const fx = { shake: 0, flash: 0, flashColor: [255, 30, 30] };

// ---- tweakables ----
export const UI_SHAKE_DECAY = 5; // how fast UI shake fades out (1/s)
export const FLASH_DECAY = 2.5; // how fast the red flash fades out (1/s)
export const FLASH_MAX_OPACITY = 0.45;

/**
 * @param {number} amount shake strength in px (camera + UI)
 * @param {number} flash  0..1 red flash strength (0 = no flash)
 */
export function screenShake(k, amount, flash = 0) {
    k.shake(amount);
    fx.shake = Math.max(fx.shake, amount);
    fx.flash = Math.max(fx.flash, flash);
}

/** Current random offset for fixed UI; wrap UI drawing in k.pushTranslate(offset). */
export function uiShakeOffset(k) {
    if (fx.shake < 0.2) return k.vec2(0, 0);
    return k.vec2(k.rand(-1, 1), k.rand(-1, 1)).scale(fx.shake);
}

/** Add once per scene: decays the effects and draws the red flash on top of everything. */
export function addFx(k) {
    fx.shake = 0;
    fx.flash = 0;
    return k.add([
        k.layer("ui"),
        k.fixed(),
        k.z(100),
        {
            update() {
                const dt = k.dt();
                fx.shake *= Math.exp(-UI_SHAKE_DECAY * dt);
                fx.flash *= Math.exp(-FLASH_DECAY * dt);
            },
            draw() {
                if (fx.flash < 0.01) return;
                k.drawRect({
                    pos: k.vec2(0, 0),
                    width: k.width(),
                    height: k.height(),
                    color: k.rgb(...fx.flashColor),
                    opacity: fx.flash * FLASH_MAX_OPACITY,
                });
            },
        },
    ]);
}
