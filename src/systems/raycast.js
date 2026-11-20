// 2D raycasting against wall segments.
// Plain {x, y} objects and numbers are used here (hot path, no allocations of Vec2).

/**
 * Build blocking segments from a grid of "opaque" tiles.
 * Edges shared by two opaque tiles are skipped, so the list stays small.
 * @param {(cx:number, cy:number) => boolean} isOpaque
 */
export function buildSegments(cols, rows, tile, isOpaque) {
    const segs = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (!isOpaque(x, y)) continue;
            const x0 = x * tile, y0 = y * tile, x1 = x0 + tile, y1 = y0 + tile;
            if (!isOpaque(x, y - 1)) segs.push({ ax: x0, ay: y0, bx: x1, by: y0 });
            if (!isOpaque(x, y + 1)) segs.push({ ax: x0, ay: y1, bx: x1, by: y1 });
            if (!isOpaque(x - 1, y)) segs.push({ ax: x0, ay: y0, bx: x0, by: y1 });
            if (!isOpaque(x + 1, y)) segs.push({ ax: x1, ay: y0, bx: x1, by: y1 });
        }
    }
    return segs;
}

/**
 * Cast one ray. Returns distance to the closest hit (or maxDist).
 */
export function castRay(ox, oy, dx, dy, maxDist, segs) {
    let best = maxDist;
    for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const ex = s.bx - s.ax, ey = s.by - s.ay;
        const den = dx * ey - dy * ex;
        if (den === 0) continue;
        const fx = s.ax - ox, fy = s.ay - oy;
        const t = (fx * ey - fy * ex) / den; // along ray
        const u = (fx * dy - fy * dx) / den; // along segment
        if (t >= 0 && t < best && u >= 0 && u <= 1) best = t;
    }
    return best;
}

/**
 * Visibility fan. First point is the origin, so the result is star-shaped
 * and can be drawn as a triangle fan.
 * @param {number} dirAngle radians
 * @param {number} fov radians (whole cone). Use Math.PI * 2 for a full circle.
 * @returns {{x:number, y:number}[]}
 */
export function visibilityFan(ox, oy, dirAngle, fov, range, rays, segs) {
    const pts = [{ x: ox, y: oy }];
    const start = dirAngle - fov / 2;
    // i = 0..rays inclusive: covers both cone edges; for a full circle the
    // last point repeats the first one and closes the fan.
    for (let i = 0; i <= rays; i++) {
        const a = start + (fov * i) / rays;
        const dx = Math.cos(a), dy = Math.sin(a);
        const d = castRay(ox, oy, dx, dy, range, segs);
        pts.push({ x: ox + dx * d, y: oy + dy * d });
    }
    return pts;
}

/** True when nothing blocks the straight line between a and b. */
export function hasLineOfSight(ax, ay, bx, by, segs) {
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len === 0) return true;
    return castRay(ax, ay, dx / len, dy / len, len, segs) >= len - 0.01;
}

/** Is point p inside a cone (origin, direction, half angle, range)? Ignores walls. */
export function inCone(ox, oy, dirAngle, fov, range, px, py) {
    const dx = px - ox, dy = py - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return false;
    if (dist === 0) return true;
    let diff = Math.atan2(dy, dx) - dirAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return Math.abs(diff) <= fov / 2;
}
