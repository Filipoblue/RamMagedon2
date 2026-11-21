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
    safe: [90, 200, 140], // safe floor tint (maps without PNG art)
    player: [80, 200, 255],
    teacher: [255, 90, 90],
    flashlight: [255, 240, 180],
    teacherCone: [255, 190, 70], // normal: orange-yellow flashlight
    teacherConeAlert: [255, 50, 50], // heard you / suspicious: red
};

export const PLAYER = {
    speed: 140,
    size: 20, // collision square (px); the 32x32 sprite is drawn on top
    animFps: 8, // walk animation
    spriteOffsetY: -6, // sprite drawn this many px above the collider centre (feet on the box)
    stepInterval: 0.3, // s between footstep sounds (sound only, teachers do not hear them)
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
    color: [0, 0, 0], // darkness colour (also used for the mini-game window background)
    opacity: 0.8, // < 1: the map is faintly visible everywhere (teachers stay hidden unless lit)
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
    detectTime: 1.2,
    // how fast the detection meter drains when out of sight (per second)
    detectDecay: 1.0,
    waitAtWaypoint: 0.8,
    animFps: 7,
    spriteScale: 1.35, // adults: drawn bigger than the player (collider unchanged)
    spriteOffsetY: -11, // keeps the feet on the collider after scaling
    turnSpeed: 4, // rad/s
    // SUSPICIOUS: walks to the noise faster and looks around there
    suspiciousSpeedMul: 1.05, // was 1.35: teachers rushed too fast
    investigateTime: 3, // seconds looking around at the noise source (GDD: 3 s)
};

// Level 3 boss: Pan Mieciu, the janitor, and his police baton "Lola" (entities/teacher.js, scenes/game.js)
export const BOSS = {
    speed: 62, // patrol
    visionRange: TILE * 6, // longer and wider flashlight than a teacher
    visionFov: 80, // degrees
    spriteScale: 1.5,
    spriteOffsetY: -13,
    // phase 1: steal the key from his belt (from behind, hold E)
    stealDist: TILE * 1.6,
    stealTime: 1.3, // s of holding E
    // ping-pong balls: E at the table takes them, Q throws one at the mouse
    balls: 3,
    throwRange: TILE * 7,
    ballFlight: 0.55, // s in the air
    ballNoise: TILE * 8, // noise where it lands (he goes to check)
    // phase 2: the escape
    escapeTime: 30, // s to reach the exit after taking the key
    chaseDelay: 1.5, // s head start: he turns around and draws Lola first (no catching meanwhile)
    chaseSpeed: 128, // the player runs 140
    chaseSight: TILE * 12, // how far he can see you while chasing (walls still block)
    repathEvery: 0.25, // s between path updates while chasing
    searchTime: 1.6, // s looking around where he last saw you, then he guesses again
    lolaSwing: 9, // baton swing speed while chasing
};

// RAM extraction: 4 stages, all of them make noise (see src/systems/extraction.js).
export const EXTRACTION = {
    // 1) unscrew 4 screws: grab the arrow next to a screw and drag it one full circle
    screwHandleRadius: 34, // px, circle the handle travels on
    screwKnobRadius: 11, // px, white grab knob on the handle
    showScrewGuides: false, // true = draw the ring + yellow arrow (off: pc_panel_with_guiding_arrows shows them)
    screwNoise: TILE * 3, // each finished screw
    // 2) slide the side panel off: drag it to the right
    panelDistance: 220, // px
    panelMaxSpeed: 150, // px/s, the panel never moves faster than this (no penalty, just slow)
    panelNoise: TILE * 5,
    // 3) open 2 RAM latches: timing bar, Space/E in the green zone
    latches: 2,
    latchZone: 0.16, // zone width (fraction of the bar)
    latchNoise: TILE * 4,
    needleSpeedLight: 0.7, // bar-widths per second, flashlight ON (easier)
    needleSpeedDark: 1.25, // flashlight OFF (harder)
    // 4) pull the RAM out: drag it up
    pullDistance: 110, // px
    pullMaxSpeed: 70, // px/s, same for the RAM stick
    pullNoise: TILE * 6, // pulling the RAM out is loud-ish
    failNoise: TILE * 12, // "TRZASK!" (missed latch)
    viewRadius: TILE * 2.5, // view circle while doing a mini-game (was 1.2, normal is FLASHLIGHT.nearRadius)
};

// ---- level 2 mini-games (src/minigames/) ----
// Terminal 1: type random A/S/D sequences against the clock.
export const QTE = {
    keys: ["a", "s", "d"],
    lengths: [4, 5, 6], // one entry per round (3 rounds)
    roundTime: 5, // s per round
    roundNoise: TILE * 3, // finished round (quiet beep)
    failNoise: TILE * 9, // wrong key / timeout: loud, alarms teachers in range
};

// Terminal 2: tune your wave to the target signal (frequency A/D, amplitude W/S).
export const ANTENNA = {
    freqMin: 1, // waves across the screen
    freqMax: 5,
    ampMin: 0.15, // fraction of the half height
    ampMax: 0.95,
    freqSpeed: 1.4, // per second while the key is held
    ampSpeed: 0.5,
    driftSpeed: 0.08, // how fast the target wanders
    jumpEvery: [7, 11], // s, random interference jumps of the target (min, max)
    jumpFreq: 0.6, // how far a jump moves the target (frequency, amplitude)
    jumpAmp: 0.1,
    tolerance: 0.22, // match needed (0 = perfect, 1 = way off); the yellow zones on the sliders
    holdTime: 1.8, // s of good match to lock the signal
    lockDecay: 0.25, // when off target the lock drains this many times slower than it fills
    squealAt: 0.6, // mismatch this bad...
    squealTime: 3, // ...for this many seconds -> the speaker squeals (noise)
    squealNoise: TILE * 6,
    lockNoise: TILE * 3,
};

// Door keypad: enter the 4-digit code, then bridge 3 wires with good timing.
export const KEYPAD = {
    beepNoise: TILE * 2, // every key press
    wrongNoise: TILE * 10, // wrong code: loud
    wires: 3,
    pulseSpeed: [0.55, 0.75, 0.95], // bar-widths per second, per wire
    gap: 0.14, // width of the gap zone (fraction of the wire)
    sparkNoise: TILE * 6, // missed timing
    openNoise: TILE * 4,
};

// Shared mini-game window (src/minigames/frame.js)
export const MINIGAME = {
    inputDelay: 0.25, // s, ignore input right after opening (E also opened it)
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
export const INTERACT_DIST = TILE * 1.3; // how close to a PC you must stand to press E
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

// ================= STORY, MENU, AUDIO (stage 2) =================

// ---- dialog textbox (systems/dialog.js) ----
export const DIALOG = {
    width: 1040, // px, whole box
    height: 190,
    bottomMargin: 20, // px from the bottom of the screen
    border: 4, // white frame thickness (Undertale style)
    padding: 22,
    textSize: 48,
    lineSpacing: -12, // tighter than the font's line height
    // first text line starts level with the top of the portrait's head
    // (negative: the font draws its letters a bit below the top of the line box)
    textTopOffset: -4,
    portraitScale: 7, // 16x16 portrait art -> 112x112 px
    charsPerSec: 38, // typewriter speed
    punctPause: 0.22, // extra pause after . ! ? (half after , and :)
    blipEvery: 2, // "voice" blip every N letters
    inputDelay: 0.15, // ignore input right after the box opens
    closeGrace: 0.2, // after closing, E/Space do not trigger game actions for this long
};

// ---- text sizes ----
// HandPixies-PL (scripts/build-font.py) renders at about half the size given, like the
// old Minecraftia, and the whole game is scaled to the window. Below 32 the pixel font
// loses pixels and looks blurry, so 32 is the smallest size used anywhere.
// 48 and 96 are exactly 2 and 4 screen px per font pixel.
export const FONT = {
    small: 32, // hints, labels, HUD
    normal: 32,
    big: 48, // titles in panels, dialog text
    huge: 64,
};

// ---- "torn notebook page" UI (ui/paper.js) ----
export const PAPER = {
    color: [238, 232, 214], // cream paper
    line: [150, 180, 222], // ruled lines
    margin: [222, 120, 120], // red margin line
    tape: [232, 222, 168], // sticky tape
    lineGap: 24, // px between ruled lines
    marginX: 26, // px from the left edge
    tearStep: 10, // px between the points of the torn edge
    tearDepth: 5, // px, how deep the tears go
};

// ---- in-game HUD (ui/hud.js) ----
export const HUD = {
    margin: 14, // px from the screen edge
    toastTime: 1.8, // s, "+1 RAM" messages
    controlsTime: 9, // s, controls card at the start of the game (H toggles it)
};

// ---- main menu (scenes/menus.js) ----
export const MENU = {
    rainColumns: 26, // binary rain columns
    rainTrail: 12, // chars per column
    rainSpeedMin: 40, // px/s
    rainSpeedMax: 120,
    beamSpeed: 0.35, // rad/s, sweeping flashlight in the background
    glitchChance: 0.025, // per frame, logo glitch
};

// ---- cutscenes (scenes/cutscene.js) ----
export const CUTSCENE = {
    pixel: 4, // one art pixel = 4 screen px
    heliScale: 2, // the helicopter art is drawn this many times bigger than characters
    fadeTime: 0.8, // s, fade in / out
    walkSpeed: 120, // px/s, characters walking in cutscenes
};

// ---- audio (systems/audio.js), Web Audio chiptune synth, no files needed ----
export const AUDIO = {
    master: 0.6,
    music: 0.4,
    sfx: 0.8,
    lookahead: 0.12, // s, music scheduled this far ahead
    tickMs: 25, // scheduler interval
    muteKey: "m",
};
