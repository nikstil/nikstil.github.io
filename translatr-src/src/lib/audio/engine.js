// Web Audio engine: one AudioContext, a compressor-protected master bus, an SFX bus,
// and a looping music bus. Every sound effect is synthesized — no audio files.
//
// Browsers only allow audio after a user gesture, so nothing plays until unlockAudio()
// is called from the first pointer/key event.

import { renderElevatorMusic } from './music'

const MUSIC_LEVEL = 0.4

let ctx = null
let master = null
let sfxBus = null
let musicBus = null
let musicDuck = null
let noise = null
let unlocked = false
let settings = { music: true, sfx: true, volume: 0.6, musicVolume: 1, sfxVolume: 1 }

let musicRender = null // Promise<AudioBuffer>, rendered once
let musicSource = null
let startingMusic = false
let status = 'idle' // idle | rendering | ready | playing
const statusListeners = new Set()

function setStatus(next) {
  status = next
  statusListeners.forEach((fn) => fn(next))
}
/** Subscribe to music status changes. Returns an unsubscribe function. */
export function onMusicStatus(fn) {
  statusListeners.add(fn)
  fn(status)
  return () => statusListeners.delete(fn)
}

function ensureContext() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC({ latencyHint: 'interactive' })
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -12
  comp.knee.value = 12
  comp.ratio.value = 3.5
  comp.attack.value = 0.003
  comp.release.value = 0.2
  master = ctx.createGain()
  sfxBus = ctx.createGain()
  musicBus = ctx.createGain()
  musicDuck = ctx.createGain()
  master.connect(comp).connect(ctx.destination)
  sfxBus.connect(master)
  musicBus.connect(musicDuck).connect(master)
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  applySettings(true)
  return ctx
}

function applySettings(immediate = false) {
  const t = ctx.currentTime
  master.gain.setTargetAtTime(settings.volume, t, immediate ? 0.001 : 0.05)
  // Mute flags zero a channel without stopping it, so unmuting resumes mid-song.
  sfxBus.gain.setTargetAtTime(settings.sfx ? (settings.sfxVolume ?? 1) : 0, t, 0.03)
  musicBus.gain.setTargetAtTime(settings.music ? MUSIC_LEVEL * (settings.musicVolume ?? 1) : 0, t, immediate ? 0.001 : 0.35)
}

/** Start rendering the music early (no gesture needed for offline rendering). */
export function prepareMusic() {
  if (!musicRender) {
    setStatus('rendering')
    musicRender = renderElevatorMusic()
      .then((buffer) => {
        if (status === 'rendering') setStatus('ready')
        return buffer
      })
      .catch((err) => {
        console.warn('Hold music failed to render', err)
        musicRender = null
        setStatus('idle')
        throw err
      })
  }
  return musicRender
}

async function startMusic() {
  if (musicSource || startingMusic || !ctx) return
  startingMusic = true
  try {
    const buffer = await prepareMusic()
    if (musicSource || !ctx) return // re-check after the await
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    src.connect(musicBus)
    src.start()
    musicSource = src
    setStatus('playing')
  } catch {
    /* already logged */
  } finally {
    startingMusic = false
  }
}

/** Call from a user gesture. Idempotent. */
export function unlockAudio() {
  const c = ensureContext()
  if (!c) return
  if (c.state !== 'running') c.resume().catch(() => {})
  unlocked = true
  if (settings.music) startMusic()
}

export function setAudioSettings(next) {
  settings = { ...settings, ...next }
  if (!ctx) return
  applySettings()
  if (settings.music && unlocked) startMusic()
}

/** Lower the music under dramatic moments (audits, trap ads): true, false, or a level from 0 to 1. */
export function duckMusic(on) {
  if (!ctx) return
  musicDuck.gain.setTargetAtTime(typeof on === 'number' ? on : on ? 0.25 : 1, ctx.currentTime, 0.3)
}

// ================= Synth helpers =================
function tone(t, { f, f2, type = 'sine', dur = 0.2, gain = 0.15, attack = 0.004, glide, lp, detune = 0, dest = sfxBus }) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.detune.value = detune
  o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + (glide ?? dur))
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + attack)
  g.gain.setTargetAtTime(0.0001, t + attack, dur / 4)
  let node = o
  if (lp) {
    const fl = ctx.createBiquadFilter()
    fl.type = 'lowpass'
    fl.frequency.value = lp
    node = o.connect(fl)
  }
  node.connect(g).connect(dest)
  o.start(t)
  o.stop(t + attack + dur * 1.6 + 0.05)
  return o
}

function noiseHit(t, { dur = 0.1, gain = 0.15, type = 'bandpass', f = 2000, f2, q = 1, attack = 0.002 }) {
  const src = ctx.createBufferSource()
  const fl = ctx.createBiquadFilter()
  const g = ctx.createGain()
  src.buffer = noise
  src.loop = true
  fl.type = type
  fl.frequency.setValueAtTime(f, t)
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur)
  fl.Q.value = q
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + attack)
  g.gain.setTargetAtTime(0.0001, t + attack, dur / 4)
  src.connect(fl).connect(g).connect(sfxBus)
  src.start(t, Math.random() * 0.5)
  src.stop(t + attack + dur * 1.6 + 0.05)
}

/** Glassy chime: fundamental + inharmonic partials (very Aero). */
function bell(t, f, gain = 0.07, dur = 0.6) {
  tone(t, { f, dur, gain })
  tone(t, { f: f * 2.76, dur: dur * 0.5, gain: gain * 0.35 })
  tone(t, { f: f * 5.4, dur: dur * 0.25, gain: gain * 0.15 })
}

const arp = (t, freqs, step, fn) => freqs.forEach((f, i) => fn(t + i * step, f, i))

// ================= Sound effects =================
// Each entry: play(t, opts) schedules nodes; `gap` throttles rapid repeats (ms).
const SFX = {
  click: { gap: 25, play: (t) => { tone(t, { f: 1900, f2: 1300, dur: 0.035, gain: 0.04 }); noiseHit(t, { dur: 0.012, gain: 0.02, type: 'highpass', f: 5000 }) } },
  mine: {
    gap: 25,
    play: (t, { vol = 1 } = {}) => {
      const p = 0.9 + Math.random() * 0.25
      bell(t, 1850 * p, 0.08 * vol, 0.16)
      noiseHit(t, { dur: 0.03, gain: 0.07 * vol, f: 3600, q: 2 })
      tone(t, { f: 190 * p, f2: 90, dur: 0.07, gain: 0.07 * vol })
    },
  },
  crit: {
    gap: 40,
    play: (t) => {
      SFX.mine.play(t)
      arp(t + 0.03, [1319, 1760, 2637, 3520], 0.035, (tt, f) => bell(tt, f, 0.055, 0.7))
    },
  },
  thud: { gap: 60, play: (t) => { tone(t, { f: 140, f2: 55, dur: 0.16, gain: 0.16 }); noiseHit(t, { dur: 0.06, gain: 0.08, type: 'lowpass', f: 500 }) } },
  coin: { gap: 60, play: (t) => { tone(t, { f: 988, type: 'square', dur: 0.07, gain: 0.05, lp: 4000 }); tone(t + 0.07, { f: 1319, type: 'square', dur: 0.3, gain: 0.05, lp: 4000 }) } },
  win: {
    gap: 120,
    play: (t) => {
      arp(t, [523, 659, 784, 1047], 0.07, (tt, f) => tone(tt, { f, type: 'triangle', dur: 0.4, gain: 0.1 }))
      bell(t + 0.28, 2093, 0.06, 0.8)
    },
  },
  jackpot: {
    gap: 200,
    play: (t) => {
      arp(t, [523, 659, 784, 1047, 1319, 1568, 2093, 2637], 0.05, (tt, f) => tone(tt, { f, type: 'triangle', dur: 0.35, gain: 0.08 }))
      for (const f of [1047, 1319, 1568, 2093]) tone(t + 0.42, { f, type: 'triangle', dur: 1.3, gain: 0.05 })
      noiseHit(t + 0.4, { dur: 1.2, gain: 0.025, type: 'highpass', f: 6500 })
    },
  },
  lose: { gap: 120, play: (t) => { tone(t, { f: 392, type: 'triangle', dur: 0.18, gain: 0.1 }); tone(t + 0.18, { f: 294, type: 'triangle', dur: 0.4, gain: 0.1 }) } },
  error: {
    gap: 150,
    play: (t) => {
      tone(t, { f: 587, dur: 0.14, gain: 0.08 })
      tone(t, { f: 740, dur: 0.14, gain: 0.05 })
      tone(t + 0.13, { f: 440, dur: 0.4, gain: 0.1 })
      tone(t + 0.13, { f: 554, dur: 0.4, gain: 0.06 })
    },
  },
  notify: { gap: 150, play: (t) => { bell(t, 1319, 0.06, 0.5); bell(t + 0.09, 1760, 0.055, 0.6) } },
  success: { gap: 150, play: (t) => arp(t, [880, 1175, 1568], 0.06, (tt, f) => bell(tt, f, 0.05, 0.5)) },
  popup: { gap: 150, play: (t) => { tone(t, { f: 320, f2: 980, dur: 0.12, gain: 0.08, glide: 0.1 }); bell(t + 0.08, 1568, 0.045, 0.35) } },
  alarm: { gap: 500, play: (t) => { for (let i = 0; i < 6; i++) tone(t + i * 0.16, { f: i % 2 ? 660 : 880, type: 'square', dur: 0.14, gain: 0.04, lp: 2400 }) } },
  tick: { gap: 15, play: (t) => { noiseHit(t, { dur: 0.012, gain: 0.1, type: 'highpass', f: 3000 }); tone(t, { f: 2600, dur: 0.015, gain: 0.025 }) } },
  reelStop: { gap: 40, play: (t) => { tone(t, { f: 220, f2: 90, dur: 0.1, gain: 0.16 }); noiseHit(t, { dur: 0.04, gain: 0.1, type: 'lowpass', f: 1200 }) } },
  lever: {
    gap: 200,
    play: (t) => {
      for (let i = 0; i < 5; i++) noiseHit(t + i * 0.05, { dur: 0.012, gain: 0.08, type: 'highpass', f: 2500 })
      tone(t + 0.25, { f: 160, f2: 420, dur: 0.3, gain: 0.07, type: 'triangle', glide: 0.08 })
    },
  },
  rumble: {
    gap: 500,
    play: (t) => {
      const src = ctx.createBufferSource()
      const lp = ctx.createBiquadFilter()
      const g = ctx.createGain()
      src.buffer = noise
      src.loop = true
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(180, t)
      lp.frequency.linearRampToValueAtTime(700, t + 1.35)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.22, t + 1.35)
      g.gain.setTargetAtTime(0.0001, t + 1.4, 0.05)
      src.connect(lp).connect(g).connect(sfxBus)
      src.start(t)
      src.stop(t + 1.7)
      tone(t, { f: 55, f2: 80, dur: 1.4, gain: 0.12, attack: 1.2, glide: 1.4 })
    },
  },
  reveal: {
    gap: 300,
    play: (t) => {
      noiseHit(t, { dur: 0.45, gain: 0.1, f: 500, f2: 5000, q: 1.2 })
      arp(t + 0.1, [2093, 2637, 3136, 4186, 5274], 0.05, (tt, f) => bell(tt, f, 0.04, 0.5))
    },
  },
  mythic: {
    gap: 300,
    play: (t) => {
      SFX.reveal.play(t)
      for (const f of [349, 440, 523, 698, 880]) tone(t + 0.2, { f, type: 'triangle', dur: 2, gain: 0.045, attack: 0.15 })
      noiseHit(t + 0.2, { dur: 1.6, gain: 0.03, type: 'highpass', f: 7000 })
    },
  },
  kaching: {
    gap: 200,
    play: (t) => {
      noiseHit(t, { dur: 0.05, gain: 0.14, f: 4200, q: 1 })
      for (let i = 0; i < 4; i++) noiseHit(t + 0.02 + i * 0.03, { dur: 0.01, gain: 0.05, type: 'highpass', f: 5000 })
      bell(t + 0.07, 2093, 0.08, 0.9)
      bell(t + 0.07, 2637, 0.06, 0.9)
    },
  },
  achievement: {
    gap: 300,
    play: (t) => {
      tone(t, { f: 392, f2: 784, dur: 0.2, gain: 0.07, type: 'triangle', glide: 0.14 })
      for (const f of [1047, 1319, 1568]) bell(t + 0.16, f, 0.06, 1.1)
    },
  },
  levelup: { gap: 150, play: (t) => { arp(t, [523, 659, 784, 1047, 1319], 0.045, (tt, f) => tone(tt, { f, type: 'triangle', dur: 0.3, gain: 0.08 })); bell(t + 0.24, 2637, 0.05, 0.6) } },
  ascend: {
    gap: 500,
    play: (t) => {
      for (const f of [349, 440, 523, 659, 784]) {
        tone(t, { f, type: 'sawtooth', dur: 2.2, gain: 0.02, attack: 0.4, lp: 1800, detune: -6 })
        tone(t, { f, type: 'sawtooth', dur: 2.2, gain: 0.02, attack: 0.4, lp: 1800, detune: 6 })
      }
      arp(t + 0.3, [1760, 2093, 2637, 3136, 3520, 4186], 0.12, (tt, f) => bell(tt, f, 0.03, 0.8))
    },
  },
  audit: {
    gap: 800,
    play: (t) => {
      for (const [f, g, d] of [[73, 0.22, 2.6], [200, 0.07, 1.8], [262, 0.05, 1.4], [311, 0.04, 1.2]]) tone(t, { f, dur: d, gain: g })
      noiseHit(t + 0.5, { dur: 0.12, gain: 0.3, type: 'lowpass', f: 320 })
      tone(t + 0.5, { f: 95, f2: 42, dur: 0.22, gain: 0.26 })
    },
  },
  scratch: { gap: 300, play: (t) => { for (let i = 0; i < 3; i++) noiseHit(t + i * 0.09, { dur: 0.18, gain: 0.2, f: 1800, f2: 6500, q: 4 }) } },
  hiss: { gap: 500, play: (t) => noiseHit(t, { dur: 0.7, gain: 0.1, type: 'highpass', f: 3500, attack: 0.05 }) },
  meow: {
    gap: 400,
    play: (t) => {
      const o = ctx.createOscillator()
      const bp1 = ctx.createBiquadFilter()
      const bp2 = ctx.createBiquadFilter()
      const g = ctx.createGain()
      const vib = ctx.createOscillator()
      const vibAmt = ctx.createGain()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(500, t)
      o.frequency.exponentialRampToValueAtTime(820, t + 0.13)
      o.frequency.exponentialRampToValueAtTime(430, t + 0.55)
      vib.frequency.value = 6
      vibAmt.gain.value = 14
      vib.connect(vibAmt).connect(o.frequency)
      bp1.type = 'bandpass'
      bp1.frequency.value = 1100
      bp1.Q.value = 2
      bp2.type = 'bandpass'
      bp2.frequency.value = 2600
      bp2.Q.value = 3
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.22, t + 0.05)
      g.gain.setTargetAtTime(0.0001, t + 0.35, 0.08)
      o.connect(bp1).connect(g)
      o.connect(bp2).connect(g)
      g.connect(sfxBus)
      o.start(t)
      vib.start(t)
      o.stop(t + 0.8)
      vib.stop(t + 0.8)
    },
  },
  munch: { gap: 200, play: (t) => { for (let i = 0; i < 3; i++) noiseHit(t + i * 0.1, { dur: 0.05, gain: 0.16, type: 'lowpass', f: 900 }) } },
  purr: {
    gap: 400,
    play: (t) => {
      const src = ctx.createBufferSource()
      const lp = ctx.createBiquadFilter()
      const g = ctx.createGain()
      const am = ctx.createOscillator()
      const amDepth = ctx.createGain()
      src.buffer = noise
      src.loop = true
      lp.type = 'lowpass'
      lp.frequency.value = 260
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.1)
      g.gain.setTargetAtTime(0.0001, t + 0.7, 0.1)
      am.frequency.value = 23
      amDepth.gain.value = 0.12
      am.connect(amDepth).connect(g.gain)
      src.connect(lp).connect(g).connect(sfxBus)
      src.start(t)
      am.start(t)
      src.stop(t + 1.2)
      am.stop(t + 1.2)
    },
  },
  boing: { gap: 200, play: (t) => { tone(t, { f: 150, f2: 440, dur: 0.35, gain: 0.1, type: 'triangle', glide: 0.08 }); tone(t + 0.08, { f: 440, f2: 260, dur: 0.3, gain: 0.05, type: 'triangle' }) } },
  horn: {
    gap: 800,
    play: (t) => {
      for (const at of [0, 0.42]) {
        tone(t + at, { f: 233, type: 'sawtooth', dur: 0.32, gain: 0.05, lp: 1400 })
        tone(t + at, { f: 294, type: 'sawtooth', dur: 0.32, gain: 0.05, lp: 1400 })
      }
    },
  },
  shutdown: {
    gap: 800,
    play: (t) => {
      arp(t, [784, 659, 523, 392], 0.2, (tt, f) => tone(tt, { f, type: 'triangle', dur: 1, gain: 0.09 }))
      tone(t + 0.6, { f: 196, dur: 2, gain: 0.08, attack: 0.1 })
    },
  },
  exhausted: {
    gap: 800,
    play: (t) => {
      arp(t, [392, 370, 349], 0.3, (tt, f) => tone(tt, { f, type: 'sawtooth', dur: 0.3, gain: 0.05, lp: 1100 }))
      const o = tone(t + 0.9, { f: 330, type: 'sawtooth', dur: 1, gain: 0.05, lp: 1100 })
      const lfo = ctx.createOscillator()
      const amt = ctx.createGain()
      lfo.frequency.value = 5
      amt.gain.value = 9
      lfo.connect(amt).connect(o.frequency)
      lfo.start(t + 0.9)
      lfo.stop(t + 2.6)
    },
  },
  uac: { gap: 200, play: (t) => { bell(t, 988, 0.06, 0.5); bell(t + 0.12, 1319, 0.06, 0.7) } },
  ping: { gap: 200, play: (t) => { bell(t, 2637, 0.05, 0.35); bell(t + 0.07, 1976, 0.045, 0.45) } },
  printer: {
    gap: 300,
    play: (t) => {
      for (let i = 0; i < 12; i++) noiseHit(t + i * 0.05, { dur: 0.01, gain: 0.05, f: 3000, q: 2 })
      tone(t, { f: 110, type: 'square', dur: 0.6, gain: 0.02, lp: 400 })
    },
  },
  denied: { gap: 200, play: (t) => { tone(t, { f: 110, type: 'square', dur: 0.32, gain: 0.06, lp: 900 }); tone(t, { f: 116, type: 'square', dur: 0.32, gain: 0.05, lp: 900 }) } },
  // The CEO Dog: a low-bit "wuf wuf" (square waves stepped like an old sound chip).
  bark: {
    gap: 600,
    play: (t) => {
      for (const [at, f] of [[0, 330], [0.19, 300]]) {
        for (let i = 0; i < 5; i++) tone(t + at + i * 0.018, { f: f - i * 38, type: 'square', dur: 0.03, gain: 0.07, lp: 1400 })
        noiseHit(t + at, { dur: 0.06, gain: 0.05, f: 700, q: 0.8 })
      }
    },
  },
  // The snail arrives: a tiny 8-bit fanfare.
  fanfare: {
    gap: 2000,
    play: (t) => arp(t, [523, 659, 784, 1046, 784, 1046, 1319], 0.11, (tt, f, i) => tone(tt, { f, type: 'square', dur: i === 6 ? 0.5 : 0.1, gain: 0.05, lp: 3000 })),
  },
  // The paperclip has something to say.
  clipsay: { gap: 400, play: (t) => tone(t, { f: 260, f2: 620, type: 'triangle', dur: 0.16, gain: 0.07, glide: 0.12 }) },
  // A fly landing.
  buzz: { gap: 800, play: (t) => tone(t, { f: 180, f2: 140, type: 'sawtooth', dur: 0.5, gain: 0.025, lp: 900, glide: 0.5 }) },
}

const lastPlayed = {}
let lastAnyAt = 0

/**
 * Play a named sound effect.
 * opts.low: skip if any other sound played in the last 180ms (for background feedback like toasts).
 */
export function sfx(name, opts = {}) {
  if (!ctx || ctx.state !== 'running' || !settings.sfx) return
  const def = SFX[name]
  if (!def) return
  const now = performance.now()
  if (opts.low && now - lastAnyAt < 180) return
  if (now - (lastPlayed[name] ?? 0) < (def.gap ?? 30)) return
  lastPlayed[name] = now
  lastAnyAt = now
  def.play(ctx.currentTime + 0.005, opts)
}

/** The roulette wheel's clicks, slowing down over `seconds` (`slow` stretches the gaps, for the 5× spin). */
export function wheelTicks(seconds = 3, slow = 1) {
  if (!ctx || ctx.state !== 'running' || !settings.sfx) return
  let at = 0
  let step = 0.035 * Math.sqrt(slow)
  const start = ctx.currentTime + 0.01
  while (at < seconds) {
    const t = start + at
    noiseHit(t, { dur: 0.012, gain: 0.08, type: 'highpass', f: 3200 })
    tone(t, { f: 2400, dur: 0.012, gain: 0.02 })
    at += step
    step *= 1 + 0.075 / Math.sqrt(slow)
  }
}
