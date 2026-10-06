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
