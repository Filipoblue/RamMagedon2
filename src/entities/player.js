import { PLAYER } from "../config.js";
import { isDialogOpen } from "../systems/dialog.js";
import { sfx } from "../systems/audio.js";

// sprite sheet rows (public/sprites/player.png)
const ROW = { down: 0, up: 1, right: 2, left: 3 };

/** Facing name from an angle (radians). */
export function facingName(a) {
    const x = Math.cos(a), y = Math.sin(a);
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? "right" : "left";
    return y > 0 ? "down" : "up";
}

export function spawnPlayer(k, startPos) {
    const s = PLAYER.size;
    const player = k.add([
        k.pos(startPos),
        // collision square centred on pos (the sprite is drawn in onDraw)
        k.area({ shape: new k.Rect(k.vec2(-s / 2, -s / 2), s, s) }),
        k.body(),
        k.layer("world"),
        "player",
        {
            aimAngle: 0, // radians, where the flashlight points
            flashlightOn: true,
            busy: false, // true during a mini-game (blocks movement)
            moving: false,
            animTime: 0,
            stepTimer: 0,
            toggleFlashlight() {
                this.flashlightOn = !this.flashlightOn;
                sfx("click");
                // TODO(P3): notify teachers that light was seen/turned off
            },
        },
    ]);

    player.onUpdate(() => {
        // aim at the mouse (mousePos is in screen space -> convert to world)
        const m = k.toWorld(k.mousePos());
        player.aimAngle = Math.atan2(m.y - player.pos.y, m.x - player.pos.x);

        player.moving = false;
        if (player.busy || isDialogOpen()) return;
        let dir = k.vec2(0, 0);
        if (k.isKeyDown("a") || k.isKeyDown("left")) dir.x -= 1;
        if (k.isKeyDown("d") || k.isKeyDown("right")) dir.x += 1;
        if (k.isKeyDown("w") || k.isKeyDown("up")) dir.y -= 1;
        if (k.isKeyDown("s") || k.isKeyDown("down")) dir.y += 1;
        if (dir.x || dir.y) {
            player.move(dir.unit().scale(PLAYER.speed));
            player.moving = true;
            player.animTime += k.dt();
            player.stepTimer -= k.dt();
            if (player.stepTimer <= 0) {
                player.stepTimer = PLAYER.stepInterval;
                sfx("step");
            }
        } else {
            player.animTime = 0;
            player.stepTimer = 0;
        }
    });

    // looks where the flashlight points; walk cycle: idle, step, idle, step
    player.onDraw(() => {
        const col = player.moving ? Math.floor(player.animTime * PLAYER.animFps) % 4 : 0;
        k.drawSprite({
            sprite: "player",
            frame: ROW[facingName(player.aimAngle)] * 4 + col,
            pos: k.vec2(0, PLAYER.spriteOffsetY),
            anchor: "center",
        });
    });

    return player;
}
