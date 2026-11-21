// What the player has already seen in this browser session (resets on page reload).
// Used so story lines and the controls card do not repeat after a retry.

const seen = new Set();

/** True the first time it is called with `key`, false afterwards. */
export function firstTime(key) {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
}

// Chosen in the menu ("Pominąć fabułę?"): true = no cutscenes and story dialogs, each level
// starts with a short recap + the quest card instead (see QUESTS in story/script.js).
export const settings = { skipStory: false };

// Level checkpoints for a retry after game over, by level id (e.g. RAM already stolen on
// level 1 = the door stays open). Cleared when the level is finished.
export const checkpoints = {};
