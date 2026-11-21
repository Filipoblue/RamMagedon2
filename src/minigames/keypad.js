import { KEYPAD as KP, FONT } from "../config.js";
import { sfx } from "../systems/audio.js";
import { openMinigame } from "./frame.js";
import { INK } from "../ui/paper.js";

// Door keypad, 2 stages:
//  1. KOD     type the 4-digit code (number keys or click the pads). Every beep is a
//             small noise, a wrong code is loud.
//  2. ZWARCIE bridge 3 wires: a pulse runs along each wire, press Space / E (or click)
//             while it is inside the gap. A miss sparks (noise). Each wire is faster.

const W = 460, H = 300;
const PAD = 58, GAP = 10; // keypad buttons
const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "<"];

/**
 * @param {string} code the 4-digit door code
 * @param {string} known what the player found so far (shown as a hint, "?" = unknown)
 */
export function startKeypad(k, player, term, code, known, onDone) {
    term.progress ??= { stage: "code", wire: 0 };
    const pr = term.progress;
    const st = { entered: "", pulse: 0, gapAt: 0.5, sparks: [], done: false };
    term.st = st; // handy for debugging from the console
    const newWire = () => {
        st.pulse = 0;
        st.gapAt = 0.25 + Math.random() * (0.75 - KP.gap - 0.25);
    };
    newWire();

    const padPos = (i, box) => box.add(W - 3 * PAD - 2 * GAP + (i % 3) * (PAD + GAP), Math.floor(i / 3) * (PAD + GAP) + 8);

    const typeKey = (ui, key) => {
        if (pr.stage !== "code" || st.done) return;
        sfx("click");
        if (key === "C") st.entered = "";
        else if (key === "<") st.entered = st.entered.slice(0, -1);
        else if (st.entered.length < 4) {
            st.entered += key;
            ui.noise(KP.beepNoise);
        }
        if (st.entered.length < 4) return;
        if (st.entered === code) {
            sfx("unlock");
            ui.say("KOD OK", INK.green, 1);
            ui.pause(1);
            pr.stage = "wires";
        } else {
            ui.fail("ZŁY KOD!", KP.wrongNoise);
            st.entered = "";
        }
    };

    const bridge = (ui) => {
        if (pr.stage !== "wires" || st.done) return;
        const hit = st.pulse >= st.gapAt && st.pulse <= st.gapAt + KP.gap;
        const y = wireY(ui.box, pr.wire);
        for (let i = 0; i < 10; i++) {
            st.sparks.push({ x: ui.box.x + st.pulse * W, y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 220, life: 0.5, ok: hit });
        }
        if (!hit) return ui.fail("ISKRA!", KP.sparkNoise);
        sfx("latch");
        pr.wire++;
        if (pr.wire >= KP.wires) {
            st.done = true;
            sfx("unlock");
            ui.noise(KP.openNoise);
            ui.say("OTWARTE!", INK.green, 1.5);
            return ui.finish(1.5);
        }
        ui.pause(0.4);
        newWire();
    };

    const keys = { space: bridge, e: bridge, backspace: (ui) => typeKey(ui, "<") };
    for (let d = 0; d <= 9; d++) keys[String(d)] = (ui) => typeKey(ui, String(d));

    openMinigame(k, player, {
        title: () => (pr.stage === "code" ? "Zamek: wpisz kod" : "Zamek: zewrzyj przewody"),
        hint: () => (pr.stage === "code" ? `Kod z terminali: ${known}` : "Spacja / E, gdy impuls jest w szczelinie"),
        width: W,
        height: H,
        keys,
        update(dt, ui) {
            for (const s of st.sparks) {
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.vy += 600 * dt;
                s.life -= dt;
            }
            st.sparks = st.sparks.filter((s) => s.life > 0);
            if (ui.busy() || st.done) return;
            if (pr.stage === "code" && ui.clicked) {
                const i = PAD_KEYS.findIndex((_, i) => {
                    const p = padPos(i, ui.box);
                    return ui.mouse.x >= p.x && ui.mouse.x <= p.x + PAD && ui.mouse.y >= p.y && ui.mouse.y <= p.y + PAD;
                });
                if (i >= 0) typeKey(ui, PAD_KEYS[i]);
            }
            if (pr.stage === "wires") {
                st.pulse = (st.pulse + KP.pulseSpeed[pr.wire] * dt) % 1;
                if (ui.clicked) bridge(ui);
            }
        },
        draw(ui) {
            if (pr.stage === "code") drawCode(k, ui, st);
            else drawWires(k, ui, st, pr);
            for (const s of st.sparks) {
                k.drawRect({ pos: k.vec2(s.x, s.y), width: 4, height: 4, color: k.rgb(...(s.ok ? [160, 255, 190] : [255, 220, 120])), opacity: s.life * 2 });
            }
        },
        onClose: onDone,
    });

    function drawCode(k, ui, st) {
        const { box } = ui;
        // LCD
        k.drawRect({ pos: box.add(0, 8), width: 180, height: 76, radius: 6, color: k.rgb(20, 40, 28) });
        const shown = st.entered.padEnd(4, "-").split("").join(" ");
        k.drawText({ text: shown, pos: box.add(90, 48), size: FONT.huge, anchor: "center", color: k.rgb(140, 255, 170) });
        k.drawText({ text: "Cyfry lub klik\nC - wyczyść", pos: box.add(0, 110), size: FONT.small, lineSpacing: 10, color: k.rgb(...INK.soft) });
        // pads
        PAD_KEYS.forEach((key, i) => {
            const p = padPos(i, box);
            const hover = ui.mouse.x >= p.x && ui.mouse.x <= p.x + PAD && ui.mouse.y >= p.y && ui.mouse.y <= p.y + PAD;
            k.drawRect({ pos: p.add(0, 4), width: PAD, height: PAD, radius: 8, color: k.rgb(20, 24, 28) });
            k.drawRect({ pos: p, width: PAD, height: PAD, radius: 8, color: k.rgb(...(hover ? [90, 100, 110] : [60, 66, 74])) });
            k.drawText({ text: key, pos: p.add(PAD / 2, PAD / 2 + 2), size: FONT.big, anchor: "center", color: k.rgb(230, 235, 240) });
        });
    }

    function drawWires(k, ui, st, pr) {
        const { box } = ui;
        for (let i = 0; i < KP.wires; i++) {
            const y = wireY(box, i);
            const done = i < pr.wire;
            const active = i === pr.wire;
            const col = done ? [120, 255, 160] : active ? [230, 120, 70] : [90, 70, 60];
            if (active) {
                // wire with a gap; the gap zone is highlighted
                const gx = box.x + st.gapAt * W, gw = KP.gap * W;
                k.drawRect({ pos: k.vec2(gx, y - 16), width: gw, height: 32, radius: 4, color: k.rgb(255, 220, 110), opacity: 0.25 });
                k.drawLine({ p1: k.vec2(box.x, y), p2: k.vec2(gx, y), width: 6, color: k.rgb(...col) });
                k.drawLine({ p1: k.vec2(gx + gw, y), p2: k.vec2(box.x + W, y), width: 6, color: k.rgb(...col) });
                const px = box.x + st.pulse * W;
                k.drawCircle({ pos: k.vec2(px, y), radius: 9, color: k.rgb(255, 255, 220) });
                k.drawCircle({ pos: k.vec2(px, y), radius: 16, color: k.rgb(255, 240, 150), opacity: 0.3 });
            } else {
                k.drawLine({ p1: k.vec2(box.x, y), p2: k.vec2(box.x + W, y), width: 6, color: k.rgb(...col) });
            }
            k.drawCircle({ pos: k.vec2(box.x, y), radius: 7, color: k.rgb(200, 200, 210) });
            k.drawCircle({ pos: k.vec2(box.x + W, y), radius: 7, color: k.rgb(200, 200, 210) });
        }
        k.drawText({ text: `Przewody: ${pr.wire}/${KP.wires}`, pos: box.add(0, H - 30), size: FONT.small, color: k.rgb(...INK.text) });
    }
}

function wireY(box, i) {
    return box.y + 50 + i * 80;
}
