import { TILE, COLORS } from "../config.js";
import { buildSegments } from "../systems/raycast.js";

const OPAQUE = new Set(["#", "S", "D"]);
const SOLID = new Set(["#", "S", "D", "b", "C"]);

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

    let playerStart = k.vec2(TILE * 2, TILE * 2);
    const waypoints = [];
    const doors = [];
    const computers = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const ch = grid[y][x];
            const p = k.vec2(x * TILE, y * TILE);
            const center = p.add(TILE / 2, TILE / 2);

            if (ch === "#") spawnBlock(k, p, COLORS.wall, ["wall", "opaque"]);
            else if (ch === "S") spawnBlock(k, p, COLORS.cabinet, ["cabinet", "opaque"], 4);
            else if (ch === "b") spawnBlock(k, p, COLORS.desk, ["desk"], 3);
            else if (ch === "C") computers.push(spawnComputer(k, p, x, y));
            else if (ch === "D") doors.push(spawnDoor(k, p, x, y));
            else if (ch === "P") playerStart = center;
            else if (/[1-9]/.test(ch)) waypoints.push({ n: Number(ch), pos: center });
        }
    }

    waypoints.sort((a, b) => a.n - b.n);

    const level = {
        cols,
        rows,
        width: cols * TILE,
        height: rows * TILE,
        playerStart,
        // One patrol for now. TODO(P3): several teachers -> use different digit ranges or room data.
        patrols: waypoints.length ? [waypoints.map((w) => w.pos)] : [],
        computers,
        doors,
        segments: [],
        isOpaque: (x, y) => OPAQUE.has(at(x, y)),
        rebuildSegments() {
            level.segments = buildSegments(cols, rows, TILE, level.isOpaque);
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
        k.area(),
        k.body({ isStatic: true }),
        k.layer("world"),
        ...tags,
    ]);
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
