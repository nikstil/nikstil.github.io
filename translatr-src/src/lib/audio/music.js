// "Holding Pattern in F" — procedurally composed elevator bossa, rendered once with an
// OfflineAudioContext (off the main audio thread) into a buffer that loops seamlessly.
//
// 128 BPM × 64 bars × 4 beats = exactly 2:00. Rhodes-style FM electric piano comping,
// vibraphone melody, bossa bass, brushes/rim clave, a soft string pad, room reverb,
// and — as tradition demands — a cheesy key change up a semitone near the end.

export const TRACK_TITLE = 'Holding Pattern in F (Your Call Is Important To Us Mix)'
const BPM = 128
const BEAT = 60 / BPM
const BAR = BEAT * 4
const BARS = 64
export const LOOP_SECONDS = BARS * BAR // 120s
const TAIL_SECONDS = 3 // rendered past the loop point, then folded back onto the start
const SAMPLE_RATE = 24_000 // warm, slightly lo-fi "ceiling speaker" fidelity (and ~12MB instead of ~40MB)

// ---------- Harmony ----------
const NOTE = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 }
const QUALITY = {
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  9: [0, 4, 7, 10, 14],
  13: [0, 4, 10, 14, 21],
  m7: [0, 3, 7, 10],
  m6: [0, 3, 7, 9],
}
const parse = (sym) => {
  const [root, q] = sym.split(':')
  return { pc: NOTE[root], iv: QUALITY[q] }
}

// One array per bar; two chords in a bar split it in half.
const A = [['F:maj9'], ['F:maj9'], ['G:m9'], ['C:9'], ['A:m7'], ['D:9'], ['G:m9'], ['C:13'], ['F:maj9'], ['F:9'], ['Bb:maj9'], ['Bb:m6'], ['A:m7'], ['D:9'], ['G:m9', 'C:9'], ['F:maj9']].map((b) => b.map(parse))
const B = [['Bb:maj9'], ['Bb:maj9'], ['A:m7'], ['D:9'], ['G:m9'], ['C:9'], ['F:maj9'], ['F:maj9'], ['Eb:maj9'], ['Ab:13'], ['Db:maj9'], ['G:m9', 'C:9'], ['F:maj9'], ['D:m9'], ['G:m9'], ['C:13']].map((b) => b.map(parse))
const TURN = [['D:m9'], ['G:13'], ['G:m9'], ['C:13'], ['A:m7'], ['D:9'], ['G:m9'], ['C:13']].map((b) => b.map(parse))

// ---------- Melody ----------
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

// Bossa-ish melodic rhythms: [startBeat, lengthBeats]
const RHYTHMS = [
  [[0, 1.5], [1.5, 1], [2.5, 1.5]],
  [[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]],
  [[0.5, 1], [1.5, 0.5], [2, 1], [3, 1]],
  [[0, 3.5]],
  [[1, 1], [2, 0.5], [2.5, 1.5]],
  [[0, 1], [1, 1], [2, 1.5], [3.5, 0.5]],
  [],
]

/** Generates a phrase (array of bars of notes) that moves stepwise through chord tones. */
function phrase(bars, seed, start = 77) {
  const R = rng(seed)
  let prev = start
  return bars.map((chords, i) => {
    const last = i === bars.length - 1
    const pattern = last ? [[0, 3.5]] : RHYTHMS[Math.floor(R() * RHYTHMS.length)]
    return pattern.map(([t, d]) => {
      const chord = chords.length === 2 && t >= 2 ? chords[1] : chords[0]
      const pcs = chord.iv.map((x) => (chord.pc + x) % 12)
      const pool = []
      for (let m = 70; m <= 86; m++) if (pcs.includes(m % 12)) pool.push(m)
      pool.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev) + (R() - 0.5) * 3)
      const m = pool[Math.floor(R() * Math.min(3, pool.length))]
      prev = m
      return { t, d, m, vel: 0.75 + R() * 0.25 }
    })
  })
}

function buildSong() {
  const melA = phrase(A, 11)
  const melA2 = [...melA.slice(0, 12), ...phrase(A.slice(12), 37, melA[11].at(-1)?.m ?? 77)]
  const melB = phrase(B, 23, 79)
  const melTurn = phrase(TURN, 53, 76)
  const section = (chords, mel, tr = 0) => chords.map((c, i) => ({ chords: c, melody: mel[i], tr }))
  return [
    ...section(A, melA),
    ...section(B, melB),
    ...section(A, melA2),
    ...section(A.slice(0, 8), melA.slice(0, 8), 1), // the key change. You know the one.
    ...section(TURN, melTurn),
  ]
}

// ---------- Synthesis ----------
// Performance note: instead of one oscillator per note (~10k nodes → 30s+ renders), each part
// uses a small set of persistent "voices" retriggered through AudioParam automation (~50 nodes).
// Drums are rendered once as a 2-bar loop and replayed.

const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

function makeNoise(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function makeImpulse(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6
  return buf
}

/** Rootless jazz voicing (3rd/5th/7th/9th…) placed around middle C, ascending. */
function rootless(chord, tr) {
  const notes = []
  for (const x of chord.iv) {
    if (x === 0) continue
    const pc = (chord.pc + x + tr) % 12
    let best = null
    for (let m = 55; m <= 72; m++) if (m % 12 === pc && (best == null || Math.abs(m - 63) < Math.abs(best - 63))) best = m
    if (best != null && !notes.includes(best)) notes.push(best)
  }
  return notes.sort((a, b) => a - b).slice(0, 4)
}

const osc = (ctx, type, end) => {
  const o = ctx.createOscillator()
  o.type = type
  o.start(0)
  o.stop(end)
  return o
}

/** Retriggerable envelope on a gain param: quick pre-fade (no clicks), attack, decay, release. */
function trigger(param, t, { peak, attack, sustain, decayTau, releaseAt, releaseTau }) {
  param.setTargetAtTime(0, Math.max(0, t - 0.015), 0.004)
  param.setValueAtTime(0, t)
  param.linearRampToValueAtTime(peak, t + attack)
  param.setTargetAtTime(sustain, t + attack, decayTau)
  param.setTargetAtTime(0, releaseAt, releaseTau)
}

/** FM electric piano voice (ratio 1:1, decaying modulation index → bell attack, mellow body). */
function epVoice(ctx, dest, end) {
  const car = osc(ctx, 'sine', end)
  const mod = osc(ctx, 'sine', end)
  const idx = ctx.createGain()
  const amp = ctx.createGain()
  idx.gain.value = 0
  amp.gain.value = 0
  mod.connect(idx).connect(car.frequency)
  car.connect(amp).connect(dest)
  return (t, midi, dur, vel) => {
    const f = mtof(midi)
    car.frequency.setValueAtTime(f, t)
    mod.frequency.setValueAtTime(f, t)
    idx.gain.setValueAtTime(f * 1.3 * vel, t)
    idx.gain.setTargetAtTime(f * 0.12, t, 0.12)
    trigger(amp.gain, t, { peak: 0.055 * vel, attack: 0.006, sustain: 0.02 * vel, decayTau: 0.25, releaseAt: t + dur, releaseTau: 0.09 })
  }
}

/** Vibraphone voice: fundamental + 4th partial, with motor tremolo. */
function vibeVoice(ctx, dest, end) {
  const o1 = osc(ctx, 'sine', end)
  const p2 = osc(ctx, 'sine', end)
  const lfo = osc(ctx, 'sine', end)
  const p2amp = ctx.createGain()
  const amp = ctx.createGain()
  const trem = ctx.createGain()
  const depth = ctx.createGain()
  p2amp.gain.value = 0
  amp.gain.value = 0
  trem.gain.value = 0.8
  depth.gain.value = 0.2
  lfo.frequency.value = 5.2
  lfo.connect(depth).connect(trem.gain)
  o1.connect(amp)
  p2.connect(p2amp).connect(amp)
  amp.connect(trem).connect(dest)
  // `nextStart` clamps the release: automation events are time-sorted, so a release scheduled
  // after the next note's attack would silence that next note.
  return (t, midi, dur, vel, nextStart = Infinity) => {
    const f = mtof(midi)
    o1.frequency.setValueAtTime(f, t)
    p2.frequency.setValueAtTime(f * 4, t)
    p2amp.gain.setValueAtTime(0.18, t)
    p2amp.gain.setTargetAtTime(0, t, 0.08)
    const releaseAt = Math.min(t + dur + 0.1, nextStart - 0.03)
    trigger(amp.gain, t, { peak: 0.075 * vel, attack: 0.004, sustain: 0.035 * vel, decayTau: 0.5, releaseAt, releaseTau: 0.16 })
  }
}

/** Round bass voice: triangle + sine sub through a lowpass. */
function bassVoice(ctx, dest, end) {
  const tri = osc(ctx, 'triangle', end)
  const sub = osc(ctx, 'sine', end)
  const lp = ctx.createBiquadFilter()
  const amp = ctx.createGain()
  lp.type = 'lowpass'
  lp.frequency.value = 650
  amp.gain.value = 0
  tri.connect(lp)
  sub.connect(lp)
  lp.connect(amp).connect(dest)
  return (t, midi, dur) => {
    const f = mtof(midi)
    tri.frequency.setValueAtTime(f, t)
    sub.frequency.setValueAtTime(f, t)
    trigger(amp.gain, t, { peak: 0.22, attack: 0.012, sustain: 0.14, decayTau: 0.3, releaseAt: t + dur * 0.92, releaseTau: 0.04 })
  }
}

/** String pad: 4 voices × 2 detuned saws through one lowpass; chords glide into each other. */
function padSection(ctx, dest, end) {
  const lp = ctx.createBiquadFilter()
  const amp = ctx.createGain()
  lp.type = 'lowpass'
  lp.frequency.value = 850
  amp.gain.setValueAtTime(0, 0)
  amp.gain.linearRampToValueAtTime(0.011, 0.7)
  amp.gain.setTargetAtTime(0, LOOP_SECONDS - 0.2, 0.25) // release at the loop point: nothing bleeds over the seam
  lp.connect(amp).connect(dest)
  const voices = Array.from({ length: 4 }, () => [-7, 7].map((cents) => {
    const o = osc(ctx, 'sawtooth', end)
    o.detune.value = cents
    o.connect(lp)
    return o
  }))
  return (t, midis) => {
    voices.forEach((pair, i) => {
      const m = midis[Math.min(i, midis.length - 1)] + (i >= midis.length ? 12 : 0)
      for (const o of pair) (t === 0 ? o.frequency.setValueAtTime(mtof(m), 0) : o.frequency.setTargetAtTime(mtof(m), t, 0.06))
    })
  }
}

/** Renders a seamless 2-bar drum loop: shaker 8ths, soft kick on 1 & 3, brushes on 2 & 4, 3-2 clave on the rim. */
async function renderDrumLoop(OAC) {
  const loopLen = 2 * BAR
  const ctx = new OAC(1, Math.ceil((loopLen + 0.5) * SAMPLE_RATE), SAMPLE_RATE)
  const noise = makeNoise(ctx)
  const out = ctx.destination
  const hit = (t, { type, f, q = 1, peak, tau, len }) => {
    const src = ctx.createBufferSource()
    const fl = ctx.createBiquadFilter()
    const g = ctx.createGain()
    src.buffer = noise
    fl.type = type
    fl.frequency.value = f
    fl.Q.value = q
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.002)
    g.gain.setTargetAtTime(0, t + 0.002, tau)
    src.connect(fl).connect(g).connect(out)
    src.start(t, Math.random() * 0.8)
    src.stop(t + len)
  }
  for (let bar = 0; bar < 2; bar++) {
    const t0 = bar * BAR
    for (let e = 0; e < 8; e++) hit(t0 + e * 0.5 * BEAT, { type: 'highpass', f: 7000, peak: 0.028 * (e % 2 ? 1 : 0.55), tau: 0.018, len: 0.12 })
    for (const b of bar === 0 ? [0, 1.5, 3] : [1, 2.5]) hit(t0 + b * BEAT, { type: 'bandpass', f: 1900, q: 7, peak: 0.22, tau: 0.012, len: 0.1 })
    for (const b of [1, 3]) {
      // brush swish: a slow swell rather than a hit
      const t = t0 + b * BEAT
      const src = ctx.createBufferSource()
      const fl = ctx.createBiquadFilter()
      const g = ctx.createGain()
      src.buffer = noise
      fl.type = 'bandpass'
      fl.frequency.value = 2600
      fl.Q.value = 0.7
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.018, t + 0.1)
      g.gain.setTargetAtTime(0, t + 0.1, 0.06)
      src.connect(fl).connect(g).connect(out)
      src.start(t, Math.random() * 0.5)
      src.stop(t + 0.45)
    }
    for (const b of [0, 2]) {
      const t = t0 + b * BEAT
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.setValueAtTime(95, t)
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.3, t + 0.004)
      g.gain.setTargetAtTime(0, t + 0.004, 0.07)
      o.connect(g).connect(out)
      o.start(t)
      o.stop(t + 0.35)
    }
  }
  const rendered = await ctx.startRendering()
  return foldLoop(rendered, Math.round(loopLen * SAMPLE_RATE))
}

/** Folds everything rendered past `loopLen` samples back onto the start, so the buffer loops seamlessly. */
function foldLoop(rendered, loopLen) {
  const out = new AudioBuffer({ length: loopLen, numberOfChannels: 1, sampleRate: SAMPLE_RATE })
  const src = rendered.getChannelData(0)
  const dst = out.getChannelData(0)
  dst.set(src.subarray(0, loopLen))
  for (let i = loopLen; i < src.length; i++) dst[(i - loopLen) % loopLen] += src[i]
  return out
}

// Bossa comping hits per bar: [beat, length, velocity]
const COMP_FULL = [
  [0, 0.9, 1],
  [1.5, 0.45, 0.8],
  [2.5, 0.9, 0.9],
  [3.5, 0.45, 0.75],
]
const COMP_SPLIT = [
  [[0, 0.9, 1], [1.5, 0.45, 0.8]],
  [[2, 0.9, 0.95], [3.5, 0.45, 0.75]],
]

/** Renders the full loop. Resolves to a mono AudioBuffer exactly LOOP_SECONDS long. */
export async function renderElevatorMusic() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const drums = await renderDrumLoop(OAC)
  const end = LOOP_SECONDS + TAIL_SECONDS
  const ctx = new OAC(1, Math.ceil(end * SAMPLE_RATE), SAMPLE_RATE)

  // Mix: parts → bus → (dry + reverb) → gentle "ceiling speaker" lowpass → out
  const bus = ctx.createGain()
  const dry = ctx.createGain()
  const wet = ctx.createGain()
  const verb = ctx.createConvolver()
  const tone = ctx.createBiquadFilter()
  wet.gain.value = 0.3
  verb.buffer = makeImpulse(ctx, 2.2)
  tone.type = 'lowpass'
  tone.frequency.value = 5500
  bus.connect(dry).connect(tone)
  bus.connect(verb).connect(wet).connect(tone)
  tone.connect(ctx.destination)

  const drumSrc = ctx.createBufferSource()
  drumSrc.buffer = drums
  drumSrc.loop = true
  drumSrc.connect(bus)
  drumSrc.start(0)
  drumSrc.stop(LOOP_SECONDS)

  const epVoices = Array.from({ length: 4 }, () => epVoice(ctx, bus, end))
  const vibe = vibeVoice(ctx, bus, end)
  const bass = bassVoice(ctx, bus, end)
  const pad = padSection(ctx, bus, end)
  const comp = (t0, hits, voicing) => {
    for (const [b, len, vel] of hits) voicing.forEach((m, i) => epVoices[i](t0 + b * BEAT, m, len * BEAT, vel))
  }
  const bassRoot = (c, tr) => 36 + ((c.pc + tr) % 12) + ((c.pc + tr) % 12 < 2 ? 12 : 0)

  const song = buildSong()
  // Melody as absolute-time notes, so each note knows when the next one starts.
  const melodyNotes = song.flatMap((bar, i) => (bar.melody ?? []).map((n) => ({ t: i * BAR + n.t * BEAT, m: n.m + bar.tr, d: n.d * BEAT, vel: n.vel })))
  melodyNotes.forEach((n, i) => vibe(n.t, n.m, n.d, n.vel, melodyNotes[i + 1]?.t))

  song.forEach((bar, i) => {
    const t0 = i * BAR
    const { chords, tr } = bar

    if (chords.length === 1) {
      const voicing = rootless(chords[0], tr)
      comp(t0, COMP_FULL, voicing)
      pad(t0, voicing)
      const r = bassRoot(chords[0], tr)
      bass(t0, r, 1.5 * BEAT)
      bass(t0 + 1.5 * BEAT, r + 7, 0.5 * BEAT)
      bass(t0 + 2 * BEAT, r + 7, 1.5 * BEAT)
      bass(t0 + 3.5 * BEAT, r, 0.5 * BEAT)
    } else {
      chords.forEach((c, half) => {
        const voicing = rootless(c, tr)
        comp(t0, COMP_SPLIT[half], voicing)
        pad(t0 + half * 2 * BEAT, voicing)
        const r = bassRoot(c, tr)
        bass(t0 + half * 2 * BEAT, r, 1.5 * BEAT)
        bass(t0 + (half * 2 + 1.5) * BEAT, r + 7, 0.5 * BEAT)
      })
    }
  })

  const rendered = await ctx.startRendering()
  return foldLoop(rendered, Math.round(LOOP_SECONDS * SAMPLE_RATE))
}
