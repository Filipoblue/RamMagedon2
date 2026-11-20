import { TEACHER, COLORS } from "../config.js";
import { visibilityFan, hasLineOfSight, inCone } from "../systems/raycast.js";

const DEG = Math.PI / 180;

// AI states from the GDD. Only PATROL is implemented in the skeleton.
export const AI = {
    PATROL: "PATROL",
    SUSPICIOUS: "SUSPICIOUS", // TODO(P3): walk to noise/light source, look around 3 s
    CHASE: "CHASE", // TODO(P3): run at the player, touch = game over
};

/**
 * @param {{x:number,y:number}[]} waypoints world positions
 * @param {object} ctx { level, player, onCaught }
 */
export function spawnTeacher(k, waypoints, ctx) {
    const s = TEACHER.size;
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
            // Hook for sound system (P3): teacher hears something at pos.
            hearNoise(pos, loudness) {
                // TODO(P3): switch to SUSPICIOUS and walk to pos
            },
        },
    ]);

    t.onUpdate(() => {
        const dt = k.dt();
        switch (t.state) {
            case AI.PATROL:
                patrol(k, t, waypoints, dt);
                break;
            // TODO(P3): case AI.SUSPICIOUS / AI.CHASE
        }

        const { level, player } = ctx;
        const fov = TEACHER.visionFov * DEG;
        const range = visionRange(player);
        t.cone = visibilityFan(t.pos.x, t.pos.y, t.facing, fov, range, TEACHER.visionRays, level.segments);

        const sees =
            inCone(t.pos.x, t.pos.y, t.facing, fov, range, player.pos.x, player.pos.y) &&
            hasLineOfSight(t.pos.x, t.pos.y, player.pos.x, player.pos.y, level.segments);

        if (sees) t.detection += dt / TEACHER.detectTime;
        else t.detection -= dt * TEACHER.detectDecay;
        t.detection = k.clamp(t.detection, 0, 1);

        // TODO(P3): instead of instant game over -> CHASE, and game over on touch.
        if (t.detection >= 1) ctx.onCaught();
    });

    t.onCollide("player", () => ctx.onCaught());

    t.onDraw(() => {
        // vision cone (drawn in local space -> subtract own pos)
        if (t.cone.length > 2) {
            k.drawPolygon({
                pts: t.cone.map((p) => k.vec2(p.x - t.pos.x, p.y - t.pos.y)),
                color: k.rgb(...COLORS.teacherCone),
                opacity: 0.18 + t.detection * 0.3,
            });
        }
        // facing nose
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

function patrol(k, t, waypoints, dt) {
    if (waypoints.length < 2) return;
    if (t.wait > 0) {
        t.wait -= dt;
        // TODO(P3): "rozglądanie się na boki" - sweep facing left/right while waiting
        return;
    }
    const target = waypoints[t.wpIndex];
    const to = target.sub(t.pos);
    const dist = to.len();
    if (dist < 2) {
        t.wpIndex = (t.wpIndex + 1) % waypoints.length;
        t.wait = TEACHER.waitAtWaypoint;
        return;
    }
    turnTowards(t, Math.atan2(to.y, to.x), dt);
    t.pos = t.pos.add(to.unit().scale(Math.min(dist, TEACHER.speed * dt)));
}

function turnTowards(t, goal, dt) {
    let diff = Math.atan2(Math.sin(goal - t.facing), Math.cos(goal - t.facing));
    const step = TEACHER.turnSpeed * dt;
    t.facing += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
}
