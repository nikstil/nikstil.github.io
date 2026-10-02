// LAWN OF THE DEAD (and BRAINS FIRST) sound: synthesized effects for every sound name the games
// use, and a soundtrack: one original tune per area, played on synthesized harpsichord, marimba,
// bass, brushes and woodblock, in the bouncy, slightly spooky spirit of the lawn-defense classic.
// Web Audio only, no files.

let ac = null
let master = null
let sfxBus = null
let musicBus = null
let noiseBuf = null
let sfxOn = true
let musicOn = true
const MUSIC_VOL = 0.42
// the pause menu's sliders, 0..1 (kept between visits)
const VOLUME_KEY = 'touchgrass-volume'
let vol = { music: 0.8, sfx: 0.8 }
try {
  vol = { ...vol, ...JSON.parse(localStorage.getItem(VOLUME_KEY) ?? '{}') }
} catch {}
const musicLevel = () => (musicOn ? MUSIC_VOL * vol.music * 1.25 : 0)
const sfxLevel = () => (sfxOn ? vol.sfx * 1.25 : 0)

function ensure() {
  if (ac) {
    if (ac.state === 'suspended') ac.resume().catch(() => {})
    return ac
  }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)()
  } catch {
    return null
  }
  master = ac.createGain()
  master.gain.value = 0.6
  master.connect(ac.destination)
  sfxBus = ac.createGain()
  sfxBus.gain.value = sfxLevel()
  sfxBus.connect(master)
  musicBus = ac.createGain()
  musicBus.gain.value = musicLevel()
  musicBus.connect(master)
  // a little room for the band: a short, soft reverb under the music
  const verb = ac.createConvolver()
  const len = Math.floor(ac.sampleRate * 1.6)
  const ir = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  verb.buffer = ir
  const wet = ac.createGain()
  wet.gain.value = 0.22
  musicBus.connect(verb).connect(wet).connect(master)
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return ac
}

function tone(bus, t, { f = 440, to = f, dur = 0.1, type = 'square', vol = 0.2, attack = 0.004 }) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (to !== f) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(bus)
  o.start(t)
  o.stop(t + dur + 0.02)
}
function noise(bus, t, { dur = 0.1, vol = 0.3, freq = 1200, to = freq, type = 'lowpass', q = 0.7 }) {
  const s = ac.createBufferSource()
  const f = ac.createBiquadFilter()
  const g = ac.createGain()
  s.buffer = noiseBuf
  f.type = type
  f.Q.value = q
  f.frequency.setValueAtTime(freq, t)
  if (to !== freq) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f).connect(g).connect(bus)
  s.start(t, Math.random() * 0.5)
  s.stop(t + dur + 0.02)
}

const SFX = {
  plant: (t) => {
    // a seed pressed into the dirt: a soft thump and a scatter of soil
    tone(sfxBus, t, { f: 150, to: 70, dur: 0.14, type: 'sine', vol: 0.35 })
    noise(sfxBus, t, { dur: 0.16, vol: 0.25, freq: 700, to: 180 })
    noise(sfxBus, t + 0.05, { dur: 0.08, vol: 0.1, freq: 2500, to: 1200, type: 'bandpass' })
  },
  plop: (t) => {
    tone(sfxBus, t, { f: 600, to: 160, dur: 0.18, type: 'sine', vol: 0.3 })
    noise(sfxBus, t + 0.02, { dur: 0.15, vol: 0.15, freq: 2500, to: 600 })
  },
  shovel: (t) => noise(sfxBus, t, { dur: 0.2, vol: 0.35, freq: 900, to: 300 }),
  shoot: (t) => {
    // a soft "thwp": a puff of air and a little pop
    noise(sfxBus, t, { dur: 0.05, vol: 0.12, freq: 900, to: 300, type: 'bandpass', q: 1.2 })
    tone(sfxBus, t, { f: 340, to: 170, dur: 0.06, type: 'sine', vol: 0.14 })
  },
  puff: (t) => noise(sfxBus, t, { dur: 0.1, vol: 0.12, freq: 1800, to: 900, type: 'bandpass' }),
  splat: (t) => {
    // a wet pea splat
    noise(sfxBus, t, { dur: 0.09, vol: 0.22, freq: 1800, to: 350, q: 1.5 })
    tone(sfxBus, t, { f: 260, to: 110, dur: 0.07, type: 'sine', vol: 0.12 })
  },
  sizzle: (t) => noise(sfxBus, t, { dur: 0.2, vol: 0.18, freq: 5000, to: 2000, type: 'highpass' }),
  thud: (t) => {
    tone(sfxBus, t, { f: 120, to: 50, dur: 0.18, type: 'sine', vol: 0.35 })
    noise(sfxBus, t, { dur: 0.1, vol: 0.2, freq: 500, to: 150 })
  },
  lob: (t) => tone(sfxBus, t, { f: 300, to: 600, dur: 0.12, type: 'triangle', vol: 0.1 }),
  sun: (t) => {
    // a glassy chime
    bell(t, 1568, 0.55, 0.16)
    bell(t + 0.07, 2349, 0.6, 0.12)
  },
  coin: (t) => {
    // ka-ching
    noise(sfxBus, t, { dur: 0.04, vol: 0.15, freq: 6000, type: 'highpass' })
    bell(t + 0.03, 2093, 0.35, 0.12)
    bell(t + 0.1, 2637, 0.45, 0.1)
  },
  diamond: (t) => [1568, 2093, 2637, 3136].forEach((f, i) => tone(sfxBus, t + i * 0.06, { f, dur: 0.16, type: 'triangle', vol: 0.12 })),
  gulp: (t) => tone(sfxBus, t, { f: 300, to: 90, dur: 0.25, type: 'sine', vol: 0.3 }),
  'chomp-soft': (t) => noise(sfxBus, t, { dur: 0.06, vol: 0.14, freq: 1100, to: 350, type: 'bandpass', q: 1 }),
  chomp: (t) => {
    // a big crunchy bite, then chewing
    noise(sfxBus, t, { dur: 0.12, vol: 0.45, freq: 1400, to: 300, type: 'bandpass', q: 0.9 })
    tone(sfxBus, t, { f: 160, to: 70, dur: 0.2, type: 'square', vol: 0.12 })
    for (let i = 1; i < 4; i++) noise(sfxBus, t + 0.18 + i * 0.12, { dur: 0.05, vol: 0.12, freq: 900, to: 400 })
  },
  groan: (t) => {
    // a zombie moan: a voice sliding down through two vowel formants ("brrraaains")
    voice(t, 135, 92, 1.4, 0.16)
  },
  siren: (t) => {
    // the big-wave alarm: a hand-cranked siren winding up and down twice
    for (let i = 0; i < 2; i++) {
      tone(sfxBus, t + i * 0.9, { f: 300, to: 820, dur: 0.45, type: 'sawtooth', vol: 0.07, attack: 0.08 })
      tone(sfxBus, t + i * 0.9 + 0.45, { f: 820, to: 300, dur: 0.45, type: 'sawtooth', vol: 0.07, attack: 0.02 })
    }
    voice(t + 0.3, 120, 85, 1.6, 0.1)
  },
  warning: (t) => [392, 392, 523].forEach((f, i) => tone(sfxBus, t + i * 0.18, { f, dur: 0.16, type: 'square', vol: 0.1 })),
  boom: (t) => {
    noise(sfxBus, t, { dur: 0.7, vol: 0.7, freq: 1600, to: 60 })
    tone(sfxBus, t, { f: 110, to: 30, dur: 0.6, type: 'sine', vol: 0.5 })
  },
  bigboom: (t) => {
    noise(sfxBus, t, { dur: 1.6, vol: 0.8, freq: 900, to: 30 })
    tone(sfxBus, t, { f: 70, to: 20, dur: 1.4, type: 'sine', vol: 0.6 })
  },
  mine: (t) => {
    SFX.boom(t)
    tone(sfxBus, t, { f: 700, to: 200, dur: 0.2, type: 'square', vol: 0.12 })
  },
  whoosh: (t) => noise(sfxBus, t, { dur: 0.9, vol: 0.5, freq: 400, to: 3000, type: 'bandpass', q: 2 }),
  freeze: (t) => {
    noise(sfxBus, t, { dur: 0.6, vol: 0.3, freq: 6000, to: 1500, type: 'highpass' })
    tone(sfxBus, t, { f: 1800, to: 2600, dur: 0.5, type: 'sine', vol: 0.1 })
  },
  frozen: (t) => tone(sfxBus, t, { f: 2400, to: 1900, dur: 0.08, type: 'sine', vol: 0.05 }),
  fume: (t) => noise(sfxBus, t, { dur: 0.3, vol: 0.2, freq: 600, to: 1600, type: 'bandpass', q: 1.5 }),
  squash: (t) => {
    noise(sfxBus, t, { dur: 0.25, vol: 0.5, freq: 500, to: 100 })
    tone(sfxBus, t, { f: 90, to: 40, dur: 0.25, type: 'sine', vol: 0.4 })
  },
  hmm: (t) => tone(sfxBus, t, { f: 220, to: 330, dur: 0.3, type: 'triangle', vol: 0.15 }),
  splash: (t) => noise(sfxBus, t, { dur: 0.5, vol: 0.35, freq: 3000, to: 500 }),
  pop: (t) => {
    tone(sfxBus, t, { f: 900, to: 200, dur: 0.08, type: 'square', vol: 0.15 })
    noise(sfxBus, t, { dur: 0.08, vol: 0.2, freq: 3000 })
  },
  crunch: (t) => {
    for (let i = 0; i < 4; i++) noise(sfxBus, t + i * 0.08, { dur: 0.06, vol: 0.3, freq: 1200, to: 400 })
  },
  wind: (t) => noise(sfxBus, t, { dur: 1.2, vol: 0.35, freq: 300, to: 1500, type: 'bandpass', q: 0.8 }),
  magnet: (t) => tone(sfxBus, t, { f: 200, to: 1600, dur: 0.35, type: 'sawtooth', vol: 0.08 }),
  slurp: (t) => tone(sfxBus, t, { f: 300, to: 900, dur: 0.3, type: 'sine', vol: 0.15 }),
  armed: (t) => tone(sfxBus, t, { f: 1200, dur: 0.06, type: 'square', vol: 0.08 }),
  angry: (t) => tone(sfxBus, t, { f: 200, to: 400, dur: 0.4, type: 'sawtooth', vol: 0.15 }),
  vault: (t) => tone(sfxBus, t, { f: 300, to: 700, dur: 0.3, type: 'triangle', vol: 0.12 }),
  boing: (t) => tone(sfxBus, t, { f: 200, to: 500, dur: 0.18, type: 'sine', vol: 0.15 }),
  bonk: (t) => {
    tone(sfxBus, t, { f: 300, to: 150, dur: 0.12, type: 'square', vol: 0.18 })
    noise(sfxBus, t, { dur: 0.08, vol: 0.2, freq: 900 })
  },
  bounce: (t) => tone(sfxBus, t, { f: 400, to: 900, dur: 0.15, type: 'sine', vol: 0.15 }),
  hypno: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(sfxBus, t + i * 0.05, { f, dur: 0.15, type: 'sine', vol: 0.12 })),
  cry: (t) => tone(sfxBus, t, { f: 600, to: 300, dur: 0.5, type: 'triangle', vol: 0.12 }),
  dance: (t) => [196, 247, 294, 392].forEach((f, i) => tone(sfxBus, t + i * 0.1, { f, dur: 0.12, type: 'square', vol: 0.08 })),
  ladder: (t) => noise(sfxBus, t, { dur: 0.2, vol: 0.25, freq: 2500, to: 1200, type: 'bandpass' }),
  throw: (t) => noise(sfxBus, t, { dur: 0.2, vol: 0.2, freq: 800, to: 2400, type: 'bandpass' }),
  stomp: (t) => {
    tone(sfxBus, t, { f: 80, to: 30, dur: 0.4, type: 'sine', vol: 0.5 })
    noise(sfxBus, t, { dur: 0.3, vol: 0.4, freq: 400, to: 80 })
  },
  dig: (t) => noise(sfxBus, t, { dur: 0.4, vol: 0.3, freq: 600, to: 200 }),
  bungee: (t) => tone(sfxBus, t, { f: 800, to: 200, dur: 0.5, type: 'sine', vol: 0.12 }),
  ash: (t) => noise(sfxBus, t, { dur: 0.4, vol: 0.15, freq: 2000, to: 400 }),
  mower: (t) => {
    tone(sfxBus, t, { f: 90, to: 140, dur: 1.2, type: 'sawtooth', vol: 0.12 })
    noise(sfxBus, t, { dur: 1.2, vol: 0.15, freq: 900, to: 1400, type: 'bandpass' })
  },
  bowl: (t) => noise(sfxBus, t, { dur: 0.3, vol: 0.2, freq: 300, to: 200 }),
  bowlhit: (t) => {
    tone(sfxBus, t, { f: 200, to: 90, dur: 0.12, type: 'square', vol: 0.18 })
    noise(sfxBus, t, { dur: 0.1, vol: 0.3, freq: 800 })
  },
  whack: (t) => {
    noise(sfxBus, t, { dur: 0.1, vol: 0.5, freq: 1000, to: 300 })
    tone(sfxBus, t, { f: 150, to: 60, dur: 0.15, type: 'sine', vol: 0.4 })
  },
  vase: (t) => {
    for (let i = 0; i < 5; i++) tone(sfxBus, t + i * 0.03, { f: 2000 + Math.random() * 2000, dur: 0.08, type: 'triangle', vol: 0.08 })
    noise(sfxBus, t, { dur: 0.25, vol: 0.3, freq: 4000, to: 1000 })
  },
  launch: (t) => noise(sfxBus, t, { dur: 0.8, vol: 0.4, freq: 300, to: 2400, type: 'bandpass', q: 1.2 }),
  van: (t) => tone(sfxBus, t, { f: 120, to: 60, dur: 1.2, type: 'sawtooth', vol: 0.15 }),
  fireball: (t) => noise(sfxBus, t, { dur: 1.2, vol: 0.4, freq: 600, to: 200 }),
  iceball: (t) => noise(sfxBus, t, { dur: 1.2, vol: 0.3, freq: 6000, to: 2000, type: 'highpass' }),
  reward: (t) => [0, 4, 7, 11, 12].forEach((n, i) => bell(t + i * 0.08, N(3 + n), 0.5, 0.12)),
  win: (t) => {
    // a little harpsichord fanfare
    ;[0, 4, 7, 12, 7, 12, 16].forEach((n, i) => pluck(sfxBus, t + i * 0.11, N(3 + n), 0.3, 0.16))
    pluck(sfxBus, t + 0.8, N(-9), 0.8, 0.2)
  },
  lose: (t) => {
    // a sad tuba sliding down, and a groan
    ;[0, -1, -2, -3, -8].forEach((n, i) => tuba(sfxBus, t + i * 0.32, N(-21 + n), i === 4 ? 1 : 0.3, 0.3))
    voice(t + 1.6, 120, 80, 1.4, 0.14)
  },
  pick: (t) => {
    // a seed packet picked up: a woodblock tick
    tone(sfxBus, t, { f: 1100, to: 900, dur: 0.05, type: 'sine', vol: 0.18 })
  },
  buzz: (t) => tone(sfxBus, t, { f: 110, dur: 0.18, type: 'square', vol: 0.12 }),
  buy: (t) => [0, 4, 7].forEach((n, i) => bell(t + i * 0.07, N(15 + n), 0.3, 0.1)),
}
const throttle = new Map()
export function playSfx(name) {
  if (!sfxOn || !ensure()) return
  const f = SFX[name]
  if (!f) return
  // The same sound at most every 40 ms (a row of Pea Spitters is a lot of pops).
  const now = ac.currentTime
  if (now - (throttle.get(name) ?? -1) < 0.04) return
  throttle.set(name, now)
  try {
    f(now + 0.005)
  } catch {
    // an audio hiccup isn't worth a crash
  }
}

// ================= Instruments =================
const N = (s) => 440 * Math.pow(2, s / 12) // semitones from A4
/** A plucked harpsichord-ish string: two bright, slightly detuned voices through a closing filter. */
function pluck(bus, t, f, dur, vol) {
  const g = ac.createGain()
  const flt = ac.createBiquadFilter()
  flt.type = 'lowpass'
  flt.Q.value = 2
  flt.frequency.setValueAtTime(Math.min(12000, f * 9), t)
  flt.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004)
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.08)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  for (const [type, k] of [['sawtooth', 1], ['square', 1.004]]) {
    const o = ac.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f * k, t)
    o.connect(flt)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
  flt.connect(g).connect(bus)
}
/** A marimba: a round note with a woody overtone, quick to fade. */
function marimba(bus, t, f, dur, vol) {
  tone(bus, t, { f, dur: Math.min(0.9, dur * 1.4), type: 'sine', vol, attack: 0.003 })
  tone(bus, t, { f: f * 3.9, dur: 0.08, type: 'sine', vol: vol * 0.35, attack: 0.002 })
}
/** A celesta / music box: a glassy bell. */
function bell(t, f, dur, vol, bus = sfxBus) {
  tone(bus, t, { f, dur, type: 'sine', vol, attack: 0.002 })
  tone(bus, t, { f: f * 2.76, dur: dur * 0.4, type: 'sine', vol: vol * 0.3, attack: 0.002 })
}
/** A soft tuba / bassoon: the oom of oom-pah. */
function tuba(bus, t, f, dur, vol) {
  const o = ac.createOscillator()
  const flt = ac.createBiquadFilter()
  const g = ac.createGain()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(f, t)
  flt.type = 'lowpass'
  flt.frequency.setValueAtTime(f * 4, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03)
  g.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(flt).connect(g).connect(bus)
  o.start(t)
  o.stop(t + dur + 0.05)
}
/** A plucked upright bass. */
function pizz(bus, t, f, dur, vol) {
  tone(bus, t, { f, dur, type: 'triangle', vol, attack: 0.005 })
  tone(bus, t, { f: f * 2, dur: dur * 0.3, type: 'sine', vol: vol * 0.3, attack: 0.003 })
}
/** A reedy squeezebox chord stab (the pah of oom-pah). */
function reed(bus, t, f, dur, vol) {
  for (const k of [1, 1.006]) {
    const o = ac.createOscillator()
    const flt = ac.createBiquadFilter()
    const g = ac.createGain()
    o.type = 'square'
    o.frequency.setValueAtTime(f * k, t)
    flt.type = 'lowpass'
    flt.frequency.value = 1600
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol / 2, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(flt).connect(g).connect(bus)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
}
/** A zombie's voice: a buzzy tone through two vowel formants, sliding from "brr" to "aah". */
function voice(t, f0, f1, dur, vol) {
  const o = ac.createOscillator()
  const lfo = ac.createOscillator()
  const lg = ac.createGain()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(f1, t + dur)
  lfo.frequency.value = 5.5
  lg.gain.value = 4
  lfo.connect(lg).connect(o.frequency)
  const out = ac.createGain()
  out.gain.setValueAtTime(0.0001, t)
  out.gain.exponentialRampToValueAtTime(vol, t + 0.12)
  out.gain.setValueAtTime(vol, t + dur * 0.7)
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  for (const [from, to, q] of [[350, 750, 6], [900, 1150, 8]]) {
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = q
    bp.frequency.setValueAtTime(from, t)
    bp.frequency.linearRampToValueAtTime(to, t + dur * 0.4)
    o.connect(bp).connect(out)
  }
  out.connect(sfxBus)
  o.start(t)
  lfo.start(t)
  o.stop(t + dur + 0.05)
  lfo.stop(t + dur + 0.05)
}
const DRUMS = {
  k: (t) => tone(musicBus, t, { f: 120, to: 45, dur: 0.18, type: 'sine', vol: 0.55 }),
  s: (t) => noise(musicBus, t, { dur: 0.14, vol: 0.22, freq: 2200, to: 1200, type: 'bandpass', q: 0.7 }),
  h: (t) => noise(musicBus, t, { dur: 0.035, vol: 0.09, freq: 7500, type: 'highpass' }),
  b: (t) => tone(musicBus, t, { f: 1250, to: 1050, dur: 0.05, type: 'sine', vol: 0.16 }), // woodblock
  c: (t) => noise(musicBus, t, { dur: 0.6, vol: 0.12, freq: 6000, to: 3000, type: 'highpass' }), // cymbal
  t: (t) => tone(musicBus, t, { f: 180, to: 110, dur: 0.2, type: 'sine', vol: 0.35 }), // tom
}

// ================= Music =================
// Every tune here is original. A song: tempo, swing, key (semitones from A4), steps per bar (6 for
// a waltz, else 8 eighth notes), one chord per bar (semitones over the key), a melody (one string
// per bar: a number is a note in semitones over the key, "." a rest, "-" holds the note), the
// instruments, the bass style and a drum pattern (one string per bar, repeated).
const SONGS = {
  // a spooky little waltz on harpsichord and music box
  title: {
    bpm: 168, swing: 0, key: -7, steps: 6, lead: 'pluck', double: 'bell', bass: 'waltz', comp: 'reed',
    chords: [[0, 3, 7], [0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7], [-2, 2, 5], [5, 8, 12], [7, 11, 14]],
    tune: ['0 . 2 3 5 .', '7 - 5 . 3 .', '5 . 3 2 0 .', '-1 - 2 . 7 .', '12 . 10 8 7 .', '5 - 7 . 8 .', '7 . 5 3 2 .', '-1 . 2 -1 -5 .'],
    drums: ['k . b . b .'],
  },
  // the front yard: a bouncy, swung minor romp on harpsichord and walking bass
  day: {
    bpm: 118, swing: 0.18, key: 0, steps: 8, lead: 'pluck', bass: 'walk', comp: 'reed',
    chords: [[0, 3, 7], [0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7], [-4, 0, 3], [7, 11, 14], [0, 3, 7]],
    tune: ['0 . 3 5 7 . 5 3', '0 . -2 . 0 . . .', '5 . 8 10 12 . 10 8', '7 . 11 . 8 7 5 4', '0 . 3 5 7 . 12 .', '8 . 7 5 3 . 0 .', '-1 . 2 4 7 . 4 2', '0 . . . -5 . -1 .'],
    drums: ['k h s h k b s h', 'k h s h k h s b'],
  },
  // night: slower, on marimba and pizzicato bass, with a woodblock tiptoe
  night: {
    bpm: 92, swing: 0.12, key: -5, steps: 8, lead: 'marimba', double: 'bell', bass: 'pizz', comp: null,
    chords: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14], [0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]],
    tune: ['0 . . 3 7 . 5 .', '3 . 0 . -1 . . .', '-4 . 0 3 5 . 3 0', '-1 . 3 . 6 . 5 3', '7 . 10 . 12 . 10 7', '8 . 7 . 3 . 0 .', '5 . 3 0 -1 . 2 6', '7 . . . 0 . . .'],
    drums: ['k . b . . b h .', 'k . b . . b . b'],
  },
  // the pool: sunny surf on bright organ and a driving bass
  pool: {
    bpm: 132, swing: 0, key: 3, steps: 8, lead: 'reed', double: 'marimba', bass: 'pulse', comp: 'pluck',
    chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14], [0, 4, 7], [-3, 0, 4], [7, 11, 14], [0, 4, 7]],
    tune: ['7 . 4 . 7 9 7 4', '9 . . 7 4 . 0 .', '5 . 9 . 12 . 9 5', '7 . 11 . 14 . 11 7', '12 . 11 9 7 . 4 .', '9 . 7 4 0 . 4 .', '2 . 5 7 11 . 7 5', '4 . 0 . . . . .'],
    drums: ['k h s h k k s h', 'k h s h k t s t'],
  },
  // the fog: an eerie music box over a low drone
  fog: {
    bpm: 84, swing: 0, key: 2, steps: 8, lead: 'bell', double: null, bass: 'drone', comp: null,
    chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [7, 11, 13], [0, 3, 7], [5, 8, 12], [1, 5, 8], [7, 11, 13]],
    tune: ['7 . . 5 3 . 2 .', '0 . . . -1 . 0 .', '3 . 8 . 7 . 5 3', '7 . 11 . 13 . 11 .', '12 . 10 7 5 . 3 .', '5 . 8 . 12 . 8 .', '8 . 5 . 1 . 5 .', '-1 . 1 . 7 . . .'],
    drums: ['. . b . . . . .', '. . b . . b . .'],
  },
  // the roof: fast and driving, harpsichord runs over an oom-pah
  roof: {
    bpm: 142, swing: 0, key: -2, steps: 8, lead: 'pluck', double: null, bass: 'oompah', comp: 'reed',
    chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17], [0, 3, 7], [8, 12, 15], [7, 11, 14], [0, 3, 7]],
    tune: ['0 3 7 3 12 7 3 7', '8 . 12 . 15 . 12 8', '3 7 10 7 15 10 7 10', '10 . 14 . 17 . 14 10', '12 10 7 3 0 3 7 12', '15 . 12 . 8 . 3 .', '11 . 14 . 7 . 5 2', '0 . . . 7 . 0 .'],
    drums: ['k h s h k h s h', 'k h s h k s s s'],
  },
  // the boss: heavy, minor, everything at once
  boss: {
    bpm: 156, swing: 0, key: 3, steps: 8, lead: 'pluck', double: 'reed', bass: 'pulse', comp: 'reed',
    chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-5, -1, 2], [0, 3, 7], [5, 8, 12], [-4, 0, 3], [-5, -1, 2]],
    tune: ['0 . 0 3 . 0 7 6', '0 . 0 3 . 0 10 11', '8 . 8 12 . 8 15 12', '7 . 11 . 14 . 11 7', '12 . 15 12 10 . 7 .', '8 . 5 . 0 . 5 8', '8 . 12 . 11 . 14 .', '12 . . 7 . . 0 .'],
    drums: ['k h s h k k s h', 'k k s h k k s c'],
  },
}
const parse = (bar) => bar.split(' ').map((x) => (x === '.' ? null : x === '-' ? '-' : Number(x)))
for (const s of Object.values(SONGS)) {
  s.notes = s.tune.map(parse)
  s.beats = s.drums.map((d) => d.split(' '))
}
const INSTRUMENT = { pluck, marimba, reed, bell: (bus, t, f, dur, vol) => bell(t, f, dur * 1.5, vol, bus) }
const LEVEL = { pluck: 0.16, marimba: 0.3, reed: 0.1, bell: 0.16 }

let song = null
let timer = null
let step = 0
let nextAt = 0
export function setMusic(name) {
  if (song === name) return
  song = name
  clearInterval(timer)
  timer = null
  if (!name || !SONGS[name]) return
  if (!ensure()) return
  step = 0
  nextAt = ac.currentTime + 0.1
  timer = setInterval(schedule, 50)
}
function schedule() {
  if (!musicOn || !song || !ac) return
  const s = SONGS[song]
  const eighth = 60 / s.bpm / 2
  while (nextAt < ac.currentTime + 0.3) {
    const bars = s.chords.length
    const i = step % s.steps
    const barN = Math.floor(step / s.steps)
    const bar = barN % bars
    const chord = s.chords[bar]
    // swing: the off-beats come a little late
    const t = nextAt + (i % 2 ? s.swing * eighth : 0)
    const root = s.key + chord[0]
    // ---- the melody (an octave up every other time round, for variety)
    const notes = s.notes[bar]
    const n = notes[i]
    if (typeof n === 'number') {
      let len = 1
      while (notes[i + len] === '-') len++
      const lift = Math.floor(barN / bars) % 2 && s.lead !== 'bell' ? 12 : 0
      const f = N(s.key + n + lift)
      INSTRUMENT[s.lead](musicBus, t, f, eighth * len * 1.1, LEVEL[s.lead])
      if (s.double) INSTRUMENT[s.double](musicBus, t, f * 2, eighth * len, LEVEL[s.double] * 0.5)
    }
    // ---- the bass
    const low = (k) => N(root - 24 + k)
    if (s.bass === 'waltz') {
      if (i === 0) tuba(musicBus, t, low(0), eighth * 1.8, 0.32)
      if ((i === 2 || i === 4) && s.comp) for (const c of chord) reed(musicBus, t, N(s.key + c - 12), eighth * 0.9, 0.05)
    } else if (s.bass === 'oompah') {
      if (i % 4 === 0) tuba(musicBus, t, low(i === 4 ? 7 : 0), eighth * 1.6, 0.32)
      if (i % 4 === 2 && s.comp) for (const c of chord) reed(musicBus, t, N(s.key + c - 12), eighth * 0.8, 0.05)
    } else if (s.bass === 'walk') {
      // a walking bass: root, third, fifth, and a step towards the next chord
      if (i % 2 === 0) {
        const next = s.chords[(bar + 1) % bars][0] - chord[0]
        const walk = [0, chord[1] - chord[0], chord[2] - chord[0], next + (next > 0 ? -1 : 1)][i / 2]
        pizz(musicBus, t, low(walk), eighth * 1.7, 0.4)
      }
      if (i % 4 === 2 && s.comp) for (const c of chord) reed(musicBus, t, N(s.key + c - 12), eighth * 0.6, 0.035)
    } else if (s.bass === 'pizz') {
      if (i === 0 || i === 3 || i === 6) pizz(musicBus, t, low(i === 3 ? chord[2] - chord[0] : 0), eighth * 2, 0.4)
    } else if (s.bass === 'pulse') {
      pizz(musicBus, t, low(i % 4 === 3 ? 12 : 0), eighth * 0.9, 0.34)
      if (i % 4 === 2 && s.comp) for (const c of chord) INSTRUMENT[s.comp](musicBus, t, N(s.key + c), eighth * 0.7, LEVEL[s.comp] * 0.35)
    } else if (s.bass === 'drone') {
      if (i === 0) tuba(musicBus, t, low(0), eighth * s.steps * 0.95, 0.18)
      if (i === 4) bell(t, N(s.key + chord[1] - 12), eighth * 3, 0.05, musicBus)
    }
    // ---- drums
    const pattern = s.beats[barN % s.beats.length]
    for (const ch of pattern[i] ?? '') if (DRUMS[ch]) DRUMS[ch](t)
    if (bar === 0 && i === 0 && barN > 0 && (s.bpm > 110)) DRUMS.c(t)
    step++
    nextAt += eighth
  }
}
export function setSound({ sfx, music }) {
  if (sfx != null) sfxOn = sfx
  if (music != null) musicOn = music
  applyLevels()
}
function applyLevels() {
  if (musicBus) musicBus.gain.value = musicLevel()
  if (sfxBus) sfxBus.gain.value = sfxLevel()
}
/** The volume sliders: music and sfx from 0 to 1. */
export function setVolume({ music, sfx }) {
  if (music != null) vol.music = Math.max(0, Math.min(1, music))
  if (sfx != null) vol.sfx = Math.max(0, Math.min(1, sfx))
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify(vol))
  } catch {}
  applyLevels()
}
export const getVolume = () => ({ ...vol })
export function unlockAudio() {
  ensure()
}
