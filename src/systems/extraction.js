import { EXTRACTION as X } from "../config.js";
import { emitSound } from "./sound.js";
import { screenShake, uiShakeOffset } from "./fx.js";
import { FAIL_SHAKE, FAIL_FLASH } from "../config.js"; // tweakables

// RAM extraction mini-game (GDD 4.C), 4 stages. Every stage makes noise,
// mistakes make a LOT of noise. Teachers in range come to check.
//
//  1. ŚRUBKI   grab the arrow next to a screw (LMB) and drag it one full circle
//              around the screw (4 screws). Each screw makes a small noise.
//  2. PANEL    grab the side panel and drag it right. Too fast -> "BRZDĘK!".
//  3. ZATRZASKI timing bar x2, Space/E in the green zone. Miss -> "TRZASK!".
//  4. RAM      grab the RAM stick and pull it up slowly. Too fast -> "TRZASK!".
//
// Esc aborts. Progress is stored on the PC (except a half-dragged panel / stick).
// With the flashlight ON everything is easier (EXTRACTION.lightEase).

const STAGES = ["screws", "panel", "latches", "pull"];
const TITLES = {
    screws: "Odkręć 4 śrubki: złap LPM żółtą strzałkę i obróć ją raz dookoła śrubki",
    panel: "Zsuń panel boczny: chwyć LPM i powoli przeciągnij w prawo",
    latches: "Odepnij zatrzaski RAM: SPACJA / E w zielonej strefie",
    pull: "Wyciągnij RAM: chwyć LPM i powoli pociągnij w górę",
};

// close-up view geometry (screen space)
const W = 360, H = 240;

/**
 * @param {object} pc the computer (gets .extract progress)
 * @param {object} player
 * @param {(success:boolean) => void} onDone
 */
export function startExtraction(k, pc, player, onDone) {
    pc.extract ??= {
        stage: 0,
        screws: [0, 0, 0, 0], // progress 0..1 per screw
        acc: [0, 0, 0, 0], // signed angle turned so far (rad)
        handle: [-Math.PI / 2, -Math.PI / 2, -Math.PI / 2, -Math.PI / 2], // arrow angle
        latches: 0,
    };
    const pr = pc.extract;
    // window on the right side, so the player (screen centre, camera follows) stays visible
    const box = k.vec2(k.width() - W - 70, k.height() / 2 - H / 2 + 40);
    const screwPos = [
        box.add(48, 48), box.add(W - 48, 48), box.add(W - 48, H - 48), box.add(48, H - 48),
    ];
    const ease = () => (player.flashlightOn ? X.lightEase : 1);

    const st = {
        msg: "",
        msgColor: [255, 255, 255],
        msgTime: 0,
        cooldown: 0.25, // ignore input right after opening (E also started it)
        // screws
        activeScrew: -1,
        // panel / pull drag
        dragging: false,
        grab: null,
        offset: 0,
        lastMouse: null,
        speed: 0, // smoothed drag speed (px/s) for the meter
        minSpeed: 0,
        maxSpeed: 1,
        // latches
        needle: 0,
        dir: 1,
        zoneStart: 0.5,
        flash: 0,
        flashColor: [255, 255, 255],
    };

    const say = (msg, color = [255, 255, 255]) => {
        st.msg = msg;
        st.msgColor = color;
        st.msgTime = 1.2;
    };
    // The noise comes from where the player stands (a free tile next to the PC), so an
    // alerted teacher path-finds through the gaps between desks to the player.
    const noise = (radius, label, color) => emitSound(k, player.pos, radius, { label, color, loudness: label ? 2 : 1 });
    const fail = (label) => {
        noise(X.failNoise, label, [255, 90, 90]);
        screenShake(k, FAIL_SHAKE, FAIL_FLASH);
        say(`${label} Za szybko!`, [255, 90, 90]);
        st.cooldown = 0.5;
    };
    const newZone = () => (st.zoneStart = k.rand(0.1, 0.9 - X.latchZone));
    const nextStage = () => {
        pr.stage++;
        st.dragging = false;
        st.offset = 0;
        st.cooldown = 0.3;
        if (pr.stage >= STAGES.length) return finish(true);
        if (STAGES[pr.stage] === "latches") newZone();
    };
    newZone();

    // ---------- per stage update ----------
    // Each screw has an arrow on a small circle around it. Grab the arrow (LMB)
    // and drag it one full circle, in either direction, to unscrew.
    const handlePos = (i) => {
        const a = pr.handle[i];
        return screwPos[i].add(Math.cos(a) * X.screwHandleRadius, Math.sin(a) * X.screwHandleRadius);
    };
    const updateScrews = (dt, m, down) => {
        if (!down) {
            st.activeScrew = -1;
            return;
        }
        if (st.activeScrew < 0) {
            st.activeScrew = screwPos.findIndex((_, i) => pr.screws[i] < 1 && handlePos(i).dist(m) < 24);
            return;
        }
        const i = st.activeScrew;
        const c = screwPos[i];
        if (c.dist(m) < 8) return; // on the centre: no reliable angle
        const a = angleTo(c, m);
        const d = Math.atan2(Math.sin(a - pr.handle[i]), Math.cos(a - pr.handle[i]));
        pr.handle[i] = a;
        if (Math.abs(d) > Math.PI / 2) return; // mouse jumped across the screw: ignore
        pr.acc[i] += d;
        pr.screws[i] = clamp01(Math.abs(pr.acc[i]) / (Math.PI * 2));
        if (pr.screws[i] >= 1) {
            noise(X.screwNoise, null, [255, 230, 120]);
            say("Odkręcona!", [120, 255, 140]);
            st.activeScrew = -1;
            if (pr.screws.every((v) => v >= 1)) nextStage();
        }
    };

    // shared by panel (drag right) and pull (drag up)
    // Speed meter: below minSpeed the part sticks, above maxSpeed it makes a loud noise.
    const updateDrag = (dt, m, down, axis, distance, minSpeed, maxSpeed, hitbox, okNoise, failLabel) => {
        st.minSpeed = minSpeed;
        st.maxSpeed = maxSpeed * ease();
        if (!down) {
            st.dragging = false;
            st.lastMouse = null;
            st.speed *= 0.8;
            return;
        }
        if (!st.dragging) {
            if (!hitbox(m)) return;
            st.dragging = true;
            st.grab = m.sub(axis === "x" ? st.offset : 0, axis === "y" ? -st.offset : 0);
            st.lastMouse = m;
            return;
        }
        const v = m.sub(st.lastMouse).scale(1 / Math.max(dt, 1e-3));
        st.lastMouse = m;
        const speed = Math.max(0, axis === "x" ? v.x : -v.y);
        st.speed += (speed - st.speed) * 0.35; // smoothed, so one jittery frame does not fail you
        const want = Math.max(0, axis === "x" ? m.x - st.grab.x : st.grab.y - m.y);
        if (want > st.offset && st.speed < minSpeed) {
            // too slow: the part sticks, re-anchor the grab so it stays in place
            const d = want - st.offset;
            st.grab = st.grab.add(axis === "x" ? d : 0, axis === "y" ? -d : 0);
        } else {
            st.offset = want;
        }
        if (st.speed > st.maxSpeed) {
            st.dragging = false;
            st.offset = 0;
            st.speed = 0;
            return fail(failLabel);
        }
        if (st.offset >= distance) {
            noise(okNoise, null, [255, 230, 120]);
            nextStage();
        }
    };

    const latchPress = () => {
        if (STAGES[pr.stage] !== "latches" || st.cooldown > 0) return;
        const hit = st.needle >= st.zoneStart && st.needle <= st.zoneStart + X.latchZone;
        if (hit) {
            noise(X.latchNoise, null, [255, 230, 120]);
            pr.latches++;
            st.flash = 0.25;
            st.flashColor = [120, 255, 140];
            st.cooldown = 0.15;
            if (pr.latches >= X.latches) return nextStage();
        } else {
            fail("TRZASK!");
            st.flash = 0.35;
            st.flashColor = [255, 60, 60];
        }
        newZone();
    };

    // ---------- UI object ----------
    const ui = k.add([
        k.layer("ui"),
        k.fixed(),
        k.pos(0, 0),
        "extraction",
        {
            update() {
                const dt = k.dt();
                st.cooldown -= dt;
                st.msgTime -= dt;
                st.flash -= dt;
                const m = k.mousePos();
                const down = k.isMouseDown("left") && st.cooldown <= 0;
                const stage = STAGES[pr.stage];
                if (stage === "screws") updateScrews(dt, m, down);
                else if (stage === "panel")
                    updateDrag(dt, m, down, "x", X.panelDistance, X.panelMinSpeed, X.panelMaxSpeed,
                        (p) => inRect(p, box.add(st.offset, 0), W, H), X.panelNoise, "BRZDĘK!");
                else if (stage === "pull")
                    updateDrag(dt, m, down, "y", X.pullDistance, X.pullMinSpeed, X.pullMaxSpeed,
                        (p) => inRect(p, ramRect(box, st.offset).pos.sub(10, 10), 220, 50), X.pullNoise, "TRZASK!");
                else if (stage === "latches") {
                    const speed = player.flashlightOn ? X.needleSpeedLight : X.needleSpeedDark;
                    st.needle += st.dir * speed * dt;
                    if (st.needle > 1) { st.needle = 1; st.dir = -1; }
                    if (st.needle < 0) { st.needle = 0; st.dir = 1; }
                }
            },
            draw() {
                // the panel is fixed on screen, so shake it explicitly
                k.pushTransform();
                k.pushTranslate(uiShakeOffset(k));
                drawUI(k, st, pr, box, screwPos);
                k.popTransform();
            },
        },
    ]);
    ui.st = st; // handy for debugging from the console

    const finish = (ok) => {
        handlers.forEach((h) => h.cancel());
        ui.destroy();
        onDone(ok);
    };

    const handlers = [
        k.onKeyPress("space", latchPress),
        k.onKeyPress("e", latchPress),
        k.onKeyPress("escape", () => finish(false)),
    ];
}

// ---------- drawing ----------

function drawUI(k, st, pr, box, screwPos) {
    const stage = STAGES[pr.stage];
    if (!stage) return;
    const rgb = (c) => k.rgb(...c);
    // Optional art: if a sprite with this name is loaded (see main.js), it replaces the placeholder.
    const art = (name) => (k.getSprite(name)?.data ? name : null);
    // backdrop + title
    k.drawRect({ pos: box.sub(30, 104), width: W + 60, height: H + 190, color: rgb([8, 10, 16]), opacity: 0.92, radius: 8 });
    k.drawText({ text: `Krok ${pr.stage + 1}/${STAGES.length}`, pos: box.sub(14, 94), size: 32, color: rgb([120, 255, 160]) });
    k.drawText({ text: TITLES[stage], pos: box.sub(14, 58), size: 24, width: W + 30, color: rgb([220, 230, 240]) });

    // motherboard (visible once the panel is off)
    if (art("pc_board")) k.drawSprite({ sprite: "pc_board", pos: box, width: W, height: H });
    else k.drawRect({ pos: box, width: W, height: H, color: rgb([20, 70, 40]) });
    const ram = ramRect(box, stage === "pull" ? st.offset : 0);
    if (pr.stage <= 3) {
        k.drawRect({ pos: box.add(60, 130), width: 240, height: 14, color: rgb([30, 30, 30]) }); // slot
        if (art("pc_ram")) k.drawSprite({ sprite: "pc_ram", pos: ram.pos, width: ram.w, height: ram.h });
        else {
            k.drawRect({ pos: ram.pos, width: ram.w, height: ram.h, color: rgb([40, 120, 60]), outline: { width: 2, color: rgb([200, 200, 120]) } });
            for (let i = 0; i < 8; i++) k.drawRect({ pos: ram.pos.add(16 + i * 24, 8), width: 16, height: 12, color: rgb([20, 20, 20]) });
        }
        // latches
        const open = pr.latches;
        const lc = (i) => (open > i ? [120, 255, 140] : [230, 230, 230]);
        k.drawRect({ pos: box.add(46, 118), width: 10, height: 30, color: rgb(lc(0)), angle: open > 0 ? -25 : 0 });
        k.drawRect({ pos: box.add(304, 118), width: 10, height: 30, color: rgb(lc(1)), angle: open > 1 ? 25 : 0 });
    }

    // side panel with screws (stages 1-2)
    if (pr.stage <= 1) {
        const off = stage === "panel" ? st.offset : 0;
        if (art("pc_panel")) k.drawSprite({ sprite: "pc_panel", pos: box.add(off, 0), width: W, height: H });
        else {
            k.drawRect({ pos: box.add(off, 0), width: W, height: H, color: rgb([95, 100, 115]), outline: { width: 3, color: rgb([60, 60, 70]) } });
            k.drawText({ text: "PC", pos: box.add(off + W / 2, H / 2), size: 48, anchor: "center", color: rgb([70, 75, 90]) });
        }
        if (stage === "screws") {
            screwPos.forEach((p, i) => {
                if (pr.screws[i] >= 1) return k.drawCircle({ pos: p, radius: 7, color: rgb([40, 40, 45]) }); // empty hole
                const R = X.screwHandleRadius;
                // screw head, slot turns with the arrow
                const sa = pr.handle[i];
                if (art("pc_screw")) {
                    k.drawSprite({ sprite: "pc_screw", pos: p, width: 24, height: 24, anchor: "center", angle: (sa * 180) / Math.PI });
                } else {
                    k.drawCircle({ pos: p, radius: 12, color: rgb([190, 190, 200]) });
                    const sd = k.vec2(Math.cos(sa), Math.sin(sa)).scale(8);
                    k.drawLine({ p1: p.sub(sd), p2: p.add(sd), width: 3, color: rgb([60, 60, 70]) });
                }
                // track + progress arc
                k.drawCircle({ pos: p, radius: R, fill: false, outline: { width: 2, color: rgb([70, 70, 85]) } });
                if (pr.screws[i] > 0)
                    k.drawCircle({ pos: p, radius: R, start: 0, end: 360 * pr.screws[i], fill: false, outline: { width: 3, color: rgb([120, 255, 140]) } });
                // the arrow handle (tangent direction = which way to drag)
                const h = p.add(Math.cos(sa) * R, Math.sin(sa) * R);
                const t = k.vec2(-Math.sin(sa), Math.cos(sa));
                const n = k.vec2(Math.cos(sa), Math.sin(sa));
                const active = st.activeScrew === i;
                k.drawCircle({ pos: h, radius: active ? 11 : 9, color: rgb(active ? [255, 255, 255] : [255, 210, 60]) });
                k.drawTriangle({ p1: h.add(t.scale(16)), p2: h.add(n.scale(7)), p3: h.sub(n.scale(7)), color: rgb([255, 210, 60]) });
            });
        }
    }

    // latch timing bar
    if (stage === "latches") {
        const bar = box.add(0, H + 18);
        k.drawRect({ pos: bar, width: W, height: 16, color: rgb([50, 50, 60]) });
        k.drawRect({ pos: bar.add(st.zoneStart * W, 0), width: X.latchZone * W, height: 16, color: rgb([60, 200, 90]) });
        k.drawRect({ pos: bar.add(st.needle * W - 2, -4), width: 4, height: 24, color: rgb([255, 255, 255]) });
        if (st.flash > 0) k.drawRect({ pos: bar, width: W, height: 16, color: rgb(st.flashColor), opacity: st.flash * 2 });
        k.drawText({ text: `Zatrzaski: ${pr.latches}/${X.latches}`, pos: bar.add(W, 22), size: 24, anchor: "topright", color: rgb([180, 180, 200]) });
    }

    // speed meter for the drag stages: grey = too slow, green = ok, red = too fast
    if (stage === "panel" || stage === "pull") {
        const bar = box.add(0, H + 18);
        const top = st.maxSpeed * 1.4;
        const x = (v) => (Math.min(v, top) / top) * W;
        k.drawRect({ pos: bar, width: x(st.minSpeed), height: 16, color: rgb([90, 90, 100]) });
        k.drawRect({ pos: bar.add(x(st.minSpeed), 0), width: x(st.maxSpeed) - x(st.minSpeed), height: 16, color: rgb([60, 200, 90]) });
        k.drawRect({ pos: bar.add(x(st.maxSpeed), 0), width: W - x(st.maxSpeed), height: 16, color: rgb([200, 60, 60]) });
        k.drawRect({ pos: bar.add(x(st.speed) - 2, -4), width: 4, height: 24, color: rgb([255, 255, 255]) });
        k.drawText({ text: "za wolno", pos: bar.add(0, 22), size: 16, color: rgb([170, 170, 180]) });
        k.drawText({ text: "za szybko", pos: bar.add(W, 22), size: 16, anchor: "topright", color: rgb([255, 120, 120]) });
        const dragging = st.dragging && st.speed > 1;
        if (dragging && st.speed < st.minSpeed)
            k.drawText({ text: "Zacina się, szybciej!", pos: bar.add(W / 2, 22), size: 16, anchor: "top", color: rgb([255, 220, 120]) });
    }

    // feedback + footer
    if (st.msgTime > 0) k.drawText({ text: st.msg, pos: box.add(W / 2, H / 2), size: 32, anchor: "center", color: rgb(st.msgColor) });
    k.drawText({ text: "ESC - przerwij (postęp zostaje)", pos: box.add(0, H + 66), size: 16, color: rgb([150, 150, 170]) });
}

function ramRect(box, lift) {
    return { pos: box.add(80, 112 - lift), w: 200, h: 30 };
}

function angleTo(c, m) {
    return Math.atan2(m.y - c.y, m.x - c.x);
}

function inRect(p, pos, w, h) {
    return p.x >= pos.x && p.x <= pos.x + w && p.y >= pos.y && p.y <= pos.y + h;
}

function clamp01(v) {
    return Math.min(1, Math.max(0, v));
}
