import kaplay from "kaplay";
import { WIDTH, HEIGHT, COLORS } from "./config.js";
import { gameScene } from "./scenes/game.js";
import { menuScenes } from "./scenes/menus.js";

const k = kaplay({
    width: WIDTH,
    height: HEIGHT,
    letterbox: true,
    background: COLORS.floor,
    global: false,
});

// Right mouse button toggles the flashlight -> no browser context menu.
k.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

k.loadRoot("./");

// Dev only: access the engine from the browser console (e.g. __k.get("player")[0]).
if (import.meta.env.DEV) window.__k = k;

menuScenes(k);
gameScene(k);

k.go("menu");
