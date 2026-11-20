import { TILE } from "../config.js";
import { LEVELS, TOTAL_RAM } from "../level/rooms.js";
import { buildLevel } from "../level/level.js";
import { spawnPlayer } from "../entities/player.js";
import { spawnTeacher } from "../entities/teacher.js";
import { addLighting } from "../systems/lighting.js";
import { startExtraction } from "../systems/extraction.js";
import { addFx, screenShake, uiShakeOffset, shakeOffset, setContinuousShake } from "../systems/fx.js";
import { MINIGAME_CAM_SHIFT } from "../config.js";
import { CAMERA_LERP, ALARM_SHAKE, ALARM_NEAR_DIST, PROXIMITY_DIST, PROXIMITY_MAX_SHAKE, PROXIMITY_CURVE } from "../config.js";

const INTERACT_DIST = TILE * 1.3;

/**
 * Scene params:
 *   levelIndex - which entry of LEVELS to play (default 0 = tutorial)
 *   run        - stats carried between levels { ram, startTime }
 */
export function gameScene(k) {
    k.scene("game", ({ levelIndex = 0, run = null } = {}) => {
        const room = LEVELS[levelIndex];
        const level = buildLevel(k, room);
        const player = spawnPlayer(k, level.playerStart);

        // camera locked on the player, smoothly following (frame-rate independent lerp)
        // (camBase = smooth position, the shake offset is added on top)
        let camBase = player.pos;
        k.setCamPos(camBase);
        k.onUpdate(() => {
            const t = 1 - Math.exp(-CAMERA_LERP * k.dt());
            // during a mini-game look a bit to the right (see MINIGAME_CAM_SHIFT)
            const target = player.busy ? player.pos.add(MINIGAME_CAM_SHIFT, 0) : player.pos;
            camBase = camBase.lerp(target, t);
            k.setCamPos(camBase.add(shakeOffset(k)));
        });

        run ??= { ram: 0, startTime: k.time() };
        const retryRun = { ...run }; // snapshot for "try again" on this level
        const state = { roomRam: 0, over: false };

        const caught = () => {
            if (state.over) return;
            state.over = true;
            k.go("gameover", { ram: run.ram, levelIndex, retryRun });
        };
        const nextLevel = () => {
            if (state.over) return;
            state.over = true;
            if (levelIndex + 1 < LEVELS.length) k.go("game", { levelIndex: levelIndex + 1, run });
            else k.go("win", { ram: run.ram, time: k.time() - run.startTime });
            // TODO: GDD finale - after the last room: alarm + 20 s escape to the roof
        };

        const lighting = addLighting(k, level, player);
        for (const t of level.teachers) {
            spawnTeacher(k, t, { level, player, lighting, onCaught: caught });
        }

        addFx(k);

        // ---- input ----
        k.onKeyPress("f", () => player.toggleFlashlight());
        k.onMousePress("right", () => player.toggleFlashlight());

        k.onKeyPress("e", () => {
            if (player.busy) return;
            const pc = nearestComputer(level, player);
            if (!pc) return;
            player.busy = true;
            startExtraction(k, pc, player, (ok) => {
                player.busy = false;
                if (!ok) return;
                pc.hasRam = false;
                run.ram++;
                state.roomRam++;
                if (state.roomRam >= room.ramToOpen) level.openDoors();
            });
        });

        // Exit: walking out of the map through the opened door.
        player.onUpdate(() => {
            const { x, y } = player.pos;
            if (x < 0 || y < 0 || x > level.width || y > level.height) nextLevel();
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
                        k.drawText({ text: t.detection > 0.6 ? "!" : "?", pos: p.add(0, -14), size: 24, anchor: "center", color: k.rgb(255, 220, 80) });
                    }
                },
            },
        ]);

        // ---- alarm: shake + red glow while a teacher is coming after a failed mini-game ----
        let wasAlarmed = 0;
        let glow = 0;
        k.add([
            k.layer("ui"),
            k.fixed(),
            {
                update() {
                    const alarmed = k.get("teacher").filter((t) => t.alarmed);
                    if (alarmed.length > wasAlarmed) screenShake(k, ALARM_SHAKE, 1); // shake + red flash
                    wasAlarmed = alarmed.length;
                    // 0..1: how close the nearest alarmed teacher is
                    let closeness = 0;
                    for (const t of alarmed) {
                        closeness = Math.max(closeness, 1 - Math.min(1, t.pos.dist(player.pos) / (ALARM_NEAR_DIST * 2)));
                    }
                    const target = alarmed.length ? 0.35 + 0.65 * closeness : 0;
                    glow += (target - glow) * Math.min(1, k.dt() * 4);
                    // proximity shake from the nearest teacher (any state)
                    let nearest = Infinity;
                    for (const t of k.get("teacher")) nearest = Math.min(nearest, t.pos.dist(player.pos));
                    const prox = Math.max(0, 1 - nearest / PROXIMITY_DIST);
                    setContinuousShake(PROXIMITY_MAX_SHAKE * Math.pow(prox, PROXIMITY_CURVE));
                },
                draw() {
                    if (glow < 0.01) return;
                    // red vignette: stacked frames, strongest at the screen edge, pulsing
                    const pulse = 0.75 + 0.25 * Math.sin(k.time() * 8);
                    const w = k.width(), h = k.height();
                    k.pushTransform();
                    k.pushTranslate(uiShakeOffset(k));
                    for (let i = 0; i < 10; i++) {
                        const b = 10; // band thickness
                        const o = i * b;
                        const a = glow * pulse * 0.45 * (1 - i / 10);
                        const c = k.rgb(255, 20, 20);
                        k.drawRect({ pos: k.vec2(o, o), width: w - 2 * o, height: b, color: c, opacity: a });
                        k.drawRect({ pos: k.vec2(o, h - o - b), width: w - 2 * o, height: b, color: c, opacity: a });
                        k.drawRect({ pos: k.vec2(o, o + b), width: b, height: h - 2 * o - 2 * b, color: c, opacity: a });
                        k.drawRect({ pos: k.vec2(w - o - b, o + b), width: b, height: h - 2 * o - 2 * b, color: c, opacity: a });
                    }
                    k.popTransform();
                },
            },
        ]);

        // ---- HUD ----
        const hud = k.add([k.layer("ui"), k.pos(12, 8), k.fixed(), k.text("", { size: 24 }), k.color(220, 255, 220)]);
        k.add([
            k.layer("ui"),
            k.pos(12, k.height() - 22),
            k.fixed(),
            k.text("WASD ruch · mysz celuje · PPM/F latarka · E kradnij RAM · F2 debug: ciemność · F3 kolizje (mapa PNG)", { size: 24 }),
            k.opacity(0.6),
        ]);
        if (room.tips) {
            k.add([
                k.layer("ui"),
                k.pos(k.width() - 12, 8),
                k.anchor("topright"),
                k.fixed(),
                k.text(room.tips.join("\n"), { size: 24, align: "right", lineSpacing: 4 }),
                k.color(255, 230, 120),
            ]);
        }
        hud.onUpdate(() => {
            const pc = nearestComputer(level, player);
            hud.text =
                `${room.name}   (${levelIndex + 1}/${LEVELS.length})\n` +
                `RAM: ${run.ram}/${TOTAL_RAM}   w tej sali: ${state.roomRam}/${room.ramToOpen}` +
                `   Latarka: ${player.flashlightOn ? "ON" : "OFF"}` +
                (pc && !player.busy ? "   E: otwórz komputer" : "") +
                (level.doors.some((d) => d.isOpen) ? "   Drzwi otwarte! Wyjdź z sali." : "");
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
