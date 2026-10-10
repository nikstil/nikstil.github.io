// Small, quiet sounds (synthesised, no files): the roulette ticking past, a coin, a win, a loss.
// Off with the 🔇 button (remembered).

let ctx = null
let out = null
const MKEY = 'skinsink-muted'
let muted = (() => {
  try {
    return localStorage.getItem(MKEY) === '1'
  } catch {
    return false
  }
})()
export const isMuted = () => muted
export function setMuted(m) {
  muted = m
  try {
    localStorage.setItem(MKEY, m ? '1' : '0')
  } catch {}
}
function ready() {
  if (muted) return false
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    ctx = new AC()
    out = ctx.createGain()
    out.gain.value = 0.22
    out.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return true
}
addEventListener('pointerdown', () => ready(), { once: true })

function tone(f, at, len, { type = 'sine', vol = 0.5, to = null } = {}) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, at)
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + len)
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(vol, at + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0005, at + len)
  o.connect(g).connect(out)
  o.start(at)
  o.stop(at + len + 0.02)
}
let lastTick = 0
export function tick() {
  if (!ready()) return
  const now = ctx.currentTime
  if (now - lastTick < 0.035) return
  lastTick = now
  tone(1400, now, 0.03, { vol: 0.18, type: 'triangle' })
}
export function click() {
  if (!ready()) return
  tone(900, ctx.currentTime, 0.04, { vol: 0.2, type: 'triangle' })
}
export function coin() {
  if (!ready()) return
  const t = ctx.currentTime
  tone(1800, t, 0.12, { vol: 0.2 })
  tone(2400, t + 0.05, 0.16, { vol: 0.14 })
}
export function winSound(big = false) {
  if (!ready()) return
  const t = ctx.currentTime
  const notes = big ? [523, 659, 784, 1046, 1318] : [659, 784, 1046]
  notes.forEach((f, i) => tone(f, t + i * 0.08, 0.35, { vol: 0.32, type: 'triangle' }))
}
export function loseSound() {
  if (!ready()) return
  tone(220, ctx.currentTime, 0.35, { vol: 0.3, type: 'triangle', to: 140 })
}
export function boom() {
  if (!ready()) return
  tone(160, ctx.currentTime, 0.5, { vol: 0.35, to: 50 })
}
