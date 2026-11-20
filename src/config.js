// Global tuning knobs. Change numbers here, not in game code.

export const TILE = 32; // 1 metre ~= 32 px
export const WIDTH = 1280;
export const HEIGHT = 704; // 22 tiles

export const COLORS = {
    floor: [38, 40, 52],
    wall: [90, 92, 110],
    cabinet: [120, 84, 60],
    desk: [70, 110, 140],
    computer: [40, 50, 60],
    led: [80, 255, 120],
    door: [160, 60, 60],
    glass: [140, 210, 255],
    player: [80, 200, 255],
    teacher: [255, 90, 90],
    flashlight: [255, 240, 180],
    teacherCone: [255, 190, 70], // normal: orange-yellow flashlight
    teacherConeAlert: [255, 50, 50], // heard you / suspicious: red
};

export const PLAYER = {
    speed: 140,
    size: 20,
};

export const FLASHLIGHT = {
    range: TILE * 9,
    fov: 50, // degrees, whole cone
    rays: 90,
    // radius you always see around yourself (~1.5 m), flashlight on or off
    nearRadius: TILE * 1.5,
    nearRays: 48,
};

export const DARKNESS = {
    opacity: 0.985,
};

export const TEACHER = {
    speed: 70,
    size: 22,
    visionRange: TILE * 6,
    visionFov: 70, // degrees
    visionRays: 40,
    // multiplier on vision range when the player's flashlight is ON
    flashlightRangeMul: 1.6,
    // multiplier when the flashlight is OFF (hard to spot in the dark)
    darkRangeMul: 0.6,
    // seconds of continuous sight before GAME OVER (GDD: ~0.5 s)
    detectTime: 0.5,
    // how fast the detection meter drains when out of sight (per second)
    detectDecay: 1.0,
    waitAtWaypoint: 0.8,
    turnSpeed: 4, // rad/s
    // SUSPICIOUS: walks to the noise faster and looks around there
    suspiciousSpeedMul: 1.35,
    investigateTime: 3, // seconds looking around at the noise source (GDD: 3 s)
};

// RAM extraction: 4 stages, all of them make noise (see src/systems/extraction.js).
export const EXTRACTION = {
    // 1) unscrew 4 screws: grab the arrow next to a screw and drag it one full circle
    screwHandleRadius: 34, // px, circle the arrow travels on
    screwNoise: TILE * 3, // each finished screw
    // 2) slide the side panel off: drag it to the right, slowly
    panelDistance: 220, // px
    panelMaxSpeed: 420, // px/s; faster = "BRZDĘK!"
    panelNoise: TILE * 5,
    panelFailNoise: TILE * 10,
    // 3) open 2 RAM latches: timing bar, Space/E in the green zone
    latches: 2,
    latchZone: 0.16, // zone width (fraction of the bar)
    latchNoise: TILE * 4,
    needleSpeedLight: 0.7, // bar-widths per second, flashlight ON (easier)
    needleSpeedDark: 1.25, // flashlight OFF (harder)
    // 4) pull the RAM out: drag it up, slowly
    pullDistance: 110, // px
    pullMaxSpeed: 260, // px/s
    pullNoise: TILE * 3,
    failNoise: TILE * 12, // "TRZASK!" (missed latch / RAM pulled too hard)
    // with the flashlight ON everything is a bit easier (but the light gives you away)
    lightEase: 1.35,
    viewRadius: TILE * 1.2, // what you still see around you while working
};

export const SOUND = {
    ringDuration: 0.9, // seconds for a ring to expand to full radius
};
