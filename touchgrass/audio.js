// TOUCHGRASS.EXE sound: synthesized effects for every sound name the game uses, and a little
// soundtrack per area. Web Audio only, no files.

let ac = null
let master = null
let sfxBus = null
let musicBus = null
let noiseBuf = null
let sfxOn = true
let musicOn = true

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
  sfxBus.connect(master)
  musicBus = ac.createGain()
  musicBus.gain.value = 0.22
  musicBus.connect(master)
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
    noise(sfxBus, t, { dur: 0.12, vol: 0.35, freq: 600, to: 200 })
    tone(sfxBus, t, { f: 180, to: 90, dur: 0.12, type: 'sine', vol: 0.3 })
  },
  plop: (t) => {
    tone(sfxBus, t, { f: 600, to: 160, dur: 0.18, type: 'sine', vol: 0.3 })
    noise(sfxBus, t + 0.02, { dur: 0.15, vol: 0.15, freq: 2500, to: 600 })
  },
  shovel: (t) => noise(sfxBus, t, { dur: 0.2, vol: 0.35, freq: 900, to: 300 }),
  shoot: (t) => tone(sfxBus, t, { f: 520, to: 260, dur: 0.07, type: 'sine', vol: 0.12 }),
  puff: (t) => noise(sfxBus, t, { dur: 0.1, vol: 0.12, freq: 1800, to: 900, type: 'bandpass' }),
  splat: (t) => {
    noise(sfxBus, t, { dur: 0.07, vol: 0.18, freq: 1400, to: 500 })
    tone(sfxBus, t, { f: 220, to: 120, dur: 0.06, type: 'triangle', vol: 0.1 })
  },
  sizzle: (t) => noise(sfxBus, t, { dur: 0.2, vol: 0.18, freq: 5000, to: 2000, type: 'highpass' }),
  thud: (t) => {
    tone(sfxBus, t, { f: 120, to: 50, dur: 0.18, type: 'sine', vol: 0.35 })
    noise(sfxBus, t, { dur: 0.1, vol: 0.2, freq: 500, to: 150 })
  },
  lob: (t) => tone(sfxBus, t, { f: 300, to: 600, dur: 0.12, type: 'triangle', vol: 0.1 }),
  sun: (t) => {
    tone(sfxBus, t, { f: 880, dur: 0.08, type: 'triangle', vol: 0.15 })
    tone(sfxBus, t + 0.06, { f: 1320, dur: 0.12, type: 'triangle', vol: 0.13 })
  },
  coin: (t) => {
    tone(sfxBus, t, { f: 1568, dur: 0.06, type: 'square', vol: 0.08 })
    tone(sfxBus, t + 0.06, { f: 2093, dur: 0.18, type: 'square', vol: 0.07 })
  },
  diamond: (t) => [1568, 2093, 2637, 3136].forEach((f, i) => tone(sfxBus, t + i * 0.06, { f, dur: 0.16, type: 'triangle', vol: 0.12 })),
  gulp: (t) => tone(sfxBus, t, { f: 300, to: 90, dur: 0.25, type: 'sine', vol: 0.3 }),
  'chomp-soft': (t) => noise(sfxBus, t, { dur: 0.06, vol: 0.1, freq: 700, to: 300 }),
  chomp: (t) => {
    noise(sfxBus, t, { dur: 0.15, vol: 0.4, freq: 900, to: 200 })
    tone(sfxBus, t + 0.1, { f: 200, to: 80, dur: 0.3, type: 'sine', vol: 0.3 })
  },
  groan: (t) => tone(sfxBus, t, { f: 140, to: 95, dur: 1.1, type: 'sawtooth', vol: 0.08 }),
  siren: (t) => {
    for (let i = 0; i < 3; i++) {
      tone(sfxBus, t + i * 0.5, { f: 500, to: 900, dur: 0.25, type: 'sawtooth', vol: 0.09 })
      tone(sfxBus, t + i * 0.5 + 0.25, { f: 900, to: 500, dur: 0.25, type: 'sawtooth', vol: 0.09 })
    }
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
  reward: (t) => [784, 988, 1175, 1568].forEach((f, i) => tone(sfxBus, t + i * 0.08, { f, dur: 0.2, type: 'triangle', vol: 0.12 })),
  win: (t) => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(sfxBus, t + i * 0.13, { f, dur: 0.22, type: 'square', vol: 0.09 })),
  lose: (t) => [392, 370, 349, 330, 262].forEach((f, i) => tone(sfxBus, t + i * 0.25, { f, dur: 0.3, type: 'sawtooth', vol: 0.09 })),
  pick: (t) => tone(sfxBus, t, { f: 700, dur: 0.05, type: 'square', vol: 0.08 }),
  buzz: (t) => tone(sfxBus, t, { f: 110, dur: 0.18, type: 'square', vol: 0.12 }),
  buy: (t) => [1047, 1319, 1568].forEach((f, i) => tone(sfxBus, t + i * 0.07, { f, dur: 0.12, type: 'square', vol: 0.08 })),
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

// ================= Music =================
// A bouncy loop per area: bass, a chord pad and a little tune, in a key and tempo of its own.
const N = (s) => 440 * Math.pow(2, s / 12) // semitones from A4
const SONGS = {
  title: { bpm: 104, root: -9, scale: [0, 2, 4, 7, 9], wave: 'triangle', tune: [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 12, 9, 7, 4, 2] },
  day: { bpm: 116, root: -5, scale: [0, 2, 4, 5, 7, 9, 11], wave: 'square', tune: [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 11, 12, 11, 7, 4] },
  night: { bpm: 96, root: -10, scale: [0, 2, 3, 5, 7, 8, 10], wave: 'triangle', tune: [0, 3, 7, 3, 8, 7, 3, 2, 0, 3, 7, 10, 12, 10, 7, 3] },
  pool: { bpm: 120, root: -2, scale: [0, 2, 4, 7, 9], wave: 'square', tune: [0, 2, 4, 9, 7, 4, 2, 4, 0, 2, 4, 7, 9, 12, 9, 7] },
  fog: { bpm: 88, root: -7, scale: [0, 1, 3, 5, 7, 8, 10], wave: 'triangle', tune: [0, 1, 3, 7, 8, 7, 3, 1, 0, 3, 7, 8, 10, 8, 7, 3] },
  roof: { bpm: 128, root: -4, scale: [0, 2, 4, 5, 7, 9, 10], wave: 'square', tune: [0, 4, 7, 10, 9, 7, 4, 7, 5, 9, 12, 9, 7, 4, 2, 0] },
  boss: { bpm: 140, root: -12, scale: [0, 1, 3, 5, 6, 8, 10], wave: 'sawtooth', tune: [0, 0, 3, 0, 6, 5, 3, 1, 0, 0, 3, 6, 8, 6, 5, 3] },
}
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
  timer = setInterval(schedule, 60)
}
function schedule() {
  if (!musicOn || !song || !ac) return
  const s = SONGS[song]
  const beat = 60 / s.bpm / 2 // eighth notes
  while (nextAt < ac.currentTime + 0.25) {
    const i = step % 16
    const bar = Math.floor(step / 16) % 4
    const chord = [0, 5, 7, 5][bar] // I IV V IV
    const t = nextAt
    // bass on the beat
    if (i % 2 === 0) tone(musicBus, t, { f: N(s.root - 24 + chord + (i % 4 === 2 ? 7 : 0)), dur: beat * 1.6, type: 'triangle', vol: 0.5 })
    // the tune, every other step, with rests
    if (i % 2 === 0 || s.bpm > 120) {
      const note = s.tune[(i + bar * 3) % 16]
      if (!(bar === 3 && i > 11)) tone(musicBus, t, { f: N(s.root + note + chord * 0), dur: beat * 0.9, type: s.wave, vol: 0.16 })
    }
    // hi-hat
    if (i % 2 === 1) noise(musicBus, t, { dur: 0.04, vol: 0.12, freq: 8000, type: 'highpass' })
    if (i % 8 === 4) noise(musicBus, t, { dur: 0.12, vol: 0.25, freq: 1800, to: 400 })
    step++
    nextAt += beat
  }
}
export function setSound({ sfx, music }) {
  if (sfx != null) sfxOn = sfx
  if (music != null) {
    musicOn = music
    if (musicBus) musicBus.gain.value = music ? 0.22 : 0
  }
}
export function unlockAudio() {
  ensure()
}
