// All story text in one place (in-game texts in Polish).
// A dialog line: { who: "player" | "pilot" | "teacher" | "mieciu" | "narrator", text }.
// Do not use square brackets in texts (KAPLAY style tags).

export const AUTHORS = [
    "Tu wpisz autorów:",
    "- Imię Nazwisko: kod, design",
    "- Imię Nazwisko: grafika",
    "- Imię Nazwisko: dźwięk, mapy",
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
        out: [
            p("Mam RAM. Tera spływka."),
        ],
        hide: [
            p("O kurde Gestapo idzie, ale raczej mnie nie zauważy."),
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
            firstRam: [p("Jeden leży skibidi, został jeszcze jeden.")],
            doorsOpen: [p("Dobra, na GTA VI wystarczy, lecym!")],
        },
        jammed: {
            start: [
                p("Cały czas ktoś pali tokeny..."),
                p("Terminal w sali po lewej wyłączy im neta, ten w prawej włączy verity phonk na słuchawkach."),
                p("A, i każda da mi kawałek kodu do drzwi (kto to projektował...), w salach powinienem być bezpieczny."),
                n("Zdobyte kawałki kodu widać w prawym górnym rogu."),
            ],
            noSignal: [
                n("Panel mruga na czerwono: BRAK ZASIĘGU."),
                p("Najpierw musze odciąć internet temu gemini enjoyer."),
            ],
            firstTerminal: [p("Nie ma grok'a, naucz sie programować a nie... lece teraz do tego po prawej.")],
            bothTerminals: [p("I tyle, nie ma generowania waifu w szkole, miłego słuchania. Do wyjścia!")],
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
        out: [p("Jestem na zewnątrz! Brama, brama, gdzie jest brama...")],
        mieciu: [
            { who: "mieciu", text: "Wracaj tu, ancymonie! Lola wszystko pamięta!" },
            { who: "mieciu", text: "Jutro rano sprawdzę wszystkie komputery! Wszystkie!" },
        ],
        gate: [
            pi("Wsiadaj, szybko! Masz ten RAM?"),
            p("Mam. Dwie kości z pracowni multimedialnej."),
            pi("I to było warte nocy w szkole, zamka bez zasięgu i woźnego z pałką?"),
            p("Starczy na bułkę w sklepiku. I może na drożdżówkę."),
            n("Koniec. A jutro na informatyce ktoś bardzo się zdziwi, że komputery nie chcą się włączyć."),
        ],
    },
};
