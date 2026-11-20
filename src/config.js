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
    opacity: 0.95   ,
};

export const TEACHER = {
    speed: 70,
    size: 22,
    visionRange: TILE * 4.5,
    visionFov: 55, // degrees
    visionRays: 40,
    // multiplier on vision range when the player's flashlight is ON
    flashlightRangeMul: 1.35,
    // multiplier when the flashlight is OFF (hard to spot in the dark)
    darkRangeMul: 0.6,
    // seconds of continuous sight before GAME OVER (GDD: ~0.5 s)
    detectTime: 0.8,
    // how fast the detection meter drains when out of sight (per second)
    detectDecay: 1.0,
    waitAtWaypoint: 0.8,
    turnSpeed: 4, // rad/s
    // SUSPICIOUS: walks to the noise faster and looks around there
    suspiciousSpeedMul: 1.05, // was 1.35: teachers rushed too fast
    investigateTime: 3, // seconds looking around at the noise source (GDD: 3 s)
};

// RAM extraction: 4 stages, all of them make noise (see src/systems/extraction.js).
export const EXTRACTION = {
    // 1) unscrew 4 screws: grab the arrow next to a screw and drag it one full circle
    screwHandleRadius: 34, // px, circle the arrow travels on
    screwNoise: TILE * 3, // each finished screw
    // 2) slide the side panel off: drag it to the right, slowly
    panelDistance: 220, // px
    panelMinSpeed: 70, // px/s; slower = the panel sticks and does not move
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
    pullMinSpeed: 50, // px/s
    pullMaxSpeed: 260, // px/s
    pullNoise: TILE * 3,
    failNoise: TILE * 12, // "TRZASK!" (missed latch / RAM pulled too hard)
    // with the flashlight ON everything is a bit easier (but the light gives you away)
    lightEase: 1.35,
    viewRadius: TILE * 2.5, // view circle while doing a mini-game (was 1.2, normal is FLASHLIGHT.nearRadius)
};

export const SOUND = {
    ringDuration: 0.9, // seconds for a ring to expand to full radius
};

// ================= VISION, RINGS, CAMERA, SCREEN EFFECTS =================
// Quick map of everything vision-related:
//   player view circle ............ FLASHLIGHT.nearRadius (normal), EXTRACTION.viewRadius (mini-game)
//   player flashlight cone ........ FLASHLIGHT.range, FLASHLIGHT.fov
//   darkness ...................... DARKNESS.opacity
//   teacher vision cone ........... TEACHER.visionRange, TEACHER.visionFov (+ flashlightRangeMul / darkRangeMul)
//   noise rings ................... SOUND.ringDuration, noise radii in EXTRACTION
//   teacher ping ring ............. PING_* below

// ---- teacher ping ring (entities/teacher.js) ----
// Every PING_INTERVAL seconds a ring expands from each teacher's position
// (visible through darkness), so the player always roughly knows where they are.
export const PING_INTERVAL = 2.5; // seconds
export const PING_RADIUS = 48; // px
export const PING_COLOR = [255, 190, 70];
export const PING_COLOR_ALARMED = [255, 60, 60];

// ---- camera, alarm, proximity shake (scenes/game.js) ----
export const CAMERA_LERP = 6; // how fast the camera catches up with the player (higher = stiffer)
// During a mini-game the camera slides right by this many px, so the player sits left of
// the centre and the mini-game window right of them: the pair is centred on screen.
export const MINIGAME_CAM_SHIFT = 230;
export const MINIGAME_GAP = 70; // px between the player's view circle and the mini-game window
export const ALARM_SHAKE = 14; // screen shake when a failed mini-game alarms a teacher
export const ALARM_NEAR_DIST = TILE * 5; // alarmed teacher this close = full red glow
// Proximity shake: any teacher closer than PROXIMITY_DIST shakes the screen,
// the closer the stronger (up to PROXIMITY_MAX_SHAKE px when touching).
export const PROXIMITY_DIST = TILE * 6;
export const PROXIMITY_MAX_SHAKE = 8; // px
export const PROXIMITY_CURVE = 1.90; // >1 = gentle far away, strong only when really close

// ---- screen effects (systems/fx.js, systems/extraction.js) ----
export const UI_SHAKE_DECAY = 5; // how fast a shake burst fades out (1/s)
export const FLASH_DECAY = 2.5; // how fast the red flash fades out (1/s)
export const FLASH_MAX_OPACITY = 0.45;
export const FAIL_SHAKE = 10; // px, mini-game mistake (camera + mini-game window)
export const FAIL_FLASH = 0.6; // 0..1 red flash on a mistake
