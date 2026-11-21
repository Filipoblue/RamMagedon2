// Level data. Levels are played in this order. Every map is a grid of 32 px tiles,
// each string is one row (all rows must have the same length).
//
// Legend:
//   #   wall              (blocks movement + light)
//   S   tall cabinet      (blocks movement + light)
//   =   desk              (blocks movement; your light passes over it, teachers cannot see through it)
//   C   desk with a PC that has RAM (target, glowing LED; same as a desk for light/sight)
//   G   glass wall        (blocks movement, light and sight pass through)
//   ,   safe floor        (teachers never step here and cannot catch you here)
//   1   terminal 1        (level 2: QTE mini-game, gives digits 1-2 of the door code)
//   2   terminal 2        (level 2: antenna tuning mini-game, digits 3-4)
//   K   door keypad       (in the wall next to D: code + wire bridging, opens the doors)
//   T   ping-pong table   \
//   B   sofa               |  furniture: block movement, your light passes over them,
//   Y   table              |  teachers cannot see through them (like "=")
//   H   chair             /
//   O   pillar            (blocks movement, light and sight, like a wall)
//   D   exit door         (opens when `ramToOpen` RAM is stolen; walk out through it)
//   P   player start
//   a-z teacher waypoints (any lowercase letter)
//   .   floor
//
// Teacher routes: `teachers` lists one route per teacher, as a string of waypoint
// letters in walking order (the route loops back to the first letter).
// The teacher starts at the first letter. Between two waypoints the teacher walks
// in a straight line, so keep that line free of desks/walls.
// Optional per teacher: { route: "abcd", speed: 50 }, or { routes: ["abc", "def"] }
// (picks a random route each time it finishes one; walks to it along a grid path).
//
// Optional `background: "spriteName"` = PNG art drawn under the grid
// (see README, "Mapa z PNG").
// Optional `id` = key of the level's story lines in STORY.levels (src/story/script.js),
// optional `cutsceneAfter` = cutscene id played after leaving the level.

export const LEVELS = [
    {
        id: "lab", // story lines: STORY.levels.lab (src/story/script.js)
        name: "Poziom 1: Pracownia multimedialna",
        ramToOpen: 2,
        cutsceneAfter: "escape", // scenes/cutscene.js, played before the next level
        // Art: public/sprites/level2.png ("level2" is just the file codename) (Tiled export 1024x1024, map = top-left 1024x640).
        // Chairs are walkable (you sit there to reach the PC), plants count as desks.
        background: "level2",
        // TODO: rotating security camera (GDD sala 2)
        teachers: ["abcdef"], // (the second, vertical "gh" teacher was removed: too hard)
        map: [
            "################################",
            "################################",
            "#######.=...C..#........#C=.==.#",
            "#######.=...=..#.====...#......#",
            "#######.==.....#.====...#.....=#",
            "#######===..............#.....=#",
            "#######=........d.....c.#..#####",
            "################........#..#####",
            "################...............#",
            "#######=.......................#",
            "#..a..................b........#",
            "D..............................#",
            "#..f............e..............#",
            "#..............................#",
            "####################..#######..#",
            "###########==##==#==..#######..#",
            "###########C=..==.==...=#......#",
            "###########.............#=....=#",
            "###########.............#=...P=#",
            "################################",
        ],
    },
    {
        id: "jammed", // story lines: STORY.levels.jammed
        name: "Poziom 2: Brak zasięgu",
        ramToOpen: 0, // no RAM here: the door opens with the keypad code (terminals 1, 2, K)
        // Art: public/sprites/level_jammed.png, built from tiles/ by scripts/build-level-art.py.
        // Light floor (",") = safe zones around the terminals and the door: teachers stay in the open.
        background: "level_jammed",
        teachers: ["ab", { route: "cdef", speed: 60 }],
        map: [
            "################################",
            "################################",
            "#,=1,,SS#SS..........SS#SS,,2=,#",
            "#,,,,,,,#..c........d..#,,,,,,,#",
            "#,,,,,,,#....==..==....#,,,,,,,#",
            "#,,,,,,,#..............#,,,,,,,#",
            "#=,,,,,=#....==..==....#=,,,,,=#",
            "###,,####..............####,,###",
            "#..............................#",
            "#.....SS................SS.....#",
            "#.a..........................b.#",
            "#.............====.............#",
            "#..............................#",
            "###,,###...............###,,####",
            "#,,,,,,#...............#,,,,,,,#",
            "#,,,,,,#...f........e..#,,,,,,,K",
            "#,,P,,,#......SS.......#,,,,,,,D",
            "#,,,,,,#...............#,,,,,,,D",
            "#=,,,,=#=............=.#=,,,,,=#",
            "################################",
        ],
    },
    {
        id: "lounge", // story lines: STORY.levels.lounge
        name: "Poziom 3: Świetlica",
        ramToOpen: 0, // no RAM: the exit opens with Pan Mieciu's key (boss level)
        boss: true, // pickpocket the key, then escape before the timer runs out (BOSS in config.js)
        drawDoors: true, // the exit door is drawn by the game (sliding panels)
        // Layout from the sketch swietlica-renew: ping-pong table, pillar, chairs along the
        // right wall, sofa, tables, bookcase, L-shaped desk; exit on the left wall (short
        // corridor to the map edge). Art: public/sprites/level_lounge.png
        // (scripts/build-level-art.py lounge).
        background: "level_lounge",
        // Pan Mieciu starts at "a" (yellow dot in the sketch) and walks the loop of arrows
        teachers: [{ route: "abcdefgh", boss: true }],
        cutsceneAfter: "outro",
        map: [
            "#############################",
            "#...........................#",
            "#...........................#",
            "#.....................P.....#",
            "##........TTTTTTTTT........H#",
            "###.......TTTTTTTTT...h.....#",
            "####......TTTTTTTTT........H#",
            "#####.....TTTTTTTTT.........#",
            "#####.....TTTTTTTTT........H#",
            "#####.......................#",
            "#####......................H#",
            "#####...e.....f.......g.....#",
            "#####.......................#",
            "#####...........OO..........#",
            "#####...........OO..........#",
            "#####...d............HH.....#",
            "#####...............YYY.....#",
            "#####...............YYY.....#",
            "#####...............YYY..a..#",
            "D....................HH.....#",
            "D...........................#",
            "D..............c.........b..#",
            "#####.....YY................#",
            "#####SS..HYYH....===========#",
            "#####SS...YY.....===========#",
            "#####SS..........==.........#",
            "#####SSBBBBBBBB..==.H.......#",
            "#####SSBBBBBBBB...........H.#",
            "#############################",
        ],
    },
];

export const TOTAL_RAM = LEVELS.reduce((sum, l) => sum + l.ramToOpen, 0);
