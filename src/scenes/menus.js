import { TOTAL_RAM } from "../level/rooms.js";
import { MENU } from "../config.js";
import { AUTHORS } from "../story/script.js";
import { playMusic, sfx, isMuted } from "../systems/audio.js";
import { settings } from "../story/progress.js";
import { drawPaper, scribble, INK } from "../ui/paper.js";

const PLN_PER_RAM = 525; // humour: GDD "4 200 PLN - starczy na bułkę w sklepiku"

// game over screen: reason (from scenes/game.js caught()) -> [title, line]
const GAME_OVER = {
    teacher: ["ZŁAPANY!", "-20 punktów i rozmowa z rodzicami."],
    mieciu: ["ZŁAPANY!", "I to tyle, nie będzie przejażdżki windą."],
    lola: ["Miss LOLA!", "Jak było na spotkaniu?"],
    timeout: ["ZA PÓŹNO!", "Pan Mieciu zablokował wyjście na cztery spusty."],
};
const GREEN = [120, 255, 160];
const YELLOW = [255, 230, 120];
const GREY = [170, 170, 190];

function centerText(k, txt, y, size, color = [255, 255, 255]) {
    return k.add([k.text(txt, { size, align: "center", width: k.width() - 80 }), k.pos(k.width() / 2, y), k.anchor("center"), k.color(...color)]);
}

function onContinue(k, action) {
    let used = false;
    const once = () => {
        if (used) return;
        used = true;
        sfx("menuSelect");
        action();
    };
    k.onKeyPress("enter", once);
    k.onKeyPress("space", once);
    k.onMousePress("left", once);
}

const CONTROLS = [
    ["WASD / strzałki", "ruch"],
    ["Mysz", "celowanie latarką"],
    ["F / PPM", "latarka wł. / wył."],
    ["E", "interakcja, kradzież RAM"],
    ["Spacja / E / Enter", "dalej w dialogu"],
    ["Esc", "zadanie / wyjście z minigierki"],
    ["M", "wycisz dźwięk"],
];

export function menuScenes(k) {
    k.scene("menu", () => {
        playMusic("menu");
        addMenuBackground(k);
        addLogo(k);

        const startGame = (skip) => {
            settings.skipStory = skip;
            if (skip) k.go("game", { levelIndex: 0 });
            else k.go("cutscene", { id: "intro", next: { levelIndex: 0 } });
        };
        const items = [
            { label: "Start", action: () => openModal("skip") },
            { label: "Sterowanie i Autorzy", action: () => openModal("controls") },
            { label: "Wyjdź", action: () => k.go("quit") },
        ];
        // modal: null | "controls" | "skip" (the "skip the story?" question, choice 0 / 1)
        const ui = { sel: 0, modal: null, modalOpenedAt: 0, choice: 0 };
        const btnW = 440, btnH = 52;
        const btnPos = (i) => k.vec2(k.width() / 2 - btnW / 2, 400 + i * 66);
        const hit = (i, m) => {
            const p = btnPos(i);
            return m.x >= p.x && m.x <= p.x + btnW && m.y >= p.y && m.y <= p.y + btnH;
        };
        const choiceHit = (m) => SKIP_CHOICES.findIndex((_, i) => {
            const r = skipChoiceRect(k, i);
            return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
        });
        const move = (d) => {
            ui.sel = (ui.sel + d + items.length) % items.length;
            sfx("menuMove");
        };
        function openModal(name) {
            ui.modal = name;
            ui.choice = 0;
            ui.modalOpenedAt = k.time();
        }
        const activate = () => {
            sfx("menuSelect");
            items[ui.sel].action();
        };
        const closeModal = () => {
            if (k.time() - ui.modalOpenedAt < 0.1) return;
            ui.modal = null;
            sfx("menuMove");
        };
        const confirm = () => {
            if (k.time() - ui.modalOpenedAt < 0.1) return;
            if (ui.modal === "skip") {
                sfx("menuSelect");
                startGame(ui.choice === 1);
            } else closeModal();
        };
        const pick = (d) => {
            if (ui.modal !== "skip") return;
            ui.choice = (ui.choice + d + 2) % 2;
            sfx("menuMove");
        };

        k.onKeyPress(["w", "up"], () => (ui.modal ? pick(-1) : move(-1)));
        k.onKeyPress(["s", "down"], () => (ui.modal ? pick(1) : move(1)));
        k.onKeyPress(["a", "left"], () => pick(-1));
        k.onKeyPress(["d", "right"], () => pick(1));
        k.onKeyPress(["enter", "space", "e"], () => (ui.modal ? confirm() : activate()));
        k.onKeyPress("escape", () => ui.modal && closeModal());
        k.onMouseMove(() => {
            if (ui.modal === "skip") {
                const i = choiceHit(k.mousePos());
                if (i >= 0 && i !== ui.choice) pick(i - ui.choice);
                return;
            }
            if (ui.modal) return;
            const i = items.findIndex((_, i) => hit(i, k.mousePos()));
            if (i >= 0 && i !== ui.sel) move(i - ui.sel);
        });
        k.onMousePress("left", () => {
            if (ui.modal === "skip") {
                const i = choiceHit(k.mousePos());
                if (i < 0) return closeModal();
                ui.choice = i;
                return confirm();
            }
            if (ui.modal) return closeModal();
            const i = items.findIndex((_, i) => hit(i, k.mousePos()));
            if (i >= 0) {
                ui.sel = i;
                activate();
            }
        });

        k.add([
            k.z(10),
            {
                draw() {
                    items.forEach((it, i) => {
                        // torn paper strips; the selected one sticks out and gets underlined
                        const on = i === ui.sel && !ui.modal;
                        const p = btnPos(i).add(on ? 14 : 0, 0);
                        drawPaper(k, p, btnW, btnH, { seed: 40 + i, lines: false, margin: false, color: on ? undefined : [212, 206, 190] });
                        k.drawText({ text: it.label, pos: p.add(btnW / 2, btnH / 2 + 2), size: 48, anchor: "center", color: k.rgb(...(on ? INK.red : INK.text)) });
                        if (on) {
                            const tw = k.formatText({ text: it.label, size: 48 }).width;
                            scribble(k, p.x + (btnW - tw) / 2, p.y + btnH - 10, tw, INK.red);
                        }
                    });
                    k.drawText({
                        text: `W/S + Enter lub mysz   ·   M: dźwięk ${isMuted() ? "wył." : "wł."}`,
                        pos: k.vec2(k.width() / 2, k.height() - 28), size: 32, anchor: "center", color: k.rgb(...GREY), opacity: 0.8,
                    });
                    if (ui.modal === "controls") drawControlsModal(k);
                    if (ui.modal === "skip") drawSkipModal(k, ui.choice);
                },
            },
        ]);
    });

    k.scene("quit", () => {
        playMusic(null);
        addMenuBackground(k, 0.35);
        centerText(k, "A ty gdzie uciekasz?", k.height() / 2 - 60, 96, [255, 110, 110]);
        centerText(k, "Wracaj do grania!", k.height() / 2 + 20, 48);
        centerText(k, "ENTER / klik - wróć do menu", k.height() / 2 + 110, 32, GREY);
        onContinue(k, () => k.go("menu"));
    });

    // retry = same level again, with the RAM count from when that level started
    k.scene("gameover", ({ ram = 0, levelIndex = 0, retryRun = null, reason = "teacher" } = {}) => {
        playMusic(null);
        sfx("caught");
        const [title, line] = GAME_OVER[reason] ?? GAME_OVER.teacher;
        centerText(k, title, k.height() / 2 - 80, 96, [255, 90, 90]);
        centerText(k, line, k.height() / 2, 48);
        centerText(k, `Skradzione kości: ${ram}/${TOTAL_RAM}`, k.height() / 2 + 40, 48, GREY);
        centerText(k, "ENTER / klik - spróbuj ponownie", k.height() / 2 + 110, 48, YELLOW);
        onContinue(k, () => k.go("game", { levelIndex, run: retryRun && { ...retryRun } }));
    });

    k.scene("win", ({ ram = 0, time = 0 } = {}) => {
        playMusic("menu");
        sfx("success");
        const value = ram * PLN_PER_RAM;
        centerText(k, "UCIECZKA UDANA!", k.height() / 2 - 100, 96, GREEN);
        centerText(k, `Czas: ${time.toFixed(1)} s`, k.height() / 2 - 20, 48);
        centerText(k, `Skradzione kości RAM: ${ram}/${TOTAL_RAM}`, k.height() / 2 + 15, 48);
        centerText(k, `Wartość łupu: ${value.toLocaleString("pl-PL")} PLN - starczy na bułkę w sklepiku`, k.height() / 2 + 50, 48, YELLOW);
        centerText(k, "ENTER / klik - menu", k.height() / 2 + 120, 48, GREY);
        onContinue(k, () => k.go("menu"));
    });
}

// ---------- menu pieces ----------

/** Binary rain + a teacher's flashlight sweeping across the screen. */
function addMenuBackground(k, dim = 1) {
    const cols = Array.from({ length: MENU.rainColumns }, (_, i) => ({
        x: (i + 0.5) * (k.width() / MENU.rainColumns),
        y: k.rand(-k.height(), k.height()),
        speed: k.rand(MENU.rainSpeedMin, MENU.rainSpeedMax),
        chars: Array.from({ length: MENU.rainTrail }, () => (Math.random() < 0.5 ? "0" : "1")),
    }));
    const lineH = 28; // size 32 glyphs are ~16 px tall
    return k.add([
        k.z(-10),
        {
            update() {
                for (const c of cols) {
                    c.y += c.speed * k.dt();
                    if (c.y - MENU.rainTrail * lineH > k.height()) {
                        c.y = k.rand(-200, 0);
                        c.speed = k.rand(MENU.rainSpeedMin, MENU.rainSpeedMax);
                    }
                    if (Math.random() < 0.02) c.chars[Math.floor(Math.random() * c.chars.length)] = Math.random() < 0.5 ? "0" : "1";
                }
            },
            draw() {
                k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: k.rgb(6, 10, 12) });
                for (const c of cols) {
                    const top = c.y - (MENU.rainTrail - 1) * lineH;
                    k.drawText({
                        text: c.chars.slice(0, -1).join("\n"), pos: k.vec2(c.x, top), size: 32, anchor: "top",
                        lineSpacing: lineH - 16, color: k.rgb(40, 140, 80), opacity: 0.35 * dim,
                    });
                    k.drawText({ text: c.chars.at(-1), pos: k.vec2(c.x, c.y), size: 32, anchor: "top", color: k.rgb(170, 255, 200), opacity: 0.8 * dim });
                }
                // sweeping flashlight from the bottom-left corner
                const o = k.vec2(-40, k.height() + 40);
                const a = -0.75 + Math.sin(k.time() * MENU.beamSpeed) * 0.55;
                const len = 1700, half = 0.22;
                const tip = (d) => o.add(Math.cos(a + d) * len, Math.sin(a + d) * len);
                k.drawPolygon({ pts: [o, tip(-half), tip(half)], color: k.rgb(255, 230, 160), opacity: 0.06 * dim });
                k.drawPolygon({ pts: [o, tip(-half * 0.5), tip(half * 0.5)], color: k.rgb(255, 230, 160), opacity: 0.05 * dim });
                // vignette
                for (let i = 0; i < 6; i++) {
                    const b = 24 * (i + 1);
                    k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), fill: false, outline: { width: b, color: k.rgb(0, 0, 0) }, opacity: 0.12 });
                }
            },
        },
    ]);
}

/** "RAMmagedon" with a glitch flicker and a pixel RAM stick. */
function addLogo(k) {
    const g = { t: 0, dx: 0 };
    return k.add([
        k.z(5),
        {
            update() {
                g.t -= k.dt();
                if (g.t <= 0 && Math.random() < MENU.glitchChance) {
                    g.t = k.rand(0.06, 0.18);
                    g.dx = k.rand(-10, 10);
                }
            },
            draw() {
                const c = k.vec2(k.width() / 2, 190);
                drawRamStick(k, c.add(-104, -122), 4);
                if (g.t > 0) {
                    k.drawText({ text: "RAMmagedon", pos: c.add(g.dx, 0), size: 96, font: "handpixies", anchor: "center", color: k.rgb(255, 40, 80), opacity: 0.7 });
                    k.drawText({ text: "RAMmagedon", pos: c.add(-g.dx, 3), size: 96, font: "handpixies", anchor: "center", color: k.rgb(40, 220, 255), opacity: 0.7 });
                }
                k.drawText({ text: "RAMmagedon", pos: c.add(4, 4), size: 96, font: "handpixies", anchor: "center", color: k.rgb(0, 0, 0) });
                k.drawText({ text: "RAMmagedon", pos: c, size: 96, font: "handpixies", anchor: "center", color: k.rgb(...GREEN) });
                k.drawText({ text: "Poza zasięgiem", pos: c.add(0, 78), size: 48, anchor: "center", color: k.rgb(...GREY) });
                k.drawText({
                    text: "Skradanka w ciemnym technikum. Ukradnij RAM, nie daj się oświetlić.",
                    pos: c.add(0, 124), size: 32, anchor: "center", color: k.rgb(150, 170, 160),
                });
            },
        },
    ]);
}

/** Pixel RAM stick (52x10 art pixels): PCB, chips, gold contacts. */
function drawRamStick(k, pos, px) {
    const R = (x, y, w, h, c) => k.drawRect({ pos: pos.add(x * px, y * px), width: w * px, height: h * px, color: k.rgb(...c) });
    R(0, 0, 52, 10, [20, 40, 24]);
    R(1, 1, 50, 8, [40, 120, 60]);
    for (let i = 0; i < 6; i++) R(3 + i * 8, 2, 6, 4, [24, 24, 28]);
    for (let i = 0; i < 24; i++) R(2 + i * 2, 8, 1, 2, [230, 190, 70]);
    R(25, 8, 2, 2, [20, 40, 24]); // notch
    // blinking LED
    if (Math.sin(k.time() * 5) > 0) R(49, 2, 1, 1, [120, 255, 140]);
}

function drawControlsModal(k) {
    const w = 1100, h = 520;
    const p = k.vec2((k.width() - w) / 2, (k.height() - h) / 2);
    k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: k.rgb(0, 0, 0), opacity: 0.6 });
    // a taped notebook page
    drawPaper(k, p, w, h, { seed: 50, tape: true });
    k.drawText({ text: "Sterowanie", pos: p.add(48, 30), size: 48, color: k.rgb(...INK.red) });
    scribble(k, p.x + 48, p.y + 70, k.formatText({ text: "Sterowanie", size: 48 }).width, INK.red);
    CONTROLS.forEach(([key, what], i) => {
        const y = 104 + i * 44;
        k.drawText({ text: key, pos: p.add(48, y), size: 32, color: k.rgb(...INK.blue) });
        k.drawText({ text: what, pos: p.add(300, y), size: 32, color: k.rgb(...INK.text) });
    });
    k.drawText({ text: "Autorzy", pos: p.add(700, 30), size: 48, color: k.rgb(...INK.red) });
    scribble(k, p.x + 700, p.y + 70, k.formatText({ text: "Autorzy", size: 48 }).width, INK.red);
    k.drawText({ text: AUTHORS.join("\n"), pos: p.add(700, 104), size: 32, lineSpacing: 12, width: 370, color: k.rgb(...INK.text) });
    k.drawText({ text: "Esc / Enter / klik - zamknij", pos: p.add(w / 2, h - 40), size: 32, anchor: "center", color: k.rgb(...INK.soft) });
}

// ---------- "skip the story?" question (Start) ----------

// [button label, line in the button, playtime under the button]
const SKIP_CHOICES = [
    ["Graj z fabułą", "scenki i dialogi", "Czas przejścia: ok. 8 min"],
    ["Pomiń fabułę", "krótki skrót + zadania", "Czas przejścia: ok. 4 min"],
];
const SKIP_W = 760, SKIP_H = 400;

function skipChoiceRect(k, i) {
    const w = 300, h = 96;
    const x = k.width() / 2 - w - 20 + i * (w + 40);
    const y = (k.height() - SKIP_H) / 2 + 150;
    return { x, y, w, h };
}

function drawSkipModal(k, choice) {
    const p = k.vec2((k.width() - SKIP_W) / 2, (k.height() - SKIP_H) / 2);
    k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: k.rgb(0, 0, 0), opacity: 0.6 });
    drawPaper(k, p, SKIP_W, SKIP_H, { seed: 52, tape: true });
    k.drawText({ text: "Pominąć fabułę?", pos: p.add(48, 30), size: 48, color: k.rgb(...INK.red) });
    scribble(k, p.x + 48, p.y + 70, k.formatText({ text: "Pominąć fabułę?", size: 48 }).width, INK.red);
    k.drawText({ text: "Pierwszy raz? Zagraj z fabułą: w niej są też wskazówki.", pos: p.add(48, 92), size: 32, color: k.rgb(...INK.soft) });
    SKIP_CHOICES.forEach(([label, sub, time], i) => {
        const r = skipChoiceRect(k, i);
        const on = i === choice;
        const q = k.vec2(r.x, r.y - (on ? 6 : 0));
        drawPaper(k, q, r.w, r.h, { seed: 60 + i, lines: false, margin: false, color: on ? [250, 246, 232] : [212, 206, 190] });
        k.drawText({ text: label, pos: q.add(r.w / 2, 28), size: 48, anchor: "center", color: k.rgb(...(on ? INK.red : INK.text)) });
        k.drawText({ text: sub, pos: q.add(r.w / 2, 66), size: 32, anchor: "center", color: k.rgb(...INK.soft) });
        k.drawText({ text: time, pos: k.vec2(r.x + r.w / 2, r.y + r.h + 22), size: 32, anchor: "center", color: k.rgb(...(on ? INK.blue : INK.soft)) });
        if (i === 0) k.drawText({ text: "Zalecany", pos: k.vec2(r.x + r.w / 2, r.y + r.h + 46), size: 32, anchor: "center", color: k.rgb(...INK.green) });
        if (on) {
            const tw = k.formatText({ text: label, size: 48 }).width;
            scribble(k, q.x + (r.w - tw) / 2, q.y + 46, tw, INK.red);
        }
    });
    k.drawText({ text: "A/D lub mysz, Enter - wybierz, Esc - wróć", pos: p.add(SKIP_W / 2, SKIP_H - 36), size: 32, anchor: "center", color: k.rgb(...INK.soft) });
}
