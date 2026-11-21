import { DEBUG, FONT } from "../config.js";
import { LEVELS } from "../level/rooms.js";
import { drawPaper, scribble, INK } from "../ui/paper.js";
import { sfx } from "./audio.js";

// Debug menu (DEBUG.key, default P), works in every scene: jump to any level or cutscene.
// While it is open the game is paused and keys go only to the menu
// (W/S or arrows = choose, Enter = go, Esc / P = close).

const ENTRIES = [
    { label: "Menu główne", go: (k) => k.go("menu") },
    { label: "Cutscenka 1: dach (intro)", go: (k) => k.go("cutscene", { id: "intro", next: { levelIndex: 0 } }) },
    ...LEVELS.map((l, i) => ({ label: l.name, go: (k) => k.go("game", { levelIndex: i }) })),
    { label: "Cutscenka 2: korytarz + telefon", go: (k) => k.go("cutscene", { id: "escape", next: { levelIndex: 1 } }) },
    { label: "Cutscenka 3: dziedziniec (outro)", go: (k) => k.go("cutscene", { id: "outro", next: { scene: "win", params: { ram: 2, time: 0 } } }) },
    { label: "Ekran wygranej", go: (k) => k.go("win", { ram: 2, time: 0 }) },
    { label: "Ekran przegranej", go: (k) => k.go("gameover", { levelIndex: 0 }) },
];

export function initDebugMenu(k) {
    if (!DEBUG.enabled) return;
    const st = { open: false, sel: 0 };
    const W = 620, ROW = 40, H = 150 + ENTRIES.length * ROW;

    const setOpen = (open) => {
        st.open = open;
        k.debug.paused = open; // freeze the scene (drawing goes on)
        sfx("menuMove");
    };

    // Keys are caught before the game sees them (capture phase), so nothing else reacts.
    window.addEventListener("keydown", (e) => {
        const key = e.key.toLowerCase();
        if (!st.open && key !== DEBUG.key) return;
        e.stopPropagation();
        e.preventDefault();
        if (e.repeat && !["arrowup", "arrowdown", "w", "s"].includes(key)) return;
        if (!st.open) return setOpen(true);
        if (key === DEBUG.key || key === "escape") return setOpen(false);
        if (key === "w" || key === "arrowup") st.sel = (st.sel - 1 + ENTRIES.length) % ENTRIES.length;
        else if (key === "s" || key === "arrowdown") st.sel = (st.sel + 1) % ENTRIES.length;
        else if (key === "enter" || key === "e" || key === " ") {
            setOpen(false);
            sfx("menuSelect");
            ENTRIES[st.sel].go(k);
        }
    }, true);
    window.addEventListener("keyup", (e) => st.open && e.stopPropagation(), true);

    function draw() {
        if (!st.open) return;
        const p = k.vec2((k.width() - W) / 2, (k.height() - H) / 2);
        k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: k.rgb(0, 0, 0), opacity: 0.6 });
        drawPaper(k, p, W, H, { seed: 77, tape: true });
        k.drawText({ text: "Debug: skocz do...", pos: p.add(48, 26), size: FONT.big, color: k.rgb(...INK.red) });
        scribble(k, p.x + 48, p.y + 64, k.formatText({ text: "Debug: skocz do...", size: FONT.big }).width, INK.red);
        ENTRIES.forEach((e, i) => {
            const on = i === st.sel;
            k.drawText({ text: (on ? "> " : "  ") + e.label, pos: p.add(48, 86 + i * ROW), size: FONT.small, color: k.rgb(...(on ? INK.red : INK.text)) });
        });
        k.drawText({ text: "W/S - wybór, Enter - idź, Esc / P - zamknij", pos: p.add(W / 2, H - 30), size: FONT.small, anchor: "center", color: k.rgb(...INK.soft) });
    }

    // One object that survives scene changes (stay), drawn on top of everything.
    k.add([k.stay(), k.layer("ui"), k.fixed(), k.z(10000), { draw }]);
}
