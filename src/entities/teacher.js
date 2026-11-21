import { TEACHER, BOSS, COLORS } from "../config.js";
import { visibilityFan, hasLineOfSight, inCone } from "../systems/raycast.js";
import { spawnRing } from "../systems/sound.js";
import { PING_INTERVAL, PING_RADIUS, PING_COLOR, PING_COLOR_ALARMED } from "../config.js";
import { isDialogOpen } from "../systems/dialog.js";
import { facingName } from "./player.js";

// sprite sheet rows (public/sprites/teacher.png, mieciu.png): idle 0-3, walk 4-7
const ROW = { down: 0, left: 1, right: 2, up: 3 };

const DEG = Math.PI / 180;

// AI states from the GDD.
export const AI = {
    PATROL: "PATROL", // walk waypoints (a boss switches between several routes)
    SUSPICIOUS: "SUSPICIOUS", // heard a noise: walk there, look around, go back
    CHASE: "CHASE", // boss only: runs after the player, touch = caught (Lola)
};

/**
 * @param {{waypoints: Vec2[], routes?: Vec2[][], speed?: number, boss?: boolean}} cfg from the level data
 * @param {object} ctx { level, player, lighting, onCaught(reason) }
 */
export function spawnTeacher(k, cfg, ctx) {
    const s = TEACHER.size;
    const boss = Boolean(cfg.boss);
    // per-teacher numbers: Pan Mieciu sees further and wider
    const stats = {
        speed: cfg.speed ?? (boss ? BOSS.speed : TEACHER.speed),
        fov: (boss ? BOSS.visionFov : TEACHER.visionFov) * DEG,
        range: boss ? BOSS.visionRange : TEACHER.visionRange,
        sprite: boss ? "mieciu" : "teacher",
        scale: boss ? BOSS.spriteScale : TEACHER.spriteScale,
        offsetY: boss ? BOSS.spriteOffsetY : TEACHER.spriteOffsetY,
    };
    const routes = cfg.routes ?? [cfg.waypoints];
    const { level, player } = ctx;
    const t = k.add([
        k.pos(routes[0][0]),
        // collision square centred on pos (the sprite is drawn in onDraw)
        k.area({ shape: new k.Rect(k.vec2(-s / 2, -s / 2), s, s) }),
        k.layer("world"),
        "teacher",
        {
            isBoss: boss,
            hasKey: boss, // Pan Mieciu carries the exit key on his belt
            state: AI.PATROL,
            facing: 0,
            waypoints: routes[0],
            routes,
            wpIndex: 1 % routes[0].length,
            wait: 0,
            detection: 0, // 0..1, reaching 1 = caught
            cone: [], // cached vision polygon for drawing
            path: [], // current grid path (SUSPICIOUS / returning / CHASE)
            investigate: 0, // seconds left looking around at the noise
            lookBase: 0,
            noisePos: null,
            alarmed: false, // heard a LOUD noise (failed mini-game) or chasing -> red glow + shake
            pingTimer: k.rand(0, PING_INTERVAL), // so teachers do not ping in sync
            moving: false,
            animTime: 0,
            // chase
            lastSeen: null,
            repath: 0,
            search: 0,
            stun: 0, // chase head start (BOSS.chaseDelay)
            /** Called by emitSound() when this teacher is in range. */
            hearNoise(pos, loudness = 1) {
                if (t.state === AI.CHASE) return;
                if (loudness >= 2) t.alarmed = true;
                t.state = AI.SUSPICIOUS;
                t.noisePos = pos;
                t.investigate = 0;
                t.path = level.findPath(t.pos, pos, true); // stops at the edge of a safe zone
                if (!t.path.length) {
                    // already as close as allowed: look around towards the noise right here
                    t.investigate = TEACHER.investigateTime;
                    t.lookBase = Math.atan2(pos.y - t.pos.y, pos.x - t.pos.x);
                }
            },
            /** Boss: stop everything and run after the player. */
            startChase() {
                t.state = AI.CHASE;
                t.alarmed = true;
                t.detection = 0;
                t.lastSeen = player.pos.clone();
                t.repath = 0;
                t.path = [];
                t.stun = BOSS.chaseDelay;
            },
        },
    ]);

    t.onUpdate(() => {
        if (isDialogOpen()) return; // the world waits while someone talks
        const dt = k.dt();
        const before = t.pos.clone();
        switch (t.state) {
            case AI.PATROL:
                if (t.path.length) followPath(t, dt, stats.speed); // walking back to / between routes
                else patrol(t, dt, stats.speed, level);
                break;
            case AI.SUSPICIOUS:
                suspicious(t, dt, level, stats.speed);
                break;
            case AI.CHASE:
                chase(t, dt, level, player);
                break;
        }

        t.moving = t.pos.dist(before) > 0.01;
        t.animTime = t.moving ? t.animTime + dt : 0;

        t.pingTimer -= dt;
        if (t.pingTimer <= 0) {
            t.pingTimer = PING_INTERVAL;
            spawnRing(k, t.pos, PING_RADIUS, t.alarmed ? PING_COLOR_ALARMED : PING_COLOR, 1.1);
        }

        // Invisible unless inside the player's light (the map is faintly visible in the
        // dark, teachers are not: only their ping / noise rings give them away).
        t.hidden = ctx.lighting ? !ctx.lighting.isLit(t.pos.x, t.pos.y) : false;
        const range = visionRange(player, stats.range);
        t.cone = visibilityFan(t.pos.x, t.pos.y, t.facing, stats.fov, range, TEACHER.visionRays, level.sightSegments);
        if (t.state === AI.CHASE) return; // chasing: only touching counts (Lola)

        // on safe floor (",") nobody can catch you: you are only at risk in the open
        const safe = level.isSafeAt(player.pos);
        const sees =
            !safe &&
            inCone(t.pos.x, t.pos.y, t.facing, stats.fov, range, player.pos.x, player.pos.y) &&
            hasLineOfSight(t.pos.x, t.pos.y, player.pos.x, player.pos.y, level.sightSegments);

        // a suspicious teacher spots you faster
        const mul = t.state === AI.SUSPICIOUS ? 1.5 : 1;
        if (sees) t.detection += (dt / TEACHER.detectTime) * mul;
        else t.detection -= dt * TEACHER.detectDecay;
        t.detection = k.clamp(t.detection, 0, 1);

        if (t.detection >= 1) ctx.onCaught(boss ? "mieciu" : "teacher");
    });

    // touching = caught, but never through a wall / PC (LOS check as a safety net).
    // Checked every frame of contact, so standing in him when his head start ends counts too.
    t.onCollideUpdate("player", (p) => {
        if (isDialogOpen() || level.isSafeAt(p.pos) || t.stun > 0) return;
        if (hasLineOfSight(t.pos.x, t.pos.y, p.pos.x, p.pos.y, level.sightSegments)) ctx.onCaught(boss ? "lola" : "teacher");
    });

    t.onDraw(() => {
        if (t.cone.length > 2) {
            k.drawPolygon({
                pts: t.cone.map((p) => k.vec2(p.x - t.pos.x, p.y - t.pos.y)),
                color: k.rgb(...(t.state === AI.PATROL ? COLORS.teacherCone : COLORS.teacherConeAlert)),
                opacity: 0.18 + t.detection * 0.3,
            });
        }
        const face = facingName(t.facing);
        const row = ROW[face] + (t.moving ? 4 : 0);
        const col = Math.floor((t.moving ? t.animTime : k.time()) * TEACHER.animFps) % 4;
        const drawBody = () =>
            k.drawSprite({ sprite: stats.sprite, frame: row * 4 + col, pos: k.vec2(0, stats.offsetY), anchor: "center", scale: stats.scale });
        if (!boss) return drawBody();
        // Pan Mieciu: Lola (baton) in his right hand, the key on his belt
        const side = face === "left" ? -1 : 1;
        const hand = k.vec2(side * 12, stats.offsetY + 10);
        const swing = t.state === AI.CHASE ? Math.sin(k.time() * BOSS.lolaSwing) * 1.1 : 0;
        const a = (t.state === AI.CHASE ? t.facing : Math.PI / 2 - side * 0.25) + swing;
        const tip = hand.add(Math.cos(a) * 22, Math.sin(a) * 22);
        const lola = () => {
            k.drawLine({ p1: hand, p2: tip, width: 6, color: k.rgb(20, 20, 26) });
            k.drawLine({ p1: hand, p2: hand.add(Math.cos(a) * 6, Math.sin(a) * 6), width: 6, color: k.rgb(90, 60, 40) }); // grip
        };
        if (face === "up") lola(); // behind him when walking away
        drawBody();
        if (face !== "up") lola();
        if (t.hasKey && face !== "up") {
            const kp = k.vec2(-side * 9, stats.offsetY + 16);
            k.drawCircle({ pos: kp, radius: 3, fill: false, outline: { width: 2, color: k.rgb(240, 200, 60) } });
            k.drawRect({ pos: kp.add(-1, 3), width: 2, height: 6, color: k.rgb(240, 200, 60) });
        }
    });

    return t;
}

function visionRange(player, base) {
    return base * (player.flashlightOn ? TEACHER.flashlightRangeMul : TEACHER.darkRangeMul);
}

function patrol(t, dt, speed, level) {
    const wps = t.waypoints;
    if (wps.length < 2 && t.routes.length < 2) return;
    if (t.wait > 0) {
        t.wait -= dt;
        // TODO(P3): "rozglądanie się na boki" - sweep facing left/right while waiting
        return;
    }
    if (!moveTo(t, wps[t.wpIndex], speed, dt)) return;
    t.wait = TEACHER.waitAtWaypoint;
    const next = t.wpIndex + 1;
    if (next >= wps.length && t.routes.length > 1) {
        // finished a route: pick another one at random and walk to its start
        const others = t.routes.filter((r) => r !== wps);
        t.waypoints = others[Math.floor(Math.random() * others.length)];
        t.wpIndex = 0;
        t.path = level.findPath(t.pos, t.waypoints[0], true);
        return;
    }
    t.wpIndex = next % wps.length;
}

function suspicious(t, dt, level, speed) {
    if (t.path.length) {
        followPath(t, dt, speed * TEACHER.suspiciousSpeedMul);
        if (!t.path.length) {
            // arrived: look around towards the noise source
            t.investigate = TEACHER.investigateTime;
            const to = t.noisePos.sub(t.pos);
            t.lookBase = to.len() > 1 ? Math.atan2(to.y, to.x) : t.facing;
        }
        return;
    }
    if (t.investigate > 0) {
        t.investigate -= dt;
        // sweep left/right around the noise direction
        const elapsed = TEACHER.investigateTime - t.investigate;
        t.facing = t.lookBase + Math.sin(elapsed * 2.2) * 0.9;
        return;
    }
    // nothing found -> walk back to the patrol route
    t.state = AI.PATROL;
    t.alarmed = false;
    t.path = level.findPath(t.pos, t.waypoints[t.wpIndex], true);
}

/** Boss chase: run to where he last saw you; lost you -> look around, then guess again. */
function chase(t, dt, level, player) {
    if (t.stun > 0) {
        // head start: turns to face you and draws Lola, does not move yet
        t.stun -= dt;
        turnTowards(t, Math.atan2(player.pos.y - t.pos.y, player.pos.x - t.pos.x), dt);
        return;
    }
    const seen =
        t.pos.dist(player.pos) < BOSS.chaseSight &&
        hasLineOfSight(t.pos.x, t.pos.y, player.pos.x, player.pos.y, level.sightSegments);
    if (seen) {
        t.lastSeen = player.pos.clone();
        t.search = 0;
    }
    t.repath -= dt;
    if (t.repath <= 0) {
        t.repath = BOSS.repathEvery;
        t.path = level.findPath(t.pos, t.lastSeen);
    }
    if (t.path.length) return followPath(t, dt, BOSS.chaseSpeed);
    if (seen) return moveTo(t, player.pos, BOSS.chaseSpeed, dt); // same tile: straight at you
    // at the last known spot and you are gone: look around, then follow his hunch
    t.search += dt;
    t.facing += dt * 3;
    if (t.search > BOSS.searchTime) {
        t.search = 0;
        t.lastSeen = player.pos.clone();
    }
}

function followPath(t, dt, speed) {
    if (moveTo(t, t.path[0], speed, dt)) t.path.shift();
}

/** Step towards target, turning to face it. Returns true when reached. */
function moveTo(t, target, speed, dt) {
    const to = target.sub(t.pos);
    const dist = to.len();
    if (dist < 2) return true;
    turnTowards(t, Math.atan2(to.y, to.x), dt);
    t.pos = t.pos.add(to.unit().scale(Math.min(dist, speed * dt)));
    return false;
}

function turnTowards(t, goal, dt) {
    const diff = Math.atan2(Math.sin(goal - t.facing), Math.cos(goal - t.facing));
    const step = TEACHER.turnSpeed * dt;
    t.facing += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
}
