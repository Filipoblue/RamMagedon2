import { QTE, FONT } from "../config.js";
import { sfx } from "../systems/audio.js";
import { openMinigame, drawKeyCap } from "./frame.js";
import { INK } from "../ui/paper.js";

// Terminal 1: "Restart routera". Three rounds of a random W/A/S/D sequence; type it
// without a mistake before the time runs out. A wrong key or a timeout restarts the
// round and makes a loud noise. Finished rounds are kept on the terminal (Esc is safe).

const W = 460, H = 250, CAP = 56;

/**
 * @param {object} term the terminal (gets .progress)
 * @param {string} reward code digits shown at the end
 * @param {(ok: boolean) => void} onDone
 */
export function startQte(k, player, term, reward, onDone) {
    term.progress ??= { round: 0 };
    const pr = term.progress;
    const st = { seq: [], typed: 0, time: QTE.roundTime, done: false };
    term.st = st; // handy for debugging from the console

    const newRound = () => {
        const len = QTE.lengths[pr.round];
        st.seq = Array.from({ length: len }, () => QTE.keys[Math.floor(Math.random() * QTE.keys.length)]);
        st.typed = 0;
        st.time = QTE.roundTime;
    };
    newRound();

    const press = (key) => (ui) => {
        if (st.done) return;
        if (st.seq[st.typed] !== key) {
            ui.fail("BŁĄD!", QTE.failNoise);
            return newRound();
        }
        st.typed++;
        sfx("click");
        if (st.typed < st.seq.length) return;
        // round finished
        pr.round++;
        ui.noise(QTE.roundNoise);
        if (pr.round >= QTE.lengths.length) {
            st.done = true;
            sfx("success");
            ui.say(`Kod: ${reward}`, INK.green, 2);
            return ui.finish(1.8);
        }
        sfx("pickup");
        ui.say(`Runda ${pr.round + 1}/${QTE.lengths.length}`, INK.blue, 0.8);
        ui.pause(0.8);
        newRound();
    };

    const keys = {};
    for (const key of QTE.keys) keys[key] = press(key);

    openMinigame(k, player, {
        title: "Terminal 1: restart routera",
        hint: () => (st.done ? "Router działa!" : `Wpisz sekwencję, runda ${pr.round + 1}/${QTE.lengths.length}`),
        width: W,
        height: H,
        keys,
        update(dt, ui) {
            if (st.done || ui.busy()) return;
            st.time -= dt;
            if (st.time <= 0) {
                ui.fail("ZA WOLNO!", QTE.failNoise);
                newRound();
            }
        },
        draw(ui) {
            const { box } = ui;
            // round pips
            for (let i = 0; i < QTE.lengths.length; i++) {
                const p = box.add(W - 20 - (QTE.lengths.length - 1 - i) * 28, 10);
                k.drawCircle({ pos: p, radius: 9, color: k.rgb(...(i < pr.round ? [120, 255, 160] : [60, 70, 70])) });
            }
            // the sequence as key caps
            const n = st.seq.length;
            const gap = 10;
            const rowW = n * CAP + (n - 1) * gap;
            const x0 = box.x + (W - rowW) / 2;
            st.seq.forEach((key, i) => {
                const typed = i < st.typed || st.done;
                const current = i === st.typed && !st.done;
                const bob = current ? Math.sin(k.time() * 10) * 2 : 0;
                drawKeyCap(k, k.vec2(x0 + i * (CAP + gap), box.y + 60 + bob), CAP, key.toUpperCase(), {
                    fill: typed ? [90, 200, 120] : [225, 232, 228],
                    outline: current ? [255, 220, 110] : null,
                });
            });
            // time bar
            const frac = st.done ? 1 : Math.max(0, st.time / QTE.roundTime);
            const bar = box.add(0, 170);
            const col = frac > 0.5 ? [120, 255, 160] : frac > 0.25 ? [255, 220, 110] : [255, 90, 90];
            k.drawRect({ pos: bar, width: W, height: 18, radius: 9, color: k.rgb(40, 46, 50) });
            k.drawRect({ pos: bar, width: Math.max(18, W * frac), height: 18, radius: 9, color: k.rgb(...col) });
            k.drawText({ text: st.done ? `Fragment kodu: ${reward}` : `${Math.max(0, st.time).toFixed(1)} s`, pos: bar.add(0, 34), size: FONT.small, color: k.rgb(...INK.text) });
        },
        onClose: onDone,
    });
}
