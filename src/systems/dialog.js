import { DIALOG as D } from "../config.js";
import { SPEAKERS } from "../story/script.js";
import { sfx } from "./audio.js";

// Undertale-style textbox on the "ui" layer.
//
//   await showDialog(k, [{ who: "player", text: "..." }, ...]);
//
// Text appears letter by letter with a "voice" blip. Space / E / Enter / LMB:
// first press finishes the line, the next press goes to the next line.
// While a dialog is open isDialogOpen() is true: the game pauses teachers and the player.

// Open boxes are tracked by object, not by a counter: a scene change (Esc in a cutscene,
// game over) destroys a box without finishing it, and a counter would stay > 0 forever.
const boxes = new Set();
let closedAt = -Infinity;

export function isDialogOpen() {
    for (const b of boxes) {
        if (b.exists()) return true;
        boxes.delete(b);
    }
    return false;
}

/**
 * Another window that pauses the world like a dialog (e.g. the quest notebook): while
 * `obj` exists isDialogOpen() is true; after it is destroyed input waits closeGrace too.
 */
export function holdWorld(k, obj) {
    boxes.add(obj);
    obj.onDestroy(() => (closedAt = k.time()));
}

/** True while a dialog is open or was closed a moment ago (so its last key press is not reused). */
export const dialogBlocksInput = (k) => isDialogOpen() || k.time() - closedAt < D.closeGrace;

export function showDialog(k, lines) {
    if (!lines?.length) return Promise.resolve();
    return new Promise((resolve) => {
        const boxPos = k.vec2((k.width() - D.width) / 2, k.height() - D.height - D.bottomMargin);
        const portraitSize = 16 * D.portraitScale;
        const st = { index: 0, shown: 0, pause: 0, wait: D.inputDelay, blip: 0, wrapped: "" };

        const speaker = () => SPEAKERS[lines[st.index].who] ?? SPEAKERS.narrator;
        const prepare = () => {
            const sp = speaker();
            const textX = sp.portrait ? D.padding * 2 + portraitSize : D.padding;
            const text = (sp.portrait ? "" : "* ") + lines[st.index].text;
            st.textX = textX;
            st.wrapped = wrap(k, text, D.width - textX - D.padding, D.textSize);
            st.shown = 0;
            st.pause = 0;
            st.blip = 0;
        };
        prepare();

        const done = () => st.shown >= st.wrapped.length;
        const finish = () => {
            box.destroy();
            closedAt = k.time();
            resolve();
        };

        const box = k.add([
            k.layer("ui"),
            k.fixed(),
            k.z(200),
            "dialog",
            {
                update() {
                    const dt = k.dt();
                    st.wait -= dt;
                    const pressed =
                        st.wait <= 0 &&
                        (k.isKeyPressed("space") || k.isKeyPressed("e") || k.isKeyPressed("enter") || k.isMousePressed("left"));
                    if (pressed) {
                        if (!done()) st.shown = st.wrapped.length;
                        else if (++st.index >= lines.length) return finish();
                        else prepare();
                        st.wait = 0.08;
                        return;
                    }
                    if (done()) return;
                    if (st.pause > 0) {
                        st.pause -= dt;
                        return;
                    }
                    const before = Math.floor(st.shown);
                    st.shown = Math.min(st.wrapped.length, st.shown + dt * D.charsPerSec);
                    for (let i = before; i < Math.floor(st.shown); i++) {
                        const ch = st.wrapped[i];
                        if (".!?".includes(ch)) st.pause = D.punctPause;
                        else if (",:-".includes(ch)) st.pause = D.punctPause / 2;
                        if (/\S/.test(ch) && st.blip++ % D.blipEvery === 0) sfx("voice", speaker().voice);
                        if (st.pause > 0) {
                            st.shown = i + 1;
                            break;
                        }
                    }
                },
                draw() {
                    const sp = speaker();
                    const white = k.rgb(255, 255, 255);
                    // frame: black box, thick white border (Undertale)
                    k.drawRect({ pos: boxPos, width: D.width, height: D.height, color: white });
                    k.drawRect({
                        pos: boxPos.add(D.border, D.border),
                        width: D.width - D.border * 2,
                        height: D.height - D.border * 2,
                        color: k.rgb(0, 0, 0),
                    });
                    if (sp.portrait) {
                        k.drawSprite({
                            sprite: sp.portrait,
                            pos: boxPos.add(D.padding, (D.height - portraitSize) / 2),
                            width: portraitSize,
                            height: portraitSize,
                        });
                    }
                    if (sp.name) {
                        const tab = boxPos.add(D.padding, -34);
                        const w = k.formatText({ text: sp.name, size: 32 }).width + 28;
                        k.drawRect({ pos: tab, width: w, height: 34, color: white });
                        k.drawRect({ pos: tab.add(3, 3), width: w - 6, height: 31, color: k.rgb(0, 0, 0) });
                        k.drawText({ text: sp.name, pos: tab.add(14, 5), size: 32, color: k.rgb(255, 230, 120) });
                    }
                    k.drawText({
                        text: st.wrapped.slice(0, Math.floor(st.shown)),
                        pos: boxPos.add(st.textX, sp.portrait ? (D.height - portraitSize) / 2 + D.textTopOffset : D.padding),
                        size: D.textSize,
                        lineSpacing: D.lineSpacing,
                        color: k.rgb(...sp.color),
                    });
                    // "next" arrow, bobbing
                    if (done()) {
                        const a = boxPos.add(D.width - 34, D.height - 30 + Math.sin(k.time() * 6) * 3);
                        k.drawTriangle({ p1: a, p2: a.add(16, 0), p3: a.add(8, 10), color: white });
                    }
                },
            },
        ]);
        boxes.add(box);
        box.st = st; // handy for debugging from the console
    });
}

/** Word wrap with explicit newlines, so the typewriter never makes words jump lines. */
function wrap(k, text, maxWidth, size) {
    const out = [];
    for (const para of text.split("\n")) {
        let line = "";
        for (const word of para.split(" ")) {
            const test = line ? `${line} ${word}` : word;
            if (line && k.formatText({ text: test, size }).width > maxWidth) {
                out.push(line);
                line = word;
            } else line = test;
        }
        out.push(line);
    }
    return out.join("\n");
}
