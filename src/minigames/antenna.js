import { ANTENNA as A, FONT } from "../config.js";
import { sfx } from "../systems/audio.js";
import { openMinigame } from "./frame.js";
import { INK } from "../ui/paper.js";

// Terminal 2: "Strojenie anteny". The oscilloscope shows the jammed school signal
// (yellow, slowly drifting, with an occasional interference jump) and your wave (green).
// A/D = frequency, W/S = amplitude (arrows work too). Two sliders under the screen show
// where the target is (yellow zone) and where you are: bring both markers into the
// zones and hold until the signal locks. Being far off for long makes the speaker squeal.
// Lock progress is kept on the terminal (Esc is safe).

const W = 460, H = 290;
const SCOPE_H = 130;
// how much each axis counts in the mismatch (frequency errors are easier to see)
const FREQ_W = 2.2, AMP_W = 1.4;

export function startAntenna(k, player, term, reward, onDone) {
    const rand = (a, b) => a + Math.random() * (b - a);
    // the target starts away from where your wave starts
    term.progress ??= { fp: A.freqMin + 0.3, ap: A.ampMax - 0.1, lock: 0 };
    const pr = term.progress;
    const st = {
        ft: rand(A.freqMin + 1.5, A.freqMax - 0.5),
        at: rand(A.ampMin + 0.1, 0.55),
        squeal: 0, // s of a bad match
        jump: rand(...A.jumpEvery),
        phase: 0,
        done: false,
    };
    term.st = st; // handy for debugging from the console

    const fRange = A.freqMax - A.freqMin, aRange = A.ampMax - A.ampMin;
    // 0 = perfect match, 1 = way off
    const mismatch = () => Math.min(1, (Math.abs(pr.fp - st.ft) / fRange) * FREQ_W + (Math.abs(pr.ap - st.at) / aRange) * AMP_W);
    // half-widths of the slider zones: inside both zones = matched
    const fZone = ((A.tolerance / 2) / FREQ_W) * fRange;
    const aZone = ((A.tolerance / 2) / AMP_W) * aRange;

    const held = (...keys) => keys.some((key) => k.isKeyDown(key));

    openMinigame(k, player, {
        title: "Terminal 2: strojenie anteny",
        hint: "Wprowadź oba znaczniki w żółte pola",
        width: W,
        height: H,
        update(dt, ui) {
            st.phase += dt * 3;
            if (st.done) return;
            // slow drift + an occasional interference jump
            st.ft += Math.sin(k.time() * 0.7) * A.driftSpeed * dt;
            st.at += Math.cos(k.time() * 0.9) * A.driftSpeed * 0.3 * dt;
            st.jump -= dt;
            if (st.jump <= 0) {
                st.jump = rand(...A.jumpEvery);
                st.ft += rand(-A.jumpFreq, A.jumpFreq);
                st.at += rand(-A.jumpAmp, A.jumpAmp);
                sfx("whoosh");
            }
            st.ft = Math.min(A.freqMax - 0.3, Math.max(A.freqMin + 0.3, st.ft));
            st.at = Math.min(A.ampMax - 0.05, Math.max(A.ampMin + 0.05, st.at));
            if (ui.busy()) return;
            // your wave
            if (held("a", "left")) pr.fp -= A.freqSpeed * dt;
            if (held("d", "right")) pr.fp += A.freqSpeed * dt;
            if (held("s", "down")) pr.ap -= A.ampSpeed * dt;
            if (held("w", "up")) pr.ap += A.ampSpeed * dt;
            pr.fp = Math.min(A.freqMax, Math.max(A.freqMin, pr.fp));
            pr.ap = Math.min(A.ampMax, Math.max(A.ampMin, pr.ap));

            const m = mismatch();
            if (m < A.tolerance) pr.lock = Math.min(1, pr.lock + dt / A.holdTime);
            else pr.lock = Math.max(0, pr.lock - (dt / A.holdTime) * A.lockDecay);
            // being way off for too long -> the speaker squeals
            if (m > A.squealAt) st.squeal += dt;
            else st.squeal = Math.max(0, st.squeal - dt);
            if (st.squeal >= A.squealTime) {
                st.squeal = 0;
                sfx("squeal");
                ui.noise(A.squealNoise, "PISK!");
                ui.say("PISK!", INK.red, 0.8);
            }
            if (pr.lock >= 1) {
                st.done = true;
                sfx("success");
                ui.noise(A.lockNoise);
                ui.say(`Kod: ${reward}`, INK.green, 2);
                ui.finish(1.8);
            }
        },
        draw(ui) {
            const { box } = ui;
            const mid = box.y + SCOPE_H / 2;
            // oscilloscope screen + grid
            k.drawRect({ pos: box, width: W, height: SCOPE_H, radius: 6, color: k.rgb(8, 26, 16) });
            for (let x = 0; x <= W; x += W / 8) k.drawLine({ p1: k.vec2(box.x + x, box.y), p2: k.vec2(box.x + x, box.y + SCOPE_H), width: 1, color: k.rgb(20, 60, 36) });
            for (let y = 0; y <= SCOPE_H; y += SCOPE_H / 4) k.drawLine({ p1: k.vec2(box.x, box.y + y), p2: k.vec2(box.x + W, box.y + y), width: 1, color: k.rgb(20, 60, 36) });
            const wave = (f, a, ph, jitter) => {
                const pts = [];
                for (let i = 0; i <= 64; i++) {
                    const t = i / 64;
                    const noise = jitter ? (Math.random() - 0.5) * jitter : 0;
                    pts.push(k.vec2(box.x + t * W, mid - Math.sin(t * f * Math.PI * 2 + ph) * (a * SCOPE_H * 0.45) + noise));
                }
                return pts;
            };
            k.drawLines({ pts: wave(st.ft, st.at, st.phase, st.done ? 0 : 4), width: 3, color: k.rgb(255, 210, 90), opacity: 0.85 });
            k.drawLines({ pts: wave(pr.fp, pr.ap, st.phase, 0), width: 3, color: k.rgb(...(st.done ? [255, 255, 255] : [120, 255, 160])) });

            // sliders: yellow zone = target, marker = you (green when inside the zone)
            const slider = (y, label, keys, value, min, max, target, zone) => {
                const sx = box.x + 150, sw = W - 150;
                const at = (v) => sx + ((v - min) / (max - min)) * sw;
                const inside = Math.abs(value - target) <= zone;
                k.drawText({ text: label, pos: k.vec2(box.x, y - 4), size: FONT.small, color: k.rgb(...INK.text) });
                k.drawText({ text: keys, pos: k.vec2(box.x + 96, y - 4), size: FONT.small, color: k.rgb(...INK.soft) });
                k.drawRect({ pos: k.vec2(sx, y + 4), width: sw, height: 8, radius: 4, color: k.rgb(60, 64, 70) });
                const z0 = Math.max(sx, at(target - zone)), z1 = Math.min(sx + sw, at(target + zone));
                k.drawRect({ pos: k.vec2(z0, y - 2), width: z1 - z0, height: 20, radius: 4, color: k.rgb(255, 205, 70), opacity: 0.85 });
                const mx = at(value);
                k.drawRect({ pos: k.vec2(mx - 4, y - 6), width: 8, height: 28, radius: 3, color: k.rgb(...(inside ? [40, 170, 80] : [44, 40, 58])) });
            };
            const sy = box.y + SCOPE_H + 22;
            slider(sy, "Częst.", "A/D", pr.fp, A.freqMin, A.freqMax, st.ft, fZone);
            slider(sy + 38, "Ampl.", "S/W", pr.ap, A.ampMin, A.ampMax, st.at, aZone);

            // signal bars (the "zasięg" icon) + lock progress
            const m = st.done ? 0 : mismatch();
            const bars = st.done ? 4 : Math.max(0, Math.min(4, Math.round((1 - m) * 4.4 - 0.2)));
            const by = box.y + H - 22;
            for (let i = 0; i < 4; i++) {
                const bh = 8 + i * 7;
                k.drawRect({ pos: k.vec2(box.x + i * 14, by - bh + 14), width: 10, height: bh, color: k.rgb(...(i < bars ? [60, 170, 90] : [150, 150, 150])) });
            }
            const lx = box.x + 70, lw = W - 70;
            k.drawRect({ pos: k.vec2(lx, by), width: lw, height: 16, radius: 8, color: k.rgb(60, 64, 70) });
            k.drawRect({ pos: k.vec2(lx, by), width: Math.max(16, lw * pr.lock), height: 16, radius: 8, color: k.rgb(60, 190, 100) });
            k.drawText({
                text: st.done ? "Sygnał zablokowany" : st.squeal > A.squealTime * 0.5 ? "Za daleko od sygnału!" : "Synchronizacja",
                pos: k.vec2(lx, by - 30),
                size: FONT.small,
                color: k.rgb(...(st.squeal > A.squealTime * 0.5 ? INK.red : INK.text)),
            });
        },
        onClose: onDone,
    });
}
