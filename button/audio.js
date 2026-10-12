// THE BUTTON: sound, all synthesised (no files). Quiet on purpose. Nothing plays until the first press.

let ac = null
let master = null
let siren = null

export function wake() {
  if (ac) return ac.state === 'suspended' && ac.resume()
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)()
    master = ac.createGain()
    master.gain.value = 0.5
    master.connect(ac.destination)
  } catch {
    ac = null
  }
}

function tone(freq, dur, { type = 'sine', vol = 0.15, at = 0, slide = 0 } = {}) {
  if (!ac) return
  const t = ac.currentTime + at
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur, { vol = 0.3, freq = 800, at = 0 } = {}) {
  if (!ac) return
  const t = ac.currentTime + at
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buf
  const f = ac.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(freq, t)
  f.frequency.exponentialRampToValueAtTime(60, t + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t)
}

/** The air-raid siren: a slow wail. level 0 turns it off. */
export function sirenLevel(level) {
  if (!ac) return
  if (!siren && level > 0) {
    const o = ac.createOscillator()
    const lfo = ac.createOscillator()
    const depth = ac.createGain()
    const g = ac.createGain()
    o.type = 'sawtooth'
    o.frequency.value = 520
    lfo.frequency.value = 0.18
    depth.gain.value = 180
    lfo.connect(depth).connect(o.frequency)
    const f = ac.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 1400
    g.gain.value = 0
    o.connect(f).connect(g).connect(master)
    o.start()
    lfo.start()
    siren = { o, lfo, g }
  }
  if (siren) siren.g.gain.setTargetAtTime(level * 0.035, ac.currentTime, 0.6)
}

export const sfx = {
  /** a short press chose the left option */
  click: () => tone(660, 0.09, { type: 'square', vol: 0.06 }),
  /** a held press reached a second */
  hold: () => {
    tone(330, 0.18, { type: 'square', vol: 0.06 })
    tone(495, 0.22, { type: 'square', vol: 0.05, at: 0.08 })
  },
  /** the button going down */
  down: () => tone(140, 0.06, { type: 'triangle', vol: 0.12 }),
  /** the timer, near the end */
  tick: () => tone(1200, 0.04, { type: 'square', vol: 0.035 }),
  /** a strike */
  strike: () => tone(180, 0.5, { type: 'sawtooth', vol: 0.08, slide: -120 }),
  /** the end of everything */
  boom: () => {
    noise(4, { vol: 0.5, freq: 900 })
    tone(55, 3.5, { type: 'sine', vol: 0.3, slide: -30 })
  },
  /** a way out */
  good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.9, { vol: 0.06, at: i * 0.14 })),
  /** time folding back */
  rewind: () => tone(900, 1.6, { type: 'triangle', vol: 0.06, slide: -800 }),
}
