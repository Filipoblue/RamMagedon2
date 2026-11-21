import { TILE } from "../config.js";
import { LEVELS, TOTAL_RAM } from "../level/rooms.js";
import { buildLevel } from "../level/level.js";
import { spawnPlayer } from "../entities/player.js";
import { spawnTeacher } from "../entities/teacher.js";
import { addLighting } from "../systems/lighting.js";
import { startExtraction } from "../systems/extraction.js";
import { addFx, screenShake, uiShakeOffset, shakeOffset, setContinuousShake } from "../systems/fx.js";
import { MINIGAME_CAM_SHIFT, INTERACT_DIST } from "../config.js";
import { STORY } from "../story/script.js";
import { showDialog, dialogBlocksInput } from "../systems/dialog.js";
import { playMusic, sfx } from "../systems/audio.js";
import { firstTime } from "../story/progress.js";
import { addHud } from "../ui/hud.js";
import { INK } from "../ui/paper.js";
import { startQte } from "../minigames/qte.js";
import { startAntenna } from "../minigames/antenna.js";
import { startKeypad } from "../minigames/keypad.js";
import { addBossLevel } from "./boss.js";
import { CAMERA_LERP, ALARM_SHAKE, ALARM_NEAR_DIST, PROXIMITY_DIST, PROXIMITY_MAX_SHAKE, PROXIMITY_CURVE } from "../config.js";

/**
 * Scene params:
 *   levelIndex - which entry of LEVELS to play (default 0 = first level)
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
        const state = {
            roomRam: 0,
            over: false,
            // level 2: random door code; terminal 1 reveals digits 1-2, terminal 2 digits 3-4
            code: String(Math.floor(Math.random() * 10000)).padStart(4, "0"),
        };
        const term = (kind) => level.terminals.find((t) => t.kind === kind);
        const knownCode = () =>
            (term("qte")?.done ? state.code.slice(0, 2) : "??") + (term("antenna")?.done ? state.code.slice(2) : "??");
        const signalReady = () => Boolean(term("qte")?.done && term("antenna")?.done);
        // dev: inspect the level from the browser console (see CONVENTIONS, "Debug")
        if (import.meta.env.DEV) Object.assign(window, { __level: level, __state: state });
        const lines = STORY.levels[room.id] ?? {};
        // story lines are shown only the first time (not again after a retry)
        const story = (key) => (firstTime(`${room.id ?? levelIndex}:${key}`) ? lines[key] : null);
        playMusic("level");

        /** @param {string} reason "teacher" | "mieciu" | "lola" | "timeout" (text in scenes/menus.js) */
        const caught = (reason = "teacher") => {
            if (state.over) return;
            state.over = true;
            k.go("gameover", { ram: run.ram, levelIndex, retryRun, reason });
        };
        const nextLevel = () => {
            if (state.over) return;
            state.over = true;
            const last = levelIndex + 1 >= LEVELS.length;
            const next = last
                ? { scene: "win", params: { ram: run.ram, time: k.time() - run.startTime } }
                : { scene: "game", params: { levelIndex: levelIndex + 1, run } };
            if (room.cutsceneAfter) k.go("cutscene", { id: room.cutsceneAfter, next });
            else k.go(next.scene, next.params);
        };

        const lighting = addLighting(k, level, player);
        for (const t of level.teachers) {
            spawnTeacher(k, t, { level, player, lighting, onCaught: caught });
        }
        // level 3: Pan Mieciu, ping-pong balls, the key and the escape (scenes/boss.js)
        const bossLevel = room.boss
            ? addBossLevel(k, { level, player, lines, story, caught, toast: (text, color) => hud.toast(text, color) })
            : null;

        addFx(k);

        // ---- input ----
        k.onKeyPress("f", () => player.toggleFlashlight());
        k.onMousePress("right", () => player.toggleFlashlight());

        const stealRam = (pc) => {
            startExtraction(k, pc, player, (ok) => {
                player.busy = false;
                if (!ok) return sfx("menuMove"); // left the mini-game, progress kept
                pc.hasRam = false;
                run.ram++;
                state.roomRam++;
                hud.toast("+1 RAM");
                if (state.roomRam >= room.ramToOpen) {
                    level.openDoors();
                    sfx("unlock");
                    hud.toast("Drzwi otwarte!", INK.red);
                    showDialog(k, story("doorsOpen"));
                } else if (state.roomRam === 1) showDialog(k, story("firstRam"));
            });
        };

        const useTerminal = (t) => {
            const done = (ok) => {
                player.busy = false;
                if (!ok) return sfx("menuMove");
                t.done = true;
                if (t.kind === "keypad") {
                    level.openDoors();
                    hud.toast("Drzwi otwarte!", INK.red);
                    return showDialog(k, story("doorsOpen"));
                }
                hud.toast(`Kod: ${t.kind === "qte" ? state.code.slice(0, 2) : state.code.slice(2)}`);
                showDialog(k, signalReady() ? story("bothTerminals") : story("firstTerminal"));
            };
            if (t.kind === "qte") startQte(k, player, t, state.code.slice(0, 2), done);
            else if (t.kind === "antenna") startAntenna(k, player, t, state.code.slice(2), done);
            else startKeypad(k, player, t, state.code, knownCode(), done);
        };

        k.onKeyPress("e", () => {
            if (player.busy || dialogBlocksInput(k)) return;
            const target = nearestInteractable(level, player);
            if (!target) return;
            if (target.terminal?.kind === "keypad" && !signalReady()) {
                // the lock has no signal until both terminals are done
                sfx("error");
                return showDialog(k, lines.noSignal);
            }
            player.busy = true;
            sfx("click");
            if (target.pc) stealRam(target.pc);
            else useTerminal(target.terminal);
        });

        // Exit: walking out of the map through the opened door.
        player.onUpdate(() => {
            const { x, y } = player.pos;
            if (x < 0 || y < 0 || x > level.width || y > level.height) nextLevel();
        });

        // ---- "?" / "!" over teachers, PC you can open (glow layer = visible in the dark) ----
        k.add([
            k.layer("glow"),
            {
                draw() {
                    drawTerminals();
                    const target = !player.busy && nearestInteractable(level, player);
                    if (target) {
                        // pulsing frame around the PC / terminal + key hint (red = locked keypad)
                        const locked = target.terminal?.kind === "keypad" && !signalReady();
                        const pulse = 0.5 + 0.5 * Math.sin(k.time() * 6);
                        const p = k.vec2(target.cx * TILE, target.cy * TILE);
                        k.drawRect({
                            pos: p.sub(2, 2), width: TILE + 4, height: TILE + 4, fill: false,
                            outline: { width: 2, color: k.rgb(...(locked ? [255, 90, 90] : [120, 255, 150])) }, opacity: 0.5 + 0.5 * pulse,
                        });
                        const kp = p.add(TILE / 2, -14 - pulse * 3);
                        k.drawRect({ pos: kp.sub(14, 14), width: 28, height: 28, color: k.rgb(0, 0, 0), opacity: 0.8, radius: 4 });
                        k.drawRect({ pos: kp.sub(14, 14), width: 28, height: 28, fill: false, outline: { width: 2, color: k.rgb(255, 255, 255) }, radius: 4 });
                        k.drawText({ text: "E", pos: kp.add(0, 1), size: 32, anchor: "center", color: k.rgb(255, 255, 255) });
                    }
                    for (const t of k.get("teacher")) {
                        if (t.detection <= 0) continue;
                        const p = t.pos.add(0, -28);
                        k.drawRect({ pos: p.add(-14, 0), width: 28, height: 4, color: k.rgb(40, 40, 40) });
                        k.drawRect({ pos: p.add(-14, 0), width: 28 * t.detection, height: 4, color: k.rgb(255, 60, 60) });
                        k.drawText({ text: t.detection > 0.6 ? "!" : "?", pos: p.add(0, -14), size: 32, anchor: "center", color: k.rgb(255, 220, 80) });
                    }
                },
            },
        ]);

        // ---- level 2: terminal LEDs, keypad, "BRAK ZASIĘGU", the locked door ----
        function drawTerminals() {
            const blink = Math.sin(k.time() * 6) > -0.3;
            for (const t of level.terminals) {
                const p = k.vec2(t.cx * TILE, t.cy * TILE);
                if (t.kind === "keypad") {
                    const open = t.done, ready = signalReady();
                    const col = open ? [120, 255, 160] : ready ? [255, 220, 110] : [255, 60, 60];
                    k.drawRect({ pos: p.add(8, 6), width: 16, height: 20, radius: 3, color: k.rgb(20, 22, 26) });
                    k.drawRect({ pos: p.add(11, 9), width: 10, height: 4, color: k.rgb(...col), opacity: open || blink ? 1 : 0.3 });
                    // floating warning when you come close to the jammed lock
                    const near = player.pos.dist(p.add(TILE / 2, TILE / 2)) < TILE * 4;
                    if (!ready && near && blink) {
                        k.drawText({ text: "BRAK ZASIĘGU", pos: p.add(-60, -18), size: 32, anchor: "center", color: k.rgb(255, 90, 90) });
                    }
                } else {
                    const col = t.done ? [120, 200, 255] : [120, 255, 150];
                    k.drawCircle({ pos: p.add(TILE - 7, TILE - 7), radius: 3, color: k.rgb(...col), opacity: t.done || blink ? 1 : 0.25 });
                }
            }
        }
        if (room.drawDoors || level.terminals.some((t) => t.kind === "keypad")) {
            // the exit door is drawn here (the PNG art shows only the frame): sliding panels
            const slide = { t: 0 };
            k.add([
                k.layer("world"),
                k.z(5),
                {
                    update() {
                        if (level.doors.some((d) => d.isOpen)) slide.t = Math.min(1, slide.t + k.dt() * 1.5);
                    },
                    draw() {
                        for (const d of level.doors) {
                            const p = k.vec2(d.cx * TILE, d.cy * TILE);
                            const h = TILE * (1 - slide.t);
                            if (h < 1) continue;
                            k.drawRect({ pos: p.add(4, 0), width: TILE - 8, height: h, color: k.rgb(96, 102, 116) });
                            k.drawRect({ pos: p.add(4, 0), width: TILE - 8, height: h, fill: false, outline: { width: 2, color: k.rgb(40, 42, 50) } });
                            for (let y = 6; y < h - 4; y += 8) k.drawRect({ pos: p.add(8, y), width: TILE - 16, height: 2, color: k.rgb(70, 74, 86) });
                        }
                    },
                },
            ]);
        }

        // ---- alarm: shake + red glow while a teacher is coming after a failed mini-game ----
        let wasAlarmed = 0;
        let glow = 0;
        k.add([
            k.layer("ui"),
            k.fixed(),
            {
                update() {
                    const alarmed = k.get("teacher").filter((t) => t.alarmed);
                    if (alarmed.length > wasAlarmed) {
                        screenShake(k, ALARM_SHAKE, 1); // shake + red flash
                        sfx("alarm");
                    }
                    if (!state.over) playMusic(alarmed.length ? "alarm" : "level");
                    // "!" sting when a teacher starts spotting you (once per sighting)
                    for (const t of k.get("teacher")) {
                        if (t.detection > 0.3 && !t.stung) {
                            t.stung = true;
                            sfx("detect");
                        } else if (t.detection <= 0) t.stung = false;
                    }
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
        const hud = addHud(k, {
            room, levelIndex, run, state, player, level,
            // level 2 (no RAM): door code panel instead of RAM slots
            code: room.ramToOpen ? null : knownCode,
            signal: () => level.terminals.filter((t) => t.done && t.kind !== "keypad").length * 2,
            // level 3: ping-pong balls instead of RAM, escape countdown
            balls: bossLevel && (() => bossLevel.balls),
            timer: bossLevel && bossLevel.timer,
            goal: () => {
                if (bossLevel) return bossLevel.goal();
                if (level.doors.some((d) => d.isOpen)) return "Uciekaj przez otwarte drzwi!";
                if (room.ramToOpen) return "Ukradnij RAM z komputerów";
                if (!signalReady()) return `Przywróć zasięg: terminale ${level.terminals.filter((t) => t.done).length}/2`;
                return "Otwórz zamek przy drzwiach";
            },
        });
        k.onKeyPress("h", () => hud.toggleHelp());
        // hero's comment, then the controls card (both only the first time)
        k.wait(0.5, async () => {
            await showDialog(k, story("start"));
            if (firstTime("controls")) hud.showHelp();
        });
    });
}

/** Closest thing you can press E on: a PC with RAM or an unfinished terminal. */
function nearestInteractable(level, player) {
    let best = null;
    let bestD = INTERACT_DIST;
    const consider = (cx, cy, target) => {
        // distance to the tile centre (pc.pos is shifted by the desk inset)
        const d = Math.hypot((cx + 0.5) * TILE - player.pos.x, (cy + 0.5) * TILE - player.pos.y);
        if (d < bestD) {
            best = { cx, cy, ...target };
            bestD = d;
        }
    };
    for (const pc of level.computers) if (pc.hasRam) consider(pc.cx, pc.cy, { pc });
    for (const t of level.terminals) if (!t.done) consider(t.cx, t.cy, { terminal: t });
    return best;
}
