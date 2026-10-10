// Dial-up for BobbyBrowser: the first page you open in a window has to connect first (a modem
// screech, the dialog, "Connected at 28,800 bps"), and every page then loads a line at a time.
// The speed button picks 28.8K, 56K or Broadband (a pretend upgrade: instant). Remembered.

import { feat } from './feats.js'

export const SPEEDS = [
  { id: '28k', label: '28.8K', bps: '28,800', connect: 5200, reveal: 1800 },
  { id: '56k', label: '56K', bps: '53,333', connect: 3600, reveal: 900 },
  { id: 'fast', label: 'Broadband', bps: '', connect: 0, reveal: 0 },
]
const KEY = 'nikstilos-dialup'
export function speed() {
  try {
    return SPEEDS.find((s) => s.id === localStorage.getItem(KEY)) ?? SPEEDS[0]
  } catch {
    return SPEEDS[0]
  }
}
export function nextSpeed() {
  const s = SPEEDS[(SPEEDS.indexOf(speed()) + 1) % SPEEDS.length]
  try {
    localStorage.setItem(KEY, s.id)
  } catch {}
  return s
}

// ---------------- The noise
let ctx = null
function modem(ms) {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    return
  }
  const out = ctx.createGain()
  out.gain.value = 0.07
  out.connect(ctx.destination)
  const t0 = ctx.currentTime + 0.05
  const tone = (f, at, len, type = 'sine', vol = 1) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = f
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.01)
    g.gain.setValueAtTime(vol, at + len - 0.02)
    g.gain.linearRampToValueAtTime(0, at + len)
    o.connect(g).connect(out)
    o.start(at)
    o.stop(at + len + 0.05)
  }
  const s = ms / 5200 // it all speeds up on 56K
  // dial tone, then the number (DTMF), then the answer tone and the handshake
  tone(350, t0, 0.5 * s, 'sine', 0.5)
  tone(440, t0, 0.5 * s, 'sine', 0.5)
  const DTMF = { 5: [770, 1336], 0: [941, 1336], 1: [697, 1209], 9: [852, 1477] }
  let t = t0 + 0.6 * s
  for (const d of '5550199') {
    const [a, b] = DTMF[d]
    tone(a, t, 0.08, 'sine', 0.5)
    tone(b, t, 0.08, 'sine', 0.5)
    t += 0.13 * s
  }
  t += 0.3 * s
  tone(2100, t, 0.7 * s, 'sine', 0.6)
  t += 0.8 * s
  const warble = [980, 1180, 1650, 1850, 2400, 1200, 600]
  const end = t0 + ms / 1000 - 0.2
  while (t < end) {
    const f = warble[Math.floor(Math.random() * warble.length)]
    const len = 0.05 + Math.random() * 0.12
    tone(f, t, len, Math.random() < 0.5 ? 'square' : 'sawtooth', 0.25)
    t += len * 0.8
  }
}

/** Shows the dial-up dialog over `view` and waits for it to connect. Resolves false if you hang up. */
export function connect(view, sp = speed()) {
  if (!sp.connect) return Promise.resolve(true)
  feat('dialup', 1)
  return new Promise((resolve) => {
    const box = document.createElement('div')
    box.className = 'dial'
    box.innerHTML = `<div class="dial-box" role="dialog" aria-label="Dial-up connection"><div class="dial-head">📞 Connecting to BobbyNet</div>
      <div class="dial-art" aria-hidden="true">🖥️ <i>· · ·</i> ☎️ <i>· · ·</i> 🌐</div><p class="dial-status">Dialing 555-0199…</p>
      <div class="dial-bar"><i></i></div><button type="button" class="btn dial-cancel">Hang up</button></div>`
    view.append(box)
    modem(sp.connect)
    const status = box.querySelector('.dial-status')
    const bar = box.querySelector('.dial-bar i')
    const steps = ['Dialing 555-0199…', 'Verifying username and password…', 'Logging on to network…', `Connected at ${sp.bps} bps`]
    // now and then someone in the house picks up the phone
    const picked = Math.random() < 0.12
    const timers = []
    const at = (ms, f) => timers.push(setTimeout(f, ms))
    const each = sp.connect / steps.length
    steps.forEach((s, i) =>
      at(each * i + (picked && i > 1 ? 1600 : 0), () => {
        status.textContent = s
        bar.style.width = `${((i + 1) / steps.length) * 100}%`
      }),
    )
    if (picked) at(each * 1.5, () => (status.textContent = 'Someone picked up the phone. Redialing…'))
    at(sp.connect + (picked ? 1600 : 0) + 300, () => {
      box.remove()
      resolve(true)
    })
    box.querySelector('.dial-cancel').addEventListener('click', () => {
      timers.forEach(clearTimeout)
      box.remove()
      resolve(false)
    })
  })
}
/** The page arriving a line at a time (a cover over it that slides away in steps). */
export function reveal(view, sp = speed()) {
  if (!sp.reveal) return
  view.querySelector('.dial-cover')?.remove()
  const c = document.createElement('div')
  c.className = 'dial-cover'
  c.innerHTML = `<span class="dial-kbps">${(sp.id === '28k' ? 3.4 : 6.6).toFixed(1)} KB/s</span>`
  view.append(c)
  c.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)' }], { duration: sp.reveal, easing: 'steps(14, end)', fill: 'forwards' }).onfinish = () => c.remove()
}
