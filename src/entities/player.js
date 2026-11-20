import { PLAYER, COLORS } from "../config.js";

export function spawnPlayer(k, startPos) {
    const s = PLAYER.size;
    const player = k.add([
        k.pos(startPos),
        k.rect(s, s),
        k.anchor("center"),
        k.color(...COLORS.player),
        k.outline(2, k.rgb(10, 30, 50)),
        k.area(),
        k.body(),
        k.layer("world"),
        "player",
        {
            aimAngle: 0, // radians, where the flashlight points
            flashlightOn: true,
            busy: false, // TODO(P2): true while doing the RAM skill check (blocks movement)
            toggleFlashlight() {
                this.flashlightOn = !this.flashlightOn;
                // TODO(P3): emitSound(click) + notify teachers that light was seen/turned off
            },
        },
    ]);

    player.onUpdate(() => {
        // aim at the mouse (mousePos is in screen space -> convert to world for future camera)
        const m = k.toWorld(k.mousePos());
        player.aimAngle = Math.atan2(m.y - player.pos.y, m.x - player.pos.x);

        if (player.busy) return;
        let dir = k.vec2(0, 0);
        if (k.isKeyDown("a") || k.isKeyDown("left")) dir.x -= 1;
        if (k.isKeyDown("d") || k.isKeyDown("right")) dir.x += 1;
        if (k.isKeyDown("w") || k.isKeyDown("up")) dir.y -= 1;
        if (k.isKeyDown("s") || k.isKeyDown("down")) dir.y += 1;
        if (dir.x || dir.y) {
            player.move(dir.unit().scale(PLAYER.speed));
            // TODO(P3): footstep sound rings (louder when running)
        }
    });

    // facing indicator: a "nose" pointing where you aim
    player.onDraw(() => {
        const a = player.aimAngle;
        const tip = k.vec2(Math.cos(a), Math.sin(a)).scale(s * 0.85);
        const l = k.vec2(Math.cos(a + 2.4), Math.sin(a + 2.4)).scale(s * 0.35);
        const r = k.vec2(Math.cos(a - 2.4), Math.sin(a - 2.4)).scale(s * 0.35);
        k.drawTriangle({ p1: tip, p2: l, p3: r, color: k.rgb(255, 255, 255) });
    });

    return player;
}
