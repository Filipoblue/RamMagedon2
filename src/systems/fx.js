// Screen effects that are visible even in the dark and on fixed UI.
//
// Our own shake (instead of k.shake) so the same offset moves the camera AND the
// fixed UI (mini-game window, red glow). Two parts:
//  - burst: screenShake(k, amount) -> decays quickly (mini-game mistake, alarm)
//  - continuous: setContinuousShake(amount) every frame (teacher getting closer)

const fx = { shake: 0, continuous: 0, flash: 0, flashColor: [255, 30, 30] };

// ---- tweakables ----
export const UI_SHAKE_DECAY = 5; // how fast UI shake fades out (1/s)
export const FLASH_DECAY = 2.5; // how fast the red flash fades out (1/s)
export const FLASH_MAX_OPACITY = 0.45;

/**
 * @param {number} amount shake strength in px (camera + UI)
 * @param {number} flash  0..1 red flash strength (0 = no flash)
 */
export function screenShake(k, amount, flash = 0) {
    fx.shake = Math.max(fx.shake, amount);
    fx.flash = Math.max(fx.flash, flash);
}

/** Continuous shake level in px; call every frame (0 = none). */
export function setContinuousShake(amount) {
    fx.continuous = amount;
}

let frameOffset = null;
let frameTime = -1;
/** Random shake offset for this frame (same for camera and UI). */
export function shakeOffset(k) {
    if (frameTime !== k.time()) {
        frameTime = k.time();
        const a = fx.shake + fx.continuous;
        frameOffset = a < 0.2 ? k.vec2(0, 0) : k.vec2(k.rand(-1, 1), k.rand(-1, 1)).scale(a);
    }
    return frameOffset;
}
export const uiShakeOffset = shakeOffset;

/** Add once per scene: decays the effects and draws the red flash on top of everything. */
export function addFx(k) {
    fx.shake = 0;
    fx.continuous = 0;
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
