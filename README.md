# RAMmagedon

Top-down stealth heist (hackathon "Poza zasięgiem"). JavaScript + [KAPLAY](https://kaplayjs.com) + Vite.

## Uruchomienie

```sh
npm install
npm run dev      # http://localhost:3001
npm run build    # paczka do dist/
npm run check-levels   # sprawdza mapy (wymiary, trasy, czy da się dojść do PC i drzwi)
```

## Sterowanie

- **WASD / strzałki** ruch
- **Mysz** celowanie latarką
- **PPM / F** latarka on/off
- **E** otwórz komputer (zielona dioda), potem 4 etapy:
  1. 4 śrubki: złap **LPM** żółtą strzałkę przy śrubce i obróć ją raz dookoła
  2. panel: chwyć **LPM** i powoli przeciągnij w prawo (za szybko = BRZDĘK!)
  3. 2 zatrzaski: **Spacja/E** w zielonej strefie (pudło = TRZASK!)
  4. RAM: chwyć **LPM** i powoli pociągnij w górę
  Każdy etap hałasuje, błędy hałasują bardzo. **Esc** przerywa (postęp zostaje).
- **F2** (debug) wyłącz ciemność, **F3** pokaż kolizje (przy mapie PNG), **F1** inspektor KAPLAY

## Struktura

```
src/
  main.js              init KAPLAY, rejestracja scen
  config.js            wszystkie liczby do tuningu (prędkości, zasięgi, kąty)
  level/
    rooms.js           poziomy po kolei: mapy ASCII (legenda w pliku), trasy nauczycieli, cele RAM
    level.js           budowanie mapy, segmenty ścian do raycastu, drzwi
  entities/
    player.js          gracz: ruch, celowanie, przełączanie latarki
    teacher.js         nauczyciel: patrol po waypointach, stożek widzenia, wykrycie, stany AI
  systems/
    raycast.js         raycasting 2D (wachlarz widoczności, line of sight, test stożka)
    lighting.js        ciemność / fog of war (drawSubtracted) + stożek latarki
    extraction.js      wyjmowanie RAM: 4 etapy (śrubki, panel, zatrzaski, wyciąganie)
    sound.js           pierścienie dźwięku + powiadamianie nauczycieli w zasięgu
  scenes/
    game.js            scena gry, HUD, interakcje, warunki wygranej/przegranej
    menus.js           menu, game over, wygrana
```

Warstwy rysowania: `world` (mapa, postacie) → `dark` (ciemność) → `glow` (widoczne w ciemności: diody, `?`/`!`, fale dźwięku) → `ui`.

## Poziomy i trasy nauczycieli

Poziomy są w `src/level/rooms.js` w kolejności gry: Tutorial (12×16), Poziom 1 (24×20), Poziom 2 (32×20), Poziom 3 (32×20).
Znaki: `#` ściana, `S` szafa, `=` ławka, `C` PC z RAM, `G` szyba, `D` drzwi wyjściowe (na krawędzi mapy), `P` start gracza, `a`-`z` punkty tras.

Trasa nauczyciela to ciąg liter w `teachers`, np. `teachers: ["abcd", { route: "efgh", speed: 50 }]`:
nauczyciel startuje na `a`, idzie prosto do `b`, `c`, `d` i wraca do `a`. Linia między punktami musi być wolna.
Po zmianie map odpal `npm run check-levels`.

## Font

Minecraftia (Andrew Tyler, dafont, licencja: free for personal use) w `public/fonts/`.
Oryginalny plik ma zepsute metryki pionowe (KAPLAY ucinał górę liter), dlatego jest poprawiony skryptem
`scripts/fix-font.py`. Skutek: font rysuje się o połowę mniejszy, więc rozmiary w kodzie są ×2 (16 / 24 / 32 / 48 / 96).

## Mapa z PNG

Grafika sali to jeden PNG (np. `public/maps/sala1.png`, rozmiar `kolumny*32 x wiersze*32`).
Kolizje i światło dalej pochodzą z siatki ASCII w `src/level/rooms.js`, ułożonej pod rysunkiem:
1. wrzuć PNG do `public/maps/`, odkomentuj `k.loadSprite("sala1", "maps/sala1.png")` w `main.js`,
2. ustaw `background: "sala1"` w danych sali,
3. popraw znaki w siatce tak, żeby `#`, `S`, `=`, `C` leżały na ścianach, szafach i ławkach z obrazka (F3 pokazuje kolizje na tle).

## Stan

Zrobione: sceny, ruch, latarka z raycastingiem, ciemność z promieniem ~1,5 m wokół gracza, światło i wzrok przechodzą nad ławkami, kradzież RAM w 4 etapach z hałasem, nauczyciel idzie sprawdzić hałas (szukanie drogi po siatce), rozgląda się 3 s i wraca na patrol, nauczyciel patrolujący z widocznym stożkiem, pasek wykrycia (0,5 s w stożku = złapany, zasięg większy przy włączonej latarce), licznik RAM, drzwi otwierające się po zebraniu RAM, wyjście = wygrana.

TODO (szukaj `TODO(P2)` / `TODO(P3)` w kodzie):
- P3: pierścienie dźwięku kroków nauczyciela, stan AI `CHASE`, reakcja na światło latarki, rozglądanie się na patrolu
- Sale 2 i 3 (kamera monitoringu, szklana ściana, 2 nauczycieli), kamera śledząca gracza, finałowa ucieczka 20 s
