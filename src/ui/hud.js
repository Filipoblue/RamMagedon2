import { HUD, FONT } from "../config.js";
import { drawPaper, INK } from "./paper.js";

// In-game HUD (fixed, "ui" layer), drawn on torn notebook pages (ui/paper.js):
//   top-left   level card + current goal
//   top-right  RAM slots (or the door code) for this room, flashlight state, help hint
//   centre     "+1 RAM"-style notes
// The quest + controls card is ui/notebook.js (Esc / H).

const textW = (k, text, size) => k.formatText({ text, size }).width;

/** Keyboard key drawn in ink on paper, returns its width. */
export function keyChip(k, pos, label, opacity = 1, size = FONT.small) {
    const w = textW(k, label, size) + 18;
    const h = size / 2 + 16;
    k.drawRect({ pos: pos.add(2, 3), width: w, height: h, radius: 4, color: k.rgb(...INK.text), opacity: 0.25 * opacity });
    k.drawRect({ pos, width: w, height: h, radius: 4, color: k.rgb(250, 247, 238), opacity });
    k.drawRect({ pos, width: w, height: h, radius: 4, fill: false, outline: { width: 2, color: k.rgb(...INK.text) }, opacity });
    k.drawText({ text: label, pos: pos.add(w / 2, h / 2 + 1), size, anchor: "center", color: k.rgb(...INK.text), opacity });
    return w;
}

/** RAM stick doodle (filled = stolen). */
function ramIcon(k, pos, filled) {
    const w = 40, h = 18;
    if (!filled) {
        k.drawRect({ pos, width: w, height: h, radius: 3, fill: false, outline: { width: 2, color: k.rgb(...INK.soft) }, opacity: 0.8 });
        return;
    }
    k.drawRect({ pos, width: w, height: h, radius: 3, color: k.rgb(60, 150, 85) });
    for (let i = 0; i < 3; i++) k.drawRect({ pos: pos.add(5 + i * 11, 4), width: 8, height: 6, color: k.rgb(20, 30, 24) });
    for (let i = 0; i < 7; i++) k.drawRect({ pos: pos.add(4 + i * 5, h - 4), width: 3, height: 4, color: k.rgb(215, 170, 60) });
}

/**
 * @param {object} o { room, levelIndex, run, state, player, level, goal?, code?, signal? }
 */
export function addHud(k, o) {
    const [label, title] = o.room.name.includes(":") ? o.room.name.split(/:\s*/) : [`Poziom ${o.levelIndex + 1}`, o.room.name];
    const toasts = [];
    const S = FONT.small, B = FONT.big;
    let toastSeed = 1;

    const hud = k.add([
        k.layer("ui"),
        k.fixed(),
        k.z(50),
        {
            /** Current goal text (also shown in the quest notebook). */
            goal() {
                return o.goal ? o.goal() : "";
            },
            /** Short note in the middle of the top of the screen. */
            toast(text, color = INK.green) {
                toasts.push({ text, color, t: HUD.toastTime, seed: toastSeed++ });
            },
            update() {
                const dt = k.dt();
                for (const t of toasts) t.t -= dt;
                while (toasts.length && toasts[0].t <= 0) toasts.shift();
            },
            draw() {
                const m = HUD.margin;
                const doorsOpen = o.level.doors.some((d) => d.isOpen);

                // ---- level card + goal (top-left) ----
                const goal = o.goal ? o.goal() : doorsOpen ? "Uciekaj przez otwarte drzwi!" : "Ukradnij RAM z komputerów";
                const lx = m + 40; // text starts right of the red margin
                const lw = Math.max(textW(k, title, B), textW(k, goal, S) + 22) + 64;
                drawPaper(k, k.vec2(m, m), lw, 112, { seed: 3 });
                k.drawText({ text: label.toUpperCase(), pos: k.vec2(lx, m + 14), size: S, color: k.rgb(...INK.red) });
                k.drawText({ text: title, pos: k.vec2(lx, m + 36), size: B, color: k.rgb(...INK.text) });
                const pulse = 0.6 + 0.4 * Math.sin(k.time() * 4);
                const gc = doorsOpen ? INK.red : INK.blue;
                // goal: a pen tick box
                k.drawRect({ pos: k.vec2(lx, m + 80), width: 12, height: 12, fill: false, outline: { width: 2, color: k.rgb(...gc) }, opacity: pulse });
                k.drawText({ text: goal, pos: k.vec2(lx + 20, m + 76), size: S, color: k.rgb(...gc) });

                // safe zone: small green note under the level card
                if (o.level.isSafeAt(o.player.pos)) {
                    const sw = textW(k, "Strefa bezpieczna", S) + 32;
                    drawPaper(k, k.vec2(m + 10, m + 122), sw, 38, { seed: 7, lines: false, margin: false });
                    k.drawText({ text: "Strefa bezpieczna", pos: k.vec2(m + 26, m + 132), size: S, color: k.rgb(...INK.green) });
                }

                // ---- RAM (or door code) + flashlight (top-right) ----
                const rw = 310, rx = k.width() - m - rw;
                const tx = rx + 40;
                drawPaper(k, k.vec2(rx, m), rw, 112, { seed: 5 });
                if (o.balls) {
                    // level 3: ping-pong balls left
                    k.drawText({ text: "PIŁECZKI", pos: k.vec2(tx, m + 16), size: S, color: k.rgb(...INK.red) });
                    const n = o.balls();
                    for (let i = 0; i < 3; i++) {
                        const c = k.vec2(tx + 140 + i * 26, m + 26);
                        if (i < n) k.drawCircle({ pos: c, radius: 8, color: k.rgb(245, 150, 40), outline: { width: 2, color: k.rgb(...INK.text) } }); // orange ping-pong ball
                        else k.drawCircle({ pos: c, radius: 8, fill: false, outline: { width: 2, color: k.rgb(...INK.soft) } });
                    }
                    keyChip(k, k.vec2(rx + rw - 52, m + 10), "Q");
                } else if (o.code) {
                    // level 2: known code digits + signal bars
                    k.drawText({ text: "KOD", pos: k.vec2(tx, m + 16), size: S, color: k.rgb(...INK.red) });
                    k.drawText({ text: o.code().split("").join(" "), pos: k.vec2(tx + 60, m + 16), size: S, color: k.rgb(...INK.text) });
                    const bars = o.signal();
                    for (let i = 0; i < 4; i++) {
                        const bh = 6 + i * 5;
                        k.drawRect({ pos: k.vec2(rx + rw - 72 + i * 12, m + 36 - bh), width: 8, height: bh, color: k.rgb(...(i < bars ? INK.green : [190, 184, 170])) });
                    }
                } else {
                    const need = o.room.ramToOpen;
                    k.drawText({ text: "RAM", pos: k.vec2(tx, m + 16), size: S, color: k.rgb(...INK.red) });
                    for (let i = 0; i < need; i++) ramIcon(k, k.vec2(tx + 62 + i * 50, m + 17), i < o.state.roomRam);
                    k.drawText({ text: `${Math.min(o.state.roomRam, need)}/${need}`, pos: k.vec2(rx + rw - 20, m + 16), size: S, anchor: "topright", color: k.rgb(...INK.text) });
                }
                // flashlight doodle + state, total loot on the right
                const on = o.player.flashlightOn;
                const fy = m + 72;
                k.drawRect({ pos: k.vec2(tx, fy + 2), width: 14, height: 10, radius: 2, color: k.rgb(...(on ? INK.text : INK.soft)) });
                if (on) k.drawPolygon({ pts: [k.vec2(tx + 14, fy + 7), k.vec2(tx + 34, fy - 3), k.vec2(tx + 34, fy + 17)], color: k.rgb(230, 190, 60), opacity: 0.8 });
                // texts level with the torch icon (its middle is fy + 7)
                k.drawText({ text: on ? "Latarka wł." : "Latarka wył.", pos: k.vec2(tx + 42, fy - 5), size: S, color: k.rgb(...(on ? INK.text : INK.soft)) });
                k.drawText({ text: `Łup: ${o.run.ram}`, pos: k.vec2(rx + rw - 20, fy - 5), size: S, anchor: "topright", color: k.rgb(...INK.soft) });

                // help hint under the right card
                const hint = "zadanie, sterowanie";
                const hintW = textW(k, hint, S) + textW(k, "Esc", S) + 60;
                const hx = k.width() - m - hintW;
                drawPaper(k, k.vec2(hx, m + 122), hintW, 44, { seed: 9, lines: false, margin: false });
                const hw = keyChip(k, k.vec2(hx + 12, m + 130), "Esc");
                // lowercase text: its middle sits lower than the text box middle, so lift it a bit
                k.drawText({ text: hint, pos: k.vec2(hx + 12 + hw + 10, m + 131), size: S, color: k.rgb(...INK.soft) });

                // ---- toasts: torn strips with a pen note ----
                toasts.forEach((t, i) => {
                    const age = HUD.toastTime - t.t;
                    const a = Math.min(1, t.t / 0.3, age / 0.15 + 0.01);
                    const p = k.vec2(k.width() / 2, 160 + i * 64 - (1 - Math.min(1, age * 6)) * 10);
                    const w = textW(k, t.text, B) + 60;
                    drawPaper(k, p.sub(w / 2, 28), w, 56, { seed: t.seed, lines: false, margin: false, opacity: a });
                    k.drawText({ text: t.text, pos: p.add(0, 1), size: B, anchor: "center", color: k.rgb(...t.color), opacity: a });
                });

                // escape countdown (level 3): a red note in the middle of the top
                const left = o.timer?.();
                if (left != null) {
                    const text = `Ucieczka: ${Math.ceil(left)} s`;
                    const tw = textW(k, text, FONT.huge) + 60;
                    const shake = left < 10 ? Math.sin(k.time() * 30) * 2 : 0;
                    drawPaper(k, k.vec2(k.width() / 2 - tw / 2 + shake, m), tw, 70, { seed: 13, lines: false, margin: false });
                    k.drawText({ text, pos: k.vec2(k.width() / 2 + shake, m + 36), size: FONT.huge, anchor: "center", color: k.rgb(...(left < 10 ? INK.red : INK.text)) });
                }

            },
        },
    ]);
    return hud;
}
