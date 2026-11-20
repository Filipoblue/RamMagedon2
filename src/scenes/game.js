import { TILE } from "../config.js";
import { ROOMS, TOTAL_RAM } from "../level/rooms.js";
import { buildLevel } from "../level/level.js";
import { spawnPlayer } from "../entities/player.js";
import { spawnTeacher } from "../entities/teacher.js";
import { addLighting } from "../systems/lighting.js";
import { startSkillCheck } from "../systems/skillcheck.js";

const INTERACT_DIST = TILE * 1.3;

export function gameScene(k) {
    k.scene("game", () => {
        k.setLayers(["world", "dark", "glow", "ui"], "world");

        const room = ROOMS[0]; // TODO: rooms 2-3 (one big map + camera follow)
        const level = buildLevel(k, room);
        const player = spawnPlayer(k, level.playerStart);

        const run = {
            ram: 0, // stolen in total
            roomRam: 0, // stolen in this room
            startTime: k.time(),
            over: false,
        };

        const endGame = (sceneName) => {
            if (run.over) return;
            run.over = true;
            k.go(sceneName, { ram: run.ram, time: k.time() - run.startTime });
        };

        for (const wp of level.patrols) {
            spawnTeacher(k, wp, { level, player, onCaught: () => endGame("gameover") });
        }

        addLighting(k, level, player);

        // ---- input ----
        k.onKeyPress("f", () => player.toggleFlashlight());
        k.onMousePress("right", () => player.toggleFlashlight());

        k.onKeyPress("e", () => {
            if (player.busy) return;
            const pc = nearestComputer(level, player);
            if (!pc) return;
            player.busy = true;
            startSkillCheck(k, pc, player, (ok) => {
                player.busy = false;
                if (!ok) return;
                pc.hasRam = false;
                run.ram++;
                run.roomRam++;
                if (run.roomRam >= room.ramToOpen) level.openDoors();
            });
        });

        // Exit: walking out through the opened door.
        // TODO: later this leads to room 2 / 3, and after 8/8 the 20 s escape to the roof.
        player.onUpdate(() => {
            if (player.pos.x > level.width - TILE / 2 || player.pos.x < 0) endGame("win");
        });

        // ---- "?" / "!" over teachers (glow layer = visible in the dark) ----
        k.add([
            k.layer("glow"),
            {
                draw() {
                    for (const t of k.get("teacher")) {
                        if (t.detection <= 0) continue;
                        const p = t.pos.add(0, -28);
                        k.drawRect({ pos: p.add(-14, 0), width: 28, height: 4, color: k.rgb(40, 40, 40) });
                        k.drawRect({ pos: p.add(-14, 0), width: 28 * t.detection, height: 4, color: k.rgb(255, 60, 60) });
                        k.drawText({ text: t.detection > 0.6 ? "!" : "?", pos: p.add(0, -16), size: 16, anchor: "center", color: k.rgb(255, 220, 80) });
                    }
                },
            },
        ]);

        // ---- HUD ----
        const hud = k.add([k.layer("ui"), k.pos(12, 10), k.fixed(), k.text("", { size: 18 }), k.color(220, 255, 220)]);
        k.add([
            k.layer("ui"),
            k.pos(12, k.height() - 26),
            k.fixed(),
            k.text("WASD ruch · mysz celuje · PPM/F latarka · E kradnij RAM · F2 debug: ciemność", { size: 14 }),
            k.opacity(0.6),
        ]);
        hud.onUpdate(() => {
            const pc = nearestComputer(level, player);
            hud.text =
                `RAM: ${run.ram}/${TOTAL_RAM}   ${room.name} (${run.roomRam}/${room.ramToOpen})` +
                `   Latarka: ${player.flashlightOn ? "ON" : "OFF"}` +
                (pc ? "   E: wyjmij RAM" : "") +
                (level.doors.some((d) => d.isOpen) ? "   Drzwi otwarte! ->" : "");
        });
    });
}

function nearestComputer(level, player) {
    let best = null;
    let bestD = INTERACT_DIST;
    for (const pc of level.computers) {
        if (!pc.hasRam) continue;
        const d = pc.pos.add(TILE / 2, TILE / 2).dist(player.pos);
        if (d < bestD) {
            best = pc;
            bestD = d;
        }
    }
    return best;
}
