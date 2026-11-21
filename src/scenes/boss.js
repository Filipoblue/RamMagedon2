import { BOSS, TILE, FONT } from "../config.js";
import { emitSound } from "../systems/sound.js";
import { showDialog, isDialogOpen, dialogBlocksInput } from "../systems/dialog.js";
import { sfx } from "../systems/audio.js";
import { screenShake } from "../systems/fx.js";
import { INK } from "../ui/paper.js";
import { keyChip } from "../ui/hud.js";

// Level 3 "niedosłowny bossfight" with Pan Mieciu (rooms.js: `boss: true`).
//
// Phase 1, the key: Pan Mieciu patrols with a wide flashlight and the exit key on his
//   belt. Take ping-pong balls from the table (E) and throw them (Q) at the mouse: he
//   goes to check the noise. Sneak up BEHIND him and hold E to take the key.
// Phase 2, the escape: he notices, pulls out Lola (his baton) and chases you. The exit
//   is open, you have BOSS.escapeTime seconds. Break his line of sight (pillar,
//   furniture) to make him lose you for a moment. Touch = caught.

/**
 * @param {object} o { level, player, lines, story(key), caught(reason), toast(text, color) }
 * @returns {{ balls: number, goal(): string, timer(): number | null }}
 */
export function addBossLevel(k, o) {
    const { level, player } = o;
    const boss = k.get("teacher").find((t) => t.isBoss);
    const tables = level.tilesWith("T");
    const st = { balls: 0, steal: 0, canSteal: false, escape: false, timeLeft: BOSS.escapeTime, jingle: 0 };

    const nearTable = () => tables.some((p) => p.dist(player.pos) < TILE * 1.4);

    // ---- balls: take (E at the table), throw (Q) ----
    k.onKeyPress("e", () => {
        if (player.busy || dialogBlocksInput(k) || st.escape || !nearTable() || st.balls >= BOSS.balls) return;
        st.balls = BOSS.balls;
        sfx("pickup");
        o.toast(`+${BOSS.balls} piłeczki`);
        showDialog(k, o.story("balls"));
    });

    k.onKeyPress("q", () => {
        if (player.busy || isDialogOpen() || st.balls <= 0) return;
        st.balls--;
        throwBall();
    });

    function throwBall() {
        const from = player.pos.clone();
        let to = k.toWorld(k.mousePos());
        const d = to.sub(from);
        if (d.len() > BOSS.throwRange) to = from.add(d.unit().scale(BOSS.throwRange));
        // land on the floor, not inside a wall or a piece of furniture
        for (let i = 0; i < 20 && level.isSolid(Math.floor(to.x / TILE), Math.floor(to.y / TILE)); i++) to = to.lerp(from, 0.1);
        sfx("click");
        k.add([
            k.pos(from),
            k.layer("glow"),
            {
                t: 0,
                h: 0,
                update() {
                    this.t += k.dt() / BOSS.ballFlight;
                    const u = Math.min(1, this.t);
                    this.pos = from.lerp(to, u);
                    this.h = Math.sin(u * Math.PI) * 40; // arc
                    if (u >= 1) {
                        sfx("ball");
                        emitSound(k, to, BOSS.ballNoise, { label: "tok!", color: [255, 255, 255] });
                        this.destroy();
                    }
                },
                draw() {
                    k.drawCircle({ pos: k.vec2(0, 0), radius: 3, color: k.rgb(0, 0, 0), opacity: 0.35 });
                    k.drawCircle({ pos: k.vec2(0, -this.h), radius: 4, color: k.rgb(245, 150, 40) });
                },
            },
        ]);
    }

    // ---- the key: hold E behind him ----
    async function stealKey() {
        boss.hasKey = false;
        st.steal = 0;
        sfx("pickup");
        o.toast("Mam klucz!", INK.green);
        level.openDoors();
        await showDialog(k, o.story("keyStolen"));
        // phase 2
        boss.startChase();
        st.escape = true;
        st.timeLeft = BOSS.escapeTime;
        sfx("alarm");
        screenShake(k, 12, 0.6);
    }

    k.onUpdate(() => {
        if (isDialogOpen() || !boss) return;
        const dt = k.dt();
        if (st.escape) {
            st.timeLeft -= dt;
            if (st.timeLeft <= 0) o.caught("timeout");
            return;
        }
        // behind him = more than 90 degrees away from where he is looking
        const to = player.pos.sub(boss.pos);
        const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(to.y, to.x) - boss.facing), Math.cos(Math.atan2(to.y, to.x) - boss.facing)));
        st.canSteal = boss.hasKey && !player.busy && to.len() < BOSS.stealDist && diff > Math.PI / 2;
        if (st.canSteal && k.isKeyDown("e")) {
            st.steal += dt;
            st.jingle -= dt;
            if (st.jingle <= 0) {
                st.jingle = 0.3;
                sfx("click"); // keys jingling
            }
            if (st.steal >= BOSS.stealTime) stealKey();
        } else {
            st.steal = Math.max(0, st.steal - dt * 2);
        }
    });

    // ---- hints in the world (glow layer: visible in the dark) ----
    k.add([
        k.layer("glow"),
        {
            draw() {
                // balls lying on the table
                if (tables.length && st.balls < BOSS.balls && !st.escape) {
                    const c = tables[0].add(TILE * 0.6, TILE * 0.4);
                    for (let i = 0; i < 3; i++) k.drawCircle({ pos: c.add(i * 9, (i % 2) * 6), radius: 4, color: k.rgb(245, 150, 40) });
                    if (nearTable() && !player.busy) {
                        const p = player.pos.add(-30, -64);
                        const w = keyChip(k, p, "E");
                        k.drawText({ text: "piłeczki", pos: p.add(w + 8, 6), size: FONT.small, color: k.rgb(255, 255, 255) });
                    }
                }
                if (!boss || !boss.hasKey) return;
                if (st.canSteal || st.steal > 0) {
                    // progress ring around Pan Mieciu + hint
                    const p = boss.pos.add(0, -10);
                    k.drawCircle({ pos: p, radius: 30, fill: false, outline: { width: 3, color: k.rgb(80, 80, 80) }, opacity: 0.6 });
                    if (st.steal > 0) {
                        k.drawCircle({ pos: p, radius: 30, start: 0, end: (360 * st.steal) / BOSS.stealTime, fill: false, outline: { width: 4, color: k.rgb(255, 220, 90) } });
                    }
                    const hp = boss.pos.add(-70, -84);
                    const w = keyChip(k, hp, "E");
                    k.drawText({ text: "przytrzymaj: klucz", pos: hp.add(w + 8, 6), size: FONT.small, color: k.rgb(255, 230, 120) });
                }
            },
        },
    ]);

    return {
        get balls() {
            return st.balls;
        },
        goal() {
            if (st.escape) return "Uciekaj do wyjścia na lewej ścianie!";
            if (!st.balls) return "Weź piłeczki ze stołu do ping-ponga";
            return "Odwróć uwagę (Q) i zabierz klucz od tyłu";
        },
        /** Seconds left in the escape, null before it starts. */
        timer: () => (st.escape ? Math.max(0, st.timeLeft) : null),
    };
}
