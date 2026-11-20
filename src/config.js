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
    player: [80, 200, 255],
    teacher: [255, 90, 90],
    flashlight: [255, 240, 180],
    teacherCone: [255, 80, 80],
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
};
