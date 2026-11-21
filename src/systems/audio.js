import { AUDIO } from "../config.js";

// Chiptune synth on the Web Audio API: music + sound effects (only the ringtone is a file).
//
//   initAudio()          once in main.js (unlocks audio on the first click / key, M = mute)
//   playMusic("menu")    "menu" | "level" | "alarm" | "boss" | "chase" | null (stop); same name again = no restart
//   sfx("success")       one-shot effects, see SFX below
//   startLoop("heli")    looping effect, returns stop()
//   playFile(url, sec)   plays an audio file (e.g. the phone ringtone) for at most `sec` seconds
//
// Browsers only allow sound after a user gesture. Everything here is safe to call
// before that: the context starts suspended and music begins on the first click / key.

let ctx = null;
let master, musicBus, sfxBus, noiseBuf;
let muted = false;

function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = AUDIO.master;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = AUDIO.music;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = AUDIO.sfx;
    sfxBus.connect(master);
    // 1 s of white noise, reused by drums / hiss / helicopter
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
}

export function initAudio() {
    const unlock = () => {
        if (!ensure()) return;
        if (ctx.state === "suspended") ctx.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", (e) => {
        unlock();
        if (e.key.toLowerCase() === AUDIO.muteKey) toggleMute();
    });
}

export function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : AUDIO.master, ctx.currentTime, 0.02);
    return muted;
}

export const isMuted = () => muted;

// ---------------- primitives ----------------

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** One synth note. `slide` = end frequency (pitch glide). */
function tone(freq, t, dur, o = {}) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? "square";
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    const vol = o.vol ?? 0.1;
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur - (o.release ?? 0.03)));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(o.dest ?? sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

/** Filtered noise burst (hats, snares, clacks, whooshes). */
function noise(t, dur, o = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter ?? "highpass";
    f.frequency.setValueAtTime(o.freq ?? 4000, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const vol = o.vol ?? 0.1;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.dest ?? sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
}

function kick(t, dest) {
    tone(150, t, 0.16, { type: "sine", slide: 45, vol: 0.5, dest });
}

// ---------------- music ----------------
// Each song = bpm + a chord per bar + a function that plays one 16th step.
// Chords: [bass root (midi), [chord tones (midi)]].
const AM = [45, [57, 60, 64]];
const F = [41, [57, 60, 65]];
const DM = [38, [57, 62, 65]];
const E = [40, [56, 59, 64]];
const BB = [46, [58, 62, 65]];

const SONGS = {
    // slow, moody A minor: bass, sparse arp, long sine "pad"
    menu: {
        bpm: 80,
        chords: [AM, F, DM, E],
        step(s, t, sd, [root, tones], bus) {
            const i = s % 16;
            if (i === 0 || i === 10) tone(midi(root), t, sd * 6, { type: "triangle", vol: 0.32, release: 0.1, dest: bus });
            if (i % 2 === 0) {
                const n = tones[[0, 1, 2, 1, 2, 0, 1, 2][(i / 2) % 8]] + (i >= 8 ? 12 : 0);
                tone(midi(n), t, sd * 1.6, { type: "square", vol: 0.035, dest: bus });
            }
            if (i === 0) tone(midi(tones[2] + 12), t, sd * 14, { type: "sine", vol: 0.06, attack: 0.3, release: 0.6, dest: bus });
            if (i === 4 || i === 12) noise(t, 0.03, { vol: 0.03, freq: 7000, dest: bus });
        },
    },
    // sneaking: pulsing low bass, ticking hats, dissonant high pings
    level: {
        bpm: 96,
        chords: [AM, AM, BB, E],
        step(s, t, sd, [root, tones], bus) {
            const i = s % 16;
            if (i % 2 === 0) tone(midi(root - (i % 4 === 0 ? 12 : 0)), t, sd * 1.5, { type: "triangle", vol: 0.3, dest: bus });
            if (i % 4 === 2) noise(t, 0.025, { vol: 0.035, freq: 8000, dest: bus });
            if (i === 0 && Math.floor(s / 16) % 2 === 0) {
                tone(midi(tones[2] + 12), t, sd * 6, { type: "sine", vol: 0.07, attack: 0.02, release: 0.4, dest: bus });
                tone(midi(tones[2] + 13), t + sd * 3, sd * 5, { type: "sine", vol: 0.04, attack: 0.02, release: 0.4, dest: bus });
            }
            if (i === 8) kick(t, bus);
        },
    },
    // alarm: fast, driving bass, 16th arp, kick + snare
    alarm: {
        bpm: 150,
        chords: [AM, AM, F, E],
        step(s, t, sd, [root, tones], bus) {
            const i = s % 16;
            if (i % 2 === 0) tone(midi(root + (i % 4 === 2 ? 12 : 0)), t, sd * 1.2, { type: "sawtooth", vol: 0.12, dest: bus });
            tone(midi(tones[s % 3] + 12), t, sd * 0.8, { type: "square", vol: 0.04, dest: bus });
            if (i % 4 === 0) kick(t, bus);
            if (i === 4 || i === 12) noise(t, 0.12, { vol: 0.16, filter: "bandpass", freq: 1800, q: 0.7, dest: bus });
            if (i % 2 === 1) noise(t, 0.02, { vol: 0.03, freq: 9000, dest: bus });
        },
    },
    // boss (Pan Mieciu, phase 1): D minor, syncopated octave bass, stabby lead, full drums
    boss: {
        bpm: 132,
        chords: [DM, DM, BB, [45, [57, 61, 64]]],
        step(s, t, sd, [root, tones], bus) {
            const i = s % 16;
            const bar = Math.floor(s / 16) % 4;
            if ([0, 3, 6, 8, 11, 14].includes(i)) tone(midi(root + (i % 2 ? 12 : 0)), t, sd * 1.4, { type: "sawtooth", vol: 0.11, dest: bus });
            // lead riff: a little different in every bar
            const riff = [0, 2, 1, 2, 0, 1, 2, 1][(i + bar * 3) % 8];
            if (i % 2 === 0 || i === 7) tone(midi(tones[riff] + 12), t, sd * 0.9, { type: "square", vol: 0.045, dest: bus });
            if (i === 0) tone(midi(tones[0] + 24), t, sd * 4, { type: "triangle", vol: 0.05, release: 0.2, dest: bus });
            if (i % 4 === 0 || i === 10) kick(t, bus);
            if (i === 4 || i === 12) noise(t, 0.12, { vol: 0.14, filter: "bandpass", freq: 1800, q: 0.7, dest: bus });
            noise(t, 0.02, { vol: i % 2 ? 0.02 : 0.035, freq: 9000, dest: bus });
        },
    },
    // chase (phase 2, Lola is out): faster, rising semitone, 16th bass
    chase: {
        bpm: 168,
        chords: [DM, [39, [58, 63, 66]], DM, [45, [57, 61, 64]]],
        step(s, t, sd, [root, tones], bus) {
            const i = s % 16;
            tone(midi(root + (i % 4 === 2 ? 12 : 0)), t, sd * 0.9, { type: "sawtooth", vol: 0.1, dest: bus });
            if (i % 2 === 0) tone(midi(tones[(i / 2) % 3] + 12 + (i >= 8 ? 12 : 0)), t, sd * 0.8, { type: "square", vol: 0.045, dest: bus });
            if (i % 4 === 0) kick(t, bus);
            if (i === 4 || i === 12 || i === 14) noise(t, 0.1, { vol: 0.15, filter: "bandpass", freq: 2000, q: 0.7, dest: bus });
            noise(t, 0.015, { vol: 0.03, freq: 9500, dest: bus });
        },
    },
};

const music = { name: null, song: null, step: 0, next: 0, timer: null, gain: null };

export function playMusic(name) {
    if (music.name === name) return;
    if (!ensure()) return;
    // fade out the old song on its own gain node
    if (music.gain) {
        const old = music.gain;
        old.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
        setTimeout(() => old.disconnect(), 1200);
        music.gain = null;
    }
    clearInterval(music.timer);
    music.name = name;
    music.song = SONGS[name] ?? null;
    if (!music.song) return;
    music.gain = ctx.createGain();
    music.gain.connect(musicBus);
    music.step = 0;
    music.next = ctx.currentTime + 0.05;
    music.timer = setInterval(schedule, AUDIO.tickMs);
}

function schedule() {
    const song = music.song;
    if (!song || ctx.state !== "running") return;
    const sd = 60 / song.bpm / 4;
    // after a long suspend, do not try to catch up on missed steps
    if (music.next < ctx.currentTime - 0.2) music.next = ctx.currentTime + 0.02;
    while (music.next < ctx.currentTime + AUDIO.lookahead) {
        const chord = song.chords[Math.floor(music.step / 16) % song.chords.length];
        song.step(music.step, music.next, sd, chord, music.gain);
        music.step++;
        music.next += sd;
    }
}

// ---------------- sound effects ----------------

const SFX = {
    // typewriter "voice" (pitch / wave per speaker, slight random detune)
    voice(t, o) {
        tone((o.freq ?? 440) * (1 + (Math.random() - 0.5) * 0.06), t, 0.045, { type: o.wave ?? "square", vol: 0.05 });
    },
    menuMove(t) {
        tone(660, t, 0.05, { vol: 0.06 });
    },
    menuSelect(t) {
        tone(660, t, 0.06, { vol: 0.07 });
        tone(990, t + 0.06, 0.1, { vol: 0.07 });
    },
    click(t) {
        tone(1400, t, 0.025, { vol: 0.06 });
    },
    step(t) {
        noise(t, 0.05, { vol: 0.05, filter: "bandpass", freq: 300, q: 1.5 });
    },
    screw(t) {
        tone(1800, t, 0.03, { type: "triangle", vol: 0.12 });
        tone(2600, t + 0.03, 0.05, { type: "triangle", vol: 0.08 });
    },
    whoosh(t) {
        noise(t, 0.35, { vol: 0.14, filter: "bandpass", freq: 400, sweep: 3000, q: 0.8 });
    },
    latch(t) {
        noise(t, 0.04, { vol: 0.2, filter: "bandpass", freq: 2500, q: 2 });
        tone(900, t, 0.04, { vol: 0.06 });
    },
    success(t) {
        [72, 76, 79, 84].forEach((n, i) => tone(midi(n), t + i * 0.07, 0.12, { vol: 0.07 }));
    },
    error(t) {
        tone(200, t, 0.28, { type: "sawtooth", slide: 90, vol: 0.12 });
        noise(t, 0.15, { vol: 0.12, filter: "lowpass", freq: 1200 });
    },
    crash(t) {
        // "TRZASK!" - loud mistake
        noise(t, 0.4, { vol: 0.35, filter: "lowpass", freq: 3000, sweep: 300 });
        tone(120, t, 0.3, { type: "square", slide: 50, vol: 0.15 });
    },
    unlock(t) {
        noise(t, 0.04, { vol: 0.15, filter: "bandpass", freq: 2000, q: 3 });
        tone(400, t + 0.05, 0.2, { type: "sine", slide: 900, vol: 0.12 });
        tone(midi(88), t + 0.25, 0.3, { type: "triangle", vol: 0.1, release: 0.25 });
    },
    door(t) {
        tone(90, t, 0.25, { type: "sine", slide: 50, vol: 0.4 });
        noise(t, 0.2, { vol: 0.1, filter: "lowpass", freq: 600 });
    },
    detect(t) {
        // "!" sting when a teacher starts noticing you
        tone(midi(81), t, 0.07, { vol: 0.1 });
        tone(midi(88), t + 0.07, 0.18, { vol: 0.1, release: 0.12 });
    },
    alarm(t) {
        for (let i = 0; i < 2; i++) {
            tone(600, t + i * 0.5, 0.25, { type: "sawtooth", slide: 950, vol: 0.09 });
            tone(950, t + i * 0.5 + 0.25, 0.25, { type: "sawtooth", slide: 600, vol: 0.09 });
        }
    },
    caught(t) {
        tone(440, t, 0.7, { type: "sawtooth", slide: 60, vol: 0.16, release: 0.3 });
        noise(t, 0.5, { vol: 0.15, filter: "lowpass", freq: 900 });
    },
    ball(t) {
        // ping-pong ball: tok-tok
        tone(1500, t, 0.03, { type: "sine", vol: 0.14 });
        tone(1300, t + 0.12, 0.03, { type: "sine", vol: 0.08 });
    },
    squeal(t) {
        // speaker feedback (antenna mini-game)
        tone(2400, t, 0.5, { type: "sine", slide: 3200, vol: 0.08, release: 0.2 });
        tone(2420, t, 0.5, { type: "square", slide: 3150, vol: 0.02 });
    },
    pickup(t) {
        tone(midi(76), t, 0.07, { vol: 0.08 });
        tone(midi(83), t + 0.07, 0.14, { vol: 0.08 });
    },
};

export function sfx(name, opts = {}) {
    if (!ensure() || ctx.state !== "running") return;
    SFX[name]?.(ctx.currentTime + 0.005, opts);
}

/** Looping effect (cutscene ambience). Returns stop(fadeSeconds). */
export function startLoop(name) {
    if (!ensure()) return () => {};
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(sfxBus);
    const nodes = [];
    if (name === "heli") {
        // rotor: low-passed noise chopped by a square LFO + low hum
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 500;
        const chop = ctx.createGain();
        chop.gain.value = 0.5;
        const lfo = ctx.createOscillator();
        lfo.type = "square";
        lfo.frequency.value = 11;
        const depth = ctx.createGain();
        depth.gain.value = 0.5;
        lfo.connect(depth);
        depth.connect(chop.gain);
        const hum = ctx.createOscillator();
        hum.type = "triangle";
        hum.frequency.value = 55;
        const humG = ctx.createGain();
        humG.gain.value = 0.25;
        src.connect(f);
        f.connect(chop);
        chop.connect(out);
        hum.connect(humG);
        humG.connect(out);
        nodes.push(src, lfo, hum);
    }
    nodes.forEach((n) => n.start());
    out.gain.setTargetAtTime(0.5, ctx.currentTime, 0.3);
    return (fade = 0.6) => {
        out.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 3);
        setTimeout(() => {
            nodes.forEach((n) => n.stop());
            out.disconnect();
        }, fade * 1000 + 200);
    };
}

/**
 * Plays an audio file for at most `maxSec` seconds (fades out at the end).
 * `volume` 0..1 scales the sound effects volume. Returns stop().
 * If the file is missing, `fallback(maxSec, volume)` runs instead (e.g. a synth ring).
 */
export function playFile(url, maxSec, fallback, volume = 1) {
    const el = new Audio(url);
    el.volume = muted ? 0 : Math.min(1, AUDIO.master * AUDIO.sfx * volume);
    let fade = null;
    let stopFallback = null;
    const stop = () => {
        clearTimeout(cut);
        clearInterval(fade);
        stopFallback?.();
        el.pause();
    };
    const cut = setTimeout(() => {
        // short fade out instead of a hard cut
        fade = setInterval(() => {
            el.volume = Math.max(0, el.volume - 0.08);
            if (el.volume <= 0) stop();
        }, 30);
    }, Math.max(0, maxSec - 0.4) * 1000);
    el.play().catch(() => {
        if (fallback) stopFallback = fallback(maxSec, volume);
    });
    el.addEventListener("error", () => {
        if (fallback && !stopFallback) stopFallback = fallback(maxSec, volume);
    });
    return stop;
}

/** Synth phone ring (used when the ringtone file is missing): brr-brr every 1.2 s. */
export function synthRing(sec, volume = 1) {
    if (!ensure()) return () => {};
    const t0 = ctx.currentTime + 0.02;
    for (let r = 0; r * 1.2 < sec - 0.3; r++) {
        for (let i = 0; i < 8; i++) {
            const t = t0 + r * 1.2 + i * 0.05;
            tone(i % 2 ? 1320 : 1760, t, 0.045, { type: "square", vol: 0.05 * volume });
        }
    }
    return () => {};
}
