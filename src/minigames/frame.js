import { EXTRACTION, FAIL_SHAKE, FAIL_FLASH, FONT, MINIGAME, MINIGAME_CAM_SHIFT, MINIGAME_GAP } from "../config.js";
import { emitSound } from "../systems/sound.js";
import { screenShake, uiShakeOffset } from "../systems/fx.js";
import { sfx } from "../systems/audio.js";
import { drawPaper, scribble, INK } from "../ui/paper.js";

// Shared window for the level 2 mini-games (same placement as the RAM extraction:
// right of the player, the camera shifts so both are centred).
//
//   openMinigame(k, player, {
//       title: "..." | () => "...",   // big line above the content
//       hint: "..." | () => "...",    // small line under the title
//       width, height,                // content area in px
//       keys: { a: fn, space: fn },   // key presses (ignored during the input delay / cooldown)
//       update(dt, ui), draw(ui),     // ui = the object below
//       onClose(ok),                  // ok = finished, false = Esc / click outside
//   })
//
// ui: { box, w, h, mouse, clicked, say(msg, color), noise(radius, label, loud),
//       fail(label), finish(delay), close(), busy() }

const HEADER = 104; // title + hint above the content
const FOOTER = 56; // footer below the content
const PAD = 28;

export function openMinigame(k, player, spec) {
    const w = spec.width, h = spec.height;
    const total = HEADER + h + FOOTER;
    // content top-left in screen space
    const box = k.vec2(
        k.width() / 2 - MINIGAME_CAM_SHIFT + EXTRACTION.viewRadius + MINIGAME_GAP + PAD,
        (k.height() - total) / 2 + HEADER,
    );
    const back = { pos: box.sub(PAD, HEADER), w: w + PAD * 2, h: total };
    const msg = { text: "", color: [255, 255, 255], t: 0 };
    let cooldown = MINIGAME.inputDelay;
    let closing = -1; // > 0: finished, closing after this delay
    let closed = false;
    const text = (v) => (typeof v === "function" ? v() : v ?? "");

    const ui = {
        k,
        box,
        w,
        h,
        mouse: k.vec2(0, 0),
        clicked: false,
        /** Input is ignored (just opened, after a mistake, or finishing). */
        busy: () => cooldown > 0 || closing >= 0,
        say(m, color = INK.text, time = 1.2) {
            msg.text = m;
            msg.color = color;
            msg.t = time;
        },
        /** Noise from the player's position. `loud` alarms teachers (red glow, shake). */
        noise(radius, label = null, loud = false) {
            if (radius > 0) emitSound(k, player.pos, radius, { label, color: loud ? [255, 90, 90] : [255, 230, 120], loudness: loud ? 2 : 1 });
        },
        /** A mistake: loud noise, shake, red flash, short input pause. */
        fail(label, radius) {
            ui.noise(radius, label, true);
            sfx("error");
            screenShake(k, FAIL_SHAKE, FAIL_FLASH);
            ui.say(label, INK.red);
            cooldown = 0.6;
        },
        /** Pause input for a moment (stage changes). */
        pause(t) {
            cooldown = Math.max(cooldown, t);
        },
        /** Success: keep the window up for `delay` s (show the reward), then close. */
        finish(delay = 1.4) {
            if (closing < 0) closing = delay;
        },
        close: (ok = false) => close(ok),
    };

    const inside = (p) => p.x >= back.pos.x && p.x <= back.pos.x + back.w && p.y >= back.pos.y && p.y <= back.pos.y + back.h;

    const obj = k.add([
        k.layer("ui"),
        k.fixed(),
        k.z(60),
        "minigame",
        {
            update() {
                const dt = k.dt();
                cooldown -= dt;
                msg.t -= dt;
                ui.mouse = k.mousePos();
                ui.clicked = cooldown <= 0 && closing < 0 && k.isMousePressed("left") && inside(ui.mouse);
                if (closing >= 0) {
                    closing -= dt;
                    if (closing <= 0) return close(true);
                }
                spec.update?.(dt, ui);
            },
            draw() {
                k.pushTransform();
                k.pushTranslate(uiShakeOffset(k));
                // a torn notebook page, taped on top
                drawPaper(k, back.pos, back.w, back.h, { seed: 21, tape: true, margin: false });
                const title = text(spec.title);
                k.drawText({ text: title, pos: box.sub(0, HEADER - 20), size: FONT.big, color: k.rgb(...INK.red) });
                scribble(k, box.x, box.y - HEADER + 58, k.formatText({ text: title, size: FONT.big }).width, INK.red, 0.6);
                k.drawText({ text: text(spec.hint), pos: box.sub(0, HEADER - 64), size: FONT.small, width: w, color: k.rgb(...INK.text) });
                spec.draw?.(ui);
                if (msg.t > 0) {
                    const mw = k.formatText({ text: msg.text, size: FONT.big }).width + 40;
                    const c = box.add(w / 2, h / 2);
                    drawPaper(k, c.sub(mw / 2, 28), mw, 56, { seed: 23, lines: false, margin: false });
                    k.drawText({ text: msg.text, pos: c, size: FONT.big, anchor: "center", color: k.rgb(...msg.color) });
                }
                k.drawText({ text: "Esc - wyjdź, postęp zostaje", pos: box.add(0, h + 22), size: FONT.small, color: k.rgb(...INK.soft) });
                k.popTransform();
            },
        },
    ]);

    const handlers = [
        k.onKeyPress("escape", () => close(false)),
        // click outside the window = leave (progress is kept)
        k.onMousePress("left", () => {
            if (cooldown <= 0 && !inside(k.mousePos())) close(false);
        }),
        ...Object.entries(spec.keys ?? {}).map(([key, fn]) => k.onKeyPress(key, () => !ui.busy() && fn(ui))),
    ];

    function close(ok) {
        if (closed) return;
        closed = true;
        handlers.forEach((h) => h.cancel());
        obj.destroy();
        spec.onClose?.(ok);
    }

    return ui;
}

/** Keyboard key cap (used by the mini-games). */
export function drawKeyCap(k, pos, size, label, { fill = [225, 232, 228], text = [20, 26, 24], outline = null, opacity = 1 } = {}) {
    k.drawRect({ pos: pos.add(0, 5), width: size, height: size, radius: 8, color: k.rgb(30, 40, 36), opacity });
    k.drawRect({ pos, width: size, height: size, radius: 8, color: k.rgb(...fill), opacity });
    if (outline) k.drawRect({ pos: pos.sub(4, 4), width: size + 8, height: size + 13, radius: 10, fill: false, outline: { width: 3, color: k.rgb(...outline) }, opacity });
    k.drawText({ text: label, pos: pos.add(size / 2, size / 2 + 2), size: FONT.big, anchor: "center", color: k.rgb(...text), opacity });
}
