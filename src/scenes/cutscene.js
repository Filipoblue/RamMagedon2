import { CUTSCENE as C } from "../config.js";
import { STORY } from "../story/script.js";
import { showDialog } from "../systems/dialog.js";
import { playMusic, sfx, startLoop } from "../systems/audio.js";

// Story cutscenes: procedural pixel-art scenes + textbox narration.
//   k.go("cutscene", { id: "intro", next: { scene: "game", params: { levelIndex: 0 } } })
// When the script ends (or Esc skips it) we go to the "game" scene with `next` as params.

const SCRIPTS = { intro: introScript, escape: escapeScript, outro: outroScript };

const ABORT = Symbol("cutscene aborted");

export function cutsceneScene(k) {
    k.scene("cutscene", ({ id = "intro", next = { levelIndex: 0 } } = {}) => {
        let alive = true;
        const stops = []; // looping sounds to stop on exit
        const fade = { a: 1 };

        const end = () => {
            if (!alive) return;
            alive = false;
            stops.forEach((s) => s());
            k.go(next.scene ?? "game", next.params ?? next);
        };

        // helpers for the scripts; each awaits and aborts once the scene is left
        const guard = (p) => p.then((v) => {
            if (!alive) throw ABORT;
            return v;
        });
        const S = {
            k,
            wait: (t) => guard(new Promise((r) => k.wait(t, r))),
            say: (lines) => guard(showDialog(k, lines)),
            tween: (obj, key, to, dur, ease = k.easings.easeInOutSine) =>
                guard(new Promise((r) => k.tween(obj[key], to, dur, (v) => (obj[key] = v), ease).onEnd(r))),
            fadeIn: () => S.tween(fade, "a", 0, C.fadeTime),
            fadeOut: () => S.tween(fade, "a", 1, C.fadeTime),
            loop: (name) => {
                const stop = startLoop(name);
                stops.push(stop);
                return stop;
            },
        };

        // fade layer + skip hint (above everything, below the textbox)
        k.add([
            k.layer("ui"),
            k.fixed(),
            k.z(150),
            {
                draw() {
                    k.drawText({ text: "Esc - pomiń", pos: k.vec2(k.width() - 16, 14), size: 32, anchor: "topright", color: k.rgb(150, 150, 170) });
                    if (fade.a > 0.001) k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: k.rgb(0, 0, 0), opacity: fade.a });
                },
            },
        ]);
        k.onKeyPress("escape", end);

        SCRIPTS[id](S)
            .then(end)
            .catch((e) => {
                if (e !== ABORT) throw e;
            });
    });
}

// ======================= shared drawing =======================

/** A side-view pixel character (sprite "kid"): { x, y (feet), flip, walking, visible }. */
function addKid(k, x, y) {
    const kid = k.add([
        k.sprite("kid", { anim: "idle" }),
        k.pos(x, y),
        k.anchor("bot"),
        k.scale(C.pixel),
        k.z(20),
        { walking: false },
    ]);
    kid.walkTo = async (S, tx) => {
        kid.flipX = tx < kid.pos.x;
        kid.play("walk");
        const dur = Math.abs(tx - kid.pos.x) / C.walkSpeed;
        await S.tween(kid.pos, "x", tx, dur, k.easings.linear).finally(() => kid.exists() && kid.play("idle"));
    };
    return kid;
}

/** Helicopter (sprite "heli", nose right) with spinning rotors and an optional searchlight down to `groundY`. */
function drawHeli(k, heli, px, groundY) {
    const t = k.time();
    const hy = heli.y + (heli.onGround ? 0 : Math.sin(t * 2.2) * 4);
    if (heli.light) {
        const o = k.vec2(heli.x + 34 * px, hy + 11 * px);
        k.drawPolygon({ pts: [o, k.vec2(o.x - 70, groundY), k.vec2(o.x + 150, groundY)], color: k.rgb(255, 240, 180), opacity: 0.12 });
    }
    k.drawSprite({ sprite: "heli", pos: k.vec2(heli.x, hy), scale: px });
    const spin = heli.rotor ? Math.abs(Math.sin(t * 28)) : 0.35;
    const cx = heli.x + 20 * px;
    k.drawRect({ pos: k.vec2(cx - 52 * px * spin, hy - 6), width: 104 * px * spin, height: 6, color: k.rgb(40, 40, 50) });
    const tail = k.vec2(heli.x + 2 * px, hy + 6 * px);
    k.drawCircle({ pos: tail, radius: heli.rotor ? 5 * px + Math.sin(t * 40) * 4 : 4 * px, fill: false, outline: { width: 2, color: k.rgb(40, 40, 50) } });
}

// stars are fixed per scene (seeded by index so they do not jump)
function makeStars(k, n, maxY) {
    return Array.from({ length: n }, (_, i) => ({
        x: (i * 397) % k.width(),
        y: ((i * 211) % maxY),
        s: i % 7 === 0 ? 4 : 2,
        tw: (i * 1.37) % 6.28,
    }));
}

// ======================= cutscene 1: helicopter on the roof =======================

async function introScript(S) {
    const { k } = S;
    playMusic("menu");
    const ROOF = 470; // roof surface y
    const stars = makeStars(k, 90, ROOF - 120);
    const city = Array.from({ length: 22 }, (_, i) => ({
        x: i * 62 - 10, w: 50 + ((i * 37) % 40), h: 60 + ((i * 53) % 110),
        lit: [(i * 7) % 5, (i * 3) % 4],
    }));
    const HP = C.pixel * C.heliScale; // helicopter pixel size (bigger than people)
    const heli = { x: -400, y: 60, rotor: true, light: true, onGround: false };
    const hatch = { open: 0 };
    const dust = [];

    k.add([
        k.z(0),
        {
            update() {
                if (heli.onGround && heli.rotor && Math.random() < 0.5) {
                    dust.push({ x: heli.x + 20 * HP + k.rand(-140, 140), y: ROOF - 4, vx: k.rand(-140, 140), life: 0.8 });
                }
                for (const d of dust) {
                    d.x += d.vx * k.dt();
                    d.y -= 12 * k.dt();
                    d.life -= k.dt();
                }
                while (dust.length && dust[0].life <= 0) dust.shift();
            },
            draw() {
                const t = k.time();
                // sky in bands (pixel-art gradient)
                const bands = [[10, 12, 30], [14, 18, 42], [20, 24, 54], [28, 30, 64], [36, 36, 72]];
                bands.forEach((c, i) => k.drawRect({ pos: k.vec2(0, i * 80), width: k.width(), height: 80, color: k.rgb(...c) }));
                k.drawRect({ pos: k.vec2(0, 400), width: k.width(), height: 304, color: k.rgb(36, 36, 72) });
                for (const s of stars) {
                    const o = 0.5 + 0.5 * Math.sin(t * 2 + s.tw);
                    k.drawRect({ pos: k.vec2(s.x, s.y), width: s.s, height: s.s, color: k.rgb(230, 230, 255), opacity: o });
                }
                // moon
                k.drawCircle({ pos: k.vec2(1080, 110), radius: 44, color: k.rgb(235, 235, 210) });
                k.drawCircle({ pos: k.vec2(1064, 98), radius: 9, color: k.rgb(205, 205, 185) });
                k.drawCircle({ pos: k.vec2(1094, 126), radius: 6, color: k.rgb(205, 205, 185) });
                // far city
                for (const b of city) {
                    k.drawRect({ pos: k.vec2(b.x, ROOF - 40 - b.h), width: b.w, height: b.h + 40, color: k.rgb(18, 20, 36) });
                    for (let wy = 0; wy < b.h - 20; wy += 20) {
                        for (let wx = 8; wx < b.w - 8; wx += 14) {
                            if ((wx + wy + b.lit[0]) % 5 === 0) k.drawRect({ pos: k.vec2(b.x + wx, ROOF - 30 - b.h + wy), width: 6, height: 8, color: k.rgb(230, 200, 110), opacity: 0.7 });
                        }
                    }
                }
                // roof: parapet, surface, facade with the school sign
                k.drawRect({ pos: k.vec2(0, ROOF), width: k.width(), height: 20, color: k.rgb(70, 72, 84) });
                k.drawRect({ pos: k.vec2(0, ROOF), width: k.width(), height: 4, color: k.rgb(110, 112, 126) });
                k.drawRect({ pos: k.vec2(0, ROOF + 20), width: k.width(), height: k.height() - ROOF, color: k.rgb(46, 44, 54) });
                for (let x = 40; x < k.width(); x += 140) {
                    k.drawRect({ pos: k.vec2(x, ROOF + 60), width: 70, height: 50, color: k.rgb(24, 26, 40) });
                }
                k.drawRect({ pos: k.vec2(480, ROOF + 130), width: 320, height: 50, color: k.rgb(30, 70, 50) });
                k.drawText({ text: "TECHNIKUM SCI", pos: k.vec2(640, ROOF + 157), size: 32, anchor: "center", color: k.rgb(150, 255, 190) });
                // helipad plate
                k.drawRect({ pos: k.vec2(470, ROOF - 6), width: 340, height: 6, color: k.rgb(230, 200, 60) });
                for (let x = 480; x < 800; x += 40) k.drawRect({ pos: k.vec2(x, ROOF - 6), width: 20, height: 6, color: k.rgb(30, 30, 30) });
                // antenna with a blinking red light
                k.drawRect({ pos: k.vec2(150, ROOF - 170), width: 6, height: 170, color: k.rgb(90, 90, 100) });
                k.drawRect({ pos: k.vec2(130, ROOF - 130), width: 46, height: 4, color: k.rgb(90, 90, 100) });
                if (Math.sin(t * 3) > 0) k.drawCircle({ pos: k.vec2(153, ROOF - 174), radius: 5, color: k.rgb(255, 60, 60) });
                // AC unit
                k.drawRect({ pos: k.vec2(260, ROOF - 50), width: 90, height: 50, color: k.rgb(120, 124, 136) });
                k.drawCircle({ pos: k.vec2(305, ROOF - 25), radius: 18, color: k.rgb(60, 62, 72) });
                // stairwell hatch: box with a door that opens (warm light inside)
                k.drawRect({ pos: k.vec2(1000, ROOF - 110), width: 130, height: 110, color: k.rgb(84, 82, 96) });
                k.drawRect({ pos: k.vec2(990, ROOF - 118), width: 150, height: 10, color: k.rgb(60, 58, 70) });
                k.drawRect({ pos: k.vec2(1036, ROOF - 86), width: 52, height: 86, color: k.rgb(255, 190, 90), opacity: hatch.open });
                k.drawRect({ pos: k.vec2(1036, ROOF - 86), width: 52 * (1 - hatch.open), height: 86, color: k.rgb(54, 52, 64) });
                // dust
                for (const d of dust) k.drawRect({ pos: k.vec2(d.x, d.y), width: 6, height: 6, color: k.rgb(170, 170, 180), opacity: Math.max(0, d.life) });
                drawHeli(k, heli, HP, ROOF);
            },
        },
    ]);

    const heliSound = S.loop("heli");
    await S.fadeIn();
    await S.say(STORY.intro.opening);
    // fly in and land on the pad
    await S.tween(heli, "x", 640 - 20 * HP, 3.2, k.easings.easeOutQuad);
    await S.tween(heli, "y", ROOF - 15 * HP, 2, k.easings.easeInOutSine);
    heli.onGround = true;
    heli.light = false;
    sfx("door");
    await S.wait(0.5);
    // the player jumps out
    const kid = addKid(k, heli.x + 24 * HP, ROOF - 6);
    await kid.walkTo(S, 860);
    await S.say(STORY.intro.landed);
    await S.say(STORY.intro.plan);
    // walk to the stairwell, door opens, gone
    await kid.walkTo(S, 1062);
    sfx("unlock");
    await S.tween(hatch, "open", 1, 0.5);
    kid.hidden = true;
    sfx("door");
    await S.tween(hatch, "open", 0, 0.4);
    // the helicopter takes off and leaves
    heli.onGround = false;
    heli.light = false;
    await S.tween(heli, "y", -20, 1.6, k.easings.easeInQuad);
    heliSound(1.5);
    await S.tween(heli, "x", k.width() + 80, 2, k.easings.easeInQuad);
    await S.fadeOut();
}

// ======================= cutscene 2: corridor after level 1 =======================

async function escapeScript(S) {
    const { k } = S;
    playMusic("level");
    const FLOOR = 470;
    const beam = { on: 0, angle: Math.PI, reach: 0 };
    const keypad = { blink: true };

    k.add([
        k.z(0),
        {
            draw() {
                const t = k.time();
                // back wall + skirting
                k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: FLOOR, color: k.rgb(34, 36, 50) });
                k.drawRect({ pos: k.vec2(0, FLOOR - 16), width: k.width(), height: 16, color: k.rgb(26, 28, 40) });
                // floor
                k.drawRect({ pos: k.vec2(0, FLOOR), width: k.width(), height: k.height() - FLOOR, color: k.rgb(22, 22, 30) });
                for (let x = 0; x < k.width(); x += 64) k.drawRect({ pos: k.vec2(x, FLOOR), width: 2, height: k.height() - FLOOR, color: k.rgb(28, 28, 38) });
                // windows with moonlight falling on the floor
                for (let x = 300; x < 900; x += 220) {
                    k.drawRect({ pos: k.vec2(x, 90), width: 110, height: 140, color: k.rgb(50, 60, 100) });
                    k.drawRect({ pos: k.vec2(x + 53, 90), width: 4, height: 140, color: k.rgb(34, 36, 50) });
                    k.drawRect({ pos: k.vec2(x, 158), width: 110, height: 4, color: k.rgb(34, 36, 50) });
                    k.drawPolygon({
                        pts: [k.vec2(x, 230), k.vec2(x + 110, 230), k.vec2(x + 200, FLOOR + 120), k.vec2(x + 60, FLOOR + 120)],
                        color: k.rgb(150, 170, 255), opacity: 0.06,
                    });
                }
                // lockers
                for (let x = 300; x < 900; x += 44) {
                    k.drawRect({ pos: k.vec2(x, FLOOR - 170), width: 40, height: 154, color: k.rgb(46, 66, 92) });
                    for (let v = 0; v < 3; v++) k.drawRect({ pos: k.vec2(x + 10, FLOOR - 160 + v * 6), width: 20, height: 2, color: k.rgb(30, 44, 64) });
                }
                // classroom door on the left (where we come from)
                k.drawRect({ pos: k.vec2(90, FLOOR - 200), width: 110, height: 200, color: k.rgb(90, 60, 40) });
                k.drawRect({ pos: k.vec2(70, FLOOR - 254), width: 150, height: 40, color: k.rgb(20, 22, 30) });
                k.drawText({ text: "SALA 12", pos: k.vec2(145, FLOOR - 233), size: 32, anchor: "center", color: k.rgb(200, 200, 210) });
                // stairwell door on the right + keypad
                k.drawRect({ pos: k.vec2(1080, FLOOR - 220), width: 140, height: 220, color: k.rgb(70, 74, 86) });
                k.drawRect({ pos: k.vec2(1146, FLOOR - 220), width: 4, height: 220, color: k.rgb(40, 42, 52) });
                k.drawRect({ pos: k.vec2(1040, FLOOR - 130), width: 28, height: 40, color: k.rgb(20, 20, 26) });
                const led = keypad.blink ? Math.sin(t * 6) > 0 : true;
                k.drawRect({ pos: k.vec2(1048, FLOOR - 124), width: 12, height: 6, color: k.rgb(255, 50, 50), opacity: led ? 1 : 0.2 });
                k.drawText({ text: "KLATKA SCHODOWA", pos: k.vec2(1130, FLOOR - 248), size: 32, anchor: "center", color: k.rgb(200, 200, 210) });
                if (led) k.drawText({ text: "BRAK ZASIĘGU", pos: k.vec2(1054, FLOOR - 165), size: 32, anchor: "center", color: k.rgb(255, 80, 80) });
                // a teacher's flashlight from the far right end of the corridor
                if (beam.on > 0.01) {
                    const o = k.vec2(k.width() + 20, FLOOR - 60);
                    const a = beam.angle;
                    const tip = (d) => o.add(Math.cos(a + d) * beam.reach, Math.sin(a + d) * beam.reach);
                    k.drawPolygon({ pts: [o, tip(-0.12), tip(0.12)], color: k.rgb(255, 230, 150), opacity: 0.22 * beam.on });
                }
                // darkness vignette
                k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: k.rgb(0, 0, 10), opacity: 0.35 });
            },
        },
    ]);

    const kid = addKid(k, 145, FLOOR + 6);
    // the stolen RAM glows above the kid's hand
    k.add([
        k.z(21),
        {
            draw() {
                if (!kid.exists() || kid.hidden) return;
                const p = kid.pos.add(kid.flipX ? -26 : 18, -34);
                k.drawRect({ pos: p, width: 14, height: 6, color: k.rgb(60, 170, 90) });
                k.drawCircle({ pos: p.add(7, 3), radius: 10, color: k.rgb(120, 255, 150), opacity: 0.15 + 0.1 * Math.sin(k.time() * 5) });
            },
        },
    ]);

    sfx("door");
    await S.fadeIn();
    await S.say(STORY.escape.out);
    await kid.walkTo(S, 400);
    // flashlight sweeps from the far end, the kid freezes in the shadow
    sfx("detect");
    await Promise.all([S.tween(beam, "on", 1, 0.4), S.tween(beam, "reach", 700, 1.2)]);
    await S.say(STORY.escape.hide);
    await S.tween(beam, "angle", Math.PI - 0.18, 1.2);
    await S.tween(beam, "angle", Math.PI + 0.05, 1.2);
    await Promise.all([S.tween(beam, "reach", 0, 1), S.tween(beam, "on", 0, 1)]);
    await S.wait(0.4);
    await kid.walkTo(S, 1000);
    sfx("error");
    await S.say(STORY.escape.door);
    await S.fadeOut();
}

// ======================= cutscene 3: the school yard, the end =======================

async function outroScript(S) {
    const { k } = S;
    playMusic("menu");
    const GROUND = 520;
    const stars = makeStars(k, 70, 300);
    const HP = C.pixel * C.heliScale;
    const heli = { x: 960, y: GROUND - 15 * HP, rotor: true, light: false, onGround: true };
    const door = { open: 1 };
    const mieciu = { visible: false, x: 262 };

    k.add([
        k.z(0),
        {
            draw() {
                const t = k.time();
                k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: GROUND, color: k.rgb(14, 18, 40) });
                for (const s of stars) {
                    k.drawRect({ pos: k.vec2(s.x, s.y), width: s.s, height: s.s, color: k.rgb(230, 230, 255), opacity: 0.5 + 0.5 * Math.sin(t * 2 + s.tw) });
                }
                k.drawCircle({ pos: k.vec2(700, 100), radius: 40, color: k.rgb(235, 235, 210) });
                // yard
                k.drawRect({ pos: k.vec2(0, GROUND), width: k.width(), height: k.height() - GROUND, color: k.rgb(50, 52, 64) });
                for (let x = 0; x < k.width(); x += 48) k.drawRect({ pos: k.vec2(x, GROUND), width: 2, height: k.height() - GROUND, color: k.rgb(42, 44, 54) });
                // the school: facade, windows, sign, main door
                k.drawRect({ pos: k.vec2(0, 120), width: 360, height: GROUND - 120, color: k.rgb(70, 66, 80) });
                k.drawRect({ pos: k.vec2(0, 110), width: 380, height: 14, color: k.rgb(52, 50, 60) });
                for (let y = 160; y < GROUND - 140; y += 90) {
                    for (let x = 30; x < 330; x += 90) k.drawRect({ pos: k.vec2(x, y), width: 54, height: 60, color: k.rgb(26, 30, 50) });
                }
                k.drawRect({ pos: k.vec2(60, GROUND - 190), width: 240, height: 40, color: k.rgb(30, 70, 50) });
                k.drawText({ text: "TECHNIKUM SCI", pos: k.vec2(180, GROUND - 170), size: 32, anchor: "center", color: k.rgb(150, 255, 190) });
                k.drawRect({ pos: k.vec2(220, GROUND - 120), width: 84, height: 120, color: k.rgb(255, 190, 90), opacity: door.open });
                k.drawRect({ pos: k.vec2(220, GROUND - 120), width: 84 * (1 - door.open), height: 120, color: k.rgb(90, 60, 40) });
                // Pan Mieciu in the doorway, swinging Lola
                if (mieciu.visible) {
                    const p = k.vec2(mieciu.x, GROUND - 4);
                    k.drawSprite({ sprite: "mieciu", frame: 0, pos: p, anchor: "bot", scale: 3 });
                    const hand = p.add(26, -46);
                    const a = -1.2 + Math.sin(t * 8) * 0.8;
                    k.drawLine({ p1: hand, p2: hand.add(Math.cos(a) * 44, Math.sin(a) * 44), width: 10, color: k.rgb(20, 20, 26) });
                }
                drawHeli(k, heli, HP, GROUND);
                // fence with an open gate (in front of the helicopter on the street)
                k.drawRect({ pos: k.vec2(760, GROUND - 90), width: k.width() - 760, height: 6, color: k.rgb(30, 34, 44) });
                for (let x = 770; x < k.width(); x += 24) {
                    if (x > 900 && x < 1010) continue; // the gate is open
                    k.drawRect({ pos: k.vec2(x, GROUND - 110), width: 6, height: 110, color: k.rgb(30, 34, 44) });
                }
                k.drawRect({ pos: k.vec2(1010, GROUND - 120), width: 12, height: 120, color: k.rgb(40, 44, 56) });
                k.drawRect({ pos: k.vec2(890, GROUND - 120), width: 12, height: 120, color: k.rgb(40, 44, 56) });
            },
        },
    ]);

    const heliSound = S.loop("heli");
    const kid = addKid(k, 262, GROUND + 4);
    await S.fadeIn();
    await kid.walkTo(S, 560);
    await S.say(STORY.outro.out);
    // Pan Mieciu shows up in the door
    sfx("door");
    mieciu.visible = true;
    await S.wait(0.3);
    await S.say(STORY.outro.mieciu);
    await kid.walkTo(S, 950);
    await S.say(STORY.outro.gate);
    // in, door closed, up and away
    kid.hidden = true;
    sfx("door");
    await S.wait(0.4);
    heli.onGround = false;
    await S.tween(heli, "y", 80, 1.8, k.easings.easeInQuad);
    heliSound(1.5);
    await S.tween(heli, "x", k.width() + 80, 2, k.easings.easeInQuad);
    await S.fadeOut();
}
