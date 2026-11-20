import { TEACHER, COLORS } from "../config.js";
import { visibilityFan, hasLineOfSight, inCone } from "../systems/raycast.js";
import { spawnRing } from "../systems/sound.js";
import { PING_INTERVAL, PING_RADIUS, PING_COLOR, PING_COLOR_ALARMED } from "../config.js";

const DEG = Math.PI / 180;

// AI states from the GDD.
export const AI = {
    PATROL: "PATROL", // walk waypoints
    SUSPICIOUS: "SUSPICIOUS", // heard a noise: walk there, look around, go back
    CHASE: "CHASE", // TODO(P3): run at the player, touch = game over
};

/**
 * @param {{waypoints: Vec2[], speed?: number}} cfg route from the level data
 * @param {object} ctx { level, player, onCaught }
 */
export function spawnTeacher(k, cfg, ctx) {
    const s = TEACHER.size;
    const waypoints = cfg.waypoints;
    const speed = cfg.speed ?? TEACHER.speed;
    const { level } = ctx;
    const t = k.add([
        k.pos(waypoints[0]),
        k.rect(s, s),
        k.anchor("center"),
        k.color(...COLORS.teacher),
        k.outline(2, k.rgb(60, 10, 10)),
        k.area(),
        k.layer("world"),
        "teacher",
        {
            state: AI.PATROL,
            facing: 0,
            wpIndex: 1 % waypoints.length,
            wait: 0,
            detection: 0, // 0..1, reaching 1 = caught
            cone: [], // cached vision polygon for drawing
            path: [], // current grid path (SUSPICIOUS / returning)
            investigate: 0, // seconds left looking around at the noise
            lookBase: 0,
            noisePos: null,
            alarmed: false, // heard a LOUD noise (failed mini-game) -> red glow + shake
            pingTimer: k.rand(0, PING_INTERVAL), // so teachers do not ping in sync
            /** Called by emitSound() when this teacher is in range. */
            hearNoise(pos, loudness = 1) {
                if (t.state === AI.CHASE) return;
                if (loudness >= 2) t.alarmed = true;
                t.state = AI.SUSPICIOUS;
                t.noisePos = pos;
                t.investigate = 0;
                t.path = level.findPath(t.pos, pos);
            },
        },
    ]);

    t.onUpdate(() => {
        const dt = k.dt();
        switch (t.state) {
            case AI.PATROL:
                if (t.path.length) followPath(t, dt, speed); // walking back to the route
                else patrol(t, waypoints, dt, speed);
                break;
            case AI.SUSPICIOUS:
                suspicious(t, waypoints, dt, level, speed);
                break;
            // TODO(P3): case AI.CHASE
        }

        t.pingTimer -= dt;
        if (t.pingTimer <= 0) {
            t.pingTimer = PING_INTERVAL;
            spawnRing(k, t.pos, PING_RADIUS, t.alarmed ? PING_COLOR_ALARMED : PING_COLOR, 1.1);
        }

        const { player } = ctx;
        // Invisible unless inside the player's light (the map is faintly visible in the
        // dark, teachers are not: only their ping / noise rings give them away).
        t.hidden = ctx.lighting ? !ctx.lighting.isLit(t.pos.x, t.pos.y) : false;
        const fov = TEACHER.visionFov * DEG;
        const range = visionRange(player);
        t.cone = visibilityFan(t.pos.x, t.pos.y, t.facing, fov, range, TEACHER.visionRays, level.sightSegments);

        const sees =
            inCone(t.pos.x, t.pos.y, t.facing, fov, range, player.pos.x, player.pos.y) &&
            hasLineOfSight(t.pos.x, t.pos.y, player.pos.x, player.pos.y, level.sightSegments);

        // a suspicious teacher spots you faster
        const mul = t.state === AI.SUSPICIOUS ? 1.5 : 1;
        if (sees) t.detection += (dt / TEACHER.detectTime) * mul;
        else t.detection -= dt * TEACHER.detectDecay;
        t.detection = k.clamp(t.detection, 0, 1);

        // TODO(P3): instead of instant game over -> CHASE, and game over on touch.
        if (t.detection >= 1) ctx.onCaught();
    });

    // touching = caught, but never through a wall / PC (LOS check as a safety net)
    t.onCollide("player", (p) => {
        if (hasLineOfSight(t.pos.x, t.pos.y, p.pos.x, p.pos.y, level.sightSegments)) ctx.onCaught();
    });

    t.onDraw(() => {
        if (t.cone.length > 2) {
            k.drawPolygon({
                pts: t.cone.map((p) => k.vec2(p.x - t.pos.x, p.y - t.pos.y)),
                color: k.rgb(...(t.state === AI.PATROL ? COLORS.teacherCone : COLORS.teacherConeAlert)),
                opacity: 0.18 + t.detection * 0.3,
            });
        }
        const a = t.facing;
        const tip = k.vec2(Math.cos(a), Math.sin(a)).scale(s * 0.85);
        const l = k.vec2(Math.cos(a + 2.4), Math.sin(a + 2.4)).scale(s * 0.35);
        const r = k.vec2(Math.cos(a - 2.4), Math.sin(a - 2.4)).scale(s * 0.35);
        k.drawTriangle({ p1: tip, p2: l, p3: r, color: k.rgb(255, 230, 230) });
    });

    return t;
}

function visionRange(player) {
    return TEACHER.visionRange * (player.flashlightOn ? TEACHER.flashlightRangeMul : TEACHER.darkRangeMul);
}

function patrol(t, waypoints, dt, speed) {
    if (waypoints.length < 2) return;
    if (t.wait > 0) {
        t.wait -= dt;
        // TODO(P3): "rozglądanie się na boki" - sweep facing left/right while waiting
        return;
    }
    const target = waypoints[t.wpIndex];
    if (moveTo(t, target, speed, dt)) {
        t.wpIndex = (t.wpIndex + 1) % waypoints.length;
        t.wait = TEACHER.waitAtWaypoint;
    }
}

function suspicious(t, waypoints, dt, level, speed) {
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
    t.path = level.findPath(t.pos, waypoints[t.wpIndex]);
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
