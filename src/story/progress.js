// What the player has already seen in this browser session (resets on page reload).
// Used so story lines and the controls card do not repeat after a retry.

const seen = new Set();

/** True the first time it is called with `key`, false afterwards. */
export function firstTime(key) {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
}
