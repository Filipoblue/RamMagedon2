import kaplay from "kaplay";
import { WIDTH, HEIGHT } from "./config.js";
import { gameScene } from "./scenes/game.js";
import { menuScenes } from "./scenes/menus.js";

const k = kaplay({
    width: WIDTH,
    height: HEIGHT,
    letterbox: true,
    background: [0, 0, 0], // outside the map is pitch black (floor colour is drawn per map)
    global: false,
    font: "minecraftia", // default font for every text (loaded below)
});

// Right mouse button toggles the flashlight -> no browser context menu.
k.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

k.loadRoot("./");
// Minecraftia by Andrew Tyler (dafont, "free for personal use").
// The TTF was patched by scripts/fix-font.py (broken metrics), so it renders at half
// size: text size 24 here ~ "12px" Minecraftia. Crispest sizes: 16 / 32 / 64.
k.loadFont("minecraftia", "fonts/Minecraftia-Regular.ttf", { filter: "nearest" });
// Room art (see `background` in src/level/rooms.js), e.g.:
// k.loadSprite("sala1", "maps/sala1.png");

// Dev only: access the engine from the browser console (e.g. __k.get("player")[0]).
if (import.meta.env.DEV) window.__k = k;

// Draw order: world (map, characters) -> dark (fog) -> glow (visible in the dark) -> ui.
// setLayers may only be called once, so it lives here and not in a scene.
k.setLayers(["world", "dark", "glow", "ui"], "world");

menuScenes(k);
gameScene(k);

k.go("menu");
