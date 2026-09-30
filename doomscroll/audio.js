// DOOMSCROLL.EXE sound: synthesized sound effects for the engine's sound names, and a soundtrack per
// episode (plus one for the final boss). Everything is generated with the Web Audio API: no files.
// Shared by nikstil.com/doomscroll/ and TRANSLATR™'s arcade.

let ctx = null,
  master = null,
  sfxBus = null,
  musicBus = null,
  noiseBuf = null;
let sfxOn = true,
  musicOn = true;

function ensure() {
  if (ctx) return ctx.state === "suspended" ? (ctx.resume().catch(() => {}), ctx) : ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.32;
  musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** A tone with a pitch sweep and a quick decay. */
function tone(bus, t, { f = 440, to = f, dur = 0.1, type = "square", vol = 0.2, attack = 0.003 }) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  to !== f && o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}
/** A burst of filtered noise (gunshots, impacts, drums). */
function noise(bus, t, { dur = 0.1, vol = 0.3, freq = 1200, to = freq, type = "lowpass", q = 0.7 }) {
  const s = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = noiseBuf;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  to !== freq && f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

// ================= Sound effects =================
const SFX = {
  // Double-barrel: a deep boom, then (with the reload) the break-open click and the shells going in.
  shotgun(t) {
    noise(sfxBus, t, { dur: 0.35, vol: 0.9, freq: 2400, to: 180 });
    tone(sfxBus, t, { f: 120, to: 38, dur: 0.3, type: "sine", vol: 0.8 });
    noise(sfxBus, t + 0.22, { dur: 0.03, vol: 0.25, freq: 3000, type: "highpass" }); // clack: broken open
    noise(sfxBus, t + 0.42, { dur: 0.04, vol: 0.2, freq: 2200, type: "bandpass", q: 4 }); // shells in
    noise(sfxBus, t + 0.6, { dur: 0.03, vol: 0.3, freq: 3500, type: "highpass" }); // snap shut
  },
  // Auto-rifle: short and punchy, with a little brass tink.
  rifle(t) {
    noise(sfxBus, t, { dur: 0.09, vol: 0.55, freq: 4000, to: 600 });
    tone(sfxBus, t, { f: 220, to: 70, dur: 0.08, type: "square", vol: 0.25 });
    tone(sfxBus, t + 0.12, { f: 5200, dur: 0.04, type: "sine", vol: 0.04 });
  },
  // Ban Hammer: a whoosh...
  swing(t) {
    noise(sfxBus, t, { dur: 0.22, vol: 0.35, freq: 400, to: 2600, type: "bandpass", q: 1.2 });
  },
  // ...and a heavy thunk when it connects.
  whack(t) {
    tone(sfxBus, t, { f: 160, to: 45, dur: 0.22, type: "triangle", vol: 0.9 });
    noise(sfxBus, t, { dur: 0.12, vol: 0.6, freq: 1500, to: 200 });
    tone(sfxBus, t, { f: 900, to: 300, dur: 0.06, type: "square", vol: 0.12 });
  },
  // A knocked-back shot: a metallic ting.
  deflect(t) {
    tone(sfxBus, t, { f: 1800, to: 2600, dur: 0.18, type: "triangle", vol: 0.3 });
    tone(sfxBus, t, { f: 2700, dur: 0.25, type: "sine", vol: 0.12 });
  },
  // Stunned: little cartoon birds.
  stun(t) {
    for (let n = 0; n < 4; n++) tone(sfxBus, t + n * 0.07, { f: 1400 + (n % 2) * 400, dur: 0.06, type: "sine", vol: 0.12 });
  },
  // The final boss changes phase.
  phase(t) {
    tone(sfxBus, t, { f: 55, to: 30, dur: 1.2, type: "sawtooth", vol: 0.5 });
    tone(sfxBus, t, { f: 82, to: 41, dur: 1.2, type: "sawtooth", vol: 0.35 });
    noise(sfxBus, t, { dur: 1, vol: 0.4, freq: 300, to: 60 });
  },
  crit(t) {
    tone(sfxBus, t, { f: 320, to: 200, dur: 0.06, type: "square", vol: 0.12 });
  },
  thud(t) {
    tone(sfxBus, t, { f: 110, to: 50, dur: 0.12, type: "square", vol: 0.25 });
  },
  kaching(t) {
    tone(sfxBus, t, { f: 880, dur: 0.06, vol: 0.12 });
    tone(sfxBus, t + 0.05, { f: 1320, dur: 0.14, vol: 0.1 });
  },
  coin(t) {
    tone(sfxBus, t, { f: 1046, dur: 0.05, type: "triangle", vol: 0.18 });
    tone(sfxBus, t + 0.04, { f: 1568, dur: 0.1, type: "triangle", vol: 0.14 });
  },
  error(t) {
    tone(sfxBus, t, { f: 180, to: 120, dur: 0.18, type: "sawtooth", vol: 0.22 });
    noise(sfxBus, t, { dur: 0.08, vol: 0.2, freq: 900 });
  },
  denied(t) {
    tone(sfxBus, t, { f: 90, dur: 0.1, vol: 0.15 });
  },
  popup(t) {
    tone(sfxBus, t, { f: 520, to: 700, dur: 0.06, type: "sine", vol: 0.08 });
  },
  horn(t) {
    tone(sfxBus, t, { f: 98, dur: 0.6, type: "sawtooth", vol: 0.22, attack: 0.05 });
    tone(sfxBus, t, { f: 147, dur: 0.6, type: "sawtooth", vol: 0.12, attack: 0.05 });
  },
  levelup(t) {
    [523, 659, 784, 1046].forEach((f, n) => tone(sfxBus, t + n * 0.08, { f, dur: 0.14, vol: 0.12 }));
  },
};

/** Plays a sound effect by the engine's name for it (unknown names are ignored). */
export function playSfx(name) {
  if (!sfxOn || !SFX[name] || !ensure()) return;
  SFX[name](ctx.currentTime + 0.005);
}

// ================= Music =================
// Each track: tempo, a 16-step bass line and lead line (semitones above the root, null = rest) and a
// drum pattern (k kick, s snare, h hat). Four bars, each with its own root.
const TRACKS = {
  // Episode 1: classic E1M1-style chugging riff.
  1: {
    bpm: 150,
    root: 40, // E2
    roots: [0, 0, 5, 3],
    bassWave: "sawtooth",
    leadWave: "square",
    bass: [0, 0, 12, 0, 0, 10, 0, 0, 8, 0, 0, 6, 0, 0, 5, 7],
    lead: [null, null, null, null, 24, null, 22, null, 19, null, null, 17, 19, null, null, null],
    drums: "k.h.s.h.k.k.s.hh",
  },
  // Episode 2: bouncy "checkout" funk in a minor key.
  2: {
    bpm: 124,
    root: 45, // A2
    roots: [0, 3, 5, 7],
    bassWave: "square",
    leadWave: "triangle",
    bass: [0, null, 0, 12, null, 0, 10, null, 0, null, 7, null, 10, 12, null, 3],
    lead: [24, null, 27, null, 29, 27, null, 24, null, 22, 24, null, null, null, 19, null],
    drums: "k.hsk.h.khs.k.hs",
  },
  // Episode 3: fast, anxious, influencer-speed.
  3: {
    bpm: 172,
    root: 38, // D2
    roots: [0, 1, 0, -2],
    bassWave: "sawtooth",
    leadWave: "sawtooth",
    bass: [0, 0, 0, 12, 0, 0, 13, 0, 0, 0, 12, 0, 10, 0, 8, 7],
    lead: [null, 24, 25, null, 28, null, 25, 24, null, 31, null, 30, 28, null, 25, null],
    drums: "khskkhs.khskkhsh",
  },
  // The Shareholders: slow, heavy, ominous.
  final: {
    bpm: 96,
    root: 33, // A1
    roots: [0, 1, 0, 6],
    bassWave: "sawtooth",
    leadWave: "square",
    bass: [0, null, null, 0, null, null, 1, null, 0, null, null, 0, 6, null, 5, null],
    lead: [36, null, null, null, 37, null, null, null, 36, null, 34, null, 33, null, null, null],
    drums: "k..sk.h.k..sk.ss",
  },
};
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

let track = null,
  step = 0,
  nextAt = 0,
  timer = 0;
function schedule() {
  if (!track || !ctx) return;
  const stepLen = 60 / track.bpm / 4;
  while (nextAt < ctx.currentTime + 0.15) {
    const i = step % 16,
      root = track.root + track.roots[Math.floor(step / 16) % track.roots.length],
      t = nextAt;
    const b = track.bass[i];
    b !== null && tone(musicBus, t, { f: midi(root + b), dur: stepLen * 0.9, type: track.bassWave, vol: 0.35 });
    const l = track.lead[i];
    l !== null && tone(musicBus, t, { f: midi(root + l), dur: stepLen * 1.8, type: track.leadWave, vol: 0.12, attack: 0.01 });
    const d = track.drums[i];
    d === "k" && tone(musicBus, t, { f: 140, to: 40, dur: 0.14, type: "sine", vol: 0.9 });
    d === "s" && noise(musicBus, t, { dur: 0.12, vol: 0.45, freq: 1800, type: "bandpass", q: 0.8 });
    d === "h" && noise(musicBus, t, { dur: 0.03, vol: 0.15, freq: 7000, type: "highpass" });
    step += 1;
    nextAt += stepLen;
  }
}

/** Starts an episode's soundtrack (1, 2, 3 or "final"); null stops the music. */
export function playMusic(id) {
  if (id === null || !TRACKS[id]) return stopMusic();
  if (track === TRACKS[id] && timer) return;
  stopMusic();
  if (!musicOn || !ensure()) return;
  track = TRACKS[id];
  step = 0;
  nextAt = ctx.currentTime + 0.05;
  timer = setInterval(schedule, 50);
  schedule();
}
export function stopMusic() {
  clearInterval(timer);
  timer = 0;
  track = null;
}
/** Which track is (or would be) playing, even while the music is off. */
let wanted = null;
export function setMusic(id) {
  wanted = id;
  playMusic(id);
}
export function setSound({ sfx = sfxOn, music = musicOn } = {}) {
  sfxOn = sfx;
  musicOn = music;
  music ? wanted !== null && playMusic(wanted) : stopMusic();
}
