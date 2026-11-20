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
// Extraction close-up art (optional, placeholders are drawn when missing).
// Sizes on screen: pc_panel / pc_board 360x240, pc_ram 200x30, pc_screw 24x24
// Draw them 1:1 in these sizes, or exactly half (180x120, 100x15, 12x12) for chunky 2x pixels.
k.loadSprite("pc_panel", "sprites/pc_panel.png");
k.loadSprite("pc_board", "sprites/pc_board.png");
k.loadSprite("pc_panel_swipe", "sprites/pc_panel_swipe.png"); // panel art shown during the "slide" stage
// k.loadSprite("pc_ram", "sprites/pc_ram.png");
// k.loadSprite("pc_screw", "sprites/pc_screw.png");
// Room art (see `background` in src/level/rooms.js). Square Tiled exports are fine:
// the sprite is drawn at its natural size from the top-left corner, transparent padding is ignored.
k.loadSprite("tutorial", "sprites/tutorial.png");
// k.loadSprite("sala1", "maps/sala1.png");

// Dev only: access the engine from the browser console (e.g. __k.get("player")[0]).
if (import.meta.env.DEV) window.__k = k;

// Draw order: world (map, characters) -> dark (fog) -> glow (visible in the dark) -> ui.
// setLayers may only be called once, so it lives here and not in a scene.
k.setLayers(["world", "dark", "glow", "ui"], "world");

menuScenes(k);
gameScene(k);

k.go("menu");
