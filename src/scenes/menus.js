import { TOTAL_RAM } from "../level/rooms.js";

const PLN_PER_RAM = 525; // humour: GDD "4 200 PLN - starczy na bułkę w sklepiku"

function centerText(k, txt, y, size, color = [255, 255, 255]) {
    return k.add([k.text(txt, { size, align: "center", width: k.width() - 80 }), k.pos(k.width() / 2, y), k.anchor("center"), k.color(...color)]);
}

function onContinue(k, action) {
    k.onKeyPress("enter", action);
    k.onKeyPress("space", action);
    k.onMousePress("left", action);
}

export function menuScenes(k) {
    k.scene("menu", () => {
        centerText(k, "RAMmagedon", k.height() / 2 - 110, 64, [120, 255, 160]);
        centerText(k, "Poza zasięgiem", k.height() / 2 - 50, 22, [180, 180, 200]);
        centerText(k, "Ukradnij RAM ze szkolnych pracowni i nie daj się złapać.", k.height() / 2 + 10, 20);
        centerText(k, "Kliknij lub naciśnij ENTER, aby zacząć", k.height() / 2 + 90, 18, [255, 230, 120]);
        onContinue(k, () => k.go("game"));
    });

    k.scene("gameover", ({ ram = 0 } = {}) => {
        centerText(k, "ZŁAPANY!", k.height() / 2 - 80, 64, [255, 90, 90]);
        centerText(k, "Konfiskata sprzętu i uwaga do dziennika.", k.height() / 2, 22);
        centerText(k, `Skradzione kości: ${ram}/${TOTAL_RAM}`, k.height() / 2 + 40, 18, [180, 180, 200]);
        centerText(k, "ENTER / klik - spróbuj ponownie", k.height() / 2 + 110, 18, [255, 230, 120]);
        onContinue(k, () => k.go("game"));
    });

    k.scene("win", ({ ram = 0, time = 0 } = {}) => {
        const value = ram * PLN_PER_RAM;
        centerText(k, "UCIECZKA UDANA!", k.height() / 2 - 100, 56, [120, 255, 160]);
        centerText(k, `Czas: ${time.toFixed(1)} s`, k.height() / 2 - 20, 22);
        centerText(k, `Skradzione kości RAM: ${ram}/${TOTAL_RAM}`, k.height() / 2 + 15, 22);
        centerText(k, `Wartość łupu: ${value.toLocaleString("pl-PL")} PLN - starczy na bułkę w sklepiku`, k.height() / 2 + 50, 20, [255, 230, 120]);
        centerText(k, "ENTER / klik - menu", k.height() / 2 + 120, 18, [180, 180, 200]);
        onContinue(k, () => k.go("menu"));
    });
}
