# RAMmagedon

Top-down stealth heist (hackathon "Poza zasięgiem"). JavaScript + [KAPLAY](https://kaplayjs.com) + Vite.

## Uruchomienie

```sh
npm install
npm run dev      # http://localhost:3001
npm run build    # paczka do dist/
```

## Sterowanie

- **WASD / strzałki** ruch
- **Mysz** celowanie latarką
- **PPM / F** latarka on/off
- **E** wyjmij RAM z komputera (zielona dioda)
- **F2** (debug) wyłącz ciemność, **F1** inspektor KAPLAY

## Struktura

```
src/
  main.js              init KAPLAY, rejestracja scen
  config.js            wszystkie liczby do tuningu (prędkości, zasięgi, kąty)
  level/
    rooms.js           mapy ASCII sal (legenda w pliku) + cele RAM
    level.js           budowanie mapy, segmenty ścian do raycastu, drzwi
  entities/
    player.js          gracz: ruch, celowanie, przełączanie latarki
    teacher.js         nauczyciel: patrol po waypointach, stożek widzenia, wykrycie, stany AI
  systems/
    raycast.js         raycasting 2D (wachlarz widoczności, line of sight, test stożka)
    lighting.js        ciemność / fog of war (drawSubtracted) + stożek latarki
    skillcheck.js      [STUB P2] mini-gra wyjmowania RAM
    sound.js           [STUB P3] pierścienie dźwięku + hałas wabiący nauczycieli
  scenes/
    game.js            scena gry, HUD, interakcje, warunki wygranej/przegranej
    menus.js           menu, game over, wygrana
```

Warstwy rysowania: `world` (mapa, postacie) → `dark` (ciemność) → `glow` (widoczne w ciemności: diody, `?`/`!`, w przyszłości fale dźwięku) → `ui`.

## Stan (szkielet)

Zrobione: sceny, ruch, latarka z raycastingiem (ściany i szafy blokują światło, ławki nie), ciemność z promieniem ~1,5 m wokół gracza, nauczyciel patrolujący z widocznym stożkiem, pasek wykrycia (0,5 s w stożku = złapany, zasięg większy przy włączonej latarce), licznik RAM, drzwi otwierające się po zebraniu RAM, wyjście = wygrana.

TODO (szukaj `TODO(P2)` / `TODO(P3)` w kodzie):
- P2: prawdziwy skill check (pasek ze strefami, szybszy po ciemku), zawężenie widoku podczas kradzieży
- P3: pierścienie dźwięku kroków, stany AI `SUSPICIOUS` / `CHASE`, rozglądanie się na boki
- Sale 2 i 3 (kamera monitoringu, szklana ściana, 2 nauczycieli), kamera śledząca gracza, finałowa ucieczka 20 s
