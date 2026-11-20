// Level data. Levels are played in this order. Every map is a grid of 32 px tiles,
// each string is one row (all rows must have the same length).
//
// Legend:
//   #   wall              (blocks movement + light)
//   S   tall cabinet      (blocks movement + light)
//   =   desk              (blocks movement, light passes over it)
//   C   desk with a PC that has RAM (target, glowing LED)
//   G   glass wall        (blocks movement, light and sight pass through)
//   D   exit door         (opens when `ramToOpen` RAM is stolen; walk out through it)
//   P   player start
//   a-z teacher waypoints (any lowercase letter)
//   .   floor
//
// Teacher routes: `teachers` lists one route per teacher, as a string of waypoint
// letters in walking order (the route loops back to the first letter).
// The teacher starts at the first letter. Between two waypoints the teacher walks
// in a straight line, so keep that line free of desks/walls.
// Optional per teacher: { route: "abcd", speed: 50 }.
//
// Optional `background: "spriteName"` = PNG art drawn under the grid
// (see README, "Mapa z PNG").

export const LEVELS = [
    {
        name: "Tutorial",
        ramToOpen: 1,
        tips: [
            "Zgaś latarkę (F / PPM), żeby nauczyciel trudniej Cię zauważył.",
            "Podejdź do PC z zieloną diodą i wciśnij E. Każdy krok hałasuje!",
            "Potem wyjdź drzwiami na górze.",
        ],
        teachers: [{ route: "abcd", speed: 45 }],
        map: [
            "#####DD#####",
            "#SS......SS#",
            "#..........#",
            "#.a......b.#",
            "#..........#",
            "#..==C=....#",
            "#..........#",
            "#..........#",
            "#....====..#",
            "#..........#",
            "#.d......c.#",
            "#..........#",
            "#S.........#",
            "#S.........#",
            "#........P.#",
            "############",
        ],
    },
    {
        name: "Poziom 1: Pracownia informatyczna",
        ramToOpen: 2,
        teachers: ["abcd"],
        map: [
            "########################",
            "#SSS......SSS.....SSSS.#",
            "#......................#",
            "#.a..................b.#",
            "#......................#",
            "#...==C==....=====.....#",
            "#......................#",
            "#......................#",
            "#...=====....==C==.....#",
            "#......................D",
            "#......................D",
            "#...=====....=====.....#",
            "#......................#",
            "#......................#",
            "#.d..................c.#",
            "#......................#",
            "#....SS.......####.....#",
            "#....SS.......#..#.....#",
            "#.P....................#",
            "########################",
        ],
    },
    {
        name: "Poziom 2: Pracownia multimedialna",
        ramToOpen: 2,
        // TODO: rotating security camera (GDD sala 2)
        teachers: ["abcdef"],
        map: [
            "################################",
            "#SSSS..........#..........SSSS.#",
            "#..............#...............#",
            "#.a..........b.#...............#",
            "#..............#...............#",
            "#...==C==......#...==C====.....#",
            "#..............................#",
            "#............c...............d.#",
            "#..............#...............#",
            "#...=====......#...=======.....#",
            "#..............#...............#",
            "#..............#...............D",
            "#...SS.........#...............D",
            "#..............................#",
            "#...=====....====....=====.....#",
            "#.f..........................e.#",
            "#..............................#",
            "#..====C====...........SSS.....#",
            "#.P............................#",
            "################################",
        ],
    },
    {
        name: "Poziom 3: Serwerownia",
        ramToOpen: 3,
        // TODO: after the last RAM -> alarm + 20 s escape to the roof (GDD finale)
        teachers: ["abcd", "efgh"],
        map: [
            "################################",
            "#SSS.......SSSS......SSSS......#",
            "#..............................#",
            "#.a.........................b..#",
            "#..............................#",
            "#...==C==...GGGGGGGG...==C==...#",
            "#..............................#",
            "#.........e..........f.........#",
            "#..............................#",
            "#...==C==..............==C==...#",
            "#..............................D",
            "#............SSSS..............D",
            "#..............................#",
            "#...=====..............=====...#",
            "#..............................#",
            "#.d.......h..........g......c..#",
            "#..............................#",
            "#.SS.......====C====.......SS..#",
            "#.P............................#",
            "################################",
        ],
    },
];

export const TOTAL_RAM = LEVELS.reduce((sum, l) => sum + l.ramToOpen, 0);
