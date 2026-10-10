// Gravity mode: the desktop gets physics. Icons fall and pile up on the taskbar, windows drop when
// you let go of them (throw them: they keep your speed and bounce off the edges), and shaking a
// window hard makes things fall out of it. Turning it off puts the icons back on their grid.

import { feat } from './feats.js'

const G = 2600 // px/s²
const BOUNCE_FLOOR = 0.32
const BOUNCE_WALL = 0.55
const AIR = 0.995
const FLOOR_FRICTION = 0.86
let on = false
let api = null
let raf = 0
let last = 0
const bodies = new Map() // element -> body
let held = null // the body being dragged: { b, dx, dy, samples }

const floorY = () => innerHeight - api.taskbarHeight()
const isWin = (el) => el.classList.contains('win')

function bodyFor(el) {
  let b = bodies.get(el)
  if (!b) {
    const r = el.getBoundingClientRect()
    b = { el, x: r.left, y: r.top, w: r.width, h: r.height, vx: 0, vy: 0, sleep: 0, win: isWin(el) }
    bodies.set(el, b)
  }
  return b
}
/** Which things fall: the desktop's icons and the windows (not maximised, minimised or embedded). */
function collect() {
  const want = new Set()
  // (fixed-position icons have no offsetParent: ask for their boxes instead)
  for (const li of document.querySelectorAll('.desk-icons > li')) if (!li.hidden && li.getClientRects().length) want.add(li)
  for (const w of document.querySelectorAll('#windows > .win')) if (!w.hidden && !w.classList.contains('is-max') && !w.classList.contains('is-embedded') && !w.classList.contains('is-minimizing')) want.add(w)
  for (const el of document.querySelectorAll('.grav-junk')) want.add(el)
  for (const el of [...bodies.keys()]) if (!want.has(el)) bodies.delete(el)
  for (const el of want) bodyFor(el)
}
function place(b) {
  if (b.win) {
    b.el.style.left = `${b.x}px`
    b.el.style.top = `${b.y}px`
  } else b.el.style.transform = `translate(${b.x}px, ${b.y}px)`
}
function step(t) {
  raf = requestAnimationFrame(step)
  const dt = Math.min(0.033, (t - last) / 1000 || 0.016)
  last = t
  collect()
  const floor = floorY()
  const W = innerWidth
  const list = [...bodies.values()]
  for (const b of list) {
    if (held?.b === b) continue
    // a window's size can change (content loads): keep it current
    if (b.win) {
      b.w = b.el.offsetWidth
      b.h = b.el.offsetHeight
    }
    if (b.sleep > 30 && Math.abs(b.vx) + Math.abs(b.vy) < 1) continue
    b.vy += G * dt
    b.vx *= AIR
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.y + b.h > floor) {
      b.y = floor - b.h
      b.vy = Math.abs(b.vy) > 120 ? -b.vy * BOUNCE_FLOOR : 0
      b.vx *= FLOOR_FRICTION
    }
    if (b.x < 0) {
      b.x = 0
      b.vx = Math.abs(b.vx) * BOUNCE_WALL
    }
    if (b.x + b.w > W) {
      b.x = W - b.w
      b.vx = -Math.abs(b.vx) * BOUNCE_WALL
    }
    // (a window keeps its title bar on screen, even if that means hanging below the taskbar)
    const minY = b.win ? 0 : -b.h * 0.5
    if (b.y < minY) {
      b.y = minY
      b.vy = Math.abs(b.vy) * 0.3
    }
  }
  // stacking: push overlapping things apart, the lighter one (or the one on top) moves
  for (let k = 0; k < 3; k++)
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const c = list[j]
        // icons don't stack on windows' insides: only on their title bars (and windows on windows)
        const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)
        const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y)
        if (ox <= 0 || oy <= 0) continue
        if (a.win !== c.win) continue // icons fall behind windows (they're on the desktop, underneath)
        const top = a.y + a.h / 2 < c.y + c.h / 2 ? a : c
        const bottom = top === a ? c : a
        if (oy < ox) {
          if (held?.b === top) continue
          top.y -= oy
          if (top.vy > 0) top.vy = 0
          top.vx *= 0.9
          // an icon balanced on another one topples off (towers of icons aren't stable)
          if (!top.win) {
            const off = top.x + top.w / 2 - (bottom.x + bottom.w / 2)
            top.vx += (off ? Math.sign(off) : Math.random() < 0.5 ? -1 : 1) * 24
            top.sleep = 0
          }
          if (held?.b !== bottom) bottom.vy = Math.max(bottom.vy, 0)
        } else {
          const left = a.x < c.x ? a : c
          const right = left === a ? c : a
          const push = ox / 2
          if (held?.b !== left) left.x -= push
          if (held?.b !== right) right.x += push
          const v = (left.vx + right.vx) / 2
          left.vx = v - 30
          right.vx = v + 30
        }
      }
  for (const b of list) {
    if (b.win && b.y < 0) b.y = 0
    b.sleep = Math.abs(b.vx) + Math.abs(b.vy) < 8 ? b.sleep + 1 : 0
    place(b)
  }
}

// ---------------- Grabbing and throwing
function grab(e) {
  if (!on || e.button > 0) return
  const li = e.target.closest('.desk-icons > li')
  const bar = e.target.closest('.win-bar')
  const el = li ?? (bar && !e.target.closest('.win-caps') ? bar.closest('.win') : null)
  if (!el || el.classList.contains('is-max')) return
  const b = bodyFor(el)
  e.preventDefault()
  e.stopPropagation()
  held = { b, dx: e.clientX - b.x, dy: e.clientY - b.y, x0: e.clientX, y0: e.clientY, moved: false, samples: [], flips: [], dir: 0 }
  b.vx = b.vy = 0
  b.sleep = 0
  el.classList.add('grav-held')
  if (b.win) api.focusEl?.(el)
  addEventListener('pointermove', drag)
  addEventListener('pointerup', drop)
  addEventListener('pointercancel', drop)
}
function drag(e) {
  if (!held) return
  const { b } = held
  if (!held.moved && Math.hypot(e.clientX - held.x0, e.clientY - held.y0) < 5) return
  held.moved = true
  const now = performance.now()
  b.x = e.clientX - held.dx
  b.y = e.clientY - held.dy
  held.samples.push({ x: e.clientX, y: e.clientY, t: now })
  while (held.samples.length > 2 && now - held.samples[0].t > 90) held.samples.shift()
  // shaking: quick changes of direction while you hold a window
  if (b.win && held.samples.length > 1) {
    const s = held.samples
    const dx = s[s.length - 1].x - s[s.length - 2].x
    const dir = Math.sign(dx)
    if (dir && Math.abs(dx) > 6 && dir !== held.dir) {
      held.dir = dir
      held.flips.push(now)
      held.flips = held.flips.filter((t) => now - t < 700)
      if (held.flips.length >= 5) {
        held.flips = []
        spill(b)
      }
    }
  }
  place(b)
}
function drop() {
  removeEventListener('pointermove', drag)
  removeEventListener('pointerup', drop)
  removeEventListener('pointercancel', drop)
  if (!held) return
  const { b, samples, moved } = held
  b.el.classList.remove('grav-held')
  if (moved && samples.length > 1) {
    const a = samples[0]
    const z = samples[samples.length - 1]
    const dt = Math.max(0.016, (z.t - a.t) / 1000)
    b.vx = Math.max(-4000, Math.min(4000, (z.x - a.x) / dt))
    b.vy = Math.max(-4000, Math.min(4000, (z.y - a.y) / dt))
    if (Math.hypot(b.vx, b.vy) > 1800) feat('thrown', 1)
  }
  b.sleep = 0
  // a drag isn't a click: the click that ends it mustn't open or select the icon
  if (moved) noClick = { el: b.el, until: performance.now() + 350 }
  held = null
}
let noClick = null
function swallowClick(e) {
  if (noClick && performance.now() < noClick.until && noClick.el.contains(e.target)) {
    e.stopPropagation()
    e.preventDefault()
  }
}
/** Shaking a window: bits of it fall out (and lie around for a while). */
function spill(b) {
  feat('shaken', 1)
  const icon = b.el.querySelector('.win-icon')?.textContent || '📄'
  const junk = [icon, '📄', '📎', '🗂️', '✏️', '💾', '🧾', '🍪']
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div')
    el.className = 'grav-junk'
    el.textContent = junk[Math.floor(Math.random() * junk.length)]
    el.setAttribute('aria-hidden', 'true')
    document.body.append(el)
    const j = bodyFor(el)
    j.x = b.x + b.w * (0.2 + Math.random() * 0.6)
    j.y = b.y + b.h * 0.6
    j.w = j.h = 34
    j.vx = (Math.random() - 0.5) * 900
    j.vy = -200 - Math.random() * 600
    setTimeout(() => {
      el.classList.add('fade')
      setTimeout(() => {
        bodies.delete(el)
        el.remove()
      }, 600)
    }, 20000 + Math.random() * 5000)
  }
}

/** Switches gravity on or off. os: { taskbarHeight, layoutIcons, focusWin } */
export function setGravity(value, os) {
  api = os ?? api
  if (value === on) return on
  on = value
  document.documentElement.classList.toggle('gravity', on)
  try {
    localStorage.setItem('nikstilos-gravity', on ? '1' : '0')
  } catch {}
  if (on) {
    feat('gravity')
    // icons leave the grid: from where they are now, as free bodies
    const list = document.querySelector('.desk-icons')
    for (const li of list.querySelectorAll(':scope > li')) {
      if (li.hidden) continue
      const r = li.getBoundingClientRect()
      li.style.transform = `translate(${r.left}px, ${r.top}px)`
    }
    bodies.clear()
    document.addEventListener('pointerdown', grab, true)
    document.addEventListener('click', swallowClick, true)
    last = performance.now()
    raf = requestAnimationFrame(step)
  } else {
    cancelAnimationFrame(raf)
    document.removeEventListener('pointerdown', grab, true)
    document.removeEventListener('click', swallowClick, true)
    for (const li of document.querySelectorAll('.desk-icons > li')) li.style.transform = ''
    for (const el of document.querySelectorAll('.grav-junk')) el.remove()
    bodies.clear()
    api.layoutIcons()
    // windows stay where they fell, but on screen
    api.keepAllOnScreen?.()
  }
  return on
}
export const gravityOn = () => on
/** (tests) */
export const _bodies = () => bodies
