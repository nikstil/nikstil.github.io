// The background music: the original hold music (music.js) plus four more loops, each composed
// from a short description below and rendered once, offline, into a buffer that loops.

import { TRACK_TITLE, renderElevatorMusic } from './music'

const SAMPLE_RATE = 24_000
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
const QUALITY = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 7: [0, 4, 7, 10], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14], sus: [0, 5, 7] }
const chord = (sym) => {
  const [root, q = 'maj'] = sym.split(':')
  return { pc: NOTE[root], iv: QUALITY[q] }
}
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

// Each track: tempo, swing, four chords (one per bar, repeated), drum patterns (16 steps a bar:
// x = hit, o = soft hit), bass steps (scale degrees of the chord, '.' rest) and the sound of
// each part.
const DEFS = [
  {
    id: 'lofi',
    title: 'lofi beats to get monetized to',
    bpm: 78,
    swing: 0.18,
    bars: 16,
    chords: ['D:m9', 'G:7', 'C:maj9', 'A:m7'],
    kick: 'x......x..x.....',
    snare: '....x.......x...',
    hat: 'x.o.x.o.x.o.x.oo',
    bass: '0......0..4.....',
    keys: 'ep',
    lead: { kind: 'melody', seed: 7, octave: 72, density: 0.35, wave: 'sine' },
    crackle: 0.025,
    lowpass: 3200,
    gain: 1.45,
  },
  {
    id: 'synthwave',
    title: 'Checkout at Midnight (Synthwave)',
    bpm: 104,
    swing: 0,
    bars: 16,
    chords: ['A:min', 'F:maj', 'C:maj', 'G:maj'],
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
    bass: '0.0.0.0.0.0.0.0.',
    keys: 'pad',
    lead: { kind: 'arp', octave: 64, wave: 'sawtooth', steps: 16 },
    pump: true,
    lowpass: 6000,
    gain: 0.78,
  },
  {
    id: 'hyperpop',
    title: 'Loot Box Hyperpop (Nightcore Edit)',
    bpm: 160,
    swing: 0,
    bars: 16,
    chords: ['C#:min', 'A:maj', 'E:maj', 'B:maj'],
    kick: 'x..x..x...x..x..',
    snare: '....x.......x..x',
    hat: 'xxxxxxxxxxxxxxxx',
    bass: '0..0..0...0..0..',
    keys: 'stab',
    lead: { kind: 'melody', seed: 31, octave: 81, density: 0.75, wave: 'square' },
    lowpass: 9000,
    gain: 0.75,
  },
  {
    id: 'phonk',
    title: 'Vowel Tax (Phonk Drift)',
    bpm: 132,
    swing: 0.08,
    bars: 16,
    chords: ['F:min', 'Db:maj', 'Eb:maj', 'C:min'],
    kick: 'x.....x...x.....',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.xxx.x.',
    bass: '0.....0...0..2..',
    bass808: true,
    keys: null,
    lead: { kind: 'cowbell', seed: 13, octave: 77 },
    lowpass: 7000,
    gain: 0.76,
  },
]

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Renders one of the DEFS into a looping mono buffer. */
async function renderLoop(def) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const beat = 60 / def.bpm
  const step = beat / 4
  const bar = beat * 4
  const length = def.bars * bar
  const tail = 2
  const ctx = new OAC(1, Math.ceil((length + tail) * SAMPLE_RATE), SAMPLE_RATE)
  const R = rng(def.lead?.seed ?? 1)

  // Mix: parts → bus → (pump) → lowpass → out
  const bus = ctx.createGain()
  const pump = ctx.createGain()
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = def.lowpass ?? 8000
  // A limiter at the end, so no track clips (kicks and 808s add up).
  const limit = ctx.createDynamicsCompressor()
  limit.threshold.value = -8
  limit.knee.value = 4
  limit.ratio.value = 12
  limit.attack.value = 0.003
  limit.release.value = 0.12
  limit.connect(ctx.destination)
  bus.connect(pump).connect(lp).connect(limit)
  bus.gain.value = 0.55 * (def.gain ?? 1)
  const drums = ctx.createGain()
  drums.connect(lp) // the drums skip the sidechain pump

  const noise = ctx.createBuffer(1, SAMPLE_RATE, SAMPLE_RATE)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

  const at = (barN, stepN) => barN * bar + stepN * step + (stepN % 2 ? def.swing * step : 0)
  const env = (g, t, peak, attack, decay) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    g.gain.setTargetAtTime(0.0001, t + attack, decay)
  }
  const note = (t, freq, dur, { wave = 'sine', peak = 0.1, attack = 0.005, decay = dur / 3, dest = bus, detune = 0, glideTo = null } = {}) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = wave
    o.detune.value = detune
    o.frequency.setValueAtTime(freq, t)
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur * 0.8)
    env(g, t, peak, attack, decay)
    o.connect(g).connect(dest)
    o.start(t)
    o.stop(t + dur + decay * 5)
  }
  const hit = (t, { type, f, q = 1, peak, decay }) => {
    const s = ctx.createBufferSource()
    const fl = ctx.createBiquadFilter()
    const g = ctx.createGain()
    s.buffer = noise
    fl.type = type
    fl.frequency.value = f
    fl.Q.value = q
    env(g, t, peak, 0.002, decay)
    s.connect(fl).connect(g).connect(drums)
    s.start(t, Math.random() * 0.5)
    s.stop(t + decay * 8)
  }
  const kick = (t, soft) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(def.bass808 ? 120 : 140, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    env(g, t, soft ? 0.45 : 0.85, 0.003, 0.09)
    o.connect(g).connect(drums)
    o.start(t)
    o.stop(t + 0.5)
    // sidechain: everything else ducks under the kick
    if (def.pump) {
      pump.gain.setValueAtTime(0.25, t)
      pump.gain.linearRampToValueAtTime(1, t + beat * 0.8)
    }
  }

  for (let b = 0; b < def.bars; b++) {
    const c = chord(def.chords[b % def.chords.length])
    const root = 36 + c.pc
    for (let s = 0; s < 16; s++) {
      const t = at(b, s)
      const k = def.kick[s]
      if (k !== '.') kick(t, k === 'o')
      const sn = def.snare[s]
      if (sn !== '.') {
        hit(t, { type: 'bandpass', f: 1800, q: 0.8, peak: sn === 'o' ? 0.12 : 0.3, decay: 0.07 })
        note(t, 190, 0.08, { wave: 'triangle', peak: 0.08, dest: drums })
      }
      const h = def.hat[s]
      if (h !== '.') hit(t, { type: 'highpass', f: 8000, peak: h === 'o' ? 0.04 : 0.08, decay: 0.02 })
      const bn = def.bass[s]
      if (bn !== '.') {
        const deg = Number(bn)
        const m = root + (c.iv[deg % c.iv.length] ?? 0) + (deg >= c.iv.length ? 12 : 0)
        if (def.bass808) note(t, mtof(m), beat * 1.5, { wave: 'sine', peak: 0.5, decay: 0.35, glideTo: s === 13 ? mtof(m - 5) : null })
        else note(t, mtof(m), step * 2, { wave: def.keys === 'pad' ? 'sawtooth' : 'triangle', peak: 0.22, decay: 0.12 })
      }
    }
    // Chords: an electric piano, a slow pad or short stabs
    const voicing = c.iv.slice(0, 4).map((x) => 60 + ((c.pc + x) % 12) - ((c.pc + x) % 12 > 7 ? 12 : 0))
    if (def.keys === 'ep') for (const [s, len] of [[0, 6], [7, 3], [10, 6]]) voicing.forEach((m) => note(at(b, s), mtof(m), step * len, { peak: 0.05, attack: 0.008, decay: 0.35 }))
    if (def.keys === 'pad') voicing.forEach((m) => [-8, 8].forEach((d) => note(at(b, 0), mtof(m), bar, { wave: 'sawtooth', peak: 0.025, attack: 0.25, decay: 1.2, detune: d })))
    if (def.keys === 'stab') for (const s of [0, 3, 6, 10, 12]) voicing.forEach((m) => note(at(b, s), mtof(m + 12), step, { wave: 'square', peak: 0.025, decay: 0.05 }))
    // The lead
    const L = def.lead
    if (L?.kind === 'arp') {
      const tones = [...c.iv, 12, ...c.iv.map((x) => x + 12)].slice(0, 6)
      for (let s = 0; s < L.steps; s++) note(at(b, s), mtof(L.octave + c.pc + tones[s % tones.length] - (c.pc > 6 ? 12 : 0)), step * 0.9, { wave: L.wave, peak: 0.045, decay: 0.08, detune: 6 })
    } else if (L?.kind === 'melody' || L?.kind === 'cowbell') {
      const scale = c.iv.map((x) => (c.pc + x) % 12)
      for (let s = 0; s < 16; s += 2) {
        if (R() > (L.density ?? 0.5)) continue
        const pc = scale[Math.floor(R() * scale.length)]
        let m = L.octave - 12 + pc
        while (m < L.octave - 6) m += 12
        if (L.kind === 'cowbell') {
          // The phonk cowbell: two detuned squares through a bandpass, short and loud.
          ;[1, 1.48].forEach((r) => note(at(b, s), mtof(m) * r, step * 1.6, { wave: 'square', peak: 0.04, decay: 0.09 }))
        } else note(at(b, s), mtof(m), step * (R() < 0.3 ? 4 : 2), { wave: L.wave, peak: L.wave === 'square' ? 0.04 : 0.07, decay: 0.15 })
      }
    }
  }
  // Vinyl crackle (lo-fi)
  if (def.crackle) {
    const s = ctx.createBufferSource()
    const g = ctx.createGain()
    const fl = ctx.createBiquadFilter()
    s.buffer = noise
    s.loop = true
    fl.type = 'highpass'
    fl.frequency.value = 3000
    g.gain.value = def.crackle
    s.connect(fl).connect(g).connect(limit)
    s.start(0)
    s.stop(length + tail)
  }
  const rendered = await ctx.startRendering()
  // Fold the tail back onto the start so it loops without a seam.
  const loopLen = Math.round(length * SAMPLE_RATE)
  const out = new AudioBuffer({ length: loopLen, numberOfChannels: 1, sampleRate: SAMPLE_RATE })
  const src = rendered.getChannelData(0)
  const dst = out.getChannelData(0)
  dst.set(src.subarray(0, loopLen))
  for (let i = loopLen; i < src.length; i++) dst[(i - loopLen) % loopLen] += src[i]
  return out
}

export const TRACKS = [{ id: 'hold', title: TRACK_TITLE, render: renderElevatorMusic }, ...DEFS.map((d) => ({ id: d.id, title: d.title, render: () => renderLoop(d) }))]
export const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]))
export const DEFAULT_TRACK = 'hold'
