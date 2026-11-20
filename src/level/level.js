import { TILE, COLORS } from "../config.js";
import { buildSegments } from "../systems/raycast.js";

// Map legend: see src/level/rooms.js.
// Player's light/view is blocked only by walls, cabinets and closed doors.
const OPAQUE = new Set(["#", "S", "D"]);
// What blocks a TEACHER's sight: the above + every desk (with or without PC).
// (The player's flashlight goes over desks, teachers cannot see the player behind them.)
const SIGHT_BLOCK = new Set(["#", "S", "D", "=", "C"]);
// Glass ("G") blocks movement, but not light/sight.
const SOLID = new Set(["#", "S", "D", "=", "C", "G"]);
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

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const ch = grid[y][x];
            const p = k.vec2(x * TILE, y * TILE);
            const center = p.add(TILE / 2, TILE / 2);

            if (ch === "#") spawnBlock(k, p, COLORS.wall, ["wall", "opaque"]);
            else if (ch === "S") spawnBlock(k, p, COLORS.cabinet, ["cabinet", "opaque"], 4);
            else if (ch === "=") spawnBlock(k, p, COLORS.desk, ["desk"], 3);
            else if (ch === "G") spawnGlass(k, p);
            else if (ch === "C") computers.push(spawnComputer(k, p, x, y));
            else if (ch === "D") doors.push(spawnDoor(k, p, x, y));
            else if (ch === "P") playerStart = center;
            else if (/[a-z]/.test(ch)) waypoints[ch] = center;
        }
    }

    // Teacher routes: "abcd" = walk a -> b -> c -> d -> a ...
    const teachers = (room.teachers ?? []).map((t) => {
        const cfg = typeof t === "string" ? { route: t } : t;
        const pts = [...cfg.route].map((ch) => {
            if (!waypoints[ch]) throw new Error(`${room.name}: route "${cfg.route}" uses '${ch}', which is not on the map`);
            return waypoints[ch];
        });
        return { ...cfg, waypoints: pts };
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
        doors,
        segments: [], // blocks the player's light/view: walls, cabinets, closed doors
        sightSegments: [], // blocks teachers' sight: the above + all desks and PCs
        isOpaque: (x, y) => OPAQUE.has(at(x, y)),
        isSolid: (x, y) => SOLID.has(at(x, y)),
        /**
         * Grid path (8 directions, no corner cutting) between two world points.
         * If `to` is inside a solid tile (e.g. a PC), goes to the nearest free tile next to it.
         * @returns {Vec2[]} world positions of tile centres, [] if unreachable
         */
        findPath(from, to) {
            const toCell = (p) => [Math.floor(p.x / TILE), Math.floor(p.y / TILE)];
            const [sx, sy] = toCell(from);
            let [gx, gy] = toCell(to);
            if (level.isSolid(gx, gy)) {
                const free = NEIGHBOURS.map(([dx, dy]) => [gx + dx, gy + dy]).filter(([x, y]) => !level.isSolid(x, y));
                if (!free.length) return [];
                free.sort((a, b) => Math.hypot(a[0] - sx, a[1] - sy) - Math.hypot(b[0] - sx, b[1] - sy));
                [gx, gy] = free[0];
            }
            const key = (x, y) => y * cols + x;
            const prev = new Map([[key(sx, sy), -1]]);
            const queue = [[sx, sy]];
            while (queue.length) {
                const [x, y] = queue.shift();
                if (x === gx && y === gy) break;
                for (const [dx, dy] of NEIGHBOURS) {
                    const nx = x + dx, ny = y + dy;
                    if (level.isSolid(nx, ny) || prev.has(key(nx, ny))) continue;
                    if (dx && dy && (level.isSolid(x + dx, y) || level.isSolid(x, y + dy))) continue;
                    prev.set(key(nx, ny), key(x, y));
                    queue.push([nx, ny]);
                }
            }
            if (!prev.has(key(gx, gy))) return [];
            const path = [];
            for (let c = key(gx, gy); c !== key(sx, sy); c = prev.get(c)) {
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

function spawnBlock(k, p, color, tags, inset = 0) {
    return k.add([
        k.pos(p.x + inset, p.y + inset),
        k.rect(TILE - inset * 2, TILE - inset * 2),
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
