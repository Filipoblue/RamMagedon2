import { FONT, NOTEBOOK } from "../config.js";
import { holdWorld } from "../systems/dialog.js";
import { sfx } from "../systems/audio.js";
import { drawPaper, scribble, INK } from "./paper.js";
import { keyChip } from "./hud.js";

// Quest notebook (Esc / H in game): the level's quest, the current goal and the controls
// on one taped notebook page. While it is open the world is paused (like a dialog).
//
//   openNotebook(k, { quest, goal: () => string, recap: bool })
//   quest = QUESTS[level id] from story/script.js; recap = also show the story in short

const CONTROLS = [
    ["W A S D", "ruch"],
    ["Mysz", "celowanie latarką"],
    ["F / PPM", "latarka wł. / wył."],
    ["E", "interakcja, kradzież"],
    ["Q", "rzut piłeczką"],
    ["Esc", "ten notatnik, wyjście z minigierki"],
    ["M", "dźwięk"],
];

export function openNotebook(k, o) {
    const S = FONT.small, B = FONT.big;
    const W = NOTEBOOK.width, H = NOTEBOOK.height;
    const left = 48, colW = NOTEBOOK.questWidth;
    const right = left + colW + 50;
    const st = { t: 0, alpha: 0 };

    const textH = (text, width) => k.formatText({ text, size: S, width, lineSpacing: NOTEBOOK.lineSpacing }).height;
    const para = (text, pos, width, color, alpha) => {
        k.drawText({ text, pos, size: S, width, lineSpacing: NOTEBOOK.lineSpacing, color: k.rgb(...color), opacity: alpha });
        return textH(text, width);
    };

    const obj = k.add([
        k.layer("ui"),
        k.fixed(),
        k.z(190),
        {
            update() {
                st.t += k.dt();
                st.alpha = Math.min(1, st.alpha + k.dt() * 8);
                if (st.t < NOTEBOOK.inputDelay) return;
                if (["escape", "h", "enter", "space"].some((key) => k.isKeyPressed(key)) || k.isMousePressed("left")) {
                    sfx("menuMove");
                    obj.destroy();
                }
            },
            draw() {
                const a = st.alpha;
                const p = k.vec2((k.width() - W) / 2, (k.height() - H) / 2 + (1 - a) * 16);
                k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: k.rgb(0, 0, 0), opacity: 0.5 * a });
                drawPaper(k, p, W, H, { seed: 17, tape: true, opacity: a });

                // ---- left: the quest ----
                k.drawText({ text: "Zadanie", pos: p.add(left, 28), size: B, color: k.rgb(...INK.red), opacity: a });
                scribble(k, p.x + left, p.y + 66, k.formatText({ text: "Zadanie", size: B }).width, INK.red, a);
                let y = 92;
                if (o.recap && o.quest?.recap) y += para(o.quest.recap, p.add(left, y), colW, INK.soft, a) + 16;
                (o.quest?.steps ?? []).forEach((step, i) => {
                    k.drawText({ text: `${i + 1}.`, pos: p.add(left, y), size: S, color: k.rgb(...INK.red), opacity: a });
                    y += para(step, p.add(left + 30, y), colW - 30, INK.text, a) + 10;
                });
                const goal = o.goal?.();
                if (goal) {
                    y += 6;
                    k.drawRect({ pos: p.add(left, y + 4), width: 12, height: 12, fill: false, outline: { width: 2, color: k.rgb(...INK.blue) }, opacity: a });
                    para(`Teraz: ${goal}`, p.add(left + 20, y), colW - 20, INK.blue, a);
                }

                // ---- right: controls ----
                k.drawText({ text: "Sterowanie", pos: p.add(right, 28), size: B, color: k.rgb(...INK.red), opacity: a });
                scribble(k, p.x + right, p.y + 66, k.formatText({ text: "Sterowanie", size: B }).width, INK.red, a);
                CONTROLS.forEach(([key, what], i) => {
                    const cy = 92 + i * NOTEBOOK.rowH;
                    keyChip(k, p.add(right, cy), key, a);
                    k.drawText({ text: what, pos: p.add(right + 130, cy + 8), size: S, width: W - right - 150, color: k.rgb(...INK.text), opacity: a });
                });

                k.drawText({ text: "Esc / Enter - wracam do gry", pos: p.add(W / 2, H - 40), size: S, anchor: "center", color: k.rgb(...INK.soft), opacity: a });
            },
        },
    ]);
    holdWorld(k, obj);
    sfx("menuMove");
    return obj;
}
