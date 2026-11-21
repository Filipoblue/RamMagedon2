// All story text in one place (in-game texts in Polish).
// A dialog line: { who: "player" | "pilot" | "teacher" | "mieciu" | "narrator", text }.
// Do not use square brackets in texts (KAPLAY style tags).

export const AUTHORS = [
    "- Andrzej Moliński - grafiki",
    "- Filip Paderecki - programista",
    "- Hubert Suchenek - programista, tester",
    "- Olaf Żyłowski - Lead programista"
];

// name: shown above the text (null = no name tab), portrait: sprite from story/art.js,
// voice: typewriter blip (frequency in Hz + oscillator wave).
export const SPEAKERS = {
    narrator: { name: null, portrait: null, color: [200, 200, 215], voice: { freq: 260, wave: "triangle" } },
    player: { name: "Ty", portrait: "portrait_player", color: [255, 255, 255], voice: { freq: 520, wave: "square" } },
    pilot: { name: "Pilot", portrait: "portrait_pilot", color: [255, 255, 255], voice: { freq: 330, wave: "sawtooth" } },
    teacher: { name: "Nauczycielka", portrait: "portrait_teacher", color: [255, 220, 220], voice: { freq: 620, wave: "triangle" } },
    mieciu: { name: "Pan Mieciu", portrait: "portrait_mieciu", color: [255, 230, 180], voice: { freq: 180, wave: "square" } },
};

const n = (text) => ({ who: "narrator", text });
const p = (text) => ({ who: "player", text });
const pi = (text) => ({ who: "pilot", text });

export const STORY = {
    // ---- cutscene 1: helicopter on the school roof ----
    intro: {
        opening: [
            n("Noc. Technikum SCI. Wszyscy uczniowie dawno śpią."),
            n("Raczej..."),
        ],
        landed: [
            pi("Jesteśmy na miejscu. Dach SCI, rzeczywiście lądowisko."),
            p("Dzięki za lote, 32GB DDR5 piechotą nie chodzi... więc trzeba lecieć... heh"),
            pi("Boże jaki z ciebie bezbek... Nie ważne, uważaj na dzisiejszą zmiane nauczycieli."),
            pi("Wszędzie się plątają więc postaraj sie żeby cie nie zauważyli."),
            p("Pewnie się plątają..."),
            pi("A, i bądź cicho bo jak cie usłyszą to kaplica💀"),
        ],
        plan: [
            pi("Weź tu najlepiej nie wracaj, odbiore cie przed wejściem."),
            p("Okej... wchodze zabieram RAM i zawijam..."),
            p("Chyba proste nie?"),
        ],
    },

    // ---- cutscene 2: after level 1, corridor ----
    escape: {
        // the phone rings in the corridor (ringtone: CUTSCENE.ringtone in config.js)
        call: [
            p("Halo?"),
            pi("Za halo to w morde walo. Co ty tyle robisz?! Zaraz zkończy mi sie tiktok do scrollowania."),
            p("Spokojnie, mam RAM. Tera tylko zejść na dół."),
            pi("To sie pospiesz albo cie tu zostawie."),
        ],
        door: [
            p("Hell Nah... kto zamyka schody na kod?"),
            n("Na panelu mruga czerwony napis: BRAK ZASIĘGU."),
            p("Claude chyba u kogoś gotuje, bo aż internet wywaliło."),
            p("W sali obok są komputery, vibecoderów nie tolerujemy."),
        ],
    },

    // ---- in-game comments, by level id (see `id` in level/rooms.js) ----
    levels: {
        lab: {
            start: [
                p("Chyba sie lekko spóźniłem, reszta RAM'u została tylko w migających komputerach."),
                p("Tylko trzeba sie prześlizgnąć koło szkiełów."),
            ],
            firstRam: [p("I do kieszeni, został jeszcze jeden.")],
            doorsOpen: [p("Dobra, na GTA VI wystarczy, lecym!")],
        },
        jammed: {
            start: [
                p("Cały czas ktoś pali tokeny..."),
                p("Terminal w sali po lewej wyłączy im neta, ten w prawej włączy skolima na słuchawkach."),
                p("A, i każda da mi kawałek kodu do drzwi (kto to projektował...), w salach powinienem być bezpieczny."),
                n("Zdobyte kawałki kodu widać w prawym górnym rogu."),
            ],
            noSignal: [
                n("Panel mruga na czerwono: BRAK ZASIĘGU."),
                p("Najpierw musze odciąć internet temu gemini enjoyer."),
            ],
            firstTerminal: [p("Nie ma grok'a, naucz sie programować a nie... lece teraz do tego po prawej.")],
            bothTerminals: [p("I tyle, miłego słuchania. Do wyjścia!")],
            doorsOpen: [p("Sezamie otwórz sie! Ej bo zadziałało... dobra wiejemy.")],
        },
        lounge: {
            start: [
                p("Świetlica. Trzeba wyjść głównym wyjściem, ale jest problem..."),
                p("Trzeba ogarnąć klucz, a jedyny klucz ma Pan Mieciu. Nosi go przy pasku."),
                p("Mimo że nie w kwiecie wieku widzi nadal ostro, a jak zobaczy to czeka spotkanie z Lolą."),
                p("Na stole do ping-ponga są jakieś piłeczki. Jak rzucę jedną, pewnie pójdzie sprawdzić, co stuknęło."),
                 p("Wtedy kradne mu klucz i zawijka. Seems easy."),
            ],
            balls: [p("Mam trzy rzuty, lepiej nie spudłować."), 
                n("Rzucanie jest pod Q, piłka leci gdzie celujesz.")
            ],
            keyStolen: [
                { who: "mieciu", text: "Co ty robisz nikczemniku!" },
                { who: "mieciu", text: "Poczujesz na swojej skórze jakość niemieckiego wykonania!" },
                p("Hell Nah, wczuł się w niemieckiego agenta!"),
                n("Wyjście jest otwarte, mało czasu zanim sie zatrzaśnie."),
            ],
        },
    },

    // ---- cutscene 3: the school yard, the end ----
    outro: {
        out: [p("W końcu... gdzie jest ten pilot?")],
        mieciu: [
            { who: "mieciu", text: "Ty... chytrusie!" },
            { who: "mieciu", text: "Już nigdy nie przejedziesz się windą!" },
        ],
        gate: [
            pi("Co tak długo! Masz ten RAM?"),
            p("Jeszcze jak! Całe 2 kości."),
            pi("Stary, Ty se żartujesz?"),
            p("No na GTA starczy, jutro lecimy do TME po ich RAM."),
            n("I tyle ich widziano."),
        ],
    },
};

// Quest card per level (Esc / H in game, shown at the start of every level).
// `recap` = the story in short, shown instead of the cutscenes when the story is skipped.
export const QUESTS = {
    lab: {
        recap: "Noc. Pilot wysadził cię na dachu Technikum SCI. W pracowni zostały kości RAM, a nauczyciele mają nocną zmianę.",
        steps: [
            "Ukradnij 2 kości RAM z migających komputerów (podejdź, E).",
            "Drzwi otworzą się same, wyjdź przez nie (strzałka pokazuje drogę).",
            "Nie daj się zobaczyć: unikaj stożków światła nauczycieli, nie hałasuj.",
        ],
    },
    jammed: {
        recap: "Masz RAM, ale schody zamknięto zamkiem na kod, a ktoś zżera cały internet i w szkole nie ma zasięgu.",
        steps: [
            "Terminal w sali po lewej (restart routera): da 2 cyfry kodu.",
            "Terminal w sali po prawej (strojenie anteny): da 2 kolejne cyfry.",
            "Wpisz kod przy drzwiach w prawym dolnym rogu i zmostkuj kable.",
            "Jasna podłoga w salach to strefa bezpieczna: tam nikt cię nie złapie.",
        ],
    },
    lounge: {
        recap: "Ostatnia przeszkoda: świetlica. Klucz do wyjścia ma woźny, Pan Mieciu, a przy pasku nosi pałkę Lolę.",
        steps: [
            "Weź piłeczki ze stołu do ping-ponga (E).",
            "Rzuć piłeczkę (Q, celujesz myszą): Pan Mieciu pójdzie sprawdzić hałas.",
            "Podejdź do niego od tyłu i przytrzymaj E, żeby zabrać klucz.",
            "Potem uciekaj do drzwi na lewej ścianie, zanim czas minie.",
        ],
    },
};
