import { loadPixelArt } from "../systems/pixelart.js";

// Pixel art for the story: 16x16 dialog portraits and small side-view cutscene sprites.
// Edit the strings to redraw; palette letters are listed next to each picture.

const OUT = [18, 18, 24];
const SKIN = [240, 192, 150];
const SKIN_SH = [204, 150, 115];
const EYE = [24, 24, 34];
const WHITE = [250, 250, 250];

// ---- portraits (16x16, shown x7 in the textbox) ----

// player: green hoodie (g/G), hair (h), white hoodie strings (w),
// school logo "C" (L) on the hero's left chest (right side of the picture)
const PLAYER = [
    "....oooooooo....",
    "...oggggggggo...",
    "..oggghhhhgggo..",
    ".oggghhhhhhgggo.",
    ".ogghhhhhhhhggo.",
    ".ogghsssssshggo.",
    ".oggswesswesggo.",
    ".oggsssssssSggo.",
    ".oGgsssmmsssgGo.",
    ".oGgSssssssSgGo.",
    "..oGgSSSSSSgGo..",
    "..oggGGGGGGggo..",
    ".ogggggwwgLLggo.",
    "oggggggwwgLggggo",
    "ogggggggggLLgggo",
    "oooooooooooooooo",
];

// pilot: helmet (H/h), visor (v/V), mic (m), jacket (j/J)
const PILOT = [
    "....oooooooo....",
    "...oHHHHHHHHo...",
    "..oHHHHHHHHHHo..",
    ".oHHHHHHHHHHHHo.",
    ".oHhvvvvvvvvhHo.",
    ".oHvVVvvvvvvvHo.",
    ".oHvvvvvvvvvvHo.",
    ".ohHsssssssshho.",
    ".ohhsssssssshho.",
    "..ohSsmmmmsSho..",
    "..ohmSSSSSSSho..",
    "...oooSSSSooo...",
    "..ojjjjjjjjjjo..",
    ".ojjJjjjjjjJjjo.",
    "ojjjJjjjjjjJjjjo",
    "oooooooooooooooo",
];

// teacher: grey hair (h), glasses (q), cardigan (c/C), shirt (w)
const TEACHER = [
    "....oooooooo....",
    "...ohhhhhhhho...",
    "..ohhhhhhhhhho..",
    ".ohhhsssssshhho.",
    ".ohhssssssssshho",
    ".ohsqqqsqqqsho..",
    ".ohsqeqsqeqsho..",
    ".ohsqqqsqqqsho..",
    "..ossssSsssso...",
    "..osssmmmmsso...",
    "...oSSSSSSSo....",
    "....oooSooo.....",
    "..occcwwwccco...",
    ".occCcwwwcCcco..",
    "occcCcwwwcCccco.",
    "ooooooooooooooo.",
];

// Pan Mieciu, the janitor (matches his in-game sprite): grey hair (h/H), blue shirt (u),
// dark button strip (d), suspenders (j), cheeks (r)
const MIECIU = [
    "....oooooooo....",
    "...ohhhhhhhho...",
    "..ohhhhhhhhhho..",
    ".ohhhhhhhhhhhho.",
    ".ohHhhhhhhhhhHo.",
    ".oHsssssssssHHo.",
    ".oHseesssseesHo.",
    ".osssssssssssso.",
    ".osrsssSSsssrso.",
    "..osssmmmmssso..",
    "...oSSSSSSSSo...",
    "..ouujuuddujuuo.",
    ".ouuujuudduujuuo",
    "ouuuujuudduujuuo",
    "ouuuujuudduujuuo",
    "oooooooooooooooo",
];

// ---- cutscene sprites ----

// helicopter, side view, nose to the right
const HELI = [
    "..................oooo..................",
    "..................obbo..................",
    "............oooooooooooooo..............",
    "...........obbbbbbbbbbbbbbo.............",
    "..........obbbbbbbbbbbwwwwwo............",
    "..oo.....obbbbbbbbbbbbwVwwwwo...........",
    ".obbo...obbbbbbbbbbbbbwwVwwwwo..........",
    ".obbbooobyyyyyyyyyyyyybwwwwwwwo.........",
    ".obbbbbbbbbbbbbbbbbbbbbbbbbbbbbo........",
    ".orooooooobbbbbbbbbbbbbbbbbbbbbbo.......",
    "..........obbbbbbbbbbbbbbbbbbbbbo.......",
    "...........oBBBBBBBBBBBBBBBBBBBo........",
    "............ooooooooooooooooooo.........",
    "..............o..........o..............",
    "..........ssssssssssssssssssss..........",
];

// player, side view (facing right), 2 walk frames + "hold RAM" pose
const KID_TOP = [
    "...hhhh...",
    "..hhhhhh..",
    "..hhhssh..",
    "..hhsses..",
    "...ssss...",
    "..gggggg..",
    ".pgggggg..",
    ".pggggggs.",
    ".pgggggg..",
    "..gggggg..",
    "..jjjjjj..",
];
const KID_A = [...KID_TOP, "..jj..jj..", "..jj..jj..", ".kkk..kkk."];
const KID_B = [...KID_TOP, "...jjjj...", "...jjjj...", "...kkkk..."];

const KID_PAL = {
    h: [70, 45, 30],
    s: SKIN,
    e: EYE,
    g: [46, 110, 70],
    p: [90, 60, 40],
    j: [50, 60, 95],
    k: [25, 25, 30],
};

export function loadStoryArt(k) {
    const portrait = (name, rows, pal) => loadPixelArt(k, name, [rows], { o: OUT, s: SKIN, S: SKIN_SH, e: EYE, w: WHITE, ...pal });
    portrait("portrait_player", PLAYER, { g: [46, 110, 70], G: [30, 75, 48], h: [70, 45, 30], m: [150, 70, 60], L: [240, 240, 220] });
    portrait("portrait_pilot", PILOT, {
        H: [210, 210, 220], h: [150, 150, 165], v: [40, 60, 90], V: [120, 170, 220], m: [30, 30, 30], j: [80, 90, 60], J: [60, 68, 45],
    });
    portrait("portrait_teacher", TEACHER, { h: [170, 170, 175], q: [60, 60, 70], c: [130, 60, 70], C: [100, 45, 55], m: [150, 80, 80] });
    portrait("portrait_mieciu", MIECIU, {
        h: [156, 156, 162], H: [112, 112, 120], r: [237, 160, 134], m: [150, 70, 60], u: [82, 102, 136], d: [46, 58, 82], j: [62, 78, 106],
    });
    loadPixelArt(k, "heli", [HELI], {
        o: OUT, b: [52, 78, 110], B: [36, 54, 78], w: [120, 200, 230], V: [220, 245, 255], y: [230, 200, 60], r: [255, 60, 60], s: [120, 120, 130],
    });
    loadPixelArt(k, "kid", [KID_A, KID_B], KID_PAL, {
        anims: { idle: 0, walk: { from: 0, to: 1, loop: true, speed: 6 } },
    });
}
