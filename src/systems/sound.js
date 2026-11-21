import { SOUND } from "../config.js";

// "Radar słuchowy" (GDD 4.B).
// emitSound() draws an expanding ring on the "glow" layer (visible through
// darkness and walls) and tells every teacher within the radius about it.
// Teachers also send a periodic "ping" ring (see PING_* in entities/teacher.js).

/** Expanding ring on the "glow" layer (purely visual). */
export function spawnRing(k, pos, radius, color = [255, 255, 255], duration = SOUND.ringDuration, width = 2) {
    return k.add([
        k.pos(pos),
        k.layer("glow"),
        k.opacity(1),
        k.lifespan(duration),
        {
            t: 0,
            update() {
                this.t += k.dt() / duration;
            },
            draw() {
                const r = Math.max(1, radius * Math.min(1, this.t));
                k.drawCircle({
                    pos: k.vec2(0, 0),
                    radius: r,
                    fill: false,
                    outline: { width, color: k.rgb(...color) },
                    opacity: Math.max(0, 1 - this.t) * this.opacity,
                });
            },
        },
    ]);
}

/**
 * A noise: ring + every teacher within `radius` hears it.
 * @returns {number} how many teachers heard it
 */
export function emitSound(k, pos, radius, opts = {}) {
    const color = opts.color ?? [255, 255, 255];
    spawnRing(k, pos, radius, color);
    if (opts.label) {
        k.add([
            k.pos(pos.add(0, -20)),
            k.layer("glow"),
            k.text(opts.label, { size: 32 }),
            k.anchor("center"),
            k.color(...color),
            k.opacity(1),
            k.lifespan(1.2, { fade: 0.6 }),
            k.move(k.UP, 20),
        ]);
    }
    let heard = 0;
    for (const t of k.get("teacher")) {
        if (t.pos.dist(pos) <= radius) {
            t.hearNoise?.(pos, opts.loudness ?? 1);
            heard++;
        }
    }
    return heard;
}
