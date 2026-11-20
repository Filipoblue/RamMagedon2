// Level data. One screen = one room for now (40 x 22 tiles of 32 px).
// Later: rooms 2 and 3 can be appended to the right of this map (one big map
// with doors between zones, as the GDD suggests) and the camera will follow.
//
// Legend:
//   #  wall            (blocks movement + light)
//   S  tall cabinet    (blocks movement + light)
//   b  low desk        (blocks movement, light passes over)
//   C  desk with a PC that has RAM (target, glowing LED)
//   D  door            (blocks movement + light until opened)
//   P  player start
//   1-9 teacher waypoints (visited in numeric order, then loop)

export const ROOMS = [
    {
        name: "Sala 1: Pracownia informatyczna",
        ramToOpen: 2,
        map: [
            "########################################",
            "#SSS....SSS..................SSSS......#",
            "#......................................#",
            "#......................................#",
            "#......................................#",
            "#....bbCbb.....bbbbb.....bbbbb.........#",
            "#......................................#",
            "#..1...........................2.......#",
            "#......................................#",
            "#....bbbbb.....bbbbb.....bbCbb.........#",
            "#......................................D",
            "#......................................D",
            "#....bbbbb.....bbbbb.....bbbbb.........#",
            "#......................................#",
            "#..4...........................3.......#",
            "#......................................#",
            "#....SS...........######...............#",
            "#....SS...........#....#...............#",
            "#.................#....#...............#",
            "#..................................P...#",
            "#......................................#",
            "########################################",
        ],
    },
];

// Whole heist goal from the GDD (2 + 3 + 3).
export const TOTAL_RAM = 8;
