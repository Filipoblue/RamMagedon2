// "Radar słuchowy" (GDD 4.B) - placeholder for Priority 3.
//
// Plan:
//  - emitSound(k, pos, radius) spawns an expanding ring on the "glow" layer
//    (visible through darkness and walls).
//  - teachers call it on every footstep; the player on running / failed skill check.
//  - every teacher within `radius` gets teacher.hearNoise(pos, loudness).

export function emitSound(k, pos, radius = 120, opts = {}) {
    // TODO(P3): draw an expanding ring at pos and notify teachers in range.
    for (const t of k.get("teacher")) {
        if (t.pos.dist(pos) <= radius) t.hearNoise?.(pos, opts.loudness ?? 1);
    }
}
