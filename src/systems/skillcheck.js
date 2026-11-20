// RAM extraction mini-game (GDD 4.C) - placeholder for Priority 2.
//
// Plan:
//  - bar with 2-3 hit zones and a moving needle; press Space/E to release a latch.
//  - needle is slower with flashlight ON, faster in the dark.
//  - miss -> emitSound(..., "trzask plastiku!") which lures the nearest teacher.
//  - while active: player.busy = true and the visible area shrinks.
//
// For now the skeleton just grants the RAM instantly, so the full game loop
// (RAM counter -> doors open -> exit -> win) already works end to end.

/**
 * @param {object} computer the PC game object (has .hasRam)
 * @param {object} player
 * @param {(success:boolean) => void} onDone
 */
export function startSkillCheck(k, computer, player, onDone) {
    // TODO(P2): real mini-game UI on the "ui" layer.
    onDone(true);
}
