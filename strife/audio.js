// Every sound is synthesised at load (no audio files): gunshots, footsteps, the bomb's beep.
// Sounds made in the world are positioned in 3D, so you can hear where the enemy is.

let ctx = null
let master = null
let volume = 0.8
let muted = false
const buffers = {}

export function setVolume(v) {
  volume = v
  if (master) master.gain.value = muted ? 0 : volume
}
export function setMuted(m) {
  muted = m
  if (master) master.gain.value = muted ? 0 : volume
}
export const isMuted = () => muted

/** Starts audio (it needs a click or key press first). */
export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : volume
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 6
  master.connect(comp).connect(ctx.destination)
  bake()
}

function buffer(seconds, fn) {
  const rate = ctx.sampleRate
  const n = Math.floor(seconds * rate)
  const b = ctx.createBuffer(1, n, rate)
  const d = b.getChannelData(0)
  let state = { lp: 0, lp2: 0, hp: 0, last: 0 }
  for (let i = 0; i < n; i++) d[i] = fn(i / rate, state)
  return b
}
const noise = () => Math.random() * 2 - 1
/** A gunshot: a crack of noise, a body (filtered noise) and a low thump, each with its own decay. */
function shot({ crack = 1, crackDecay = 60, body = 0.8, bodyDecay = 14, lp = 0.25, thump = 0.7, thumpHz = 70, thumpDecay = 18, tail = 0.15, tailDecay = 4, len = 0.6 }) {
  return buffer(len, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * lp
    s.lp2 += (n - s.lp2) * 0.04
    const c = n * crack * Math.exp(-t * crackDecay)
    const b = s.lp * body * Math.exp(-t * bodyDecay)
    const th = Math.sin(2 * Math.PI * thumpHz * t * (1 - t * 0.8)) * thump * Math.exp(-t * thumpDecay)
    const tl = s.lp2 * tail * Math.exp(-t * tailDecay) * 3
    return Math.tanh((c + b + th + tl) * 1.4) * 0.9
  })
}
function bake() {
  buffers.ak = shot({ crack: 1, body: 1, lp: 0.22, thump: 0.8, thumpHz: 62, tail: 0.25 })
  buffers.m4 = shot({ crack: 0.9, body: 0.8, lp: 0.3, thump: 0.6, thumpHz: 80, tail: 0.2, bodyDecay: 18 })
  buffers.smg = shot({ crack: 0.8, body: 0.6, lp: 0.35, thump: 0.4, thumpHz: 95, tail: 0.12, bodyDecay: 22, len: 0.4 })
  buffers.pistol = shot({ crack: 0.9, body: 0.55, lp: 0.4, thump: 0.4, thumpHz: 110, tail: 0.1, bodyDecay: 24, len: 0.4 })
  buffers.deagle = shot({ crack: 1, body: 1, lp: 0.2, thump: 0.9, thumpHz: 55, tail: 0.3, bodyDecay: 10, len: 0.7 })
  buffers.awp = shot({ crack: 1, body: 1.1, lp: 0.15, thump: 1, thumpHz: 45, thumpDecay: 8, tail: 0.5, tailDecay: 2.5, bodyDecay: 7, len: 1.4 })
  buffers.shotgun = shot({ crack: 1, body: 1.2, lp: 0.18, thump: 1, thumpHz: 50, thumpDecay: 12, tail: 0.4, tailDecay: 3.5, bodyDecay: 9, len: 0.9 })
  buffers.mg = shot({ crack: 0.95, body: 0.9, lp: 0.24, thump: 0.75, thumpHz: 70, tail: 0.2, bodyDecay: 16, len: 0.5 })
  buffers.scout = shot({ crack: 1, body: 0.8, lp: 0.3, thump: 0.6, thumpHz: 75, thumpDecay: 14, tail: 0.35, tailDecay: 3, bodyDecay: 12, len: 1.0 })
  buffers.auto = shot({ crack: 1, body: 1, lp: 0.2, thump: 0.85, thumpHz: 55, thumpDecay: 10, tail: 0.35, tailDecay: 3, bodyDecay: 10, len: 0.9 })
  buffers.zeus = buffer(0.5, (t) => (Math.random() < 0.5 ? 1 : -1) * Math.exp(-t * 7) * (0.4 + 0.6 * (Math.sin(2 * Math.PI * 90 * t) > 0 ? 1 : 0)) * 0.6)
  buffers.molotov = buffer(1.2, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.08
    const glass = t < 0.15 ? n * Math.exp(-t * 30) * (Math.sin(2 * Math.PI * 3200 * t) * 0.5 + 0.5) : 0
    return glass * 0.8 + s.lp * 2.2 * Math.min(1, t * 6) * Math.exp(-t * 2.2)
  })
  buffers.burn = buffer(0.5, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.06
    const pop = Math.random() < 0.002 ? 1 : 0
    s.last = Math.max(s.last * 0.97, pop)
    return (s.lp * 1.2 + n * s.last * 0.6) * Math.sin(Math.PI * t / 0.5)
  })
  buffers.pop = buffer(0.2, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.2
    return s.lp * 1.5 * Math.exp(-t * 30)
  })
  buffers.silenced = buffer(0.25, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.12
    return (s.lp * 1.4 * Math.exp(-t * 30) + Math.sin(2 * Math.PI * 180 * t) * 0.3 * Math.exp(-t * 40)) * 0.8
  })
  buffers.click = buffer(0.05, (t) => (Math.random() * 2 - 1) * Math.exp(-t * 300) * 0.6)
  buffers.reload = buffer(1.0, (t) => {
    const hit = (at) => (t > at && t < at + 0.03 ? noise() * Math.exp(-(t - at) * 160) : 0)
    return (hit(0.1) * 0.6 + hit(0.55) * 0.8 + hit(0.62) * 0.5 + hit(0.85) * 0.7) * 0.8
  })
  buffers.swish = buffer(0.25, (t, s) => {
    const n = noise()
    s.hp = n - s.last
    s.last = n
    return s.hp * 0.35 * Math.sin(Math.PI * Math.min(1, t / 0.25))
  })
  buffers.stab = buffer(0.2, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.2
    return s.lp * 1.5 * Math.exp(-t * 25)
  })
  for (let k = 0; k < 4; k++)
    buffers['step' + k] = buffer(0.12, (t, s) => {
      const n = noise()
      s.lp += (n - s.lp) * (0.15 + k * 0.05)
      return s.lp * 1.6 * Math.exp(-t * (40 + k * 6)) + Math.sin(2 * Math.PI * (60 + k * 8) * t) * 0.3 * Math.exp(-t * 50)
    })
  buffers.land = buffer(0.2, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.1
    return s.lp * 2 * Math.exp(-t * 25) + Math.sin(2 * Math.PI * 50 * t) * 0.5 * Math.exp(-t * 20)
  })
  buffers.hit = buffer(0.15, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.3
    return s.lp * 1.6 * Math.exp(-t * 35)
  })
  buffers.dink = buffer(0.5, (t) => (Math.sin(2 * Math.PI * 2400 * t) * 0.5 + Math.sin(2 * Math.PI * 3700 * t) * 0.3) * Math.exp(-t * 14) * 0.6)
  buffers.ricochet = buffer(0.3, (t) => Math.sin(2 * Math.PI * (2600 - t * 4000) * t) * Math.exp(-t * 18) * 0.25)
  buffers.beep = buffer(0.12, (t) => Math.sin(2 * Math.PI * 1950 * t) * Math.min(1, t * 200) * Math.exp(-t * 18) * 0.7)
  buffers.boom = buffer(2.6, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.05
    s.lp2 += (n - s.lp2) * 0.012
    return Math.tanh((s.lp * 3 * Math.exp(-t * 3) + s.lp2 * 6 * Math.exp(-t * 1.2) + Math.sin(2 * Math.PI * 38 * t) * Math.exp(-t * 3)) * 1.5) * 0.95
  })
  buffers.he = buffer(1.4, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.08
    return Math.tanh((noise() * Math.exp(-t * 30) + s.lp * 3 * Math.exp(-t * 4) + Math.sin(2 * Math.PI * 50 * t) * Math.exp(-t * 6)) * 1.3) * 0.9
  })
  buffers.flash = buffer(0.6, (t, s) => {
    const n = noise()
    s.lp += (n - s.lp) * 0.3
    return Math.tanh((noise() * Math.exp(-t * 40) + s.lp * 2 * Math.exp(-t * 12)) * 1.5) * 0.8
  })
  buffers.ring = buffer(3, (t) => Math.sin(2 * Math.PI * 3200 * t) * 0.2 * Math.exp(-t * 0.9))
  buffers.hiss = buffer(2.5, (t, s) => {
    const n = noise()
    s.hp = n - s.last
    s.last = n
    return s.hp * 0.25 * Math.min(1, t * 6) * Math.exp(-t * 0.8)
  })
  buffers.bounce = buffer(0.08, (t) => Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 60) * 0.5 + noise() * Math.exp(-t * 120) * 0.3)
  buffers.pin = buffer(0.15, (t) => Math.sin(2 * Math.PI * 3000 * t) * Math.exp(-t * 50) * 0.3)
  buffers.buy = buffer(0.12, (t) => Math.sin(2 * Math.PI * (700 + t * 3000) * t) * Math.exp(-t * 20) * 0.35)
  buffers.deny = buffer(0.2, (t) => Math.sign(Math.sin(2 * Math.PI * 160 * t)) * Math.exp(-t * 12) * 0.2)
  const chord = (notes, len, wave = (x) => Math.sin(x)) =>
    buffer(len, (t) => notes.reduce((a, [hz, at]) => a + (t > at ? wave(2 * Math.PI * hz * (t - at)) * Math.exp(-(t - at) * 3) : 0), 0) * 0.16)
  buffers.roundStart = chord([[392, 0], [523, 0.08], [659, 0.16]], 1.2)
  buffers.win = chord([[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36]], 1.8)
  buffers.lose = chord([[392, 0], [311, 0.15], [262, 0.3]], 1.6)
  buffers.planted = chord([[880, 0], [880, 0.25], [660, 0.5]], 1.2, (x) => Math.sign(Math.sin(x)) * 0.5)
}

const listener = { x: 0, y: 0, z: 0, fx: 0, fz: -1 }
/** Where the ears are (the camera), every frame. */
export function setListener(x, y, z, yaw) {
  listener.x = x
  listener.y = y
  listener.z = z
  if (!ctx) return
  const L = ctx.listener
  const fx = -Math.sin(yaw)
  const fz = -Math.cos(yaw)
  if (L.positionX) {
    L.positionX.value = x
    L.positionY.value = y
    L.positionZ.value = z
    L.forwardX.value = fx
    L.forwardY.value = 0
    L.forwardZ.value = fz
    L.upX.value = 0
    L.upY.value = 1
    L.upZ.value = 0
  } else {
    L.setPosition(x, y, z)
    L.setOrientation(fx, 0, fz, 0, 1, 0)
  }
}

/**
 * Plays a sound. With `at` ({x, y, z}) it comes from that place in the world; without, it's in
 * your head (your own gun, the UI). `range` is how far it carries (metres).
 */
export function play(name, { at = null, gain = 1, rate = 1, range = 40 } = {}) {
  if (!ctx || !buffers[name]) return
  if (at) {
    const d = Math.hypot(at.x - listener.x, at.y - listener.y, at.z - listener.z)
    if (d > range * 2.2) return
  }
  const src = ctx.createBufferSource()
  src.buffer = buffers[name]
  src.playbackRate.value = rate * (0.96 + Math.random() * 0.08)
  const g = ctx.createGain()
  g.gain.value = gain
  if (at) {
    const p = ctx.createPanner()
    p.panningModel = 'equalpower'
    p.distanceModel = 'inverse'
    p.refDistance = Math.max(1.5, range / 12)
    p.rolloffFactor = 1.1
    p.maxDistance = range * 2
    if (p.positionX) {
      p.positionX.value = at.x
      p.positionY.value = at.y
      p.positionZ.value = at.z
    } else p.setPosition(at.x, at.y, at.z)
    src.connect(g).connect(p).connect(master)
  } else src.connect(g).connect(master)
  src.start()
}

// ================= Music kits =================
// A kit is a sound (oscillator wave), a tempo, a root note and a scale; its tunes are made up
// from them (the same tune every time for the same kit), with a bass line and a little drum kit.
let musicGain = null
let musicStop = null
export function music(kit, kind = 'start') {
  if (!ctx || !kit) return
  if (ctx.state === 'suspended') ctx.resume()
  musicStop?.()
  musicGain = ctx.createGain()
  musicGain.gain.value = kind === 'mvp' ? 0.32 : 0.22
  musicGain.connect(master)
  const out = musicGain
  let s = kit.seed * 9301 + (kind === 'mvp' ? 77 : kind === 'lose' ? 191 : 0)
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const beat = 60 / kit.bpm
  const bars = kind === 'mvp' ? 4 : kind === 'lose' ? 1 : 2
  const steps = bars * 8 // eighth notes
  const t0 = ctx.currentTime + 0.05
  const scale = kind === 'lose' ? kit.scale.map((n, k) => (k === 1 ? n - 1 : n)) : kit.scale
  const freq = (deg, oct = 0) => kit.root * Math.pow(2, (scale[((deg % scale.length) + scale.length) % scale.length] + 12 * (oct + Math.floor(deg / scale.length))) / 12)
  const nodes = []
  const note = (f, at, len, wave, vol) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = wave
    o.frequency.value = f
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0008, at + len)
    o.connect(g).connect(out)
    o.start(at)
    o.stop(at + len + 0.05)
    nodes.push(o)
  }
  const drum = (at, kick) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(kick ? 120 : 900, at)
    o.frequency.exponentialRampToValueAtTime(kick ? 40 : 200, at + 0.12)
    g.gain.setValueAtTime(kick ? 0.6 : 0.15, at)
    g.gain.exponentialRampToValueAtTime(0.001, at + (kick ? 0.2 : 0.05))
    o.connect(g).connect(out)
    o.start(at)
    o.stop(at + 0.25)
    nodes.push(o)
  }
  // a melody that walks the scale, a bass on the beat, drums
  let deg = 2
  for (let k = 0; k < steps; k++) {
    const at = t0 + k * beat * 0.5
    if (rnd() < (kind === 'lose' ? 0.45 : 0.78)) {
      deg += Math.floor(rnd() * 5) - 2
      deg = Math.max(0, Math.min(9, deg))
      const last = k === steps - 1
      note(freq(last ? 0 : deg, 1), at, beat * (last ? 1.6 : 0.45), kit.wave, 0.14)
    }
    if (k % 2 === 0) note(freq(k % 8 < 4 ? 0 : 3, -1), at, beat * 0.9, 'triangle', 0.22)
    if (kind !== 'lose') {
      if (k % 4 === 0) drum(at, true)
      if (k % 4 === 2) drum(at, false)
    }
  }
  const end = t0 + steps * beat * 0.5 + 1.8
  const g = musicGain
  musicStop = () => {
    try {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
      for (const n of nodes) n.stop(ctx.currentTime + 0.4)
    } catch {}
    musicStop = null
  }
  setTimeout(() => musicStop === null || g !== musicGain || musicStop?.(), (end - ctx.currentTime) * 1000)
}
