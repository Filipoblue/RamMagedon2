// Sanity check for the level maps in src/level/rooms.js.
// Run: npm run check-levels
import { LEVELS } from "../src/level/rooms.js";

const KNOWN = new Set(["#", "S", "=", "C", "G", "D", "P", ".", ",", "1", "2", "K", "T", "B", "Y", "H", "O"]);
const SOLID = new Set(["#", "S", "=", "C", "G", "D", "1", "2", "K", "T", "B", "Y", "H", "O"]);
let errors = 0;
const err = (lvl, msg) => {
    errors++;
    console.log(`  [${lvl.name}] ${msg}`);
};

for (const lvl of LEVELS) {
    const rows = lvl.map.length;
    const cols = lvl.map[0].length;
    console.log(`${lvl.name}: ${cols}x${rows}`);
    const at = (x, y) => (y < 0 || y >= rows || x < 0 || x >= cols ? "#" : lvl.map[y][x]);
    const solid = (x, y) => SOLID.has(at(x, y));

    const wps = {};
    let player = null;
    const pcs = [];
    const doors = [];
    const terminals = {}; // "1" | "2" | "K" -> [x, y]
    lvl.map.forEach((row, y) => {
        if (row.length !== cols) err(lvl, `row ${y} has ${row.length} chars, expected ${cols}`);
        [...row].forEach((ch, x) => {
            if (/[a-z]/.test(ch)) {
                if (wps[ch]) err(lvl, `waypoint '${ch}' used twice`);
                wps[ch] = [x, y];
            } else if (!KNOWN.has(ch)) err(lvl, `unknown char '${ch}' at ${x},${y}`);
            if (ch === "P") player = [x, y];
            if (ch === "C") pcs.push([x, y]);
            if (ch === "D") doors.push([x, y]);
            if ("12K".includes(ch)) {
                if (terminals[ch]) err(lvl, `terminal '${ch}' used twice`);
                terminals[ch] = [x, y];
            }
        });
    });
    if (!player) err(lvl, "no player start P");
    if (pcs.length < lvl.ramToOpen) err(lvl, `ramToOpen=${lvl.ramToOpen} but only ${pcs.length} PCs`);
    if (!doors.length) err(lvl, "no exit door D");
    if (terminals.K && (!terminals["1"] || !terminals["2"])) err(lvl, "keypad K needs terminals 1 and 2");
    if (!lvl.ramToOpen && !terminals.K && !lvl.boss) err(lvl, "ramToOpen is 0, no keypad K and no boss: the door never opens");
    if (lvl.boss && !(lvl.teachers ?? []).some((t) => t.boss)) err(lvl, "boss level without a teacher marked { boss: true }");
    // routes: letters exist + straight lines are free
    const routes = (lvl.teachers ?? []).flatMap((t) => (typeof t === "string" ? [t] : t.routes ?? [t.route]));
    for (const route of routes) {
        for (const ch of route) if (!wps[ch]) err(lvl, `route "${route}": waypoint '${ch}' not on the map`);
        for (let i = 0; i < route.length; i++) {
            const a = wps[route[i]], b = wps[route[(i + 1) % route.length]];
            if (!a || !b) continue;
            const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 4;
            for (let s = 0; s <= steps; s++) {
                const x = Math.floor(a[0] + 0.5 + ((b[0] - a[0]) * s) / steps);
                const y = Math.floor(a[1] + 0.5 + ((b[1] - a[1]) * s) / steps);
                if (solid(x, y) || at(x, y) === ",") {
                    err(lvl, `route "${route}": line ${route[i]}->${route[(i + 1) % route.length]} blocked at ${x},${y}`);
                    break;
                }
            }
        }
    }

    // reachability from P (doors count as open)
    if (player) {
        const seen = new Set([player.join()]);
        const q = [player];
        while (q.length) {
            const [x, y] = q.shift();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                const ch = at(nx, ny);
                if (seen.has(`${nx},${ny}`) || (SOLID.has(ch) && ch !== "D")) continue;
                seen.add(`${nx},${ny}`);
                q.push([nx, ny]);
            }
        }
        const nextTo = ([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));
        pcs.forEach((p) => !nextTo(p) && err(lvl, `PC at ${p} unreachable`));
        Object.entries(terminals).forEach(([ch, p]) => !nextTo(p) && err(lvl, `terminal '${ch}' at ${p} unreachable`));
        if (!doors.some((d) => seen.has(d.join()))) err(lvl, "exit door unreachable");
        const edge = doors.some(([x, y]) => x === 0 || y === 0 || x === cols - 1 || y === rows - 1);
        if (!edge) err(lvl, "exit door must be on the map edge");
    }
}

console.log(errors ? `\n${errors} problem(s)` : "\nAll levels OK");
process.exit(errors ? 1 : 0);
