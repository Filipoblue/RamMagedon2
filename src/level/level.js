import { TILE, COLORS } from "../config.js";
import { buildSegments } from "../systems/raycast.js";

// Map legend: see src/level/rooms.js.
// Player's light/view is blocked only by walls, cabinets, closed doors and keypads.
const OPAQUE = new Set(["#", "S", "D", "K", "O"]);
// What blocks a TEACHER's sight: the above + every desk (with or without PC / terminal).
// (The player's flashlight goes over desks, teachers cannot see the player behind them.)
const SIGHT_BLOCK = new Set(["#", "S", "D", "K", "O", "=", "C", "1", "2", "T", "B", "Y", "H"]);
// Glass ("G") blocks movement, but not light/sight.
const SOLID = new Set(["#", "S", "D", "K", "O", "=", "C", "G", "1", "2", "T", "B", "Y", "H"]);
// Safe floor: teachers never walk there and cannot catch you there.
const SAFE = ",";
// Interactive terminals (level 2): which mini-game each one starts.
const TERMINALS = { 1: "qte", 2: "antenna", K: "keypad" };
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Spawns the tiles of a room and returns the level API used by the rest of the game.
 */
export function buildLevel(k, room) {
    const rows = room.map.length;
    const cols = room.map[0].length;
    room.map.forEach((row, i) => {
        if (row.length !== cols) throw new Error(`Map row ${i} has ${row.length} chars, expected ${cols}`);
    });

    // Mutable copy of the grid (doors change it at runtime).
    const grid = room.map.map((r) => r.split(""));
    const at = (x, y) => (y < 0 || y >= rows || x < 0 || x >= cols ? "#" : grid[y][x]);

    // floor (the area outside the map stays black)
    k.add([k.pos(0, 0), k.rect(cols * TILE, rows * TILE), k.color(...COLORS.floor), k.z(-20), k.layer("world")]);

    // Optional PNG art for the whole room. The ASCII grid above stays the
    // collision + light layer; tiles become invisible (F3 shows them for debugging).
    if (room.background) {
        k.add([k.sprite(room.background), k.pos(0, 0), k.z(-10), k.layer("world")]);
    }

    let playerStart = k.vec2(TILE * 2, TILE * 2);
    const waypoints = {}; // letter -> world pos
    const doors = [];
    const computers = [];
    const terminals = []; // { kind: "qte" | "antenna" | "keypad", cx, cy, done, progress }

    // Static blocks are merged into as few rectangles as possible: KAPLAY collision cost
    // grows with the square of area() objects, one object per tile drops to ~2 FPS.
    for (const r of mergeRects(grid, cols, rows, "#")) spawnBlock(k, r, COLORS.wall, ["wall", "opaque"]);
    for (const r of mergeRects(grid, cols, rows, "S")) spawnBlock(k, r, COLORS.cabinet, ["cabinet", "opaque"], 4);
    for (const r of mergeRects(grid, cols, rows, "=")) spawnBlock(k, r, COLORS.desk, ["desk"], 3);
    for (const r of mergeRects(grid, cols, rows, "G")) spawnGlass(k, r);
    for (const ch of ["O", "T", "B", "Y", "H"]) {
        for (const r of mergeRects(grid, cols, rows, ch)) spawnBlock(k, r, ch === "O" ? COLORS.wall : COLORS.desk, ch === "O" ? ["wall", "opaque"] : ["desk"], 3);
    }

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const ch = grid[y][x];
            const p = k.vec2(x * TILE, y * TILE);
            const center = p.add(TILE / 2, TILE / 2);

            if (ch === "C") computers.push(spawnComputer(k, p, x, y));
            else if (TERMINALS[ch]) {
                const block = ch === "K" ? spawnBlock(k, p, COLORS.wall, ["wall", "opaque"]) : spawnBlock(k, p, COLORS.desk, ["desk"], 3);
                terminals.push({ kind: TERMINALS[ch], cx: x, cy: y, block, done: false, progress: null });
            } else if (ch === SAFE && !room.background) {
                k.add([k.pos(p), k.rect(TILE, TILE), k.color(...COLORS.safe), k.opacity(0.35), k.z(-15), k.layer("world")]);
            }
            else if (ch === "D") doors.push(spawnDoor(k, p, x, y));
            else if (ch === "P") {
                playerStart = center;
                // a start inside a safe zone is safe floor too
                if (NEIGHBOURS.slice(0, 4).some(([dx, dy]) => at(x + dx, y + dy) === SAFE)) grid[y][x] = SAFE;
            }
            else if (/[a-z]/.test(ch)) waypoints[ch] = center;
        }
    }

    // Teacher routes: "abcd" = walk a -> b -> c -> d -> a ...
    const teachers = (room.teachers ?? []).map((t) => {
        const cfg = typeof t === "string" ? { route: t } : t;
        const toPts = (route) =>
            [...route].map((ch) => {
                if (!waypoints[ch]) throw new Error(`${room.name}: route "${route}" uses '${ch}', which is not on the map`);
                return waypoints[ch];
            });
        // { routes: [...] } = several routes, the teacher switches between them
        const routes = (cfg.routes ?? [cfg.route]).map(toPts);
        return { ...cfg, waypoints: routes[0], routes };
    });

    if (room.background) {
        const colliders = k.get("collider");
        colliders.forEach((c) => (c.hidden = true));
        k.onKeyPress("f3", () => colliders.forEach((c) => c.exists() && (c.hidden = !c.hidden)));
    }

    const level = {
        cols,
        rows,
        width: cols * TILE,
        height: rows * TILE,
        playerStart,
        teachers, // [{ route, waypoints: Vec2[], speed? }]
        computers,
        terminals,
        doors,
        segments: [], // blocks the player's light/view: walls, cabinets, closed doors
        sightSegments: [], // blocks teachers' sight: the above + all desks and PCs
        isOpaque: (x, y) => OPAQUE.has(at(x, y)),
        isSolid: (x, y) => SOLID.has(at(x, y)),
        isSafe: (x, y) => at(x, y) === SAFE,
        /** Centres (world px) of every tile with this map char, e.g. "T" = ping-pong table. */
        tilesWith(ch) {
            const out = [];
            room.map.forEach((row, y) => [...row].forEach((c, x) => c === ch && out.push(k.vec2((x + 0.5) * TILE, (y + 0.5) * TILE))));
            return out;
        },
        /** Is a world point on a safe tile (teachers cannot catch you there)? */
        isSafeAt: (p) => at(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === SAFE,
        /**
         * Grid path (8 directions, no corner cutting) between two world points.
         * If `to` cannot be reached (inside a desk, or inside a safe zone when
         * `avoidSafe`), the path ends on the reachable tile closest to it.
         * @param {boolean} avoidSafe true for teachers: never step on safe tiles (",")
         * @returns {Vec2[]} world positions of tile centres, [] if already there / stuck
         */
        findPath(from, to, avoidSafe = false) {
            const toCell = (p) => [Math.floor(p.x / TILE), Math.floor(p.y / TILE)];
            const [sx, sy] = toCell(from);
            const [gx, gy] = toCell(to);
            const blocked = (x, y) => level.isSolid(x, y) || (avoidSafe && level.isSafe(x, y));
            const key = (x, y) => y * cols + x;
            const prev = new Map([[key(sx, sy), -1]]);
            const queue = [[sx, sy]];
            let best = key(sx, sy);
            let bestD = Math.hypot(gx - sx, gy - sy);
            for (let qi = 0; qi < queue.length; qi++) {
                const [x, y] = queue[qi];
                const d = Math.hypot(gx - x, gy - y);
                if (d < bestD) {
                    bestD = d;
                    best = key(x, y);
                }
                if (d === 0) break;
                for (const [dx, dy] of NEIGHBOURS) {
                    const nx = x + dx, ny = y + dy;
                    if (blocked(nx, ny) || prev.has(key(nx, ny))) continue;
                    if (dx && dy && (blocked(x + dx, y) || blocked(x, y + dy))) continue;
                    prev.set(key(nx, ny), key(x, y));
                    queue.push([nx, ny]);
                }
            }
            const path = [];
            for (let c = best; c !== key(sx, sy); c = prev.get(c)) {
                path.push(k.vec2((c % cols) * TILE + TILE / 2, Math.floor(c / cols) * TILE + TILE / 2));
            }
            return path.reverse();
        },
        rebuildSegments() {
            level.segments = buildSegments(cols, rows, TILE, level.isOpaque);
            level.sightSegments = buildSegments(cols, rows, TILE, (x, y) => SIGHT_BLOCK.has(at(x, y)));
        },
        openDoors() {
            for (const d of doors) {
                if (d.isOpen) continue;
                d.isOpen = true;
                grid[d.cy][d.cx] = ".";
                d.destroy();
            }
            level.rebuildSegments();
        },
    };
    level.rebuildSegments();
    return level;
}

/**
 * Greedy meshing: covers every `ch` tile with as few rectangles as possible.
 * @returns {{x:number, y:number, w:number, h:number}[]} in tiles
 */
function mergeRects(grid, cols, rows, ch) {
    const used = grid.map((r) => r.map(() => false));
    const free = (x, y) => grid[y][x] === ch && !used[y][x];
    const out = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (!free(x, y)) continue;
            let w = 1;
            while (x + w < cols && free(x + w, y)) w++;
            let h = 1;
            grow: while (y + h < rows) {
                for (let i = 0; i < w; i++) if (!free(x + i, y + h)) break grow;
                h++;
            }
            for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[y + j][x + i] = true;
            out.push({ x, y, w, h });
        }
    }
    return out;
}

/** @param r rectangle in tiles ({x, y, w, h}) or a single tile position in px (Vec2) */
function spawnBlock(k, r, color, tags, inset = 0) {
    const t = r.w ? r : { x: r.x / TILE, y: r.y / TILE, w: 1, h: 1 };
    return k.add([
        k.pos(t.x * TILE + inset, t.y * TILE + inset),
        k.rect(t.w * TILE - inset * 2, t.h * TILE - inset * 2),
        k.color(...color),
        k.opacity(1),
        k.area(),
        k.body({ isStatic: true }),
        k.layer("world"),
        "collider",
        ...tags,
    ]);
}

function spawnGlass(k, p) {
    const g = spawnBlock(k, p, COLORS.glass, ["glass"]);
    g.opacity = 0.35;
    return g;
}

function spawnDoor(k, p, cx, cy) {
    const d = spawnBlock(k, p, COLORS.door, ["door", "opaque"]);
    d.cx = cx;
    d.cy = cy;
    d.isOpen = false;
    return d;
}

function spawnComputer(k, p, cx, cy) {
    const pc = spawnBlock(k, p, COLORS.desk, ["desk", "computer"], 3);
    pc.cx = cx;
    pc.cy = cy;
    pc.hasRam = true;
    pc.onDraw(() => {
        // monitor
        k.drawRect({ pos: k.vec2(5, 4), width: TILE - 16, height: 12, color: k.rgb(...COLORS.computer) });
    });
    // LED lives on the "glow" layer (above darkness), so it is visible in the dark.
    k.add([
        k.pos(p.x + TILE - 9, p.y + TILE - 9),
        k.layer("glow"),
        {
            draw() {
                if (!pc.hasRam) return;
                const on = Math.sin(k.time() * 6) > -0.3;
                k.drawCircle({ pos: k.vec2(0, 0), radius: 3, color: k.rgb(...COLORS.led), opacity: on ? 1 : 0.25 });
            },
        },
    ]);
    return pc;
}
